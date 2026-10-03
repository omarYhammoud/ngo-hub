from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless
from unittest.mock import patch
from django.db import connection, close_old_connections, IntegrityError, transaction
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from apps.accounts.models import Role, User
from .models import Equipment, Loan


class EquipmentTests(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user('lending_test', role='LENDING_OFFICER')
        self.client.force_authenticate(self.officer)
        self.item = Equipment.objects.create(code='OC5-001', type='OC5', name='Oxygen concentrator')
        self.payload = {'equipment': self.item.pk, 'borrower_name': 'Test borrower', 'borrower_phone': '+9611234567', 'due_date': timezone.localdate().isoformat()}

    def checkout(self, **kwargs):
        return self.client.post('/api/lending/', {**self.payload, **kwargs}, format='json')

    def test_inventory_catalogue_validation_and_edit(self):
        self.assertEqual(self.client.get('/api/equipment/types/').data, Equipment.TYPE_CODES)
        for code in Equipment.TYPE_CODES:
            result = self.client.post('/api/equipment/', {'code': code + '-002', 'type': code, 'name': 'Test'}, format='json')
            self.assertEqual(result.status_code, 201, result.data)
        for payload in [{'code': self.item.code, 'type': 'OC5', 'name': 'Duplicate'}, {'code': 'X', 'type': 'UNKNOWN', 'name': 'Bad'}, {'code': 'Y', 'type': 'WC', 'name': 'Bad', 'status': 'ON_LOAN'}]:
            self.assertEqual(self.client.post('/api/equipment/', payload, format='json').status_code, 400)
        self.assertEqual(self.client.patch(f'/api/equipment/{self.item.pk}/', {'notes': 'Checked'}, format='json').status_code, 200)
        self.assertEqual(len(self.client.get('/api/equipment/?search=001&type=OC5&status=AVAILABLE').data), 1)

    def test_checkout_return_and_recheckout_keep_history_and_actors(self):
        result = self.checkout(checked_out_by=999, returned_at=timezone.now().isoformat())
        self.assertEqual(result.status_code, 201, result.data)
        loan = Loan.objects.get(pk=result.data['id'])
        self.assertEqual(loan.checked_out_by, self.officer)
        self.assertIsNone(loan.returned_at)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, 'ON_LOAN')
        self.assertEqual(self.checkout().status_code, 400)
        self.assertEqual(self.client.patch(f'/api/equipment/{self.item.pk}/', {'status': 'AVAILABLE'}, format='json').status_code, 400)
        url = f'/api/lending/{loan.pk}/return/'
        self.assertEqual(self.client.post(url, {'status': 'ON_LOAN'}, format='json').status_code, 400)
        result = self.client.post(url, {'status': 'AVAILABLE', 'return_notes': 'Complete'}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['returned_by'], self.officer.pk)
        self.assertEqual(result.data['return_notes'], 'Complete')
        self.assertEqual(self.client.post(url, {'status': 'MAINTENANCE'}, format='json').status_code, 400)
        self.assertEqual(self.checkout().status_code, 201)
        self.assertEqual(Loan.objects.count(), 2)
        self.assertEqual(len(self.client.get('/api/lending/?status=RETURNED').data), 1)

    def test_maintenance_and_retired_items_cannot_be_lent(self):
        for status in ['MAINTENANCE', 'RETIRED']:
            self.item.status = status
            self.item.save()
            self.assertEqual(self.checkout().status_code, 400)
        self.item.status = 'AVAILABLE'
        self.item.save()
        result = self.checkout()
        self.client.post(f"/api/lending/{result.data['id']}/return/", {'status': 'MAINTENANCE'}, format='json')
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, 'MAINTENANCE')
        self.assertEqual(self.checkout().status_code, 400)

    def test_required_borrower_fields_and_dates(self):
        for values in [{'borrower_name': ''}, {'borrower_phone': ' '}, {'due_date': 'bad'}, {'due_date': (timezone.localdate() - timedelta(days=1)).isoformat()}, {'equipment': 99999}]:
            self.assertEqual(self.checkout(**values).status_code, 400)
        self.assertFalse(Loan.objects.exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, 'AVAILABLE')

    def test_overdue_boundary_summary_and_search(self):
        result = self.checkout()
        self.assertFalse(result.data['is_overdue'])
        self.assertEqual(self.client.get('/api/equipment/summary/').data, {'total': 1, 'available': 0, 'on_loan': 1, 'overdue': 0})
        tomorrow = timezone.localdate() + timedelta(days=1)
        with patch('django.utils.timezone.localdate', return_value=tomorrow):
            self.assertTrue(self.client.get('/api/lending/').data[0]['is_overdue'])
            self.assertEqual(len(self.client.get('/api/lending/?status=OVERDUE&search=Test').data), 1)
            self.assertEqual(self.client.get('/api/equipment/summary/').data['overdue'], 1)
            self.client.post(f"/api/lending/{result.data['id']}/return/", {'status': 'AVAILABLE'}, format='json')
            self.assertEqual(self.client.get('/api/lending/?status=OVERDUE').data, [])
            self.assertEqual(self.client.get('/api/equipment/summary/').data['overdue'], 0)
        self.assertEqual(self.client.get('/api/lending/?status=invalid').status_code, 400)

    def test_permissions_for_every_role_and_anonymous(self):
        loan = self.checkout().data['id']
        for role in Role.Code.values:
            user = User.objects.create_user('role_' + role, role=role)
            self.client.force_authenticate(user)
            allowed = role in ['SUPER_ADMIN', 'LENDING_OFFICER']
            for url in ['/api/equipment/', '/api/equipment/types/', '/api/equipment/summary/', f'/api/equipment/{self.item.pk}/', '/api/lending/', f'/api/lending/{loan}/']:
                self.assertEqual(self.client.get(url).status_code, 200 if allowed else 403, (role, url))
            if not allowed:
                self.assertEqual(self.checkout().status_code, 403)
                self.assertEqual(self.client.post('/api/equipment/', {}, format='json').status_code, 403)
                self.assertEqual(self.client.patch(f'/api/equipment/{self.item.pk}/', {}, format='json').status_code, 403)
                self.assertEqual(self.client.post(f'/api/lending/{loan}/return/', {}, format='json').status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/lending/').status_code, 401)
        self.officer.is_active = False
        self.officer.save()
        self.client.force_authenticate(self.officer)
        self.assertEqual(self.client.get('/api/lending/').status_code, 403)

    def test_history_is_immutable_and_unknown_ids_are_404(self):
        loan = self.checkout().data['id']
        self.assertEqual(self.client.patch(f'/api/lending/{loan}/', {'borrower_name': 'changed'}, format='json').status_code, 405)
        self.assertEqual(self.client.delete(f'/api/lending/{loan}/').status_code, 405)
        self.assertEqual(self.client.delete(f'/api/equipment/{self.item.pk}/').status_code, 405)
        self.assertEqual(self.client.post('/api/lending/99999/return/', {'status': 'AVAILABLE'}, format='json').status_code, 404)
        self.assertEqual(self.client.patch('/api/equipment/99999/', {}, format='json').status_code, 404)

    def test_database_prevents_duplicate_open_loans(self):
        self.checkout()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Loan.objects.create(equipment=self.item, borrower_name='Duplicate', borrower_phone='123', due_date=timezone.localdate(), checked_out_by=self.officer)


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locks')
class LendingConcurrencyTests(TransactionTestCase):
    def setUp(self):
        role, _ = Role.objects.get_or_create(code='LENDING_OFFICER', defaults={'name': 'Lending Officer'})
        self.officer = User.objects.create_user('concurrent_lender', role=role)
        self.item = Equipment.objects.create(code='WC-001', type='WC', name='Wheelchair')

    def race(self, path, payload):
        barrier = Barrier(2)
        def perform(_):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(User.objects.get(pk=self.officer.pk))
                barrier.wait(timeout=10)
                return client.post(path, payload, format='json').status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            return sorted(pool.map(perform, range(2)))

    def test_simultaneous_checkout_then_return(self):
        payload = {'equipment': self.item.pk, 'borrower_name': 'Test', 'borrower_phone': '123', 'due_date': timezone.localdate().isoformat()}
        self.assertEqual(self.race('/api/lending/', payload), [201, 400])
        self.assertEqual(Loan.objects.count(), 1)
        loan = Loan.objects.get()
        self.assertEqual(self.race(f'/api/lending/{loan.pk}/return/', {'status': 'AVAILABLE'}), [200, 400])
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, 'AVAILABLE')
