from rest_framework.test import APITestCase

from accounts.models import User
from recipes.models import Recipe


class AuthTests(APITestCase):
    def test_register_logs_in_and_hashes_password(self):
        r = self.client.post("/api/auth/register/", {"email": "Ana@Ex.com", "name": "Ana", "password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 201)
        user = User.objects.get()
        self.assertEqual(user.email, "ana@ex.com")
        self.assertNotEqual(user.password, "Sel-poivre-42")  # NF-08
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

    def test_register_rejects_duplicate_and_weak_password(self):
        User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        r = self.client.post("/api/auth/register/", {"email": "ANA@ex.com", "password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/auth/register/", {"email": "bob@ex.com", "password": "123"})
        self.assertEqual(r.status_code, 400)

    def test_login_logout(self):
        User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        r = self.client.post("/api/auth/login/", {"email": "ana@ex.com", "password": "faux"})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/auth/login/", {"email": "Ana@ex.com", "password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 200)
        self.client.post("/api/auth/logout/")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_export_and_delete_account(self):  # NF-09
        user = User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        Recipe.objects.create(owner=user, title="Crêpes")
        self.client.force_authenticate(user)
        r = self.client.get("/api/auth/export/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["recipes"][0]["title"], "Crêpes")
        self.assertEqual(self.client.delete("/api/auth/me/", {"password": "faux"}).status_code, 400)
        self.assertEqual(self.client.delete("/api/auth/me/", {"password": "Sel-poivre-42"}).status_code, 204)
        self.assertFalse(User.objects.exists())
        self.assertFalse(Recipe.objects.exists())
