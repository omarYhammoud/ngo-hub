from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CanManageVehicles
from .models import VehicleIssue
from .serializers import IssueCreateInput, IssueNotesInput, IssueTransitionInput, IssueFilters, IssueOutput, IssueDetail
from .services import save_issue


class VehicleIssueViewSet(viewsets.GenericViewSet):
    permission_classes = [CanManageVehicles]
    serializer_class = IssueOutput
    queryset = VehicleIssue.objects.select_related('vehicle', 'reported_by', 'resolved_by')

    def filtered(self):
        filters = IssueFilters(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        values = dict(filters.validated_data)
        page = values.pop('page')
        if 'category' in values:
            values['category__icontains'] = values.pop('category')
        return self.get_queryset().filter(**values), page

    def list(self, request):
        qs, page = self.filtered()
        return Response({'count': qs.count(), 'results': IssueOutput(qs[(page-1)*20:page*20], many=True).data})

    def retrieve(self, request, pk=None):
        return Response(IssueDetail(self.get_object()).data)

    def create(self, request):
        data = IssueCreateInput(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(IssueDetail(save_issue(request.user, data.validated_data)).data, status=201)

    def mutate(self, request, pk, command, input_class):
        issue = self.get_object()
        data = input_class(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(IssueDetail(save_issue(request.user, data.validated_data, issue.pk, command)).data)

    def partial_update(self, request, pk=None):
        return self.mutate(request, pk, 'notes', IssueNotesInput)

    @action(detail=True, methods=['post'])
    def maintenance(self, request, pk=None):
        return self.mutate(request, pk, 'maintenance', IssueTransitionInput)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        return self.mutate(request, pk, 'resolve', IssueTransitionInput)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs, _ = self.filtered()
        counts = {row['status']: row['total'] for row in qs.values('status').annotate(total=Count('pk'))}
        return Response({'counts': {status: counts.get(status, 0) for status in VehicleIssue.Status.values}, 'unresolved': counts.get('OPEN', 0) + counts.get('IN_MAINTENANCE', 0)})
