from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import Role, User
from .models import ContactSubmission, VolunteerApplication


class SubmissionAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.records = {
            'contact': ContactSubmission.objects.create(name='Test Contact', email='test@example.com'),
            'volunteer': VolunteerApplication.objects.create(name='Test Volunteer', phone='12345678', role='DRIVER'),
        }

    def test_role_matrix_profile_lists_details_and_status(self):
        for code in Role.Code.values:
            user = User.objects.create_user(code.lower(), role=code)
            self.client.force_authenticate(user)
            allowed = code in {'SUPER_ADMIN', 'OPERATIONS_MANAGER'}
            profile = self.client.get('/api/auth/me/')
            self.assertEqual(profile.status_code, 200)
            self.assertEqual('view_team_activity' in profile.data['capabilities'], allowed)
            for kind, record in self.records.items():
                with self.subTest(role=code, kind=kind):
                    record.status = 'NEW'
                    record.reviewed_by = None
                    record.reviewed_at = None
                    record.save()
                    base = f'/api/submissions/staff/{kind}/'
                    for path in (base, base + '?status=NEW', f'{base}{record.pk}/'):
                        self.assertEqual(self.client.get(path).status_code, 200 if allowed else 403)
                    for state in ('REVIEWED', 'CLOSED', 'NEW'):
                        response = self.client.patch(f'{base}{record.pk}/status/', {'status': state}, format='json')
                        self.assertEqual(response.status_code, 200 if allowed else 403)
                        record.refresh_from_db()
                        self.assertEqual(record.status, state if allowed else 'NEW')
                        self.assertEqual(record.reviewed_by_id, user.pk if allowed and state != 'NEW' else None)
                        if allowed:
                            self.assertEqual(response.data['reviewed_by_name'], user.username if state != 'NEW' else None)
                            self.assertEqual(response.data['reviewed_at'] is not None, state != 'NEW')
                            filtered = self.client.get(base + '?status=REVIEWED')
                            self.assertEqual(len(filtered.data), int(state == 'REVIEWED'))

    def test_anonymous_and_inactive_management_cannot_read_or_update(self):
        inactive = User.objects.create_user('inactive', role='SUPER_ADMIN', is_active=False)
        for user in (None, inactive):
            self.client.force_authenticate(user)
            for kind, record in self.records.items():
                base = f'/api/submissions/staff/{kind}/'
                for path in (base, f'{base}{record.pk}/'):
                    self.assertIn(self.client.get(path).status_code, (401, 403))
                self.assertIn(self.client.patch(f'{base}{record.pk}/status/', {'status': 'REVIEWED'}, format='json').status_code, (401, 403))
                record.refresh_from_db()
                self.assertEqual(record.status, 'NEW')
