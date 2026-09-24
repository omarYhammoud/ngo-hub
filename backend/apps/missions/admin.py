from django.contrib import admin
from .models import Mission, MissionAudit
from .services import visible_missions
from apps.accounts.permissions import capabilities_for


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ('mission_number', 'title', 'status', 'created_by', 'created_at')
    list_filter = ('status',)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(pk__in=visible_missions(request.user))

    def has_module_permission(self, request):
        return 'manage_missions' in capabilities_for(request.user)

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request) and (obj is None or visible_missions(request.user).filter(pk=obj.pk).exists())

    # All mutations go through the tested workflow API; no admin bypass.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
