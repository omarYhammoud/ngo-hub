from django.db import IntegrityError
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import date
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CanManageMissions
from apps.accounts.models import User
from apps.vehicles.models import Vehicle
from .models import MissionCrew
from .serializers import MissionInput, MissionOutput, MissionDetail
from .services import save_mission, visible_missions


class MissionViewSet(viewsets.GenericViewSet):
    permission_classes = [CanManageMissions]
    serializer_class = MissionOutput

    def get_queryset(self):
        return visible_missions(self.request.user).select_related('vehicle', 'created_by').prefetch_related('crew__user', 'audit__actor')

    def list(self, request):
        qs = self.get_queryset()
        query = request.query_params.get('search', '').strip()
        if query:
            qs = qs.filter(Q(mission_number__icontains=query) | Q(title__icontains=query) | Q(location__icontains=query) | Q(destination__icontains=query))
        filters = {'status': 'status', 'incident_type': 'incident_type__icontains', 'vehicle': 'vehicle_id', 'crew': 'crew__user_id', 'date_from': 'date__gte', 'date_to': 'date__lte'}
        for param, field in filters.items():
            value = request.query_params.get(param)
            if value:
                if param in {'vehicle', 'crew'}:
                    value = serializers.IntegerField(min_value=1).run_validation(value)
                if param.startswith('date_'):
                    value = serializers.DateField().run_validation(value)
                qs = qs.filter(**{field: value})
        qs = qs.distinct()
        page = serializers.IntegerField(min_value=1).run_validation(request.query_params.get('page', 1))
        return Response({'count': qs.count(), 'results': MissionOutput(qs[(page-1)*20:page*20], many=True).data})

    def retrieve(self, request, pk=None):
        return Response(MissionDetail(self.get_object()).data)

    def mutate(self, request, pk=None, command='save'):
        if pk is not None:
            self.get_object()  # Out-of-scope identifiers return 404, including action URLs.
        data = MissionInput(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            mission = save_mission(request.user, data.validated_data, int(pk) if pk else None, command)
        except IntegrityError:
            return Response({'detail': 'concurrent_conflict'}, status=409)
        return Response(MissionDetail(mission).data, status=200 if pk else 201)

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
        counts = {row['status']: row['total'] for row in qs.values('status').annotate(total=Count('id', distinct=True))}
        today = timezone.localdate()
        # Six calendar months, including the current month, in the app timezone.
        month_index = today.year * 12 + today.month - 1
        months = [date(index // 12, index % 12 + 1, 1)
                  for index in range(month_index - 5, month_index + 1)]
        monthly_rows = qs.filter(date__gte=months[0], date__lte=today).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(total=Count('id', distinct=True))
        monthly = {row['month']: row['total'] for row in monthly_rows}
        types = list(qs.values('incident_type').annotate(
            total=Count('id', distinct=True)
        ).order_by('-total', 'incident_type'))
        available = Vehicle.objects.filter(status='AVAILABLE')
        return Response({
            'counts': counts,
            'today': today,
            'today_missions': qs.filter(date=today).count(),
            'available_vehicles': available.count(),
            'available_ambulances': available.filter(
                Q(type__iexact='Ambulance') | Q(type='إسعاف') | Q(type='سيارة إسعاف')
            ).count(),
            'monthly': [{'month': month, 'total': monthly.get(month, 0)} for month in months],
            'incident_types': types,
            'recent': MissionOutput(self.get_queryset().order_by('-created_at', '-id')[:5], many=True).data,
        })

    @action(detail=False, methods=['get'])
    def activity(self, request):
        # Count actual participation, never a creator or a planned assignment.
        qs = MissionCrew.objects.filter(actual=True, mission__status='COMPLETED', mission__in=visible_missions(request.user))
        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)
        return Response(list(qs.values('user_id', 'user__username', 'user__first_name', 'user__last_name').annotate(total=Count('mission', distinct=True)).order_by('user__username')))


    @action(detail=False, methods=['get'], url_path='activity-history')
    def activity_history(self, request):
        # Include actual participation in completed missions only.
        qs = MissionCrew.objects.filter(
            actual=True,
            mission__status='COMPLETED',
            mission__in=visible_missions(request.user),
        ).select_related('user', 'mission')

        # Paramedics can only see their own participation.
        if request.user.role.code == 'PARAMEDIC':
            qs = qs.filter(user=request.user)

        # Optional staff filter. This cannot expand the access above.
        staff_id = request.query_params.get('user_id')
        if staff_id:
            staff_id = serializers.IntegerField(
                min_value=1
            ).run_validation(staff_id)
            qs = qs.filter(user_id=staff_id)

        # Validate optional mission-date filters.
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
        qs = qs.order_by('-mission__date', '-mission_id', 'user_id', 'id')

        page = serializers.IntegerField(
            min_value=1
        ).run_validation(request.query_params.get('page', 1))

        count = qs.count()
        completed_missions = qs.values('mission_id').distinct().count()
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
            'results': results,
        })


    @action(detail=False, methods=['get'])
    def crew_options(self, request):
        users = User.objects.filter(is_active=True, role__code='PARAMEDIC').order_by('username')
        return Response([{'id': user.pk, 'name': user.get_full_name() or user.username} for user in users])
