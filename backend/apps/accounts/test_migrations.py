from importlib import import_module
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class AlignmentMigrationTests(TransactionTestCase):
    def test_existing_users_and_missions_survive_alignment(self):
        old = [('accounts', '0001_initial'), ('missions', '0001_initial')]
        new = [('accounts', '0002_brd_roles'), ('missions', '0002_brd_statuses')]
        executor = MigrationExecutor(connection)
        executor.migrate(old)
        apps = executor.loader.project_state(old).apps
        User = apps.get_model('accounts', 'User')
        Mission = apps.get_model('missions', 'Mission')
        admin = User.objects.create(username='legacy_super', role='ADMIN', is_superuser=True, password='unchanged-hash')
        manager = User.objects.create(username='legacy_manager', role='ADMIN')
        medic = User.objects.create(username='legacy_medic', role='PARAMEDIC')
        ids = {}
        for status in ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']:
            mission = Mission.objects.create(title=status, status=status, created_by=admin, notes='Keep these notes')
            mission.paramedics.add(medic)
            ids[status] = mission.pk
        executor = MigrationExecutor(connection)
        executor.migrate(new)
        apps = executor.loader.project_state(new).apps
        User = apps.get_model('accounts', 'User')
        Mission = apps.get_model('missions', 'Mission')
        self.assertEqual(User.objects.get(pk=admin.pk).role.code, 'SUPER_ADMIN')
        self.assertEqual(User.objects.get(pk=manager.pk).role.code, 'OPERATIONS_MANAGER')
        self.assertEqual(User.objects.get(pk=medic.pk).role.code, 'PARAMEDIC')
        self.assertEqual(User.objects.get(pk=admin.pk).password, 'unchanged-hash')
        expected = {'PENDING': 'PENDING', 'ASSIGNED': 'PENDING', 'IN_PROGRESS': 'ACTIVE', 'COMPLETED': 'COMPLETED', 'CANCELLED': 'CANCELLED'}
        for old_status, pk in ids.items():
            mission = Mission.objects.get(pk=pk)
            self.assertEqual(mission.status, expected[old_status])
            self.assertEqual(mission.notes, 'Keep these notes')
            self.assertEqual(mission.created_by_id, admin.pk)
            self.assertEqual(list(mission.paramedics.values_list('pk', flat=True)), [medic.pk])
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        executor.migrate(latest)
        apps = executor.loader.project_state(latest).apps
        for old_status, pk in ids.items():
            mission = apps.get_model('missions', 'Mission').objects.get(pk=pk)
            self.assertEqual(mission.mission_number, f'MSN-LEGACY-{pk:06d}')
            self.assertEqual(mission.notes, 'Keep these notes')
            self.assertIsNone(mission.actual_start)
            self.assertIsNone(mission.actual_end)
            self.assertEqual(list(mission.crew.values_list('user_id', flat=True)), [medic.pk])
            self.assertEqual(mission.crew.get().actual, old_status == 'COMPLETED')

    def tearDown(self):
        # Always restore latest schema even if a migration assertion fails.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def _post_teardown(self):
        super()._post_teardown()
        # TransactionTestCase flushes data-migration seeds. Restore only the
        # role catalogue so subsequent tests and --keepdb start consistently.
        from apps.accounts.models import Role
        for code, name, description in import_module('apps.accounts.migrations.0002_brd_roles').ROLES:
            Role.objects.get_or_create(code=code, defaults={'name': name, 'description': description})
