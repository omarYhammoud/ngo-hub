import os
os.environ.setdefault("DJANGO_SECRET_KEY", "isolated-test-secret-not-for-deployment-123456789")
from .settings import *
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
