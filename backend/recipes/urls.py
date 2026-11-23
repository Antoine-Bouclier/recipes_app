from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cooking.views import CookingSessionView

from .views import RecipeViewSet

router = DefaultRouter()
router.register("recipes", RecipeViewSet, basename="recipe")

urlpatterns = [
    path("", include(router.urls)),
    path("recipes/<int:recipe_id>/session/", CookingSessionView.as_view(), name="cooking-session"),
]
