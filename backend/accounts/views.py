from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from recipes.serializers import RecipeSerializer

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

MODEL_BACKEND = "django.contrib.auth.backends.ModelBackend"


class IPRateThrottle(SimpleRateThrottle):
    """Limite par adresse IP ; le débit est lu dans DEFAULT_THROTTLE_RATES[scope]."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class RegisterThrottle(IPRateThrottle):
    scope = "register"


class LoginThrottle(IPRateThrottle):
    scope = "login"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user, backend=MODEL_BACKEND)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # On passe la requête Django d'origine (et non l'enveloppe DRF) : django-axes y
    # note le blocage, relu ensuite par son middleware (accounts/security.py).
    user = authenticate(
        request._request,
        email=serializer.validated_data["email"].lower(),
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response({"detail": "E-mail ou mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "DELETE"])
def me(request):
    """GET : profil courant. DELETE : suppression du compte et des données (NF-09)."""
    if request.method == "DELETE":
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"detail": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        logout(request)
        for recipe in user.recipes.all():
            recipe.delete_photo()  # les fichiers ne sont pas supprimés par la cascade
        user.delete()  # cascade : recettes, ingrédients, étapes, sessions
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
def export(request):
    """Export JSON de toutes les données de l'utilisateur (NF-09)."""
    recipes = request.user.recipes.prefetch_related("ingredients", "steps")
    response = Response(
        {
            "exported_at": timezone.now().isoformat(),
            "user": UserSerializer(request.user).data,
            "recipes": RecipeSerializer(recipes, many=True, context={"request": request}).data,
        }
    )
    response["Content-Disposition"] = 'attachment; filename="mes-recettes.json"'
    return response
