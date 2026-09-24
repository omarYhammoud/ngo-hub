from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.accounts.models import User
from apps.vehicles.models import Vehicle
from .models import Mission, MissionCrew, MissionAudit

MANAGEMENT = {'SUPER_ADMIN', 'OPERATIONS_MANAGER'}
CLOSED = {'COMPLETED', 'CANCELLED'}
FIELDS = ['title', 'date', 'actual_start', 'actual_end', 'location', 'incident_type', 'destination', 'notes', 'vehicle_id', 'cancellation_reason']


def visible_missions(user):
    qs = Mission.objects.all()
    if user.role.code in MANAGEMENT:
        return qs
    if user.role.code == 'PARAMEDIC':
        return qs.filter(Q(created_by=user) | Q(crew__user=user)).distinct()
    return qs.none()


def fail(code):
    raise ValidationError({'detail': code})


def snapshot(mission):
    result = {field: (getattr(mission, field).isoformat() if hasattr(getattr(mission, field), 'isoformat') else getattr(mission, field)) for field in FIELDS}
    result['status'] = mission.status
    result['crew'] = list(mission.crew.order_by('actual', 'user_id').values('user_id', 'crew_role', 'actual'))
    return result


def validate_crew(entries):
    ids = [item['user_id'] for item in entries]
    if len(set(ids)) != len(ids):
        fail('duplicate_crew')
    if User.objects.filter(pk__in=ids, is_active=True, role__code='PARAMEDIC').count() != len(ids):
        fail('invalid_crew')


@transaction.atomic
def save_mission(actor, data, mission_id=None, action='save'):
    if actor.role.code not in MANAGEMENT | {'PARAMEDIC'} or not actor.is_active:
        raise PermissionDenied()
    if mission_id:
        # Lock the row without a DISTINCT join, then recheck scope inside the lock.
        mission = Mission.objects.select_for_update().get(pk=mission_id)
        if not visible_missions(actor).filter(pk=mission_id).exists():
            raise PermissionDenied()
        before = snapshot(mission)
    else:
        mission = Mission(created_by=actor)
        before = {}
    previous = mission.status
    correction = mission_id and previous in CLOSED
    if correction:
        if actor.role.code != 'SUPER_ADMIN':
            raise PermissionDenied('closed_mission')
        if action != 'correct' or not data.get('correction_reason', '').strip():
            fail('correction_reason_required')
    elif action == 'correct':
        fail('not_closed')
    if action == 'start' and (not mission_id or previous != 'PENDING'):
        fail('invalid_transition')
    if action in {'complete', 'cancel'} and previous not in {'PENDING', 'ACTIVE'}:
        fail('invalid_transition')
    if not mission_id and action not in {'save', 'complete'}:
        fail('invalid_transition')
    target = previous if correction else {'start': 'ACTIVE', 'complete': 'COMPLETED', 'cancel': 'CANCELLED'}.get(action, previous)
    if 'planned_crew' in data:
        if actor.role.code not in MANAGEMENT:
            raise PermissionDenied('planned_assignment_forbidden')
        if previous != 'PENDING' and not correction:
            fail('planned_assignment_locked')
    if 'actual_crew' in data and target == 'PENDING':
        fail('actual_crew_not_pending')
    if previous == 'ACTIVE' and 'vehicle_id' in data and data['vehicle_id'] != mission.vehicle_id:
        fail('active_vehicle_locked')
    for key in FIELDS:
        if key in data:
            setattr(mission, key, data[key])
    mission.status = target
    if not correction and action != 'cancel' and (not mission.date or not mission.location.strip() or not mission.incident_type.strip()):
        fail('mission_fields_required')
    if target == 'PENDING' and (mission.actual_start or mission.actual_end):
        fail('pending_actual_times')
    if mission.actual_end and not mission.actual_start:
        fail('start_required')
    if mission.actual_start and mission.actual_start > timezone.now():
        fail('future_actual_time')
    if mission.actual_end and (mission.actual_end > timezone.now() or mission.actual_end < mission.actual_start):
        fail('invalid_actual_times')
    if mission.actual_start and mission.date and timezone.localtime(mission.actual_start).date() != mission.date:
        fail('date_start_mismatch')
    if action == 'start' and not mission.actual_start:
        fail('start_required')
    if target == 'ACTIVE' and mission.actual_end:
        fail('active_end_time')
    if target == 'CANCELLED' and not mission.cancellation_reason.strip():
        fail('cancellation_reason_required')
    for key in ['planned_crew', 'actual_crew']:
        if key in data:
            validate_crew(data[key])
    actual = data.get('actual_crew')
    actual_count = len(actual) if actual is not None else (mission.crew.filter(actual=True).count() if mission_id else 0)
    if target == 'COMPLETED' and (not mission.vehicle_id or not actual_count or not mission.actual_start or not mission.location.strip() or not mission.incident_type.strip() or not mission.date):
        fail('completion_fields_required')
    vehicle = None
    if mission.vehicle_id:
        try:
            vehicle = Vehicle.objects.select_for_update().get(pk=mission.vehicle_id)
        except Vehicle.DoesNotExist:
            fail('invalid_vehicle')
    # Historical records and corrections never touch current vehicle state.
    if action == 'start':
        if not vehicle:
            fail('vehicle_required')
        if vehicle.status != 'AVAILABLE' or Mission.objects.filter(vehicle=vehicle, status='ACTIVE').exclude(pk=mission.pk).exists():
            fail('vehicle_unavailable')
        vehicle.status = 'ON_MISSION'
        vehicle.save(update_fields=['status'])
    elif target == 'PENDING' and vehicle and vehicle.status == 'MAINTENANCE' and ('vehicle_id' in data or not mission_id):
        fail('vehicle_maintenance')
    elif previous == 'ACTIVE' and target in CLOSED and vehicle:
        if vehicle.status != 'MAINTENANCE' and not Mission.objects.filter(vehicle=vehicle, status='ACTIVE').exclude(pk=mission.pk).exists():
            vehicle.status = 'AVAILABLE'
            vehicle.save(update_fields=['status'])
    mission.save()
    for key, actual_flag in [('planned_crew', False), ('actual_crew', True)]:
        if key in data:
            mission.crew.filter(actual=actual_flag).delete()
            MissionCrew.objects.bulk_create([MissionCrew(mission=mission, actual=actual_flag, **item) for item in data[key]])
    MissionAudit.objects.create(mission=mission, actor=actor, action='correct' if correction else ('create' if not mission_id else action), reason=data.get('correction_reason', '') if correction else mission.cancellation_reason if action == 'cancel' else '', before=before, after=snapshot(mission))
    return mission
