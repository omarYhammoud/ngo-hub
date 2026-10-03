from django.conf import settings
from django.db import migrations, models


def forwards(apps, schema_editor):
    Mission = apps.get_model('missions', 'Mission')
    missions = Mission.objects.using(schema_editor.connection.alias)
    missions.filter(status='ASSIGNED').update(status='PENDING')
    missions.filter(status='IN_PROGRESS').update(status='ACTIVE')


def backwards(apps, schema_editor):
    Mission = apps.get_model('missions', 'Mission')
    Mission.objects.using(schema_editor.connection.alias).filter(status='ACTIVE').update(status='IN_PROGRESS')


class Migration(migrations.Migration):
    dependencies = [('accounts', '0002_brd_roles'), ('missions', '0001_initial')]
    operations = [
        migrations.RemoveConstraint(model_name='mission', name='valid_mission_status'),
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(model_name='mission', name='status', field=models.CharField(choices=[('PENDING', 'Pending'), ('ACTIVE', 'Active'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=16)),
        migrations.AlterField(model_name='mission', name='paramedics', field=models.ManyToManyField(blank=True, limit_choices_to={'role__code': 'PARAMEDIC', 'is_active': True}, related_name='missions', to=settings.AUTH_USER_MODEL)),
        migrations.AddConstraint(model_name='mission', constraint=models.CheckConstraint(condition=models.Q(status__in=['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']), name='valid_mission_status')),
    ]
