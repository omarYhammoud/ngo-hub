from datetime import timedelta
from django.utils import timezone
from . import test_issues
from apps.accounts.models import User
from .models import Vehicle, VehicleIssue


class Step3LifecycleTests(test_issues.VehicleIssueTests):
    # Use API-created clean vehicles for all inherited issue/hold assertions.
    def setUp(self):
        super().setUp()
        result = self.client.post('/api/vehicles/', {
            'code': 'AMB-TEST-01', 'plate_number': 'TEST-001',
            'type': 'Ambulance', 'model': 'Toyota Hiace', 'year': 2020,
            'mileage': 50000, 'status': 'AVAILABLE',
        }, format='json')
        self.assertEqual(result.status_code, 201, result.data)
        self.vehicle = Vehicle.objects.get(pk=result.data['id'])
        self.assertFalse(self.vehicle.manual_maintenance)
        self.payload['vehicle'] = self.vehicle.pk

    def test_full_lifecycle_and_new_assignment_rejections(self):
        issue = self.report()
        self.assertEqual(self.action(issue, 'maintenance').status_code, 200)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, 'MAINTENANCE')
        start = timezone.now() - timedelta(hours=1)
        base = {'date': timezone.localtime(start).date().isoformat(),
                'location': 'Saida', 'incident_type': 'Other'}
        self.client.force_authenticate(self.admin)
        pending = self.client.post('/api/missions/', base, format='json')
        self.assertEqual(pending.status_code, 201, pending.data)
        pending_id = pending.data['id']
        def blocked():
            result = self.client.post('/api/missions/', {**base, 'vehicle_id': self.vehicle.pk}, format='json')
            self.assertEqual(result.status_code, 400, result.data)
            self.assertEqual(str(result.data['detail']), 'vehicle_unavailable')
            result = self.client.patch(f'/api/missions/{pending_id}/', {'vehicle_id': self.vehicle.pk}, format='json')
            self.assertEqual(result.status_code, 400, result.data)
            self.assertEqual(str(result.data['detail']), 'vehicle_unavailable')
        blocked()
        resolved = self.action(issue, 'resolve')
        self.assertEqual(resolved.status_code, 200, resolved.data)
        record = VehicleIssue.objects.get(pk=issue)
        self.assertEqual(record.resolved_by, self.admin)
        self.assertIsNotNone(record.resolved_at)
        self.assertEqual(list(record.audit.order_by('id').values_list('action', flat=True)), ['report', 'maintenance', 'resolve'])
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, 'AVAILABLE')
        medic = User.objects.create_user('step3_medic')
        for close in ['complete', 'cancel']:
            mission = self.client.post('/api/missions/', {**base, 'vehicle_id': self.vehicle.pk}, format='json')
            self.assertEqual(mission.status_code, 201, mission.data)
            pk = mission.data['id']
            result = self.client.post(f'/api/missions/{pk}/start/', {'actual_start': start.isoformat()}, format='json')
            self.assertEqual(result.status_code, 200, result.data)
            self.vehicle.refresh_from_db()
            self.assertEqual(self.vehicle.status, 'ON_MISSION')
            blocked()
            data = {'actual_crew': [{'user_id': medic.pk}], 'actual_end': timezone.now().isoformat()} if close == 'complete' else {'cancellation_reason': 'Step 3 test finished'}
            result = self.client.post(f'/api/missions/{pk}/{close}/', data, format='json')
            self.assertEqual(result.status_code, 200, result.data)
            self.vehicle.refresh_from_db()
            self.assertEqual(self.vehicle.status, 'AVAILABLE')
