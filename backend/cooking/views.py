from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.models import Recipe

from .models import CookingSession
from .serializers import CookingSessionSerializer


class CookingSessionView(APIView):
    """Session de cuisine de l'utilisateur pour une recette.

    GET    : renvoie la session (créée vide si besoin).
    PUT    : remplace l'avancement (étapes/ingrédients cochés, minuteurs) — F-15.
    DELETE : réinitialise l'avancement — F-16.
    """

    def _session(self, request, recipe_id):
        recipe = get_object_or_404(Recipe, pk=recipe_id, owner=request.user)
        session, _ = CookingSession.objects.get_or_create(recipe=recipe, user=request.user)
        return session

    def get(self, request, recipe_id):
        return Response(CookingSessionSerializer(self._session(request, recipe_id)).data)

    def put(self, request, recipe_id):
        session = self._session(request, recipe_id)
        serializer = CookingSessionSerializer(session, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, recipe_id):
        recipe = get_object_or_404(Recipe, pk=recipe_id, owner=request.user)
        CookingSession.objects.filter(recipe=recipe, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
