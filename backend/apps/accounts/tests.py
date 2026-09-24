from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase, APIRequestFactory
from .models import User, Role
from .permissions import IsAdminRole


class AuthenticationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="medic", password="a-test-password-324")

    def login(self):
        return self.client.post('/api/auth/login/', {'username': 'medic', 'password': 'a-test-password-324'})

    def test_login_profile_and_read_only_role(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['role'], 'PARAMEDIC')
        self.assertNotIn('password', response.data)
        self.assertEqual(self.client.patch('/api/auth/me/', {'role': 'ADMIN'}).status_code, 405)

    def test_anonymous_and_bad_credentials_rejected(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/login/', {'username': 'medic', 'password': 'wrong'}).status_code, 401)

    def test_inactive_user_rejected(self):
        token = self.login().data['access']
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.login().status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_refresh_rotation_and_logout(self):
        original = self.login().data['refresh']
        rotated = self.client.post('/api/auth/refresh/', {'refresh': original})
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': original}).status_code, 401)
        current = rotated.data['refresh']
        self.assertEqual(self.client.post('/api/auth/logout/', {'refresh': current}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': current}).status_code, 401)

    def test_invalid_tokens_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': 'invalid'}).status_code, 401)

    def test_roles_and_superuser(self):
        admin = User.objects.create_superuser('admin', password='test-password')
        self.assertEqual(admin.role.code, User.Role.SUPER_ADMIN)
        request = APIRequestFactory().get('/')
        request.user = self.user
        self.assertFalse(IsAdminRole().has_permission(request, None))
        request.user = admin
        self.assertTrue(IsAdminRole().has_permission(request, None))
        with self.assertRaises(ValueError):
            User.objects.create_superuser('invalid-admin', role='PARAMEDIC')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Role.objects.create(code='DISPATCHER', name='Invalid role')

    def test_login_throttled(self):
        for _ in range(10):
            self.client.post('/api/auth/login/', {'username': 'medic', 'password': 'wrong'})
        self.assertEqual(self.login().status_code, 429)

    def test_cors_allowlist(self):
        response = self.client.options('/api/auth/login/', HTTP_ORIGIN='http://localhost:3000', HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST')
        self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:3000')
        response = self.client.options('/api/auth/login/', HTTP_ORIGIN='https://untrusted.example', HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST')
        self.assertNotIn('Access-Control-Allow-Origin', response)
