"""Connexion unique (OIDC) avec le compte partagé de tous les sites.

Le fournisseur d'identité (Authentik) authentifie l'utilisateur ; l'application
garde son propre modèle `User`, relié au compte partagé par le claim `sub`.
"""
from urllib.parse import urlencode

from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from mozilla_django_oidc.auth import OIDCAuthenticationBackend


class SSOBackend(OIDCAuthenticationBackend):
    def verify_claims(self, claims):
        return bool(claims.get("sub")) and bool(claims.get("email"))

    def filter_users_by_claims(self, claims):
        users = self.UserModel.objects.filter(oidc_sub=claims["sub"])
        if users.exists():
            return users
        # Première connexion SSO d'un compte local existant : on ne le relie que si
        # le fournisseur garantit que l'adresse appartient bien à cette personne.
        if claims.get("email_verified") is True:
            return self.UserModel.objects.filter(email__iexact=claims["email"], oidc_sub__isnull=True)
        return self.UserModel.objects.none()

    def create_user(self, claims):
        email = self.UserModel.objects.normalize_email(claims["email"]).lower()
        if self.UserModel.objects.filter(email__iexact=email).exists():
            # Adresse déjà prise par un compte local et non vérifiée côté fournisseur.
            raise SuspiciousOperation("Adresse déjà utilisée par un autre compte.")
        # Pas de mot de passe local : la connexion passe toujours par le compte partagé.
        return self.UserModel.objects.create_user(
            email, password=None, name=(claims.get("name") or "")[:150], oidc_sub=claims["sub"]
        )

    def update_user(self, user, claims):
        user.oidc_sub = claims["sub"]
        user.name = (claims.get("name") or user.name)[:150]
        email = self.UserModel.objects.normalize_email(claims["email"]).lower()
        if email != user.email and not self.UserModel.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            user.email = email
        user.save()
        return user


def provider_logout_url(request):
    """URL de déconnexion du fournisseur : ferme aussi la session du compte partagé."""
    params = {"post_logout_redirect_uri": request.build_absolute_uri(settings.LOGOUT_REDIRECT_URL)}
    id_token = request.session.get("oidc_id_token")
    if id_token:
        params["id_token_hint"] = id_token
    return f"{settings.OIDC_OP_LOGOUT_ENDPOINT}?{urlencode(params)}"
