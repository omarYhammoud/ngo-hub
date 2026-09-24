from datetime import date
from unittest.mock import patch

from rest_framework.test import APITestCase
from apps.accounts.models import User
from apps.vehicles.models import Vehicle
from .models import Mission, MissionCrew


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('dashboard_admin', role='SUPER_ADMIN')
        self.medic = User.objects.create_user('dashboard_medic')
        self.other = User.objects.create_user('dashboard_other')
        self.mission = Mission.objects.create(
            created_by=self.admin, date=date(2026, 1, 15),
            status='COMPLETED', incident_type='Trauma',
        )
        # A planned and actual assignment must not double-count this mission.
        MissionCrew.objects.create(mission=self.mission, user=self.medic, actual=False)
        MissionCrew.objects.create(mission=self.mission, user=self.medic, actual=True)
        Mission.objects.create(created_by=self.other, date=date(2026, 1, 15), incident_type='Other')
        Mission.objects.create(created_by=self.admin, date=date(2025, 12, 1), incident_type='Other')
        Mission.objects.create(created_by=self.admin, date=None, incident_type='')
        Vehicle.objects.create(code='A', plate_number='A', type='Ambulance')
        Vehicle.objects.create(code='B', plate_number='B', type='Van')
        Vehicle.objects.create(code='C', plate_number='C', type='Ambulance', status='MAINTENANCE')

    @patch('apps.missions.views.timezone.localdate', return_value=date(2026, 1, 15))
    def test_paramedic_statistics_are_scoped_and_not_duplicated(self, _today):
        self.client.force_authenticate(self.medic)
        response = self.client.get('/api/missions/summary/')
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data['today_missions'], 1)
        self.assertEqual(data['counts'], {'COMPLETED': 1})
        self.assertEqual(data['incident_types'], [{'incident_type': 'Trauma', 'total': 1}])
        self.assertEqual([row['total'] for row in data['monthly']], [0, 0, 0, 0, 0, 1])
        self.assertEqual([row['id'] for row in data['recent']], [self.mission.pk])

    @patch('apps.missions.views.timezone.localdate', return_value=date(2026, 1, 15))
    def test_management_sees_all_and_calendar_rollover_is_correct(self, _today):
        self.client.force_authenticate(self.admin)
        data = self.client.get('/api/missions/summary/').data
        self.assertEqual(data['today_missions'], 2)
        self.assertEqual(data['monthly'][0]['month'], date(2025, 8, 1))
        self.assertEqual([row['total'] for row in data['monthly']], [0, 0, 0, 0, 1, 2])
        self.assertEqual(sum(row['total'] for row in data['incident_types']), 4)
        self.assertEqual(data['available_vehicles'], 2)
        self.assertEqual(data['available_ambulances'], 1)

    def test_non_mission_role_cannot_read_summary(self):
        officer = User.objects.create_user('dashboard_lending', role='LENDING_OFFICER')
        self.client.force_authenticate(officer)
        self.assertEqual(self.client.get('/api/missions/summary/').status_code, 403)
