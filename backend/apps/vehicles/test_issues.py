from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from apps.accounts.models import User
from apps.missions.models import Mission
from .models import Vehicle, VehicleIssue, VehicleIssueAudit


class VehicleIssueTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('issue_admin', role='SUPER_ADMIN')
        self.manager = User.objects.create_user('issue_manager', role='VEHICLE_MANAGER')
        self.vehicle = Vehicle.objects.create(code='ISSUE-1', plate_number='ISSUE-1')
        self.client.force_authenticate(self.manager)
        self.payload = {'vehicle': self.vehicle.pk, 'category': 'Brakes', 'severity': 'HIGH', 'description': 'Inspect brake noise'}

    def report(self):
        result = self.client.post('/api/vehicle-issues/', self.payload, format='json')
        self.assertEqual(result.status_code, 201, result.data)
        return result.data['id']

    def action(self, pk, action, notes='Inspected and repaired'):
        return self.client.post(f'/api/vehicle-issues/{pk}/{action}/', {'maintenance_notes': notes}, format='json')

    def test_permissions_on_every_endpoint(self):
        pk = self.report()
        endpoints = [('get','/api/vehicle-issues/'),('get',f'/api/vehicle-issues/{pk}/'),('post','/api/vehicle-issues/'),('get','/api/vehicle-issues/summary/'),('patch',f'/api/vehicle-issues/{pk}/'),('post',f'/api/vehicle-issues/{pk}/maintenance/'),('post',f'/api/vehicle-issues/{pk}/resolve/')]
        for role in ['OPERATIONS_MANAGER','PARAMEDIC','LENDING_OFFICER']:
            actor = User.objects.create_user('issue_'+role, role=role)
            self.client.force_authenticate(actor)
            for method, url in endpoints:
                self.assertEqual(getattr(self.client,method)(url).status_code,403,(role,url))
        self.client.force_authenticate(None)
        for method, url in endpoints:
            self.assertEqual(getattr(self.client,method)(url).status_code,401,url)
        for actor in [self.admin,self.manager]:
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get(f'/api/vehicle-issues/{pk}/').status_code,200)
        self.assertEqual(VehicleIssue.objects.get(pk=pk).status,'OPEN')

    def test_report_is_audited_and_does_not_change_availability(self):
        pk = self.report()
        issue = VehicleIssue.objects.get(pk=pk)
        self.assertEqual(issue.reported_by,self.manager)
        self.assertIsNotNone(issue.reported_at)
        self.assertIsNone(issue.resolved_at)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')
        audit = issue.audit.get();self.assertEqual(audit.actor,self.manager)
        self.assertEqual(audit.after['description'],self.payload['description'])
        self.assertEqual(self.client.delete(f'/api/vehicle-issues/{pk}/').status_code,405)
        self.assertEqual(self.client.post('/api/vehicle-issues/',{**self.payload,'reported_by':self.admin.pk},format='json').status_code,400)
        for override in [{'severity':'UNKNOWN'},{'description':' '},{'category':''},{'vehicle':999999},{'status':'RESOLVED'}]:
            self.assertEqual(self.client.post('/api/vehicle-issues/',{**self.payload,**override},format='json').status_code,400)

    def test_maintenance_resolution_and_audit(self):
        pk = self.report()
        self.assertEqual(self.action(pk,'maintenance').status_code,200)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.assertEqual(self.client.patch(f'/api/vehicles/{self.vehicle.pk}/',{'status':'AVAILABLE'},format='json').status_code,400)
        result = self.action(pk,'resolve')
        self.assertEqual(result.status_code,200,result.data)
        self.assertEqual(result.data['resolved_by'],self.manager.pk)
        self.assertIsNotNone(result.data['resolved_at'])
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')
        self.assertEqual(VehicleIssueAudit.objects.filter(issue_id=pk).count(),3)
        audit = VehicleIssueAudit.objects.filter(issue_id=pk,action='resolve').get()
        self.assertEqual(audit.before['status'],'IN_MAINTENANCE')
        self.assertEqual(audit.after['vehicle_status'],'AVAILABLE')

    def test_multiple_maintenance_issues_keep_vehicle_unavailable(self):
        first,second,open_only = self.report(),self.report(),self.report()
        self.action(first,'maintenance');self.action(second,'maintenance')
        self.action(first,'resolve')
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.action(open_only,'resolve')
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.action(second,'resolve')
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')

    def test_manual_maintenance_is_preserved(self):
        self.client.patch(f'/api/vehicles/{self.vehicle.pk}/',{'status':'MAINTENANCE'},format='json')
        pk=self.report();self.action(pk,'maintenance');self.action(pk,'resolve')
        self.vehicle.refresh_from_db()
        self.assertTrue(self.vehicle.manual_maintenance)
        self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.assertEqual(self.client.patch(f'/api/vehicles/{self.vehicle.pk}/',{'status':'AVAILABLE'},format='json').status_code,200)

    def test_open_resolution_does_not_release_manual_or_active_vehicle(self):
        for status in ['MAINTENANCE','ON_MISSION']:
            self.vehicle.status=status;self.vehicle.save()
            pk=self.report();self.action(pk,'resolve')
            self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,status)

    def test_invalid_repeated_transitions_and_locked_resolution(self):
        pk=self.report()
        self.assertEqual(self.action(pk,'resolve',' ').status_code,400)
        self.assertEqual(self.client.patch(f'/api/vehicle-issues/{pk}/',{'status':'IN_MAINTENANCE'},format='json').status_code,400)
        self.action(pk,'maintenance')
        self.assertEqual(self.action(pk,'maintenance').status_code,400)
        self.assertEqual(self.client.patch(f'/api/vehicle-issues/{pk}/',{'maintenance_notes':'Waiting for part'},format='json').status_code,200)
        self.action(pk,'resolve')
        for action in ['resolve','maintenance']:
            self.assertEqual(self.action(pk,action).status_code,400)
        self.assertEqual(self.client.patch(f'/api/vehicle-issues/{pk}/',{'maintenance_notes':'edit'},format='json').status_code,400)

    def test_filters_and_summary(self):
        pk=self.report();self.action(pk,'maintenance');self.report()
        result=self.client.get(f'/api/vehicle-issues/?vehicle={self.vehicle.pk}&status=IN_MAINTENANCE&severity=HIGH&category=brak')
        self.assertEqual(result.data['count'],1)
        self.assertEqual(self.client.get('/api/vehicle-issues/summary/').data,{'counts':{'OPEN':1,'IN_MAINTENANCE':1,'RESOLVED':0},'unresolved':2})
        for query in ['severity=bad','status=bad','vehicle=bad','page=0']:
            self.assertEqual(self.client.get('/api/vehicle-issues/?'+query).status_code,400)

    def test_maintenance_blocks_assignment_and_start_but_preserves_historical_entry(self):
        now=timezone.now()-timedelta(hours=1)
        pending=Mission.objects.create(created_by=self.admin,vehicle=self.vehicle,date=timezone.localtime(now).date(),location='Saida',incident_type='Other')
        pk=self.report();self.action(pk,'maintenance')
        self.client.force_authenticate(self.admin)
        base={'vehicle_id':self.vehicle.pk,'date':timezone.localtime(now).date().isoformat(),'location':'Saida','incident_type':'Other'}
        self.assertEqual(self.client.post('/api/missions/',base,format='json').status_code,400)
        self.assertEqual(self.client.patch(f'/api/missions/{pending.pk}/',{'vehicle_id':self.vehicle.pk},format='json').status_code,400)
        self.assertEqual(self.client.post(f'/api/missions/{pending.pk}/start/',{'actual_start':now.isoformat()},format='json').status_code,400)
        medic=User.objects.create_user('issue_history_medic')
        self.assertEqual(self.client.post('/api/missions/historical/',{**base,'actual_start':now.isoformat(),'actual_crew':[{'user_id':medic.pk}]},format='json').status_code,201)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')

    def test_maintenance_and_resolution_preserve_active_mission(self):
        mission=Mission.objects.create(created_by=self.admin,vehicle=self.vehicle,status='ACTIVE')
        self.vehicle.status='ON_MISSION';self.vehicle.save()
        pk=self.report();self.action(pk,'maintenance');self.action(pk,'resolve')
        mission.refresh_from_db();self.assertEqual(mission.status,'ACTIVE')
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'ON_MISSION')

    def test_active_cancellation_keeps_issue_hold_until_resolution(self):
        mission=Mission.objects.create(created_by=self.admin,vehicle=self.vehicle,status='ACTIVE')
        pk=self.report();self.action(pk,'maintenance')
        self.client.force_authenticate(self.admin)
        result=self.client.post(f'/api/missions/{mission.pk}/cancel/',{'cancellation_reason':'Fault reported'},format='json')
        self.assertEqual(result.status_code,200,result.data)
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.action(pk,'resolve')
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')
