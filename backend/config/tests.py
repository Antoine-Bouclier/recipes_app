from django.conf import settings
from django.test import TestCase

from accounts.models import User

CSP = "Content-Security-Policy"


class ContentSecurityPolicyTests(TestCase):
    def assert_csp(self, response):
        self.assertIn(CSP, response.headers)
        self.assertEqual(response.headers[CSP], settings.CONTENT_SECURITY_POLICY)

    def test_policy_is_strict(self):
        policy = settings.CONTENT_SECURITY_POLICY
        for directive in ("default-src 'self'", "script-src 'self'", "style-src 'self'",
                          "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'",
                          "form-action 'self'"):
            self.assertIn(directive, policy)
        self.assertNotIn("unsafe-inline", policy)
        self.assertNotIn("unsafe-eval", policy)

    def test_header_on_pages_api_and_admin(self):
        for url in ("/", "/recettes/42", "/sw.js", "/manifest.webmanifest", "/api/auth/config/",
                    "/api/recipes/", "/admin/login/"):
            with self.subTest(url=url):
                self.assert_csp(self.client.get(url))

    def test_header_on_admin_for_superuser(self):
        admin = User.objects.create_superuser("admin@ex.com", "Sel-poivre-42")
        self.client.force_login(admin)
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 200)
        self.assert_csp(response)

    def test_index_has_no_inline_code(self):
        """La page doit respecter la CSP : ni script/style inline, ni style=, ni onclick=."""
        html = self.client.get("/").content.decode()
        self.assertNotRegex(html, r"<script(?![^>]*\bsrc=)[^>]*>")
        self.assertNotIn("<style", html)
        self.assertNotRegex(html, r"\sstyle=")
        self.assertNotRegex(html, r"\son[a-z]+=")

    def test_admin_pages_have_no_inline_code(self):
        admin = User.objects.create_superuser("admin@ex.com", "Sel-poivre-42")
        self.client.force_login(admin)
        for url in ("/admin/", "/admin/recipes/recipe/", "/admin/recipes/recipe/add/", "/admin/accounts/user/add/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                html = response.content.decode()
                self.assertNotRegex(html, r"<script(?![^>]*\bsrc=)[^>]*>")
                self.assertNotRegex(html, r"\sstyle=")
                self.assertNotRegex(html, r"\son[a-z]+=")
