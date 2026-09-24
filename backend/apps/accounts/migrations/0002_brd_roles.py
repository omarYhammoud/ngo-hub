import django.db.models.deletion
from django.db import migrations, models

ROLES = [
    ('SUPER_ADMIN', 'Super Admin', 'Full system administration and all operational modules.'),
    ('OPERATIONS_MANAGER', 'Operations Manager / Admin', 'Operational oversight, missions and team activity.'),
    ('PARAMEDIC', 'Paramedic', 'Mission management and own activity.'),
    ('LENDING_OFFICER', 'Lending Officer', 'Equipment, borrowers, loans and returns.'),
    ('VEHICLE_MANAGER', 'Vehicle Manager', 'Vehicles, issues and maintenance.'),
]


def forwards(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    User = apps.get_model('accounts', 'User')
    db = schema_editor.connection.alias
    roles = {code: Role.objects.using(db).create(code=code, name=name, description=description).pk
             for code, name, description in ROLES}
    User.objects.using(db).filter(legacy_role='PARAMEDIC').update(role_id=roles['PARAMEDIC'])
    User.objects.using(db).filter(legacy_role='ADMIN').update(role_id=roles['OPERATIONS_MANAGER'])
    User.objects.using(db).filter(is_superuser=True).update(role_id=roles['SUPER_ADMIN'])


def backwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    db = schema_editor.connection.alias
    User.objects.using(db).all().update(legacy_role='PARAMEDIC')
    User.objects.using(db).filter(role__code__in=['SUPER_ADMIN', 'OPERATIONS_MANAGER']).update(legacy_role='ADMIN')


class Migration(migrations.Migration):
    dependencies = [('accounts', '0001_initial')]
    operations = [
        migrations.AlterModelOptions(name='user', options={'verbose_name': 'user', 'verbose_name_plural': 'users'}),
        migrations.RemoveConstraint(model_name='user', name='valid_user_role'),
        migrations.RenameField(model_name='user', old_name='role', new_name='legacy_role'),
        migrations.CreateModel(name='Role', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('code', models.CharField(choices=[(c, n) for c, n, _ in ROLES], max_length=24, unique=True)),
            ('name', models.CharField(max_length=80)),
            ('description', models.TextField(blank=True)),
        ], options={'constraints': [models.CheckConstraint(condition=models.Q(code__in=[c for c, _, _ in ROLES]), name='valid_role_code')]}),
        migrations.AddField(model_name='user', name='role', field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='users', to='accounts.role')),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(model_name='user', name='legacy_role'),
        migrations.AlterField(model_name='user', name='role', field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='users', to='accounts.role')),
        migrations.AddField(model_name='user', name='phone', field=models.CharField(blank=True, max_length=32)),
    ]
