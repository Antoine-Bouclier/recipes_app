from django.contrib import admin

from .models import Ingredient, Recipe, Step


class IngredientInline(admin.TabularInline):
    model = Ingredient
    extra = 0


class StepInline(admin.TabularInline):
    model = Step
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "category", "favorite", "updated_at")
    list_filter = ("category", "favorite")
    search_fields = ("title", "ingredients__name")
    inlines = [IngredientInline, StepInline]
