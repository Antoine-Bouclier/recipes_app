from rest_framework.test import APITestCase

from accounts.models import User
from cooking.models import CookingSession
from recipes.models import Ingredient, Recipe, Step


class CookingSessionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ana@ex.com", "Sel-poivre-42")
        self.client.force_authenticate(self.user)
        self.recipe = Recipe.objects.create(owner=self.user, title="Crêpes")
        self.s1 = Step.objects.create(recipe=self.recipe, order=0, text="Mélanger", timer_seconds=60)
        self.s2 = Step.objects.create(recipe=self.recipe, order=1, text="Cuire")
        self.i1 = Ingredient.objects.create(recipe=self.recipe, name="farine")
        self.url = f"/api/recipes/{self.recipe.id}/session/"

    def test_get_creates_empty_session(self):
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["checked_steps"], [])
        self.assertEqual(CookingSession.objects.count(), 1)

    def test_progress_is_saved(self):  # F-15, F-25
        timer = {"id": "t1", "step": self.s1.id, "label": "Mélanger", "duration": 60, "end_at": 1_800_000_000_000}
        r = self.client.put(
            self.url,
            {"checked_steps": [self.s1.id, 99999, self.s1.id], "checked_ingredients": [self.i1.id], "timers": [timer]},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.get(self.url)
        self.assertEqual(r.data["checked_steps"], [self.s1.id])  # ids inconnus et doublons retirés
        self.assertEqual(r.data["checked_ingredients"], [self.i1.id])
        self.assertEqual(r.data["timers"][0]["end_at"], 1_800_000_000_000)
        self.assertFalse(r.data["timers"][0]["paused"])

    def test_servings_are_saved(self):  # F-08 en mode cuisine
        self.assertIsNone(self.client.get(self.url).data["servings"])
        r = self.client.put(self.url, {"servings": 8}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.client.get(self.url).data["servings"], 8)
        self.assertEqual(self.client.put(self.url, {"servings": 0}, format="json").status_code, 400)
        self.assertEqual(self.client.put(self.url, {"servings": None}, format="json").status_code, 200)

    def test_invalid_timer(self):
        r = self.client.put(self.url, {"timers": [{"id": "t", "duration": 0}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_reset(self):  # F-16
        self.client.put(self.url, {"checked_steps": [self.s1.id]}, format="json")
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        self.assertEqual(self.client.get(self.url).data["checked_steps"], [])

    def test_other_user_cannot_access(self):  # NF-08
        other = User.objects.create_user("bob@ex.com", "Sel-poivre-42")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(self.url).status_code, 404)
