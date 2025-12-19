from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'patients', views.PatientViewSet)
router.register(r'medical-folders', views.MedicalFolderViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('patients/<int:patient_id>/pdf/', views.generate_patient_pdf, name='patient-pdf'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]
