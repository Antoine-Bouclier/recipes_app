import shutil
import tempfile
from io import BytesIO

from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from accounts.models import User
from recipes.models import Recipe

PAYLOAD = {
    "title": "Pâtes bolognaise",
    "description": "Classique",
    "servings": 4,
    "prep_minutes": 15,
    "cook_minutes": 40,
    "category": "plat",
    "tags": ["Italien", " rapide ", "italien"],
    "ingredients": [
        {"quantity": "400", "unit": "g", "name": "spaghetti"},
        {"quantity": None, "unit": "", "name": "sel"},
    ],
    "steps": [
        {"text": "Faire revenir l'oignon", "timer_seconds": 300, "timer_label": "Oignon"},
        {"text": "Mijoter la sauce", "timer_seconds": 1800},
        {"text": "Servir", "timer_seconds": 0},
    ],
}


class RecipeApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        self.other = User.objects.create_user("bob@ex.com", "Sel-poivre-42")
        self.client.force_authenticate(self.user)

    def create(self, **overrides):
        r = self.client.post("/api/recipes/", {**PAYLOAD, **overrides}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/recipes/").status_code, 403)

    def test_create_with_ingredients_and_steps(self):  # F-01 à F-03
        data = self.create()
        self.assertEqual([i["name"] for i in data["ingredients"]], ["spaghetti", "sel"])
        self.assertEqual([s["timer_seconds"] for s in data["steps"]], [300, 1800, None])
        self.assertEqual(data["tags"], ["italien", "rapide"])

    def test_reorder_edit_delete_steps(self):  # F-04
        data = self.create()
        steps = data["steps"]
        new_steps = [steps[2], {**steps[0], "text": "Oignon émincé"}]
        r = self.client.patch(f"/api/recipes/{data['id']}/", {"steps": new_steps}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([s["text"] for s in r.data["steps"]], ["Servir", "Oignon émincé"])
        self.assertEqual(len(r.data["ingredients"]), 2)  # non envoyés => inchangés

    def test_update_and_delete(self):  # F-05
        data = self.create()
        r = self.client.patch(f"/api/recipes/{data['id']}/", {"title": "Bolo"}, format="json")
        self.assertEqual(r.data["title"], "Bolo")
        self.assertEqual(self.client.delete(f"/api/recipes/{data['id']}/").status_code, 204)
        self.assertFalse(Recipe.objects.exists())

    def test_search_and_filters(self):  # F-06, F-07, F-09
        self.create()
        self.create(title="Tarte aux pommes", category="dessert", tags=["sucré"], favorite=True,
                    ingredients=[{"name": "pommes"}], steps=[])
        def titles(qs):
            return [r["title"] for r in self.client.get(f"/api/recipes/{qs}").data]
        self.assertEqual(len(titles("")), 2)
        self.assertEqual(titles("?q=spagh"), ["Pâtes bolognaise"])
        self.assertEqual(titles("?q=tarte"), ["Tarte aux pommes"])
        self.assertEqual(titles("?category=dessert"), ["Tarte aux pommes"])
        self.assertEqual(titles("?tag=italien"), ["Pâtes bolognaise"])
        self.assertEqual(titles("?favorite=1"), ["Tarte aux pommes"])

    def test_users_only_see_their_recipes(self):  # NF-08
        data = self.create()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/recipes/").data, [])
        self.assertEqual(self.client.get(f"/api/recipes/{data['id']}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/recipes/{data['id']}/").status_code, 404)

    def test_invalid_tags(self):
        r = self.client.post("/api/recipes/", {**PAYLOAD, "tags": "pas une liste"}, format="json")
        self.assertEqual(r.status_code, 400)


class PhotoTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.user = User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        self.client.force_authenticate(self.user)
        self.recipe = Recipe.objects.create(owner=self.user, title="Crêpes")

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def png(self):
        buf = BytesIO()
        Image.new("RGB", (4, 4), "red").save(buf, "PNG")
        buf.name = "crepes.png"
        buf.seek(0)
        return buf

    def test_upload_and_remove_photo(self):  # F-01 (photo facultative)
        url = f"/api/recipes/{self.recipe.id}/photo/"
        r = self.client.post(url, {"photo": self.png()}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.recipe.refresh_from_db()
        self.assertTrue(self.recipe.photo)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.recipe.refresh_from_db()
        self.assertFalse(self.recipe.photo)

    def test_rejects_non_image(self):
        buf = BytesIO(b"not an image")
        buf.name = "x.png"
        r = self.client.post(f"/api/recipes/{self.recipe.id}/photo/", {"photo": buf}, format="multipart")
        self.assertEqual(r.status_code, 400)
