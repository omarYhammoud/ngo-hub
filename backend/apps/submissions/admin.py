from django.contrib import admin

from .models import (
    ContactSubmission,
    VolunteerApplication,
)


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "subject",
        "status",
        "reviewed_by",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "name",
        "email",
        "subject",
        "message",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "reviewed_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(VolunteerApplication)
class VolunteerApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "phone",
        "area",
        "role",
        "status",
        "reviewed_by",
        "created_at",
    )

    list_filter = (
        "role",
        "status",
        "created_at",
    )

    search_fields = (
        "name",
        "phone",
        "area",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "reviewed_at",
    )

    ordering = (
        "-created_at",
    )