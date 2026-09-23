from django.conf import settings
from django.db import models

class Mission(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_missions")
    paramedics = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="missions",
                                      limit_choices_to={"role": "PARAMEDIC", "is_active": True})
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(condition=models.Q(status__in=["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), name="valid_mission_status")]
    def __str__(self):
        return self.title
