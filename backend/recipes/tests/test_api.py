import shutil
import tempfile
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

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
        self.url = f"/api/recipes/{self.recipe.id}/photo/"

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def image(self, size=(4, 4), fmt="PNG", mode="RGB", exif=None, name="crepes.png"):
        buf = BytesIO()
        img = Image.new(mode, size, (200, 30, 30, 0) if mode == "RGBA" else "red")
        img.save(buf, fmt, **({"exif": exif} if exif else {}))
        buf.name = name
        buf.seek(0)
        return buf

    def files_on_disk(self):
        return sorted(str(p.relative_to(self.media)) for p in Path(self.media).rglob("*") if p.is_file())

    def test_upload_and_remove_photo(self):  # F-01 (photo facultative)
        r = self.client.post(self.url, {"photo": self.image()}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.recipe.refresh_from_db()
        self.assertTrue(self.recipe.photo.name.endswith(".jpg"))
        self.assertTrue(self.recipe.photo_thumb.name.endswith("-mini.jpg"))
        self.assertEqual(len(self.files_on_disk()), 2)
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        self.recipe.refresh_from_db()
        self.assertFalse(self.recipe.photo)
        self.assertFalse(self.recipe.photo_thumb)
        self.assertEqual(self.files_on_disk(), [])

    def test_large_photo_is_resized_rotated_and_stripped(self):  # §7 : images redimensionnées, RGPD
        exif = Image.Exif()
        exif[0x0112] = 6  # orientation : rotation de 90°
        exif[0x8825] = {2: (48.0, 51.0, 24.0)}  # coordonnées GPS
        upload = self.image(size=(3000, 2000), fmt="JPEG", exif=exif.tobytes(), name="photo.jpg")
        r = self.client.post(self.url, {"photo": upload}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.recipe.refresh_from_db()
        with Image.open(self.recipe.photo.path) as photo:
            self.assertEqual(photo.format, "JPEG")
            self.assertEqual(photo.size, (1067, 1600))  # portrait après rotation, ≤ 1600 px
            self.assertEqual(len(photo.getexif()), 0)  # plus aucune métadonnée (GPS…)
        with Image.open(self.recipe.photo_thumb.path) as thumb:
            self.assertEqual(max(thumb.size), 600)

    def test_transparent_png_gets_white_background(self):
        r = self.client.post(self.url, {"photo": self.image(mode="RGBA")}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.recipe.refresh_from_db()
        with Image.open(self.recipe.photo.path) as photo:
            self.assertEqual(photo.mode, "RGB")
            self.assertEqual(photo.getpixel((0, 0)), (255, 255, 255))

    def test_replacing_photo_deletes_old_files(self):
        self.client.post(self.url, {"photo": self.image()}, format="multipart")
        first = self.files_on_disk()
        self.client.post(self.url, {"photo": self.image()}, format="multipart")
        second = self.files_on_disk()
        self.assertEqual(len(second), 2)
        self.assertFalse(set(first) & set(second))

    def test_deleting_recipe_or_account_deletes_files(self):
        self.client.post(self.url, {"photo": self.image()}, format="multipart")
        self.client.delete(f"/api/recipes/{self.recipe.id}/")
        self.assertEqual(self.files_on_disk(), [])
        other = Recipe.objects.create(owner=self.user, title="Gaufres")
        self.client.post(f"/api/recipes/{other.id}/photo/", {"photo": self.image()}, format="multipart")
        self.assertEqual(len(self.files_on_disk()), 2)
        r = self.client.delete("/api/auth/me/", {"password": "Sel-poivre-42"})
        self.assertEqual(r.status_code, 204)
        self.assertEqual(self.files_on_disk(), [])

    def test_rejects_non_image(self):
        buf = BytesIO(b"not an image")
        buf.name = "x.png"
        r = self.client.post(self.url, {"photo": buf}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_rejects_too_heavy_file(self):
        with patch("recipes.images.MAX_UPLOAD_BYTES", 10):
            r = self.client.post(self.url, {"photo": self.image()}, format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("trop lourde", str(r.data))

    def test_list_returns_thumbnail(self):
        self.client.post(self.url, {"photo": self.image()}, format="multipart")
        item = self.client.get("/api/recipes/").data[0]
        self.assertTrue(item["photo_thumb"].endswith("-mini.jpg"))
