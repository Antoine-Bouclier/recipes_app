"""Connexion unique (OIDC) : rattachement des comptes et API associée."""
from django.core.exceptions import SuspiciousOperation
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from accounts.models import User
from accounts.oidc import SSOBackend

OIDC = dict(
    SSO_ENABLED=True,
    PASSWORD_LOGIN_ENABLED=False,
    OIDC_RP_CLIENT_ID="recettes",
    OIDC_RP_CLIENT_SECRET="secret",
    OIDC_OP_AUTHORIZATION_ENDPOINT="https://auth.example.fr/application/o/authorize/",
    OIDC_OP_TOKEN_ENDPOINT="https://auth.example.fr/application/o/token/",
    OIDC_OP_USER_ENDPOINT="https://auth.example.fr/application/o/userinfo/",
    OIDC_OP_JWKS_ENDPOINT="https://auth.example.fr/application/o/recettes/jwks/",
    OIDC_OP_LOGOUT_ENDPOINT="https://auth.example.fr/application/o/recettes/end-session/",
    OIDC_OP_LOGOUT_URL_METHOD="accounts.oidc.provider_logout_url",
    OIDC_RP_SIGN_ALGO="RS256",
    LOGOUT_REDIRECT_URL="/",
)


def claims(**extra):
    return {"sub": "abc123", "email": "Ana@Ex.com", "name": "Ana", **extra}


@override_settings(**OIDC)
class SSOBackendTests(TestCase):
    def login(self, c):
        """Même enchaînement que mozilla-django-oidc après validation du jeton."""
        backend = SSOBackend()
        assert backend.verify_claims(c)
        users = backend.filter_users_by_claims(c)
        if len(users) == 1:
            return backend.update_user(users[0], c)
        return backend.create_user(c)

    def test_first_login_creates_account_without_local_password(self):
        user = self.login(claims())
        self.assertEqual((user.email, user.name, user.oidc_sub), ("ana@ex.com", "Ana", "abc123"))
        self.assertFalse(user.has_usable_password())

    def test_next_login_reuses_account_and_syncs_profile(self):
        first = self.login(claims())
        again = self.login(claims(email="ana.b@ex.com", name="Ana B."))
        self.assertEqual(first.pk, again.pk)
        self.assertEqual((again.email, again.name), ("ana.b@ex.com", "Ana B."))
        self.assertEqual(User.objects.count(), 1)

    def test_unverified_email_never_takes_over_local_account(self):
        User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        with self.assertRaises(SuspiciousOperation):
            self.login(claims(email_verified=False))
        self.assertIsNone(User.objects.get().oidc_sub)

    def test_verified_email_links_existing_local_account(self):
        local = User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        user = self.login(claims(email_verified=True))
        self.assertEqual(user.pk, local.pk)
        self.assertEqual(user.oidc_sub, "abc123")

    def test_claims_without_email_are_rejected(self):
        self.assertFalse(SSOBackend().verify_claims({"sub": "abc123"}))


@override_settings(**OIDC)
class SSOApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ana@ex.com", password=None, oidc_sub="abc123")

    def test_config_announces_sso_only(self):
        r = self.client.get("/api/auth/config/")
        self.assertEqual(r.json(), {"sso": True, "sso_login_url": "/oidc/authenticate/", "password_login": False})

    def test_password_login_and_register_are_disabled(self):
        User.objects.create_user("bob@ex.com", "Sel-poivre-42")
        r = self.client.post("/api/auth/login/", {"email": "bob@ex.com", "password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 403)
        r = self.client.post("/api/auth/register/", {"email": "eve@ex.com", "password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 403)

    def test_me_reports_shared_account(self):
        self.client.force_login(self.user)
        self.assertFalse(self.client.get("/api/auth/me/").json()["has_password"])

    def test_logout_returns_provider_logout_url(self):
        self.client.force_login(self.user)
        session = self.client.session
        session["oidc_id_token"] = "jeton"
        session.save()
        r = self.client.post("/api/auth/logout/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["redirect"].startswith(OIDC["OIDC_OP_LOGOUT_ENDPOINT"] + "?"))
        self.assertIn("id_token_hint=jeton", r.json()["redirect"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_delete_shared_account_requires_typing_email(self):
        self.client.force_login(self.user)
        r = self.client.delete("/api/auth/me/", {"email": "autre@ex.com"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.delete("/api/auth/me/", {"email": " Ana@Ex.com "}, format="json")
        self.assertEqual(r.status_code, 204)
        self.assertFalse(User.objects.exists())
