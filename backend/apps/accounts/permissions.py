from rest_framework.permissions import BasePermission
from .models import Role


# Future APIs must also apply record-level scope, e.g. own paramedic activity.
ROLE_CAPABILITIES = {
    Role.Code.SUPER_ADMIN: frozenset({'manage_staff', 'manage_missions', 'view_team_activity', 'view_own_activity', 'manage_lending', 'manage_vehicles'}),
    Role.Code.OPERATIONS_MANAGER: frozenset({'manage_missions', 'view_team_activity'}),
    Role.Code.PARAMEDIC: frozenset({'manage_missions', 'view_own_activity'}),
    Role.Code.LENDING_OFFICER: frozenset({'manage_lending'}),
    Role.Code.VEHICLE_MANAGER: frozenset({'manage_vehicles'}),
}


def capabilities_for(user):
    if not user or not user.is_authenticated or not user.is_active:
        return frozenset()
    return ROLE_CAPABILITIES.get(user.role.code, frozenset())


class HasCapability(BasePermission):
    capability = None

    def has_permission(self, request, view):
        return self.capability in capabilities_for(request.user)


class CanManageStaff(HasCapability):
    capability = 'manage_staff'


class CanManageMissions(HasCapability):
    capability = 'manage_missions'


class CanViewTeamActivity(HasCapability):
    capability = 'view_team_activity'


class CanManageLending(HasCapability):
    capability = 'manage_lending'


class CanManageVehicles(HasCapability):
    capability = 'manage_vehicles'


class IsAdminRole(BasePermission):
    """Operational oversight, not permission to administer accounts."""
    def has_permission(self, request, view):
        return 'view_team_activity' in capabilities_for(request.user)
