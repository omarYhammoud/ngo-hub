from django.contrib.auth.models import AbstractUser, UserManager
from django.core.exceptions import ValidationError
from django.db import models


class Role(models.Model):
    class Code(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        OPERATIONS_MANAGER = 'OPERATIONS_MANAGER', 'Operations Manager / Admin'
        PARAMEDIC = 'PARAMEDIC', 'Paramedic'
        LENDING_OFFICER = 'LENDING_OFFICER', 'Lending Officer'
        VEHICLE_MANAGER = 'VEHICLE_MANAGER', 'Vehicle Manager'

    code = models.CharField(max_length=24, unique=True, choices=Code.choices)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)

    class Meta:
        constraints = [models.CheckConstraint(
            condition=models.Q(code__in=['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'PARAMEDIC', 'LENDING_OFFICER', 'VEHICLE_MANAGER']),
            name='valid_role_code',
        )]

    def __str__(self):
        return self.name


class AccountManager(UserManager):
    def _create_user(self, username, email, password, **extra_fields):
        if 'role' not in extra_fields and 'role_id' not in extra_fields:
            extra_fields['role'] = Role.Code.PARAMEDIC
        if isinstance(extra_fields.get('role'), str):
            extra_fields['role'] = Role.objects.db_manager(self._db).get(code=extra_fields['role'])
        return super()._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        role = extra_fields.get('role')
        if role is None:
            role = Role.objects.db_manager(self._db).get(code=Role.Code.SUPER_ADMIN)
        if (role.code if isinstance(role, Role) else role) != Role.Code.SUPER_ADMIN:
            raise ValueError('Superusers must have the Super Admin role.')
        extra_fields['role'] = role
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    Role = Role.Code
    role = models.ForeignKey('accounts.Role', on_delete=models.PROTECT, related_name='users')
    phone = models.CharField(max_length=32, blank=True)
    objects = AccountManager()

    def clean(self):
        super().clean()
        if self.is_superuser and self.role_id and self.role.code != Role.Code.SUPER_ADMIN:
            raise ValidationError({'role': 'Django superusers must retain the Super Admin role.'})
