from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    # Faux pour un compte partagé (connexion unique) : pas de mot de passe propre à l'app.
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "name", "date_joined", "has_password")
        read_only_fields = ("id", "date_joined", "has_password")

    def get_has_password(self, user):
        return user.has_usable_password()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("email", "name", "password")

    def validate_email(self, value):
        value = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse.")
        return value

    def validate(self, attrs):
        password_validation.validate_password(attrs["password"], User(email=attrs["email"], name=attrs.get("name", "")))
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={"input_type": "password"})
