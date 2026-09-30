from importlib import import_module
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class MaintenanceMigrationTests(TransactionTestCase):
    def test_existing_vehicle_status_and_manual_hold_survive(self):
        old=[('vehicles','0001_initial')]
        executor=MigrationExecutor(connection)
        executor.migrate(old)
        Vehicle=executor.loader.project_state(old).apps.get_model('vehicles','Vehicle')
        for status in ['AVAILABLE','ON_MISSION','MAINTENANCE']:
            Vehicle.objects.create(code=status,plate_number=status,status=status)
        executor=MigrationExecutor(connection)
        latest=executor.loader.graph.leaf_nodes()
        executor.migrate(latest)
        Vehicle=executor.loader.project_state(latest).apps.get_model('vehicles','Vehicle')
        for vehicle in Vehicle.objects.all():
            self.assertEqual(vehicle.status,vehicle.code)
            self.assertEqual(vehicle.manual_maintenance,vehicle.status=='MAINTENANCE')

    def tearDown(self):
        executor=MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def _post_teardown(self):
        super()._post_teardown()
        from apps.accounts.models import Role
        for code,name,description in import_module('apps.accounts.migrations.0002_brd_roles').ROLES:
            Role.objects.get_or_create(code=code,defaults={'name':name,'description':description})
