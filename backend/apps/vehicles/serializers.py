from rest_framework import serializers
from .models import Vehicle, VehicleIssue, VehicleIssueAudit


class StrictInput(serializers.Serializer):
    def to_internal_value(self, data):
        if set(data) - set(self.fields):
            raise serializers.ValidationError({'detail': 'issue_unknown_fields'})
        return super().to_internal_value(data)


class IssueCreateInput(StrictInput):
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    category = serializers.CharField(max_length=100)
    severity = serializers.ChoiceField(choices=VehicleIssue.Severity.choices)
    description = serializers.CharField(max_length=10000)


class IssueNotesInput(StrictInput):
    maintenance_notes = serializers.CharField(max_length=10000, allow_blank=True)


class IssueTransitionInput(StrictInput):
    maintenance_notes = serializers.CharField(max_length=10000, allow_blank=True, required=False)


class IssueFilters(serializers.Serializer):
    vehicle = serializers.IntegerField(min_value=1, required=False)
    status = serializers.ChoiceField(choices=VehicleIssue.Status.choices, required=False)
    severity = serializers.ChoiceField(choices=VehicleIssue.Severity.choices, required=False)
    category = serializers.CharField(max_length=100, required=False)
    page = serializers.IntegerField(min_value=1, default=1)


class IssueAuditOutput(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username')

    class Meta:
        model = VehicleIssueAudit
        fields = ['id', 'actor', 'actor_name', 'action', 'created_at', 'before', 'after']


class IssueOutput(serializers.ModelSerializer):
    vehicle_code = serializers.CharField(source='vehicle.code')
    vehicle_status = serializers.CharField(source='vehicle.status')
    manual_maintenance = serializers.BooleanField(source='vehicle.manual_maintenance')
    reported_by_name = serializers.CharField(source='reported_by.username')
    resolved_by_name = serializers.CharField(source='resolved_by.username', default=None)

    class Meta:
        model = VehicleIssue
        fields = ['id', 'vehicle', 'vehicle_code', 'vehicle_status', 'manual_maintenance', 'category', 'severity', 'description', 'reported_by', 'reported_by_name', 'reported_at', 'status', 'maintenance_notes', 'resolved_by', 'resolved_by_name', 'resolved_at']


class IssueDetail(IssueOutput):
    audit = IssueAuditOutput(many=True, read_only=True)

    class Meta(IssueOutput.Meta):
        fields = IssueOutput.Meta.fields + ['audit']
