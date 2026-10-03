from django.test import TestCase
from django.db import IntegrityError, transaction
from apps.accounts.models import User
from .models import Mission, MissionCrew

class MissionTests(TestCase):
    def test_defaults_assignment_and_status_constraint(self):
        user = User.objects.create_user('medic')
        mission = Mission.objects.create(title='Transport', created_by=user)
        self.assertEqual(mission.status, Mission.Status.PENDING)
        MissionCrew.objects.create(mission=mission, user=user)
        self.assertEqual(list(mission.crew.values_list('user_id', flat=True)), [user.pk])
        for status in Mission.Status.values:
            mission.status = status
            mission.full_clean()
            mission.save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Mission.objects.filter(pk=mission.pk).update(status='UNKNOWN')
        for removed_status in ['ASSIGNED', 'IN_PROGRESS']:
            with self.assertRaises(IntegrityError), transaction.atomic():
                Mission.objects.filter(pk=mission.pk).update(status=removed_status)
