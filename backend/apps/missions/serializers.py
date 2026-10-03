from rest_framework import serializers
from .models import Mission, MissionCrew, MissionAudit


class CrewInput(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
    crew_role = serializers.CharField(max_length=80, allow_blank=True, default='')


class MissionInput(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    date = serializers.DateField(required=False)
    actual_start = serializers.DateTimeField(required=False, allow_null=True)
    actual_end = serializers.DateTimeField(required=False, allow_null=True)
    location = serializers.CharField(max_length=250, required=False, allow_blank=True)
    incident_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    destination = serializers.CharField(max_length=250, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=20000)
    vehicle_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    planned_crew = CrewInput(many=True, required=False)
    actual_crew = CrewInput(many=True, required=False)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True, max_length=4000)
    correction_reason = serializers.CharField(required=False, allow_blank=True, max_length=4000)

    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({'detail': 'unknown_fields'})
        return super().to_internal_value(data)


class CrewOutput(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    class Meta:
        model = MissionCrew
        fields = ['user_id', 'name', 'crew_role', 'actual']


class AuditOutput(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username')
    class Meta:
        model = MissionAudit
        fields = ['id', 'actor_name', 'action', 'reason', 'before', 'after', 'created_at']


class MissionOutput(serializers.ModelSerializer):
    crew = CrewOutput(many=True, read_only=True)
    vehicle_code = serializers.CharField(source='vehicle.code', default='')
    creator_name = serializers.CharField(source='created_by.username')
    class Meta:
        model = Mission
        fields = ['id', 'mission_number', 'title', 'date', 'actual_start', 'actual_end', 'location', 'incident_type', 'destination', 'notes', 'status', 'cancellation_reason', 'vehicle_id', 'vehicle_code', 'created_by_id', 'creator_name', 'created_at', 'updated_at', 'crew']


class MissionDetail(MissionOutput):
    audit = AuditOutput(many=True, read_only=True)
    class Meta(MissionOutput.Meta):
        fields = MissionOutput.Meta.fields + ['audit']
