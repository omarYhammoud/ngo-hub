from concurrent.futures import ThreadPoolExecutor
from importlib import import_module
from threading import Barrier
from django.db import connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User, Role
from apps.missions.models import Mission
from apps.missions.services import save_mission
from .models import Vehicle, VehicleIssue
from .services import save_issue


class MaintenanceConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.seed_roles()
        self.actor=User.objects.create_user('issue_concurrent',role='SUPER_ADMIN')
        self.vehicle=Vehicle.objects.create(code='ISSUE-RACE',plate_number='ISSUE-RACE')

    def seed_roles(self):
        for code,name,description in import_module('apps.accounts.migrations.0002_brd_roles').ROLES:
            Role.objects.get_or_create(code=code,defaults={'name':name,'description':description})

    def race(self, functions):
        barrier=Barrier(len(functions))
        def run(fn):
            try:
                actor=User.objects.get(pk=self.actor.pk)
                barrier.wait(timeout=10)
                return fn(actor)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=len(functions)) as pool:
            return list(pool.map(run,functions))

    def test_start_racing_maintenance_never_leaves_vehicle_available(self):
        now=timezone.now()
        mission=Mission.objects.create(created_by=self.actor,vehicle=self.vehicle,date=timezone.localtime(now).date(),location='Test',incident_type='Other')
        issue=VehicleIssue.objects.create(vehicle=self.vehicle,reported_by=self.actor,category='Engine',description='Inspect')
        def start(actor):
            try:
                save_mission(actor,{'actual_start':now},mission.pk,'start')
                return 'started'
            except ValidationError:
                return 'rejected'
        self.race([start,lambda actor:save_issue(actor,{},issue.pk,'maintenance')])
        self.vehicle.refresh_from_db();issue.refresh_from_db();mission.refresh_from_db()
        self.assertEqual(self.vehicle.status,'MAINTENANCE')
        self.assertEqual(issue.status,'IN_MAINTENANCE')
        self.assertIn(mission.status,['PENDING','ACTIVE'])

    def test_simultaneous_resolutions_release_only_after_last_hold(self):
        issues=[VehicleIssue.objects.create(vehicle=self.vehicle,reported_by=self.actor,category='Engine',description='Inspect') for _ in range(2)]
        for issue in issues:save_issue(self.actor,{},issue.pk,'maintenance')
        self.race([lambda actor,pk=issue.pk:save_issue(actor,{'maintenance_notes':'Fixed'},pk,'resolve') for issue in issues])
        self.vehicle.refresh_from_db();self.assertEqual(self.vehicle.status,'AVAILABLE')
        self.assertEqual(VehicleIssue.objects.filter(status='RESOLVED').count(),2)

    def _post_teardown(self):
        super()._post_teardown()
        self.seed_roles()
