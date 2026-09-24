from django.db import models


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

    class Meta:
        ordering = ['code']
        constraints = [models.CheckConstraint(condition=models.Q(status__in=['AVAILABLE', 'ON_MISSION', 'MAINTENANCE']), name='valid_vehicle_status')]

    def __str__(self):
        return self.code
