from django.contrib import admin
from .models import Mission
@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "created_by", "created_at")
    list_filter = ("status",)
    filter_horizontal = ("paramedics",)
