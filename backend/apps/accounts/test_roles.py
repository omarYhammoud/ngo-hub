from django.contrib import admin
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.models import User, Role
from apps.accounts.permissions import (
    CanManageStaff, CanManageMissions, CanViewTeamActivity,
    CanManageLending, CanManageVehicles, capabilities_for,
)
from apps.accounts.views import MeView
from apps.missions.models import Mission


class RoleAccessTests(TestCase):
    def setUp(self):
        self.users = {code: User.objects.create_user(code.lower(), role=code) for code in Role.Code.values}
        self.factory = APIRequestFactory()

    def test_api_permission_matrix(self):
        matrix = {
            CanManageStaff: {'SUPER_ADMIN'},
            CanManageMissions: {'SUPER_ADMIN', 'OPERATIONS_MANAGER', 'PARAMEDIC'},
            CanViewTeamActivity: {'SUPER_ADMIN', 'OPERATIONS_MANAGER'},
            CanManageLending: {'SUPER_ADMIN', 'LENDING_OFFICER'},
            CanManageVehicles: {'SUPER_ADMIN', 'VEHICLE_MANAGER'},
        }
        for permission, allowed in matrix.items():
            class ProtectedView(APIView):
                permission_classes = [permission]
                def get(self, request):
                    return Response({'ok': True})
            for code, user in self.users.items():
                with self.subTest(permission=permission.__name__, role=code):
                    request = self.factory.get('/')
                    force_authenticate(request, user=user)
                    self.assertEqual(ProtectedView.as_view()(request).status_code, 200 if code in allowed else 403)
            self.assertIn(ProtectedView.as_view()(self.factory.get('/')).status_code, [401, 403])

    def test_inactive_users_have_no_capabilities(self):
        self.assertEqual(capabilities_for(AnonymousUser()), frozenset())
        for user in self.users.values():
            user.is_active = False
            self.assertEqual(capabilities_for(user), frozenset())

    def test_profile_exposes_five_role_codes_and_scoped_capabilities(self):
        for code, user in self.users.items():
            request = self.factory.get('/api/auth/me/')
            force_authenticate(request, user=user)
            response = MeView.as_view()(request)
            self.assertEqual(response.data['role'], code)
            self.assertEqual(response.data['capabilities'], sorted(capabilities_for(user)))
            self.assertNotIn('password', response.data)

    def test_admin_staff_management_cannot_be_granted_to_operations_manager(self):
        account_admin = admin.site._registry[User]
        for code, user in self.users.items():
            user.is_staff = True
            request = self.factory.get('/admin/accounts/user/')
            request.user = user
            self.assertEqual(account_admin.has_change_permission(request), code == 'SUPER_ADMIN')
            self.assertEqual(account_admin.has_add_permission(request), code == 'SUPER_ADMIN')

    def test_mission_admin_is_read_only_and_does_not_bypass_workflow(self):
        mission_admin = admin.site._registry[Mission]
        for code, user in self.users.items():
            request = self.factory.get('/')
            request.user = user
            self.assertEqual(mission_admin.has_view_permission(request), code in {'SUPER_ADMIN', 'OPERATIONS_MANAGER', 'PARAMEDIC'})
            self.assertFalse(mission_admin.has_change_permission(request))
            self.assertFalse(mission_admin.has_add_permission(request))
            self.assertFalse(mission_admin.has_delete_permission(request))

    def test_referenced_role_cannot_be_deleted(self):
        from django.db.models.deletion import ProtectedError
        with self.assertRaises(ProtectedError):
            self.users['PARAMEDIC'].role.delete()
