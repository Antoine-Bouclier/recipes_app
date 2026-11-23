from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from recipes.serializers import RecipeSerializer

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request,
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
