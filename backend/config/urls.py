from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.accounts.staff import StaffViewSet
from apps.missions.views import MissionViewSet
from apps.vehicles.views import VehicleViewSet

router = DefaultRouter()
router.register('staff', StaffViewSet, basename='staff')
router.register('missions', MissionViewSet, basename='missions')
router.register('vehicles', VehicleViewSet, basename='vehicles')
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.core.urls")),
    path("api/", include(router.urls)),
]
