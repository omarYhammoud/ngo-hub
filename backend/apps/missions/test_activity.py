from datetime import date

from rest_framework.test import APITestCase
from apps.accounts.models import User
from .models import Mission, MissionCrew


class StaffActivityTests(APITestCase):
    url = '/api/missions/activity-history/'

    def setUp(self):
        self.manager = User.objects.create_user('activity_manager', role='OPERATIONS_MANAGER')
        self.medic = User.objects.create_user('activity_medic')
        self.other = User.objects.create_user('activity_other', is_active=False)
        self.shared = self.mission(date(2026, 1, 1), 'Trauma', [self.medic, self.other])
        self.mission(date(2025, 12, 31), 'Cardiac', [self.other])
        self.mission(None, '', [self.other])
        self.mission(date(2026, 1, 2), 'Other', [self.medic], status='PENDING')
        planned = self.mission(date(2026, 1, 3), 'Other', [])
        MissionCrew.objects.create(mission=planned, user=self.medic, actual=False)
        MissionCrew.objects.create(mission=self.shared, user=self.medic, actual=False)
        self.client.force_authenticate(self.manager)

    def mission(self, day, incident, crew, status='COMPLETED'):
        mission = Mission.objects.create(created_by=self.medic, date=day, incident_type=incident, status=status)
        for user in crew:
            MissionCrew.objects.create(mission=mission, user=user, actual=True, crew_role='مسعف')
        return mission

    def test_management_counts_unique_missions_and_historical_staff(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data['count'], 4)
        self.assertEqual(data['completed_missions'], 3)
        self.assertEqual(data['undated_missions'], 1)
        self.assertEqual([row['total'] for row in data['monthly']], [1, 1])
        self.assertEqual([row['month'] for row in data['monthly']], [date(2025, 12, 1), date(2026, 1, 1)])
        self.assertEqual(sum(row['total'] for row in data['incident_types']), 3)
        self.assertEqual({row['id'] for row in data['staff_options']}, {self.medic.pk, self.other.pk})

    def test_filters_apply_to_all_statistics_and_history(self):
        data = self.client.get(self.url, {'user_id': self.other.pk, 'date_from': '2026-01-01', 'date_to': '2026-01-01'}).data
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['completed_missions'], 1)
        self.assertEqual(data['undated_missions'], 0)
        self.assertEqual(data['monthly'], [{'month': date(2026, 1, 1), 'total': 1}])
        self.assertEqual(data['incident_types'], [{'incident_type': 'Trauma', 'total': 1}])
        self.assertEqual(data['results'][0]['mission_id'], self.shared.pk)
        self.assertEqual(data['results'][0]['user_id'], self.other.pk)
        self.assertEqual(len(data['staff_options']), 2)

    def test_paramedic_cannot_expand_scope_by_staff_filter(self):
        self.client.force_authenticate(self.medic)
        data = self.client.get(self.url).data
        self.assertEqual(data['count'], 1)
        self.assertEqual([row['id'] for row in data['staff_options']], [self.medic.pk])
        data = self.client.get(self.url, {'user_id': self.other.pk}).data
        self.assertEqual(data['count'], 0)
        self.assertEqual(data['completed_missions'], 0)
        self.assertEqual(data['monthly'], [])
        self.assertEqual(data['incident_types'], [])
        self.assertEqual(data['results'], [])

    def test_totals_are_not_limited_to_current_page(self):
        for _ in range(21):
            self.mission(date(2026, 2, 1), 'Fall', [self.medic])
        data = self.client.get(self.url, {'user_id': self.medic.pk, 'page': 2}).data
        self.assertEqual(data['count'], 22)
        self.assertEqual(data['completed_missions'], 22)
        self.assertEqual(len(data['results']), 2)
        self.assertEqual(sum(row['total'] for row in data['monthly']), 22)

    def test_invalid_filters_are_rejected(self):
        for params in [{'user_id': 'bad'}, {'page': 0}, {'date_from': 'bad'}, {'date_from': '2026-02-01', 'date_to': '2026-01-01'}]:
            with self.subTest(params=params):
                self.assertEqual(self.client.get(self.url, params).status_code, 400)

    def test_other_roles_and_anonymous_cannot_access(self):
        officer = User.objects.create_user('activity_vehicle', role='VEHICLE_MANAGER')
        self.client.force_authenticate(officer)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
