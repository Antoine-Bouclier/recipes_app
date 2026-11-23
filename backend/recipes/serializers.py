from django.db import transaction
from rest_framework import serializers

from .models import Ingredient, Recipe, Step


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ("id", "quantity", "unit", "name")
        read_only_fields = ("id",)


class StepSerializer(serializers.ModelSerializer):
    class Meta:
        model = Step
        fields = ("id", "text", "timer_seconds", "timer_label")
        read_only_fields = ("id",)

    def validate_timer_seconds(self, value):
        if value == 0:
            return None
        return value


class RecipeListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste (F-06)."""

    class Meta:
        model = Recipe
        fields = (
            "id", "title", "description", "photo", "servings", "prep_minutes",
            "cook_minutes", "category", "tags", "favorite", "updated_at",
        )


class RecipeSerializer(serializers.ModelSerializer):
    """Recette complète. Ingrédients et étapes sont écrits en bloc :
    l'ordre de la liste envoyée devient l'ordre en base (F-03, F-04)."""

    ingredients = IngredientSerializer(many=True, required=False)
    steps = StepSerializer(many=True, required=False)

    class Meta:
        model = Recipe
        fields = (
            "id", "title", "description", "photo", "servings", "prep_minutes",
            "cook_minutes", "category", "tags", "favorite", "created_at",
            "updated_at", "ingredients", "steps",
        )
        read_only_fields = ("id", "photo", "created_at", "updated_at")

    def validate_tags(self, value):
        if not isinstance(value, list) or not all(isinstance(t, str) for t in value):
            raise serializers.ValidationError("Les étiquettes doivent être une liste de textes.")
        seen, clean = set(), []
        for tag in (t.strip().lower() for t in value):
            if tag and tag not in seen:
                seen.add(tag)
                clean.append(tag[:40])
        return clean

    @staticmethod
    def _replace_children(recipe, ingredients, steps):
        if ingredients is not None:
            recipe.ingredients.all().delete()
            Ingredient.objects.bulk_create(
                Ingredient(recipe=recipe, order=i, **data) for i, data in enumerate(ingredients)
            )
        if steps is not None:
            recipe.steps.all().delete()
            Step.objects.bulk_create(Step(recipe=recipe, order=i, **data) for i, data in enumerate(steps))

    @transaction.atomic
    def create(self, validated_data):
        ingredients = validated_data.pop("ingredients", [])
        steps = validated_data.pop("steps", [])
        recipe = Recipe.objects.create(**validated_data)
        self._replace_children(recipe, ingredients, steps)
        return recipe

    @transaction.atomic
    def update(self, instance, validated_data):
        ingredients = validated_data.pop("ingredients", None)
        steps = validated_data.pop("steps", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._replace_children(instance, ingredients, steps)
        return instance


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = ("photo",)
