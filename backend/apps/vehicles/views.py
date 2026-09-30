from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.accounts.permissions import capabilities_for
from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'code', 'plate_number', 'type', 'model', 'year', 'mileage', 'status']

    def validate_year(self, value):
        if value is not None and not 1900 <= value <= 2100:
            raise serializers.ValidationError('invalid_year')
        return value


class VehicleViewSet(viewsets.GenericViewSet):
    serializer_class = VehicleSerializer
    queryset = Vehicle.objects.all()

    def check_access(self, write=False):
        caps = capabilities_for(self.request.user)
        if 'manage_vehicles' not in caps and (write or 'manage_missions' not in caps):
            raise PermissionDenied()

    def list(self, request):
        self.check_access()
        return Response(VehicleSerializer(self.get_queryset(), many=True).data)

    @transaction.atomic
    def create(self, request):
        self.check_access(True)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('status') == 'ON_MISSION':
            raise ValidationError({'detail': 'vehicle_status_automatic'})
        serializer.save(manual_maintenance=serializer.validated_data.get('status') == 'MAINTENANCE')
        return Response(serializer.data, status=201)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        self.check_access(True)
        vehicle = self.get_queryset().select_for_update().get(pk=self.get_object().pk)
        serializer = self.get_serializer(vehicle, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        target = serializer.validated_data.get('status', vehicle.status)
        occupied = vehicle.missions.filter(status='ACTIVE').exists()
        if target != 'MAINTENANCE' and vehicle.issues.filter(status='IN_MAINTENANCE').exists():
            raise ValidationError({'detail': 'vehicle_issue_maintenance_hold'})
        if target == 'ON_MISSION' and target != vehicle.status:
            raise ValidationError({'detail': 'vehicle_status_automatic'})
        if target == 'AVAILABLE' and occupied:
            raise ValidationError({'detail': 'vehicle_has_active_mission'})
        manual_hold = vehicle.manual_maintenance
        if target == 'MAINTENANCE' and vehicle.status != 'MAINTENANCE':
            manual_hold = True
        elif target != 'MAINTENANCE':
            manual_hold = False
        serializer.save(manual_maintenance=manual_hold)
        return Response(serializer.data)


from rest_framework.response import Response
