from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.staff import StaffViewSet
from apps.missions.views import MissionViewSet
from apps.vehicles.views import VehicleViewSet
from apps.vehicles.issues import VehicleIssueViewSet
from apps.equipment.views import EquipmentViewSet, LoanViewSet


router = DefaultRouter()

router.register(
    'equipment',
    EquipmentViewSet,
    basename='equipment',
)

router.register(
    'lending',
    LoanViewSet,
    basename='lending',
)

router.register(
    'staff',
    StaffViewSet,
    basename='staff',
)

router.register(
    'missions',
    MissionViewSet,
    basename='missions',
)

router.register(
    'vehicles',
    VehicleViewSet,
    basename='vehicles',
)

router.register(
    'vehicle-issues',
    VehicleIssueViewSet,
    basename='vehicle-issues',
)


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/auth/",
        include("apps.accounts.urls"),
    ),

    path(
        "api/",
        include("apps.core.urls"),
    ),

    path(
        "api/",
        include(router.urls),
    ),

    path(
        "api/submissions/",
        include("apps.submissions.urls"),
    ),

    path(
        "api/ai/",
        include("apps.ai_assistant.urls"),
    ),
]