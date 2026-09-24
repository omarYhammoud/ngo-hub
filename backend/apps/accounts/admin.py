from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from .permissions import capabilities_for

@admin.register(User)
class AccountAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("NGO Hub", {"fields": ("role", "phone")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("NGO Hub", {"fields": ("role",)}),)
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = UserAdmin.list_filter + ("role",)

    def has_module_permission(self, request):
        return "manage_staff" in capabilities_for(request.user)

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)
