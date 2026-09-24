from rest_framework.test import APITestCase
from .models import User


class StaffPasswordResetTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('reset_admin', role='SUPER_ADMIN')
        self.target = User.objects.create_user('reset_target', password='Old-Example-Strong-583!')
        self.url = f'/api/staff/{self.target.pk}/reset_password/'
        self.body = {'new_password': 'New-Example-Strong-937!', 'confirm_password': 'New-Example-Strong-937!'}

    def test_only_super_admin_can_reset_and_no_secrets_are_returned(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url, self.body, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data, {'detail': 'password_reset_success'})
        self.target.refresh_from_db()
        self.assertTrue(self.target.check_password(self.body['new_password']))
        self.assertFalse(self.target.check_password('Old-Example-Strong-583!'))
        listed = self.client.get('/api/staff/').data
        self.assertTrue(all('password' not in row and 'new_password' not in row for row in listed))
        self.assertNotIn(self.target.password, str(listed))
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/auth/login/', {'username': self.target.username, 'password': self.body['new_password']}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/login/', {'username': self.target.username, 'password': 'Old-Example-Strong-583!'}).status_code, 401)

    def test_all_other_roles_and_anonymous_are_denied_without_changing_password(self):
        original = self.target.password
        self.assertEqual(self.client.post(self.url, self.body, format='json').status_code, 401)
        for role in ['OPERATIONS_MANAGER', 'PARAMEDIC', 'VEHICLE_MANAGER', 'LENDING_OFFICER']:
            user = User.objects.create_user('reset_' + role, role=role)
            self.client.force_authenticate(user)
            self.assertEqual(self.client.post(self.url, self.body, format='json').status_code, 403)
        self.target.refresh_from_db()
        self.assertEqual(self.target.password, original)

    def test_confirmation_strength_and_missing_fields_are_validated(self):
        self.client.force_authenticate(self.admin)
        original = self.target.password
        for body in [{}, {'new_password': self.body['new_password']}, {**self.body, 'confirm_password': 'Different-value-837!'}, {'new_password': '12345678', 'confirm_password': '12345678'}, {'new_password': 'short', 'confirm_password': 'short'}]:
            self.assertEqual(self.client.post(self.url, body, format='json').status_code, 400)
        self.assertEqual(self.client.patch(f'/api/staff/{self.target.pk}/', {'password': self.body['new_password']}, format='json').status_code, 400)
        self.target.refresh_from_db()
        self.assertEqual(self.target.password, original)
