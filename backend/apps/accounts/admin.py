from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class AccountAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("NGO Hub", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("NGO Hub", {"fields": ("role",)}),)
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = UserAdmin.list_filter + ("role",)
