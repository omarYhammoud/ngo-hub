from rest_framework import serializers
from rest_framework.generics import RetrieveAPIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")
        read_only_fields = fields

class MeView(RetrieveAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class AuthThrottleMixin:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

class LoginView(AuthThrottleMixin, TokenObtainPairView):
    pass
class RefreshView(AuthThrottleMixin, TokenRefreshView):
    pass
class LogoutView(AuthThrottleMixin, TokenBlacklistView):
    pass
