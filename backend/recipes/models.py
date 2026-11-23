from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Recipe(models.Model):
    """Recette (cahier des charges §5, F-01)."""

    class Category(models.TextChoices):
        ENTREE = "entree", "Entrée"
        PLAT = "plat", "Plat"
        DESSERT = "dessert", "Dessert"
        ACCOMPAGNEMENT = "accompagnement", "Accompagnement"
        BOISSON = "boisson", "Boisson"
        AUTRE = "autre", "Autre"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipes")
    title = models.CharField("titre", max_length=200)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="recipes/%Y/%m/", blank=True)
    servings = models.PositiveSmallIntegerField("portions", default=4, validators=[MinValueValidator(1)])
    prep_minutes = models.PositiveIntegerField("temps de préparation (min)", default=0)
    cook_minutes = models.PositiveIntegerField("temps de cuisson (min)", default=0)
    category = models.CharField("catégorie", max_length=20, choices=Category.choices, default=Category.PLAT)
    tags = models.JSONField("étiquettes", default=list, blank=True)
    favorite = models.BooleanField("favori", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class Ingredient(models.Model):
    """Ingrédient d'une recette (F-02)."""

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="ingredients")
    order = models.PositiveIntegerField("ordre", default=0)
    quantity = models.DecimalField("quantité", max_digits=8, decimal_places=2, null=True, blank=True)
    unit = models.CharField("unité", max_length=30, blank=True)
    name = models.CharField("nom", max_length=200)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class Step(models.Model):
    """Étape ordonnée d'une recette, avec durée de minuteur facultative (F-03, F-20)."""

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField("ordre", default=0)
    text = models.TextField("texte")
    timer_seconds = models.PositiveIntegerField("durée du minuteur (s)", null=True, blank=True)
    timer_label = models.CharField("libellé du minuteur", max_length=100, blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.recipe_id}#{self.order}"
