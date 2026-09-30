from django.conf import settings
from django.db import models
from django.utils import timezone


class Equipment(models.Model):
    # Preserve the agreed catalogue without guessing expansions of abbreviations.
    TYPE_CODES = ['OC5', 'OC10', 'CYL', 'BP', 'CP', 'NB', 'WC']

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ON_LOAN = 'ON_LOAN', 'On loan'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        RETIRED = 'RETIRED', 'Retired'

    code = models.CharField(max_length=40, unique=True)
    type = models.CharField(max_length=8, choices=[(code, code) for code in TYPE_CODES])
    name = models.CharField(max_length=120)
    serial_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)

    class Meta:
        ordering = ['code']
        constraints = [
            models.CheckConstraint(condition=models.Q(status__in=['AVAILABLE', 'ON_LOAN', 'MAINTENANCE', 'RETIRED']), name='valid_equipment_status'),
            models.CheckConstraint(condition=models.Q(type__in=['OC5', 'OC10', 'CYL', 'BP', 'CP', 'NB', 'WC']), name='valid_equipment_type'),
        ]


class Loan(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.PROTECT, related_name='loans')
    borrower_name = models.CharField(max_length=120)
    borrower_phone = models.CharField(max_length=32)
    borrower_address = models.CharField(max_length=250, blank=True)
    notes = models.TextField(blank=True)
    checked_out_at = models.DateTimeField(default=timezone.now, editable=False)
    due_date = models.DateField()
    checked_out_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='equipment_checkouts')
    returned_at = models.DateTimeField(null=True, blank=True, editable=False)
    returned_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='equipment_returns')
    return_status = models.CharField(max_length=16, blank=True, choices=[('AVAILABLE', 'Available'), ('MAINTENANCE', 'Maintenance')])
    return_notes = models.TextField(blank=True)

    @property
    def is_overdue(self):
        return self.returned_at is None and self.due_date < timezone.localdate()

    class Meta:
        ordering = ['-checked_out_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['equipment'], condition=models.Q(returned_at__isnull=True), name='one_open_loan_per_equipment'),
            models.CheckConstraint(condition=models.Q(returned_at__isnull=True) | models.Q(returned_at__gte=models.F('checked_out_at')), name='equipment_return_after_checkout'),
            models.CheckConstraint(condition=(models.Q(returned_at__isnull=True, returned_by__isnull=True, return_status='') | models.Q(returned_at__isnull=False, returned_by__isnull=False, return_status__in=['AVAILABLE', 'MAINTENANCE'])), name='complete_equipment_return'),
        ]
