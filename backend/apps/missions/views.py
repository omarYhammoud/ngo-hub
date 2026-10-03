import csv
from datetime import date
from io import StringIO

from django.db import IntegrityError
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import CanManageMissions
from apps.vehicles.models import Vehicle

from .models import MissionCrew
from .serializers import MissionDetail, MissionInput, MissionOutput
from .services import save_mission, visible_missions

def csv_safe(value):
    if value is None:
        return ''

    text = str(value)

    if text.startswith(('=', '+', '-', '@')):
        return "'" + text

    return text

class MissionViewSet(viewsets.GenericViewSet):
    permission_classes = [CanManageMissions]
    serializer_class = MissionOutput

    def get_queryset(self):
        return (
            visible_missions(self.request.user)
            .select_related('vehicle', 'created_by')
            .prefetch_related('crew__user', 'audit__actor')
        )

    def filtered_missions(self, request):
        # Always start with missions this user can access.
        qs = self.get_queryset()
        params = request.query_params

        query = params.get('search', '').strip()
        if query:
            qs = qs.filter(
                Q(mission_number__icontains=query)
                | Q(title__icontains=query)
                | Q(location__icontains=query)
                | Q(destination__icontains=query)
            )

        filters = {
            'status': 'status',
            'incident_type': 'incident_type__icontains',
            'vehicle': 'vehicle_id',
            'crew': 'crew__user_id',
            'date_from': 'date__gte',
            'date_to': 'date__lte',
        }
        validated = {}

        for param, field in filters.items():
            value = params.get(param)
            if not value:
                continue

            if param in {'vehicle', 'crew'}:
                value = serializers.IntegerField(
                    min_value=1
                ).run_validation(value)

            elif param.startswith('date_'):
                value = serializers.DateField().run_validation(value)

            elif param == 'status':
                value = serializers.ChoiceField(
                    choices=[
                        'PENDING',
                        'ACTIVE',
                        'COMPLETED',
                        'CANCELLED',
                    ]
                ).run_validation(value)

            validated[param] = value
            qs = qs.filter(**{field: value})

        date_from = validated.get('date_from')
        date_to = validated.get('date_to')

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_to': 'End date must be on or after start date.'
            })

        return qs.distinct()

    def list(self, request):
        qs = self.filtered_missions(request).order_by(
            '-created_at',
            '-id',
        )

        page = serializers.IntegerField(
            min_value=1
        ).run_validation(request.query_params.get('page', 1))

        start = (page - 1) * 20

        return Response({
            'count': qs.count(),
            'results': MissionOutput(
                qs[start:start + 20],
                many=True,
            ).data,
        })

    @action(detail=False, methods=['get'], url_path='report')
    def report(self, request):
        qs = self.filtered_missions(request)

        # Build choices from accessible missions before applying filters.
        # Historical staff remain available even after deactivation.
        visible = visible_missions(request.user)

        participants = (
            MissionCrew.objects.filter(mission__in=visible)
            .order_by()
            .values('user_id')
        )

        staff_options = [
            {
                'id': user.pk,
                'name': user.get_full_name() or user.username,
            }
            for user in User.objects.filter(
                pk__in=participants
            ).order_by('username')
        ]

        vehicle_options = [
            {
                'id': vehicle.pk,
                'name': vehicle.code,
            }
            for vehicle in Vehicle.objects.filter(
                pk__in=visible.order_by().values('vehicle_id')
            ).order_by('code')
        ]

        # Totals cover all matching missions, not just this page.
        counts = {
            'PENDING': 0,
            'ACTIVE': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
        }

        status_totals = (
            qs.order_by()
            .values('status')
            .annotate(total=Count('id', distinct=True))
        )

        for row in status_totals:
            counts[row['status']] = row['total']

        page = serializers.IntegerField(
            min_value=1
        ).run_validation(request.query_params.get('page', 1))

        start = (page - 1) * 20
        records = qs.order_by('-date', '-id')[start:start + 20]

        return Response({
            'staff_options': staff_options,
            'vehicle_options': vehicle_options,
            'count': qs.count(),
            'counts': counts,
            'page': page,
            'page_size': 20,
            'results': MissionOutput(records, many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='report-export')
    def report_export(self, request):
        qs = self.filtered_missions(request).order_by('-date', '-id')

        output = StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'Mission Number',
            'Mission Date',
            'Incident Type',
            'Location',
            'Vehicle',
            'Crew Members',
            'Status',
        ])

        for mission in qs:
            crew_members = ', '.join(
                (
                    f"{crew.user.get_full_name() or crew.user.username} "
                    f"({crew.crew_role or '—'})"
                )
                for crew in mission.crew.all()
            )

            writer.writerow([
                csv_safe(mission.mission_number),
                csv_safe(mission.date),
                csv_safe(mission.incident_type),
                csv_safe(mission.location),
                csv_safe(mission.vehicle.code if mission.vehicle else ''),
                csv_safe(crew_members),
                csv_safe(mission.status),
            ])


        return Response({
            'filename': 'mission-report.csv',
            'content': output.getvalue(),
        })

    @action(detail=False, methods=['get'], url_path='report-print')
    def report_print(self, request):
        qs = self.filtered_missions(request).order_by('-date', '-id')

        counts = {
            'PENDING': 0,
            'ACTIVE': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
        }

        status_totals = (
            qs.order_by()
            .values('status')
            .annotate(total=Count('id', distinct=True))
        )

        for row in status_totals:
            counts[row['status']] = row['total']

        results = []

        for mission in qs:
            crew_members = []

            for crew in mission.crew.all():
                name = (
                    crew.user.get_full_name()
                    or crew.user.username
                )

                crew_members.append({
                    'name': name,
                    'role': crew.crew_role,
                    'actual': crew.actual,
                })

            results.append({
                'id': mission.pk,
                'mission_number': mission.mission_number,
                'date': mission.date,
                'incident_type': mission.incident_type,
                'location': mission.location,
                'vehicle': (
                    mission.vehicle.code
                    if mission.vehicle
                    else ''
                ),
                'status': mission.status,
                'crew': crew_members,
            })

        return Response({
            'count': qs.count(),
            'counts': counts,
            'results': results,
        })

    def retrieve(self, request, pk=None):
        return Response(MissionDetail(self.get_object()).data)

    def mutate(self, request, pk=None, command='save'):
        if pk is not None:
            # Out-of-scope identifiers return 404, including action URLs.
            self.get_object()

        data = MissionInput(data=request.data)
        data.is_valid(raise_exception=True)

        try:
            mission = save_mission(
                request.user,
                data.validated_data,
                int(pk) if pk else None,
                command,
            )
        except IntegrityError:
            return Response(
                {'detail': 'concurrent_conflict'},
                status=409,
            )

        return Response(
            MissionDetail(mission).data,
            status=200 if pk else 201,
        )

    def create(self, request):
        return self.mutate(request)

    def partial_update(self, request, pk=None):
        return self.mutate(request, pk)

    @action(detail=False, methods=['post'], url_path='historical')
    def historical(self, request):
        return self.mutate(request, command='complete')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        return self.mutate(request, pk, 'start')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        return self.mutate(request, pk, 'complete')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self.mutate(request, pk, 'cancel')

    @action(detail=True, methods=['post'])
    def correct(self, request, pk=None):
        return self.mutate(request, pk, 'correct')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = visible_missions(request.user).order_by()

        counts = {
            row['status']: row['total']
            for row in (
                qs.values('status')
                .annotate(total=Count('id', distinct=True))
            )
        }

        today = timezone.localdate()

        # Six calendar months, including the current month.
        month_index = today.year * 12 + today.month - 1
        months = [
            date(index // 12, index % 12 + 1, 1)
            for index in range(month_index - 5, month_index + 1)
        ]

        monthly_rows = (
            qs.filter(date__gte=months[0], date__lte=today)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Count('id', distinct=True))
        )

        monthly = {
            row['month']: row['total']
            for row in monthly_rows
        }

        incident_types = list(
            qs.values('incident_type')
            .annotate(total=Count('id', distinct=True))
            .order_by('-total', 'incident_type')
        )

        available = Vehicle.objects.filter(status='AVAILABLE')

        recent = self.get_queryset().order_by(
            '-created_at',
            '-id',
        )[:5]

        return Response({
            'counts': counts,
            'today': today,
            'today_missions': qs.filter(date=today).count(),
            'available_vehicles': available.count(),
            'available_ambulances': available.filter(
                Q(type__iexact='Ambulance')
                | Q(type='إسعاف')
                | Q(type='سيارة إسعاف')
            ).count(),
            'monthly': [
                {
                    'month': month,
                    'total': monthly.get(month, 0),
                }
                for month in months
            ],
            'incident_types': incident_types,
            'recent': MissionOutput(recent, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def activity(self, request):
        # Count actual participation, not creators or planned assignments.
        qs = MissionCrew.objects.filter(
            actual=True,
            mission__status='COMPLETED',
            mission__in=visible_missions(request.user),
        )

        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)

        rows = (
            qs.values(
                'user_id',
                'user__username',
                'user__first_name',
                'user__last_name',
            )
            .annotate(total=Count('mission', distinct=True))
            .order_by('user__username')
        )

        return Response(list(rows))

    @action(detail=False, methods=['get'], url_path='activity-history')
    def activity_history(self, request):
        # Include actual participation in completed missions only.
        qs = (
            MissionCrew.objects.filter(
                actual=True,
                mission__status='COMPLETED',
                mission__in=visible_missions(request.user),
            )
            .select_related('user', 'mission')
        )

        # Paramedics can only see their own participation.
        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)

        # Keep historical participants selectable after deactivation.
        staff_options = list(
            qs.order_by('user__username')
            .values(
                'user_id',
                'user__username',
                'user__first_name',
                'user__last_name',
            )
            .distinct()
        )

        # This filter cannot expand the access scope above.
        staff_id = request.query_params.get('user_id')
        if staff_id:
            staff_id = serializers.IntegerField(
                min_value=1
            ).run_validation(staff_id)

            qs = qs.filter(user_id=staff_id)

        date_from = None
        date_to = None

        if request.query_params.get('date_from'):
            date_from = serializers.DateField().run_validation(
                request.query_params['date_from']
            )

        if request.query_params.get('date_to'):
            date_to = serializers.DateField().run_validation(
                request.query_params['date_to']
            )

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_to': 'End date must be on or after start date.'
            })

        if date_from:
            qs = qs.filter(mission__date__gte=date_from)

        if date_to:
            qs = qs.filter(mission__date__lte=date_to)

        # Stable ordering and 20 participation records per page.
        qs = qs.order_by(
            '-mission__date',
            '-mission_id',
            'user_id',
            'id',
        )

        page = serializers.IntegerField(
            min_value=1
        ).run_validation(request.query_params.get('page', 1))

        count = qs.count()

        completed_missions = (
            qs.order_by()
            .values('mission_id')
            .distinct()
            .count()
        )

        monthly = list(
            qs.order_by()
            .exclude(mission__date=None)
            .annotate(month=TruncMonth('mission__date'))
            .values('month')
            .annotate(total=Count('mission_id', distinct=True))
            .order_by('month')
        )

        incident_types = list(
            qs.order_by()
            .values('mission__incident_type')
            .annotate(total=Count('mission_id', distinct=True))
            .order_by('-total', 'mission__incident_type')
        )

        undated_missions = (
            qs.filter(mission__date=None)
            .order_by()
            .values('mission_id')
            .distinct()
            .count()
        )

        start = (page - 1) * 20

        results = [
            {
                'id': participation.pk,
                'user_id': participation.user_id,
                'staff_name': (
                    participation.user.get_full_name()
                    or participation.user.username
                ),
                'crew_role': participation.crew_role,
                'mission_id': participation.mission_id,
                'mission_number': participation.mission.mission_number,
                'date': participation.mission.date,
                'incident_type': participation.mission.incident_type,
                'location': participation.mission.location,
                'status': participation.mission.status,
            }
            for participation in qs[start:start + 20]
        ]

        return Response({
            'count': count,
            'completed_missions': completed_missions,
            'monthly': monthly,
            'undated_missions': undated_missions,
            'incident_types': [
                {
                    'incident_type': row['mission__incident_type'],
                    'total': row['total'],
                }
                for row in incident_types
            ],
            'staff_options': [
                {
                    'id': row['user_id'],
                    'name': (
                        f"{row['user__first_name']} "
                        f"{row['user__last_name']}"
                    ).strip() or row['user__username'],
                }
                for row in staff_options
            ],
            'results': results,
        })

    @action(detail=False, methods=['get'], url_path='activity-export')
    def activity_export(self, request):
        qs = (
            MissionCrew.objects.filter(
                actual=True,
                mission__status='COMPLETED',
                mission__in=visible_missions(request.user),
            )
            .select_related('user', 'mission')
        )

        # Paramedics can only export their own activity.
        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)

        staff_id = request.query_params.get('user_id')

        if staff_id:
            staff_id = serializers.IntegerField(
                min_value=1
            ).run_validation(staff_id)

            qs = qs.filter(user_id=staff_id)

        date_from = None
        date_to = None

        if request.query_params.get('date_from'):
            date_from = serializers.DateField().run_validation(
                request.query_params['date_from']
            )

        if request.query_params.get('date_to'):
            date_to = serializers.DateField().run_validation(
                request.query_params['date_to']
            )

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_to': 'End date must be on or after start date.'
            })

        if date_from:
            qs = qs.filter(
                mission__date__gte=date_from
            )

        if date_to:
            qs = qs.filter(
                mission__date__lte=date_to
            )

        qs = qs.order_by(
            '-mission__date',
            '-mission_id',
            'user_id',
            'id',
        )

        output = StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'Staff Member',
            'Crew Role',
            'Mission Number',
            'Mission Date',
            'Incident Type',
            'Location',
            'Status',
        ])

        for participation in qs:
            staff_name = (
                participation.user.get_full_name()
                or participation.user.username
            )

            writer.writerow([
                csv_safe(staff_name),
                csv_safe(participation.crew_role),
                csv_safe(participation.mission.mission_number),
                csv_safe(participation.mission.date),
                csv_safe(participation.mission.incident_type),
                csv_safe(participation.mission.location),
                csv_safe(participation.mission.status),
            ])

        return Response({
            'filename': 'paramedic-activity-report.csv',
            'content': output.getvalue(),
        })

    @action(detail=False, methods=['get'], url_path='activity-print')
    def activity_print(self, request):
        qs = (
            MissionCrew.objects.filter(
                actual=True,
                mission__status='COMPLETED',
                mission__in=visible_missions(request.user),
            )
            .select_related('user', 'mission')
        )

        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)

        staff_id = request.query_params.get('user_id')

        if staff_id:
            staff_id = serializers.IntegerField(
                min_value=1
            ).run_validation(staff_id)

            qs = qs.filter(user_id=staff_id)

        date_from = None
        date_to = None

        if request.query_params.get('date_from'):
            date_from = serializers.DateField().run_validation(
                request.query_params['date_from']
            )

        if request.query_params.get('date_to'):
            date_to = serializers.DateField().run_validation(
                request.query_params['date_to']
            )

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_to': 'End date must be on or after start date.'
            })

        if date_from:
            qs = qs.filter(
                mission__date__gte=date_from
            )

        if date_to:
            qs = qs.filter(
                mission__date__lte=date_to
            )

        qs = qs.order_by(
            '-mission__date',
            '-mission_id',
            'user_id',
            'id',
        )

        count = qs.count()

        completed_missions = (
            qs.order_by()
            .values('mission_id')
            .distinct()
            .count()
        )

        monthly = list(
            qs.order_by()
            .exclude(mission__date=None)
            .annotate(
                month=TruncMonth('mission__date')
            )
            .values('month')
            .annotate(
                total=Count(
                    'mission_id',
                    distinct=True,
                )
            )
            .order_by('month')
        )

        incident_types = list(
            qs.order_by()
            .values(
                'mission__incident_type'
            )
            .annotate(
                total=Count(
                    'mission_id',
                    distinct=True,
                )
            )
            .order_by(
                '-total',
                'mission__incident_type',
            )
        )

        results = []

        for participation in qs:
            results.append({
                'id': participation.pk,
                'user_id': participation.user_id,
                'staff_name': (
                    participation.user.get_full_name()
                    or participation.user.username
                ),
                'crew_role': participation.crew_role,
                'mission_id': participation.mission_id,
                'mission_number': (
                    participation.mission.mission_number
                ),
                'date': participation.mission.date,
                'incident_type': (
                    participation.mission.incident_type
                ),
                'location': (
                    participation.mission.location
                ),
                'status': (
                    participation.mission.status
                ),
            })

        return Response({
            'count': count,
            'completed_missions': completed_missions,
            'monthly': monthly,
            'incident_types': [
                {
                    'incident_type': row[
                        'mission__incident_type'
                    ],
                    'total': row['total'],
                }
                for row in incident_types
            ],
            'results': results,
        })

    @action(detail=False, methods=['get'])
    def crew_options(self, request):
        users = User.objects.filter(
            is_active=True,
            role__code='PARAMEDIC',
        ).order_by('username')

        return Response([
            {
                'id': user.pk,
                'name': user.get_full_name() or user.username,
            }
            for user in users
        ])