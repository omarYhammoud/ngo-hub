from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from importlib import import_module
from django.db import connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User, Role
from apps.vehicles.models import Vehicle
from .models import Mission
from .services import save_mission


class VehicleConcurrencyTests(TransactionTestCase):
    def test_two_simultaneous_starts_claim_vehicle_only_once(self):
        for code,name,description in import_module('apps.accounts.migrations.0002_brd_roles').ROLES:
            Role.objects.get_or_create(code=code,defaults={'name':name,'description':description})
        actor=User.objects.create_user('concurrency_manager',role='OPERATIONS_MANAGER')
        vehicle=Vehicle.objects.create(code='CONCURRENT',plate_number='CONCURRENT')
        now=timezone.now()
        missions=[Mission.objects.create(created_by=actor,date=timezone.localtime(now).date(),location='Test',incident_type='Transport',vehicle=vehicle) for _ in range(2)]
        barrier=Barrier(2)
        def start(pk):
            try:
                user=User.objects.get(pk=actor.pk)
                barrier.wait(timeout=10)
                try:
                    save_mission(user,{'actual_start':now},pk,'start')
                    return 'started'
                except ValidationError:
                    return 'rejected'
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(start,[m.pk for m in missions]))
        self.assertCountEqual(results,['started','rejected'])
        self.assertEqual(Mission.objects.filter(status='ACTIVE',vehicle=vehicle).count(),1)
        vehicle.refresh_from_db();self.assertEqual(vehicle.status,'ON_MISSION')

    def _post_teardown(self):
        super()._post_teardown()
        for code,name,description in import_module('apps.accounts.migrations.0002_brd_roles').ROLES:
            Role.objects.get_or_create(code=code,defaults={'name':name,'description':description})
