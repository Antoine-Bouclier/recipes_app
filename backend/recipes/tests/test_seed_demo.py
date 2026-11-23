from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from cooking.models import CookingSession
from recipes.demo_data import DEMO_PASSWORD, DEMO_RECIPES
from recipes.models import Recipe


def seed(*args):
    call_command("seed_demo", *args, stdout=StringIO())


class SeedDemoTests(TestCase):
    def test_creates_demo_accounts_and_recipes(self):
        seed()
        demo = User.objects.get(email="demo@recettes.local")
        self.assertTrue(demo.check_password(DEMO_PASSWORD))
        self.assertEqual(demo.recipes.count(), len(DEMO_RECIPES["demo@recettes.local"]))
        self.assertTrue(User.objects.filter(email="autre@recettes.local").exists())
        # Au moins une recette avec plusieurs minuteurs, dont un très court, pour tester F-22/F-23.
        short = Recipe.objects.get(owner=demo, title__startswith="Test des minuteurs")
        self.assertTrue(all(s.timer_seconds <= 30 for s in short.steps.exclude(timer_seconds=None)))
        self.assertGreaterEqual(short.steps.exclude(timer_seconds=None).count(), 2)

    def test_demo_data_is_valid_and_covers_every_category(self):
        seed()
        categories = set(Recipe.objects.values_list("category", flat=True))
        self.assertEqual(categories, {c for c, _ in Recipe.Category.choices})

    def test_rerun_resets_without_duplicates(self):
        seed()
        demo = User.objects.get(email="demo@recettes.local")
        recipe = demo.recipes.first()
        recipe.title = "modifié"
        recipe.save()
        CookingSession.objects.create(recipe=recipe, user=demo, checked_steps=[1])
        seed()
        self.assertEqual(User.objects.filter(email="demo@recettes.local").count(), 1)
        self.assertEqual(Recipe.objects.count(), sum(len(r) for r in DEMO_RECIPES.values()))
        self.assertFalse(Recipe.objects.filter(title="modifié").exists())
        self.assertFalse(CookingSession.objects.exists())

    def test_other_accounts_are_untouched(self):
        real = User.objects.create_user("vrai@ex.com", "Sel-poivre-42")
        Recipe.objects.create(owner=real, title="Ma recette")
        seed()
        seed("--remove")
        self.assertTrue(Recipe.objects.filter(owner=real).exists())
        self.assertFalse(User.objects.filter(email__endswith="@recettes.local").exists())

    def test_demo_accounts_only_see_their_recipes(self):  # NF-08
        seed()
        client = APIClient()
        self.assertTrue(client.login(email="demo@recettes.local", password=DEMO_PASSWORD))
        titles = [r["title"] for r in client.get("/api/recipes/").data]
        self.assertNotIn("Gratin dauphinois", titles)
        self.assertIn("Spaghetti à la bolognaise", titles)

    @override_settings(IS_PRODUCTION=True)
    def test_refused_in_production(self):
        with self.assertRaises(CommandError):
            seed()
        self.assertFalse(User.objects.exists())

    @override_settings(IS_PRODUCTION=True)
    def test_force_and_remove_allowed_in_production(self):
        seed("--force")
        self.assertTrue(User.objects.filter(email="demo@recettes.local").exists())
        seed("--remove")
        self.assertFalse(User.objects.exists())
