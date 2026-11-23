"""Crée (ou réinitialise) les comptes et recettes de démonstration.

    python manage.py seed_demo            # local / Docker de test
    python manage.py seed_demo --force    # forcer, même en production (déconseillé)
    python manage.py seed_demo --remove   # supprimer les comptes de démo

Les comptes de démo sont supprimés puis recréés : la commande peut être relancée
autant de fois que voulu, sans doublon, et remet les données dans leur état
initial. Les autres comptes ne sont jamais touchés.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from recipes.demo_data import DEMO_PASSWORD, DEMO_RECIPES, DEMO_USERS
from recipes.serializers import RecipeSerializer


class Command(BaseCommand):
    help = "Crée ou réinitialise les comptes et recettes de démonstration."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Autoriser l'exécution en production (comptes au mot de passe public !).",
        )
        parser.add_argument("--remove", action="store_true", help="Supprimer les comptes de démo, sans les recréer.")

    @transaction.atomic
    def handle(self, *args, force=False, remove=False, **options):
        if settings.IS_PRODUCTION and not force and not remove:
            raise CommandError(
                "Refusé : environnement de production. Les comptes de démo ont un mot de passe "
                "public. Utiliser --force uniquement si c'est vraiment voulu."
            )

        emails = [u["email"] for u in DEMO_USERS]
        deleted = User.objects.filter(email__in=emails).count()
        User.objects.filter(email__in=emails).delete()  # cascade : recettes, sessions

        if remove:
            self.stdout.write(self.style.SUCCESS(f"{deleted} compte(s) de démo supprimé(s)."))
            return

        for data in DEMO_USERS:
            user = User.objects.create_user(data["email"], DEMO_PASSWORD, name=data["name"])
            for recipe in DEMO_RECIPES.get(data["email"], []):
                serializer = RecipeSerializer(data=recipe)
                serializer.is_valid(raise_exception=True)
                serializer.save(owner=user)
            self.stdout.write(f"  {user.email:<24} {user.recipes.count()} recette(s)")

        self.stdout.write(self.style.SUCCESS(f"Données de démo prêtes. Mot de passe des comptes : {DEMO_PASSWORD}"))
