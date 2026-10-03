from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.accounts.permissions import capabilities_for
from .models import Vehicle, VehicleIssue, VehicleIssueAudit


def snapshot(issue, vehicle):
    return {
        'vehicle': vehicle.pk, 'vehicle_status': vehicle.status,
        'manual_maintenance': vehicle.manual_maintenance,
        'category': issue.category, 'severity': issue.severity,
        'description': issue.description, 'status': issue.status,
        'maintenance_notes': issue.maintenance_notes,
        'reported_by': issue.reported_by_id,
        'reported_at': issue.reported_at.isoformat(),
        'resolved_by': issue.resolved_by_id,
        'resolved_at': issue.resolved_at.isoformat() if issue.resolved_at else None,
    }


@transaction.atomic
def save_issue(actor, data, issue_id=None, action='report'):
    if 'manage_vehicles' not in capabilities_for(actor):
        raise PermissionDenied()
    if issue_id is None:
        vehicle = get_object_or_404(Vehicle.objects.select_for_update(), pk=data['vehicle'].pk)
        issue = VehicleIssue.objects.create(vehicle=vehicle, reported_by=actor, **{k: data[k] for k in ['category', 'severity', 'description']})
        before = {}
    else:
        # The shared vehicle lock serializes issue transitions, manual changes,
        # and mission starts/finishes. Never lock a mission from this service.
        reference = get_object_or_404(VehicleIssue, pk=issue_id)
        vehicle = Vehicle.objects.select_for_update().get(pk=reference.vehicle_id)
        issue = VehicleIssue.objects.select_for_update().get(pk=issue_id)
        before = snapshot(issue, vehicle)
        if issue.status == 'RESOLVED':
            raise ValidationError({'detail': 'issue_closed'})
        if action == 'maintenance':
            if issue.status != 'OPEN':
                raise ValidationError({'detail': 'issue_invalid_transition'})
            issue.status = 'IN_MAINTENANCE'
            vehicle.status = 'MAINTENANCE'
        elif action == 'resolve':
            if not data.get('maintenance_notes', '').strip():
                raise ValidationError({'detail': 'issue_resolution_notes_required'})
            was_maintenance = issue.status == 'IN_MAINTENANCE'
            issue.status = 'RESOLVED'
            issue.resolved_by = actor
            issue.resolved_at = timezone.now()
            other_holds = vehicle.issues.filter(status='IN_MAINTENANCE').exclude(pk=issue.pk).exists()
            if was_maintenance and not other_holds and not vehicle.manual_maintenance:
                vehicle.status = 'ON_MISSION' if vehicle.missions.filter(status='ACTIVE').exists() else 'AVAILABLE'
        elif action != 'notes':
            raise ValidationError({'detail': 'issue_invalid_transition'})
        if 'maintenance_notes' in data:
            issue.maintenance_notes = data['maintenance_notes']
        issue.save()
        vehicle.save(update_fields=['status'])
    VehicleIssueAudit.objects.create(issue=issue, actor=actor, action=action, before=before, after=snapshot(issue, vehicle))
    # Attach the locked, up-to-date vehicle for response serialization.
    issue.vehicle = vehicle
    return issue
