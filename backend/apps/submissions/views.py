from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole

from .models import (
    ContactSubmission,
    SubmissionStatus,
    VolunteerApplication,
)

from .serializers import (
    ContactSubmissionCreateSerializer,
    ContactSubmissionSerializer,
    VolunteerApplicationCreateSerializer,
    VolunteerApplicationSerializer,
)


ALLOWED_STATUSES = {
    SubmissionStatus.NEW,
    SubmissionStatus.REVIEWED,
    SubmissionStatus.CLOSED,
}


def update_submission_status(
    submission,
    new_status,
    user,
):
    """
    Apply the review workflow consistently.

    NEW:
        Clears review metadata.

    REVIEWED:
        Records reviewer/time if not already reviewed.

    CLOSED:
        Preserves the original reviewer/time when the
        submission was already reviewed. If it is closed
        directly from NEW, the current user becomes the
        reviewer.
    """

    submission.status = new_status

    if new_status == SubmissionStatus.NEW:
        submission.reviewed_by = None
        submission.reviewed_at = None

    elif submission.reviewed_by_id is None:
        submission.reviewed_by = user
        submission.reviewed_at = timezone.now()

    submission.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "updated_at",
        ]
    )

    return submission


class ContactSubmissionCreateView(
    generics.CreateAPIView
):
    queryset = ContactSubmission.objects.all()

    serializer_class = (
        ContactSubmissionCreateSerializer
    )

    permission_classes = [
        AllowAny
    ]


class VolunteerApplicationCreateView(
    generics.CreateAPIView
):
    queryset = VolunteerApplication.objects.all()

    serializer_class = (
        VolunteerApplicationCreateSerializer
    )

    permission_classes = [
        AllowAny
    ]


class ContactSubmissionListView(
    generics.ListAPIView
):
    serializer_class = (
        ContactSubmissionSerializer
    )

    permission_classes = [
        IsAdminRole
    ]

    def get_queryset(self):
        queryset = (
            ContactSubmission.objects
            .select_related(
                "reviewed_by"
            )
            .all()
        )

        status_value = (
            self.request.query_params
            .get("status")
        )

        if status_value:
            if status_value not in ALLOWED_STATUSES:
                return queryset.none()

            queryset = queryset.filter(
                status=status_value
            )

        return queryset


class ContactSubmissionDetailView(
    generics.RetrieveAPIView
):
    queryset = (
        ContactSubmission.objects
        .select_related(
            "reviewed_by"
        )
        .all()
    )

    serializer_class = (
        ContactSubmissionSerializer
    )

    permission_classes = [
        IsAdminRole
    ]


class ContactSubmissionStatusView(
    APIView
):
    permission_classes = [
        IsAdminRole
    ]

    def patch(
        self,
        request,
        pk,
    ):
        submission = get_object_or_404(
            ContactSubmission.objects
            .select_related(
                "reviewed_by"
            ),
            pk=pk,
        )

        new_status = request.data.get(
            "status"
        )

        if new_status not in ALLOWED_STATUSES:
            return Response(
                {
                    "status": [
                        (
                            "Status must be NEW, "
                            "REVIEWED, or CLOSED."
                        )
                    ]
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        update_submission_status(
            submission,
            new_status,
            request.user,
        )

        submission = (
            ContactSubmission.objects
            .select_related(
                "reviewed_by"
            )
            .get(
                pk=submission.pk
            )
        )

        return Response(
            ContactSubmissionSerializer(
                submission
            ).data
        )


class VolunteerApplicationListView(
    generics.ListAPIView
):
    serializer_class = (
        VolunteerApplicationSerializer
    )

    permission_classes = [
        IsAdminRole
    ]

    def get_queryset(self):
        queryset = (
            VolunteerApplication.objects
            .select_related(
                "reviewed_by"
            )
            .all()
        )

        status_value = (
            self.request.query_params
            .get("status")
        )

        if status_value:
            if status_value not in ALLOWED_STATUSES:
                return queryset.none()

            queryset = queryset.filter(
                status=status_value
            )

        return queryset


class VolunteerApplicationDetailView(
    generics.RetrieveAPIView
):
    queryset = (
        VolunteerApplication.objects
        .select_related(
            "reviewed_by"
        )
        .all()
    )

    serializer_class = (
        VolunteerApplicationSerializer
    )

    permission_classes = [
        IsAdminRole
    ]


class VolunteerApplicationStatusView(
    APIView
):
    permission_classes = [
        IsAdminRole
    ]

    def patch(
        self,
        request,
        pk,
    ):
        application = get_object_or_404(
            VolunteerApplication.objects
            .select_related(
                "reviewed_by"
            ),
            pk=pk,
        )

        new_status = request.data.get(
            "status"
        )

        if new_status not in ALLOWED_STATUSES:
            return Response(
                {
                    "status": [
                        (
                            "Status must be NEW, "
                            "REVIEWED, or CLOSED."
                        )
                    ]
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        update_submission_status(
            application,
            new_status,
            request.user,
        )

        application = (
            VolunteerApplication.objects
            .select_related(
                "reviewed_by"
            )
            .get(
                pk=application.pk
            )
        )

        return Response(
            VolunteerApplicationSerializer(
                application
            ).data
        )