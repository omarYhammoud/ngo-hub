from django.db import models
from django.conf import settings


class Vehicle(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ON_MISSION = 'ON_MISSION', 'On Mission'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'

    code = models.CharField(max_length=40, unique=True)
    plate_number = models.CharField(max_length=40, unique=True)
    type = models.CharField(max_length=80, default='Ambulance')
    model = models.CharField(max_length=100, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    mileage = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    manual_maintenance = models.BooleanField(default=False, editable=False)

    class Meta:
        ordering = ['code']
        constraints = [models.CheckConstraint(condition=models.Q(status__in=['AVAILABLE', 'ON_MISSION', 'MAINTENANCE']), name='valid_vehicle_status')]

    def __str__(self):
        return self.code


class VehicleIssue(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_MAINTENANCE = 'IN_MAINTENANCE', 'In Maintenance'
        RESOLVED = 'RESOLVED', 'Resolved'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='issues')
    category = models.CharField(max_length=100)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    description = models.TextField()
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reported_vehicle_issues')
    reported_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    maintenance_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='resolved_vehicle_issues')
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-reported_at', '-id']
        constraints = [
            models.CheckConstraint(condition=models.Q(status__in=['OPEN', 'IN_MAINTENANCE', 'RESOLVED']), name='valid_vehicle_issue_status'),
            models.CheckConstraint(condition=models.Q(severity__in=['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), name='valid_vehicle_issue_severity'),
            models.CheckConstraint(condition=(models.Q(status='RESOLVED', resolved_by__isnull=False, resolved_at__isnull=False) | (models.Q(resolved_by__isnull=True, resolved_at__isnull=True) & ~models.Q(status='RESOLVED'))), name='vehicle_issue_resolution_metadata'),
        ]


class VehicleIssueAudit(models.Model):
    issue = models.ForeignKey(VehicleIssue, on_delete=models.PROTECT, related_name='audit')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at', '-id']
