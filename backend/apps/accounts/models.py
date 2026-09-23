from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class AccountManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", "ADMIN")
        if extra_fields["role"] != "ADMIN":
            raise ValueError("Superusers must have the Admin role.")
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        PARAMEDIC = "PARAMEDIC", "Paramedic"
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.PARAMEDIC)
    objects = AccountManager()
    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(role__in=["ADMIN", "PARAMEDIC"]), name="valid_user_role")]
