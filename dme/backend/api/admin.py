from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Patient, MedicalFolder, Prescription, Notification

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'is_staff']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role',)}),
    )

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'date_of_birth', 'contact_phone', 'created_by']
    search_fields = ['first_name', 'last_name', 'contact_email']
    list_filter = ['created_at']

@admin.register(MedicalFolder)
class MedicalFolderAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'created_by', 'created_at']
    search_fields = ['title', 'patient__first_name', 'patient__last_name']
    list_filter = ['created_at']

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['patient__first_name', 'patient__last_name']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'message', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
