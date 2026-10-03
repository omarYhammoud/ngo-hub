from datetime import timedelta
from django.utils import timezone
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role
from apps.vehicles.models import Vehicle
from .models import Mission, MissionCrew, MissionAudit


class MissionWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('super', role='SUPER_ADMIN')
        self.manager = User.objects.create_user('ops', role='OPERATIONS_MANAGER')
        self.medic = User.objects.create_user('medic')
        self.other = User.objects.create_user('other')
        self.lending = User.objects.create_user('lender', role='LENDING_OFFICER')
        self.vm = User.objects.create_user('vehiclemanager', role='VEHICLE_MANAGER')
        self.vehicle = Vehicle.objects.create(code='A1', plate_number='P1')
        self.start = timezone.now() - timedelta(hours=2)
        self.end = self.start + timedelta(hours=1)
        self.base = {'date': timezone.localtime(self.start).date().isoformat(), 'location': 'Saida', 'incident_type': 'Transport', 'vehicle_id': self.vehicle.pk}
        self.actual = {'actual_start': self.start.isoformat(), 'actual_end': self.end.isoformat(), 'actual_crew': [{'user_id': self.medic.pk, 'crew_role': 'Driver'}]}
        self.client.force_authenticate(self.admin)

    def create(self, actor=None, **overrides):
        self.client.force_authenticate(actor or self.admin)
        response = self.client.post('/api/missions/', {**self.base, **overrides}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def command(self, pk, action, data=None):
        return self.client.post(f'/api/missions/{pk}/{action}/', data or {}, format='json')

    def test_pending_assignment_does_not_reserve_vehicle_and_scope_is_enforced(self):
        pk = self.create(planned_crew=[{'user_id': self.medic.pk, 'crew_role': 'Medic'}])
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, 'AVAILABLE')
        self.client.force_authenticate(self.medic)
        self.assertEqual(self.client.get(f'/api/missions/{pk}/').status_code, 200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/missions/').data['count'], 0)
        for url in [f'/api/missions/{pk}/', f'/api/missions/{pk}/complete/']:
            result = self.client.get(url) if url.endswith(f'{pk}/') else self.client.post(url, self.actual, format='json')
            self.assertEqual(result.status_code, 404)
        self.assertEqual(self.client.get('/api/missions/summary/').data['counts'], {})

    def test_paramedic_can_create_but_cannot_change_planned_assignments(self):
        pk = self.create(self.medic)
        response = self.client.patch(f'/api/missions/{pk}/', {'planned_crew':[{'user_id':self.other.pk}]}, format='json')
        self.assertEqual(response.status_code, 403)
        response = self.client.patch(f'/api/missions/{pk}/', {'notes':'Recorded by creator'}, format='json')
        self.assertEqual(response.status_code, 200)
        response = self.command(pk, 'complete', self.actual)
        self.assertEqual(response.status_code, 200, response.data)

    def test_management_can_assign_and_unassigned_users_cannot_mutate(self):
        pk = self.create(self.manager, planned_crew=[{'user_id':self.medic.pk}])
        self.client.force_authenticate(self.other)
        for action in ['start','complete','cancel','correct']:
            self.assertEqual(self.command(pk,action,{'cancellation_reason':'test'}).status_code,404)
        self.client.force_authenticate(self.medic)
        self.assertEqual(self.command(pk,'cancel',{'cancellation_reason':'Duplicate dispatch'}).status_code,200)

    def test_start_then_complete_releases_vehicle(self):
        pk = self.create()
        self.assertEqual(self.command(pk, 'start', {'actual_start': self.start.isoformat()}).status_code,200)
        self.vehicle.refresh_from_db(); self.assertEqual(self.vehicle.status,'ON_MISSION')
        response = self.command(pk,'complete',self.actual)
        self.assertEqual(response.status_code,200,response.data)
        self.vehicle.refresh_from_db(); self.assertEqual(self.vehicle.status,'AVAILABLE')
        self.assertEqual(response.data['status'],'COMPLETED')
        self.assertNotEqual(response.data['actual_start'],response.data['created_at'])

    def test_historical_and_pending_completion_cannot_release_another_active_vehicle(self):
        active = self.create()
        pending = self.create(self.medic)
        self.client.force_authenticate(self.admin)
        self.command(active,'start',{'actual_start':self.start.isoformat()})
        self.client.force_authenticate(self.medic)
        self.assertEqual(self.command(pending,'complete',self.actual).status_code,200)
        response=self.client.post('/api/missions/historical/',{**self.base,**self.actual},format='json')
        self.assertEqual(response.status_code,201,response.data)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'ON_MISSION')

    def test_second_active_mission_is_prevented(self):
        first=self.create();second=self.create()
        self.assertEqual(self.command(first,'start',{'actual_start':self.start.isoformat()}).status_code,200)
        self.assertEqual(self.command(second,'start',{'actual_start':self.start.isoformat()}).status_code,400)
        self.assertEqual(Mission.objects.get(pk=second).status,'PENDING')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Mission.objects.filter(pk=second).update(status='ACTIVE')

    def test_pending_and_historical_completion_without_end_preserves_occupied_vehicle(self):
        active = self.create()
        pending = self.create(self.medic, incident_type='Existing custom type')
        self.client.force_authenticate(self.admin)
        self.command(active, 'start', {'actual_start': self.start.isoformat()})
        self.client.force_authenticate(self.medic)
        actual = {key: value for key, value in self.actual.items() if key != 'actual_end'}
        response = self.command(pending, 'complete', actual)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['actual_end'])
        self.assertEqual(response.data['incident_type'], 'Existing custom type')
        self.assertIsNone(Mission.objects.get(pk=pending).actual_end)
        historical = self.client.post('/api/missions/historical/', {**self.base, **actual, 'actual_end': None}, format='json')
        self.assertEqual(historical.status_code, 201, historical.data)
        self.assertIsNone(historical.data['actual_end'])
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, 'ON_MISSION')

    def test_optional_end_does_not_relax_other_completion_requirements(self):
        pending = self.create(self.medic)
        actual = {key: value for key, value in self.actual.items() if key != 'actual_end'}
        for missing in [{'actual_start': None}, {'actual_crew': []}, {'vehicle_id': None}, {'location': ''}, {'incident_type': ''}]:
            self.assertEqual(self.command(pending, 'complete', {**actual, **missing}).status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.command(pending, 'complete', actual).status_code, 404)

    def test_active_completion_without_end_releases_vehicle(self):
        pending = self.create()
        self.command(pending, 'start', {'actual_start': self.start.isoformat()})
        response = self.command(pending, 'complete', {'actual_crew': self.actual['actual_crew']})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['actual_end'])
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, 'AVAILABLE')

    def test_maintenance_survives_active_completion_or_cancellation(self):
        for action in ['complete','cancel']:
            self.vehicle.status='AVAILABLE';self.vehicle.save()
            pk=self.create();self.command(pk,'start',{'actual_start':self.start.isoformat()})
            self.vehicle.status='MAINTENANCE';self.vehicle.save()
            result=self.command(pk,action,self.actual if action=='complete' else {'cancellation_reason':'Mechanical fault'})
            self.assertEqual(result.status_code,200,result.data)
            self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')

    def test_cancel_active_releases_vehicle_and_requires_reason(self):
        pk=self.create();self.command(pk,'start',{'actual_start':self.start.isoformat()})
        self.assertEqual(self.command(pk,'cancel').status_code,400)
        self.assertEqual(self.command(pk,'cancel',{'cancellation_reason':'Duplicate call'}).status_code,200)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')

    def test_historical_entry_can_reference_maintenance_vehicle_without_changing_it(self):
        self.vehicle.status='MAINTENANCE';self.vehicle.save()
        self.assertEqual(self.client.post('/api/missions/',self.base,format='json').status_code,400)
        self.assertEqual(self.client.post('/api/missions/historical/',{**self.base,**self.actual},format='json').status_code,201)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')

    def test_completion_requires_all_data_and_valid_actual_times(self):
        pk=self.create()
        self.assertEqual(self.command(pk,'complete').status_code,400)
        for extra in [{'actual_end':(self.start-timedelta(hours=1)).isoformat()}, {'actual_start':(timezone.now()+timedelta(days=1)).isoformat()}, {'actual_crew':[]}, {'actual_crew':[{'user_id':self.manager.pk}]}]:
            self.assertEqual(self.command(pk,'complete',{**self.actual,**extra}).status_code,400)
        self.medic.is_active=False;self.medic.save()
        self.assertEqual(self.command(pk,'complete',self.actual).status_code,400)

    def test_closed_correction_requires_super_admin_and_reason_and_is_audited(self):
        pk=self.create(self.medic);self.command(pk,'complete',self.actual)
        for user in [self.medic,self.manager]:
            self.client.force_authenticate(user)
            self.assertEqual(self.command(pk,'correct',{'notes':'changed','correction_reason':'Fix typo'}).status_code,403)
            self.assertEqual(self.client.patch(f'/api/missions/{pk}/',{'notes':'changed'},format='json').status_code,403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.command(pk,'correct',{'notes':'changed'}).status_code,400)
        result=self.command(pk,'correct',{'notes':'Corrected location note','correction_reason':'Verified dispatch log'})
        self.assertEqual(result.status_code,200,result.data)
        audit=MissionAudit.objects.filter(mission_id=pk,action='correct').get()
        self.assertEqual(audit.actor,self.admin);self.assertEqual(audit.before['notes'],'');self.assertEqual(audit.after['notes'],'Corrected location note')
        self.assertEqual(audit.reason,'Verified dispatch log');self.assertIsNotNone(audit.created_at)
        self.assertEqual(self.command(pk,'start').status_code,400)
        self.assertEqual(self.client.delete(f'/api/missions/{pk}/').status_code,405)
        self.assertEqual(self.command(pk,'correct',{'status':'PENDING','correction_reason':'reopen'}).status_code,400)

    def test_correction_never_alters_vehicle_availability(self):
        old=self.client.post('/api/missions/historical/',{**self.base,**self.actual},format='json').data['id']
        active=self.create();self.command(active,'start',{'actual_start':self.start.isoformat()})
        self.assertEqual(self.command(old,'correct',{'notes':'Updated','correction_reason':'Correction'}).status_code,200)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'ON_MISSION')

    def test_role_denials_and_vehicle_management_permissions(self):
        for user in [self.lending,self.vm]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/missions/').status_code,403)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get('/api/vehicles/').status_code,200)
        self.assertEqual(self.client.post('/api/vehicles/',{'code':'B','plate_number':'B'},format='json').status_code,403)
        self.assertEqual(self.client.get('/api/staff/').status_code,403)
        self.client.force_authenticate(self.vm)
        self.assertEqual(self.client.post('/api/vehicles/',{'code':'B','plate_number':'B'},format='json').status_code,201)

    def test_search_filter_activity_are_scoped_and_count_actual_participation(self):
        pk=self.create(self.medic);self.command(pk,'complete',self.actual)
        self.assertEqual(self.client.get('/api/missions/?search=Saida&status=COMPLETED').data['count'],1)
        self.assertEqual(self.client.get('/api/missions/activity/').data[0]['total'],1)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/missions/?search=Saida').data['count'],0)
        self.assertEqual(self.client.get('/api/missions/activity/').data,[])
        self.assertEqual(self.client.get('/api/missions/?vehicle=not-an-id').status_code,400)

    def test_staff_creation_login_and_disable_without_django_privilege_escalation(self):
        result=self.client.post('/api/staff/',{'username':'newmedic','password':'Strong-Staff-Example-837!','role':'PARAMEDIC','is_superuser':True},format='json')
        self.assertEqual(result.status_code,201,result.data)
        user=User.objects.get(username='newmedic');self.assertFalse(user.is_superuser);self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password('Strong-Staff-Example-837!'));self.assertNotIn('password',result.data)
        self.assertEqual(self.client.patch(f'/api/staff/{self.admin.pk}/',{'is_active':False},format='json').status_code,400)
        self.assertEqual(self.client.patch(f'/api/staff/{user.pk}/',{'is_active':False},format='json').status_code,200)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/auth/login/',{'username':'newmedic','password':'Strong-Staff-Example-837!'}).status_code,401)
