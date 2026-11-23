from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from recipes.models import Recipe


class CookingSession(models.Model):
    """Avancement d'un utilisateur sur une recette (cahier des charges §5, F-15).

    Stocké à part pour ne jamais modifier la recette quand on la cuisine.
    Une seule session par couple (utilisateur, recette).

    `timers` est une liste d'objets :
        {"id": str, "step": int|null, "label": str, "duration": int (s),
         "end_at": int|null (ms epoch), "paused": bool, "remaining": int|null (ms),
         "alerted": bool (alerte de fin déjà donnée)}
    On stocke l'heure de fin et non le temps restant (F-25) ; `remaining` ne sert
    que pour un minuteur en pause.
    """

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="cooking_sessions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cooking_sessions")
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checked_steps = models.JSONField(default=list, blank=True)
    checked_ingredients = models.JSONField(default=list, blank=True)
    timers = models.JSONField(default=list, blank=True)
    # Portions choisies pour cette fois-ci (F-08) ; null = celles de la recette.
    servings = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "recipe"], name="one_session_per_user_recipe")]

    def __str__(self):
        return f"Session {self.user_id} / {self.recipe_id}"
