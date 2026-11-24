from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Gestionnaire d'utilisateurs identifiés par leur e-mail (pas de username)."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)  # NF-08 : mot de passe haché
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra["is_staff"] = True
        extra["is_superuser"] = True
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    """Utilisateur (cahier des charges §5) : id, e-mail, nom, mot de passe, date de création."""

    username = None
    first_name = None
    last_name = None
    email = models.EmailField("e-mail", unique=True)
    name = models.CharField("nom", max_length=150, blank=True)
    # Identifiant stable du compte partagé (claim `sub` OIDC) ; vide pour un compte local.
    oidc_sub = models.CharField("identifiant SSO", max_length=255, unique=True, null=True, blank=True)
    # `date_joined` (hérité) sert de date de création.

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
