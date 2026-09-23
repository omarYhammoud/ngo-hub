from django.test import TestCase
from django.db import IntegrityError, transaction
from apps.accounts.models import User
from .models import Mission

class MissionTests(TestCase):
    def test_defaults_assignment_and_status_constraint(self):
        user = User.objects.create_user('medic')
        mission = Mission.objects.create(title='Transport', created_by=user)
        self.assertEqual(mission.status, Mission.Status.PENDING)
        mission.paramedics.add(user)
        self.assertEqual(list(mission.paramedics.all()), [user])
        for status in Mission.Status.values:
            mission.status = status
            mission.full_clean()
            mission.save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Mission.objects.filter(pk=mission.pk).update(status='UNKNOWN')
