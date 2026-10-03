from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.accounts.permissions import CanManageLending
from .models import Equipment, Loan
from .serializers import EquipmentSerializer, LoanSerializer, ReturnSerializer


class EquipmentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [CanManageLending]
    serializer_class = EquipmentSerializer
    queryset = Equipment.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        for key in ['status', 'type']:
            if value := self.request.query_params.get(key):
                qs = qs.filter(**{key: value})
        if search := self.request.query_params.get('search'):
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search) | Q(serial_number__icontains=search))
        return qs

    @transaction.atomic
    def partial_update(self, request, pk=None):
        item = get_object_or_404(Equipment.objects.select_for_update(), pk=pk)
        if item.loans.filter(returned_at__isnull=True).exists():
            raise ValidationError({'detail': 'equipment_on_loan_locked'})
        serializer = self.get_serializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def types(self, request):
        return Response(Equipment.TYPE_CODES)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        loans = Loan.objects.filter(returned_at__isnull=True)
        return Response({
            'total': Equipment.objects.count(),
            'available': Equipment.objects.filter(status=Equipment.Status.AVAILABLE).count(),
            'on_loan': loans.count(),
            'overdue': loans.filter(due_date__lt=timezone.localdate()).count(),
        })


class LoanViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [CanManageLending]
    serializer_class = LoanSerializer
    queryset = Loan.objects.select_related('equipment', 'checked_out_by', 'returned_by')

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status == 'ACTIVE':
            qs = qs.filter(returned_at__isnull=True)
        elif status == 'RETURNED':
            qs = qs.filter(returned_at__isnull=False)
        elif status == 'OVERDUE':
            qs = qs.filter(returned_at__isnull=True, due_date__lt=timezone.localdate())
        elif status:
            raise ValidationError({'status': 'invalid_status'})
        if search := self.request.query_params.get('search'):
            qs = qs.filter(Q(borrower_name__icontains=search) | Q(borrower_phone__icontains=search) | Q(equipment__code__icontains=search))
        return qs

    @transaction.atomic
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # All mutations lock the equipment first, including returns and edits.
        item = get_object_or_404(Equipment.objects.select_for_update(), pk=serializer.validated_data['equipment'].pk)
        if item.status != Equipment.Status.AVAILABLE or item.loans.filter(returned_at__isnull=True).exists():
            raise ValidationError({'detail': 'equipment_unavailable'})
        serializer.save(equipment=item, checked_out_by=request.user)
        item.status = Equipment.Status.ON_LOAN
        item.save(update_fields=['status'])
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['post'], url_path='return')
    @transaction.atomic
    def return_equipment(self, request, pk=None):
        loan = get_object_or_404(Loan, pk=pk)
        item = Equipment.objects.select_for_update().get(pk=loan.equipment_id)
        loan = Loan.objects.select_for_update().get(pk=pk)
        if loan.returned_at is not None:
            raise ValidationError({'detail': 'loan_already_returned'})
        serializer = ReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan.returned_at = timezone.now()
        loan.returned_by = request.user
        loan.return_status = serializer.validated_data['status']
        loan.return_notes = serializer.validated_data['return_notes']
        loan.save(update_fields=['returned_at', 'returned_by', 'return_status', 'return_notes'])
        item.status = loan.return_status
        item.save(update_fields=['status'])
        return Response(self.get_serializer(loan).data)
