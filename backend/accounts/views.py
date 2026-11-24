from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.utils.module_loading import import_string
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from recipes.serializers import RecipeSerializer

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


PASSWORD_LOGIN_DISABLED = {"detail": "Connectez-vous avec votre compte partagé."}


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_config(request):
    """Modes de connexion proposés par l'interface."""
    return Response(
        {
            "sso": settings.SSO_ENABLED,
            "sso_login_url": "/oidc/authenticate/" if settings.SSO_ENABLED else None,
            "password_login": settings.PASSWORD_LOGIN_ENABLED,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    if not settings.PASSWORD_LOGIN_ENABLED:
        return Response(PASSWORD_LOGIN_DISABLED, status=status.HTTP_403_FORBIDDEN)
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    if not settings.PASSWORD_LOGIN_ENABLED:
        return Response(PASSWORD_LOGIN_DISABLED, status=status.HTTP_403_FORBIDDEN)
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
    """Déconnexion. Pour un compte partagé, renvoie aussi l'adresse qui ferme la
    session du fournisseur d'identité, que l'interface ouvre ensuite."""
    redirect = None
    logout_method = getattr(settings, "OIDC_OP_LOGOUT_URL_METHOD", "")
    if request.user.is_authenticated and request.user.oidc_sub and logout_method:
        redirect = import_string(logout_method)(request)
    logout(request)
    if redirect:
        return Response({"redirect": redirect})
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "DELETE"])
def me(request):
    """GET : profil courant. DELETE : suppression du compte et des données (NF-09)."""
    if request.method == "DELETE":
        user = request.user
        if user.has_usable_password():
            if not user.check_password(request.data.get("password", "")):
                return Response({"detail": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        # Compte partagé, sans mot de passe local : on confirme en retapant l'adresse e-mail.
        elif request.data.get("email", "").strip().lower() != user.email:
            return Response({"detail": "Adresse e-mail incorrecte."}, status=status.HTTP_400_BAD_REQUEST)
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
