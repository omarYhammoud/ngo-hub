from rest_framework import serializers
from rest_framework.generics import RetrieveAPIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from .models import User
from .permissions import capabilities_for

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="role.code", read_only=True)
    capabilities = serializers.SerializerMethodField()

    def get_capabilities(self, obj):
        return sorted(capabilities_for(obj))

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "phone", "role", "capabilities")
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
