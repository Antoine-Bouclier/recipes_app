from unittest.mock import patch

from django.test import RequestFactory, override_settings
from rest_framework.test import APITestCase

from accounts.models import User
from accounts.security import client_ip
from accounts.views import LoginThrottle, RegisterThrottle

LOGIN = "/api/auth/login/"


class LoginLockoutTests(APITestCase):
    """Blocage après trop d'échecs (django-axes, NF-08)."""

    def setUp(self):
        User.objects.create_user("ana@ex.com", "Sel-poivre-42")

    def attempt(self, password, ip="10.0.0.1", email="ana@ex.com"):
        return self.client.post(LOGIN, {"email": email, "password": password}, REMOTE_ADDR=ip)

    def test_locked_after_five_failures_even_with_right_password(self):
        for _ in range(4):
            self.assertEqual(self.attempt("faux").status_code, 400)
        r = self.attempt("faux")  # 5e échec : blocage
        self.assertEqual(r.status_code, 429)
        r = self.attempt("Sel-poivre-42")
        self.assertEqual(r.status_code, 429)
        self.assertIn("Trop de tentatives", r.json()["detail"])

    def test_lockout_is_per_ip(self):
        for _ in range(5):
            self.attempt("faux", ip="10.0.0.1")
        # Le vrai propriétaire, depuis une autre adresse, peut toujours se connecter.
        self.assertEqual(self.attempt("Sel-poivre-42", ip="10.0.0.2").status_code, 200)

    def test_lockout_is_per_account(self):
        User.objects.create_user("bob@ex.com", "Sel-poivre-42")
        for _ in range(5):
            self.attempt("faux")
        self.assertEqual(self.attempt("Sel-poivre-42", email="bob@ex.com").status_code, 200)

    def test_success_resets_the_counter(self):
        for _ in range(4):
            self.attempt("faux")
        self.assertEqual(self.attempt("Sel-poivre-42").status_code, 200)
        self.client.post("/api/auth/logout/")
        for _ in range(4):
            self.assertEqual(self.attempt("faux").status_code, 400)


class RateLimitTests(APITestCase):
    """Limites par adresse IP (throttles DRF)."""

    def test_register_rate_limit(self):
        with patch.object(RegisterThrottle, "THROTTLE_RATES", {"register": "2/hour"}):
            for i in range(2):
                r = self.client.post("/api/auth/register/", {"email": f"u{i}@ex.com", "password": "Sel-poivre-42"})
                self.assertEqual(r.status_code, 201)
                self.client.post("/api/auth/logout/")
            r = self.client.post("/api/auth/register/", {"email": "u9@ex.com", "password": "Sel-poivre-42"})
            self.assertEqual(r.status_code, 429)

    def test_login_rate_limit(self):
        User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        with patch.object(LoginThrottle, "THROTTLE_RATES", {"login": "3/minute"}):
            for i in range(3):
                self.client.post(LOGIN, {"email": f"x{i}@ex.com", "password": "faux"})
            r = self.client.post(LOGIN, {"email": "ana@ex.com", "password": "Sel-poivre-42"})
            self.assertEqual(r.status_code, 429)


class ClientIpTests(APITestCase):
    def request(self, **meta):
        return RequestFactory().get("/", **meta)

    def test_without_proxy_uses_remote_addr(self):
        req = self.request(REMOTE_ADDR="1.2.3.4", HTTP_X_FORWARDED_FOR="6.6.6.6")
        self.assertEqual(client_ip(req), "1.2.3.4")  # en-tête ignoré : falsifiable

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_behind_one_proxy_uses_last_forwarded_entry(self):
        # Le client a tenté de se faire passer pour 6.6.6.6 ; le proxy a ajouté sa vraie IP.
        req = self.request(REMOTE_ADDR="172.18.0.1", HTTP_X_FORWARDED_FOR="6.6.6.6, 5.6.7.8")
        self.assertEqual(client_ip(req), "5.6.7.8")
