"""Réglages Django du projet « recettes ».

Toute la configuration variable passe par des variables d'environnement
(voir `.env.example` à la racine du dépôt). Les valeurs par défaut conviennent
au développement local uniquement.
"""
import os
import warnings
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
REPO_DIR = BASE_DIR.parent
FRONTEND_DIR = REPO_DIR / "frontend"


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "on")


DEBUG = env_bool("DJANGO_DEBUG", True)
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
if not DEBUG and SECRET_KEY.startswith("dev-only"):
    raise RuntimeError("DJANGO_SECRET_KEY doit être défini en production.")

ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "axes",
    "accounts",
    "recipes",
    "cooking",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # fichiers statiques en production
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",  # doit rester en dernier
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",  # bloque après trop d'échecs (accounts/security.py)
    "django.contrib.auth.backends.ModelBackend",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [FRONTEND_DIR],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# PostgreSQL via DATABASE_URL (docker compose) ; SQLite par défaut en local.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}", conn_max_age=60
    )
}

AUTH_USER_MODEL = "accounts.User"

# Cache partagé entre les processus Gunicorn (compteurs des limites de débit).
# Table créée par `manage.py createcachetable` (make migrate, démarrage Docker).
CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}}

# --- Protection de la connexion (NF-08, accounts/security.py) ---
# Nombre de proxys de confiance devant Django (1 derrière Caddy/Nginx, 0 sinon).
TRUSTED_PROXY_COUNT = int(os.environ.get("DJANGO_TRUSTED_PROXY_COUNT", "0"))
AXES_FAILURE_LIMIT = int(os.environ.get("DJANGO_LOGIN_FAILURE_LIMIT", "5"))
AXES_COOLOFF_TIME = timedelta(minutes=int(os.environ.get("DJANGO_LOGIN_COOLOFF_MINUTES", "15")))
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]
AXES_USERNAME_FORM_FIELD = "email"
AXES_RESET_ON_SUCCESS = True
AXES_CLIENT_IP_CALLABLE = "accounts.security.client_ip"
AXES_LOCKOUT_CALLABLE = "accounts.security.lockout_response"
AXES_VERBOSE = False

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"  # NF-11
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [FRONTEND_DIR / "static"]
STATIC_ROOT = Path(os.environ.get("DJANGO_STATIC_ROOT", REPO_DIR / "staticfiles"))

# Photos : servies par Django si DJANGO_SERVE_MEDIA=1 (petite installation) ;
# sinon par le serveur web frontal ou un stockage objet (voir docs/deploiement.md).
SERVE_MEDIA = env_bool("DJANGO_SERVE_MEDIA", DEBUG)

# En développement, les statiques sont servis depuis frontend/static : le dossier
# STATIC_ROOT (rempli par collectstatic en production) n'a pas besoin d'exister.
warnings.filterwarnings("ignore", message="No directory at: ")

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("DJANGO_MEDIA_ROOT", REPO_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]
    + (["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    # Limites par adresse IP sur les routes sensibles (ScopedRateThrottle).
    "DEFAULT_THROTTLE_RATES": {
        "login": os.environ.get("DJANGO_LOGIN_RATE", "30/minute"),
        "register": os.environ.get("DJANGO_REGISTER_RATE", "20/hour"),
    },
    "NUM_PROXIES": TRUSTED_PROXY_COUNT,
}

# NF-08 : en production, tout passe en HTTPS. DJANGO_HTTPS=0 permet de tester
# l'image de production en local sur http://localhost.
# Vrai uniquement en production réelle (servie en HTTPS). Sert aussi de garde-fou
# aux commandes qui ne doivent pas tourner en production (ex. seed_demo).
IS_PRODUCTION = not DEBUG and env_bool("DJANGO_HTTPS", True)
if IS_PRODUCTION:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
