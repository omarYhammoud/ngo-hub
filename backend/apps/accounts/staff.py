from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import User, Role
from .permissions import CanManageStaff


class StaffSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(slug_field='code', queryset=Role.objects.all())
    password = serializers.CharField(write_only=True, required=False, max_length=1024)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'phone', 'email', 'role', 'is_active', 'password']

    def validate(self, data):
        if self.instance is None and not data.get('password'):
            raise serializers.ValidationError({'password': 'required'})
        if 'password' in data:
            candidate = User(username=data.get('username', getattr(self.instance, 'username', '')), first_name=data.get('first_name', ''), last_name=data.get('last_name', ''))
            try:
                validate_password(data['password'], candidate)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({'password': exc.messages})
        return data

    def create(self, data):
        return User.objects.create_user(**data)

    def update(self, instance, data):
        password = data.pop('password', None)
        for key, value in data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        # Portal accounts never gain Django superuser access through this API.
        if instance.role.code != 'SUPER_ADMIN':
            instance.is_superuser = False
        instance.save()
        return instance


class StaffViewSet(viewsets.GenericViewSet):
    permission_classes = [CanManageStaff]
    serializer_class = StaffSerializer
    queryset = User.objects.select_related('role').order_by('username')

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        if 'password' in request.data:
            raise ValidationError({'detail': 'use_password_reset'})
        target = self.get_object()
        # Serialize changes to the administrator set, protecting the last one.
        admins = list(User.objects.select_for_update().filter(role__code='SUPER_ADMIN', is_active=True).order_by('pk'))
        target = User.objects.select_for_update().get(pk=target.pk)
        serializer = self.get_serializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        removing = not data.get('is_active', target.is_active) or data.get('role', target.role).code != 'SUPER_ADMIN'
        if target.pk == request.user.pk and removing:
            raise ValidationError({'detail': 'cannot_disable_self'})
        if target.role.code == 'SUPER_ADMIN' and target.is_active and removing and len(admins) <= 1:
            raise ValidationError({'detail': 'last_super_admin'})
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reset_password')
    @transaction.atomic
    def reset_password(self, request, pk=None):
        target = User.objects.select_for_update().get(pk=self.get_object().pk)
        data = PasswordResetInput(data=request.data, context={'user': target})
        data.is_valid(raise_exception=True)
        target.set_password(data.validated_data['new_password'])
        target.save(update_fields=['password'])
        return Response({'detail': 'password_reset_success'})


class PasswordResetInput(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=1024)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=1024)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'detail': 'password_mismatch'})
        try:
            validate_password(data['new_password'], self.context['user'])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': exc.messages})
        return data
