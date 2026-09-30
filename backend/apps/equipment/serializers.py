from django.utils import timezone
from rest_framework import serializers
from .models import Equipment, Loan


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['id', 'code', 'type', 'name', 'serial_number', 'notes', 'status']

    def validate_status(self, value):
        if value == Equipment.Status.ON_LOAN:
            raise serializers.ValidationError('equipment_status_automatic')
        return value


class LoanSerializer(serializers.ModelSerializer):
    equipment_code = serializers.CharField(source='equipment.code', read_only=True)
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    checked_out_by_name = serializers.CharField(source='checked_out_by.username', read_only=True)
    returned_by_name = serializers.CharField(source='returned_by.username', read_only=True, default=None)

    class Meta:
        model = Loan
        fields = ['id', 'equipment', 'equipment_code', 'equipment_name', 'borrower_name', 'borrower_phone', 'borrower_address', 'notes', 'checked_out_at', 'due_date', 'checked_out_by', 'checked_out_by_name', 'returned_at', 'returned_by', 'returned_by_name', 'return_status', 'return_notes', 'is_overdue']
        read_only_fields = ['checked_out_at', 'checked_out_by', 'returned_at', 'returned_by', 'return_status', 'return_notes']

    def validate_due_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('due_date_in_past')
        return value


class ReturnSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['AVAILABLE', 'MAINTENANCE'])
    return_notes = serializers.CharField(required=False, allow_blank=True, default='')
