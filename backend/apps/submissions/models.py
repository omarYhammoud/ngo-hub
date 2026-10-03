from django.conf import settings
from django.db import models


class SubmissionStatus(models.TextChoices):
    NEW = "NEW", "New"
    REVIEWED = "REVIEWED", "Reviewed"
    CLOSED = "CLOSED", "Closed"


class ContactSubmission(models.Model):
    name = models.CharField(
        max_length=150
    )

    email = models.EmailField()

    subject = models.CharField(
        max_length=200,
        blank=True
    )

    message = models.TextField(
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.NEW
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_contact_submissions"
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = [
            "-created_at"
        ]

    def __str__(self):
        return (
            f"{self.name} - "
            f"{self.subject or 'Contact message'}"
        )


class VolunteerApplication(models.Model):
    class VolunteerRole(models.TextChoices):
        PARAMEDIC = (
            "PARAMEDIC",
            "Paramedic"
        )

        DRIVER = (
            "DRIVER",
            "Driver"
        )

        LOGISTICS = (
            "LOGISTICS",
            "Logistics"
        )

        FUNDRAISING = (
            "FUNDRAISING",
            "Fundraising"
        )

    name = models.CharField(
        max_length=150
    )

    phone = models.CharField(
        max_length=30
    )

    area = models.CharField(
        max_length=150,
        blank=True
    )

    role = models.CharField(
        max_length=30,
        choices=VolunteerRole.choices
    )

    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.NEW
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_volunteer_applications"
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = [
            "-created_at"
        ]

    def __str__(self):
        return (
            f"{self.name} - "
            f"{self.get_role_display()}"
        )