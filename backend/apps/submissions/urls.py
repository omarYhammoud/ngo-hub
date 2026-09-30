from django.urls import path

from .views import (
    ContactSubmissionCreateView,
    ContactSubmissionDetailView,
    ContactSubmissionListView,
    ContactSubmissionStatusView,
    VolunteerApplicationCreateView,
    VolunteerApplicationDetailView,
    VolunteerApplicationListView,
    VolunteerApplicationStatusView,
)


urlpatterns = [
    # Public
    path(
        "contact/",
        ContactSubmissionCreateView.as_view(),
        name="contact-submission-create",
    ),
    path(
        "volunteer/",
        VolunteerApplicationCreateView.as_view(),
        name="volunteer-application-create",
    ),

    # Staff review
    path(
        "staff/contact/",
        ContactSubmissionListView.as_view(),
        name="contact-submission-list",
    ),
    path(
        "staff/contact/<int:pk>/",
        ContactSubmissionDetailView.as_view(),
        name="contact-submission-detail",
    ),
    path(
        "staff/contact/<int:pk>/status/",
        ContactSubmissionStatusView.as_view(),
        name="contact-submission-status",
    ),

    path(
        "staff/volunteer/",
        VolunteerApplicationListView.as_view(),
        name="volunteer-application-list",
    ),
    path(
        "staff/volunteer/<int:pk>/",
        VolunteerApplicationDetailView.as_view(),
        name="volunteer-application-detail",
    ),
    path(
        "staff/volunteer/<int:pk>/status/",
        VolunteerApplicationStatusView.as_view(),
        name="volunteer-application-status",
    ),
]