from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Recipe
from .serializers import PhotoSerializer, RecipeListSerializer, RecipeSerializer


class RecipeViewSet(viewsets.ModelViewSet):
    """CRUD des recettes de l'utilisateur connecté (F-01 à F-09, NF-08).

    Filtres de la liste : `q` (titre ou ingrédient), `category`, `tag`, `favorite=1`.
    """

    def get_queryset(self):
        qs = Recipe.objects.filter(owner=self.request.user)
        if self.action != "list":
            return qs.prefetch_related("ingredients", "steps")
        params = self.request.query_params
        q = params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(ingredients__name__icontains=q)).distinct()
        if params.get("category"):
            qs = qs.filter(category=params["category"])
        if params.get("tag"):
            # Les étiquettes sont stockées en liste JSON : on cherche la valeur entre guillemets.
            qs = qs.filter(tags__icontains=f'"{params["tag"].strip().lower()}"')
        if params.get("favorite") in ("1", "true"):
            qs = qs.filter(favorite=True)
        return qs

    def get_serializer_class(self):
        return RecipeListSerializer if self.action == "list" else RecipeSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        instance.delete_photo()
        instance.delete()

    @action(detail=True, methods=["post", "delete"], parser_classes=[MultiPartParser, FormParser])
    def photo(self, request, pk=None):
        """POST (multipart, champ `photo`) : ajoute/remplace la photo. DELETE : la retire."""
        recipe = self.get_object()
        if request.method == "DELETE":
            if recipe.photo or recipe.photo_thumb:
                recipe.delete_photo()
                recipe.save(update_fields=["photo", "photo_thumb", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = PhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recipe)
        data = RecipeSerializer(recipe, context={"request": request}).data
        return Response({"photo": data["photo"], "photo_thumb": data["photo_thumb"]})
