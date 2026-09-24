import uuid
from django.conf import settings
from django.db import models


def mission_number():
    return 'MSN-' + uuid.uuid4().hex[:12].upper()


class Mission(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=200, blank=True)
    mission_number = models.CharField(max_length=40, unique=True, default=mission_number, editable=False)
    date = models.DateField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=250, blank=True)
    incident_type = models.CharField(max_length=100, blank=True)
    destination = models.CharField(max_length=250, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    cancellation_reason = models.TextField(blank=True)
    vehicle = models.ForeignKey('vehicles.Vehicle', null=True, blank=True, on_delete=models.PROTECT, related_name='missions')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_missions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        constraints = [
            models.CheckConstraint(condition=models.Q(status__in=['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']), name='valid_mission_status'),
            models.UniqueConstraint(fields=['vehicle'], condition=models.Q(status='ACTIVE', vehicle__isnull=False), name='one_active_mission_per_vehicle'),
            models.CheckConstraint(condition=models.Q(actual_end__isnull=True) | models.Q(actual_start__isnull=True) | models.Q(actual_end__gte=models.F('actual_start')), name='mission_times_ordered'),
        ]

    def __str__(self):
        return self.mission_number


class MissionCrew(models.Model):
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='crew')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='mission_participations')
    crew_role = models.CharField(max_length=80, blank=True)
    actual = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']
        constraints = [models.UniqueConstraint(fields=['mission', 'user', 'actual'], name='unique_mission_crew_phase')]


class MissionAudit(models.Model):
    mission = models.ForeignKey(Mission, on_delete=models.PROTECT, related_name='audit')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
