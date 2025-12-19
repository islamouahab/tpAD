from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO

from .models import User, Patient, MedicalFolder, Prescription, Notification
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer,
    PatientSerializer, MedicalFolderSerializer, PrescriptionSerializer,
    NotificationSerializer, AdminUserSerializer
)
from .kafka_producer import publish_prescription_event

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsDoctorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'

class IsNurseUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'nurse'

class IsPharmacistUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'pharmacist'

class IsDoctorOrNurse(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['doctor', 'nurse']

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        if request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
        return Response({'message': 'Logged out successfully'})

class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsDoctorOrNurse()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class MedicalFolderViewSet(viewsets.ModelViewSet):
    queryset = MedicalFolder.objects.all()
    serializer_class = MedicalFolderSerializer
    
    def get_queryset(self):
        queryset = MedicalFolder.objects.all()
        patient_id = self.request.query_params.get('patient', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsDoctorOrNurse()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    
    def get_queryset(self):
        queryset = Prescription.objects.all()
        patient_id = self.request.query_params.get('patient', None)
        status_filter = self.request.query_params.get('status', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsDoctorUser()]
        if self.action in ['dispense']:
            return [IsPharmacistUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        prescription = serializer.save(doctor=self.request.user)
        publish_prescription_event(prescription)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPharmacistUser])
    def dispense(self, request, pk=None):
        prescription = self.get_object()
        if prescription.status != 'pending':
            return Response({'error': 'Prescription is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        prescription.status = 'dispensed'
        prescription.dispensed_by = request.user
        prescription.dispensed_at = timezone.now()
        prescription.save()
        
        return Response(PrescriptionSerializer(prescription).data)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_patient_pdf(request, patient_id):
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#1e40af')
    )
    elements.append(Paragraph("Medical Report", title_style))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph(f"<b>Patient:</b> {patient.first_name} {patient.last_name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date of Birth:</b> {patient.date_of_birth}", styles['Normal']))
    elements.append(Paragraph(f"<b>Contact:</b> {patient.contact_phone} | {patient.contact_email}", styles['Normal']))
    elements.append(Paragraph(f"<b>Address:</b> {patient.address}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("<b>Medical History:</b>", styles['Heading2']))
    elements.append(Paragraph(patient.medical_history or "No medical history recorded.", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("<b>Medical Records:</b>", styles['Heading2']))
    folders = MedicalFolder.objects.filter(patient=patient)
    if folders.exists():
        for folder in folders:
            elements.append(Paragraph(f"<b>{folder.title}</b> - {folder.created_at.strftime('%Y-%m-%d')}", styles['Normal']))
            elements.append(Paragraph(f"Diagnosis: {folder.diagnosis or 'N/A'}", styles['Normal']))
            elements.append(Paragraph(f"Notes: {folder.notes}", styles['Normal']))
            if folder.vitals_blood_pressure or folder.vitals_heart_rate:
                vitals = f"Vitals: BP: {folder.vitals_blood_pressure or 'N/A'}, HR: {folder.vitals_heart_rate or 'N/A'} bpm"
                elements.append(Paragraph(vitals, styles['Normal']))
            elements.append(Spacer(1, 10))
    else:
        elements.append(Paragraph("No medical records found.", styles['Normal']))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>Prescriptions:</b>", styles['Heading2']))
    prescriptions = Prescription.objects.filter(patient=patient)
    if prescriptions.exists():
        for rx in prescriptions:
            elements.append(Paragraph(f"<b>Prescription #{rx.id}</b> - {rx.created_at.strftime('%Y-%m-%d')} - Status: {rx.status}", styles['Normal']))
            elements.append(Paragraph(f"Doctor: {rx.doctor.first_name} {rx.doctor.last_name if rx.doctor else 'N/A'}", styles['Normal']))
            meds = ", ".join([m.get('name', 'Unknown') for m in rx.medications]) if rx.medications else "None"
            elements.append(Paragraph(f"Medications: {meds}", styles['Normal']))
            elements.append(Spacer(1, 10))
    else:
        elements.append(Paragraph("No prescriptions found.", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"<i>Report generated on {timezone.now().strftime('%Y-%m-%d %H:%M')}</i>", styles['Normal']))
    
    doc.build(elements)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="medical_report_{patient.last_name}_{patient.first_name}.pdf"'
    return response

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    stats = {
        'total_patients': Patient.objects.count(),
        'total_prescriptions': Prescription.objects.count(),
        'pending_prescriptions': Prescription.objects.filter(status='pending').count(),
        'dispensed_prescriptions': Prescription.objects.filter(status='dispensed').count(),
    }
    
    if user.role == 'doctor':
        stats['my_prescriptions'] = Prescription.objects.filter(doctor=user).count()
        stats['my_patients'] = Patient.objects.filter(created_by=user).count()
    elif user.role == 'pharmacist':
        stats['my_dispensed'] = Prescription.objects.filter(dispensed_by=user).count()
    elif user.role == 'admin':
        stats['total_users'] = User.objects.count()
        stats['users_by_role'] = {
            'admin': User.objects.filter(role='admin').count(),
            'doctor': User.objects.filter(role='doctor').count(),
            'nurse': User.objects.filter(role='nurse').count(),
            'pharmacist': User.objects.filter(role='pharmacist').count(),
        }
    
    return Response(stats)
