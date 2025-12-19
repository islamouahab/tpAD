from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Patient, MedicalFolder, Prescription, Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')
        data['user'] = user
        return data

class PatientSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = ['id', 'first_name', 'last_name', 'date_of_birth', 'contact_phone', 
                  'contact_email', 'address', 'medical_history', 'created_at', 
                  'updated_at', 'created_by', 'created_by_name']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None

class MedicalFolderSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalFolder
        fields = ['id', 'patient', 'patient_name', 'title', 'notes', 'diagnosis',
                  'vitals_blood_pressure', 'vitals_heart_rate', 'vitals_temperature',
                  'vitals_weight', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_patient_name(self, obj):
        return str(obj.patient)
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    dispensed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = ['id', 'patient', 'patient_name', 'doctor', 'doctor_name', 
                  'medications', 'notes', 'status', 'dispensed_by', 'dispensed_by_name',
                  'dispensed_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'doctor', 'dispensed_by', 'dispensed_at']
    
    def get_patient_name(self, obj):
        return str(obj.patient)
    
    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
        return None
    
    def get_dispensed_by_name(self, obj):
        if obj.dispensed_by:
            return f"{obj.dispensed_by.first_name} {obj.dispensed_by.last_name}"
        return None

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'prescription', 'is_read', 'created_at']
        read_only_fields = ['id', 'message', 'prescription', 'created_at']

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']
