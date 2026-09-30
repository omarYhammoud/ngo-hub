from rest_framework import serializers

from .models import (
    ContactSubmission,
    VolunteerApplication,
)


class ContactSubmissionCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = ContactSubmission
        fields = (
            "name",
            "email",
            "subject",
            "message",
        )

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Name must contain at least 2 characters."
            )

        return value

    def validate_subject(self, value):
        return value.strip()

    def validate_message(self, value):
        return value.strip()


class ContactSubmissionSerializer(
    serializers.ModelSerializer
):
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ContactSubmission

        fields = (
            "id",
            "name",
            "email",
            "subject",
            "message",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None

        return (
            obj.reviewed_by.get_full_name()
            or obj.reviewed_by.username
        )


class VolunteerApplicationCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = VolunteerApplication

        fields = (
            "name",
            "phone",
            "area",
            "role",
        )

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Name must contain at least 2 characters."
            )

        return value

    def validate_phone(self, value):
        value = value.strip()

        if len(value) < 6:
            raise serializers.ValidationError(
                "Please enter a valid phone number."
            )

        return value

    def validate_area(self, value):
        return value.strip()


class VolunteerApplicationSerializer(
    serializers.ModelSerializer
):
    reviewed_by_name = serializers.SerializerMethodField()

    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True
    )

    class Meta:
        model = VolunteerApplication

        fields = (
            "id",
            "name",
            "phone",
            "area",
            "role",
            "role_display",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "role_display",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None

        return (
            obj.reviewed_by.get_full_name()
            or obj.reviewed_by.username
        )