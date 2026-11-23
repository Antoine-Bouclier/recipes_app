from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("recipes.urls")),
    # Le service worker doit être servi à la racine pour contrôler tout le site (NF-05).
    path("sw.js", views.service_worker, name="service-worker"),
    path("manifest.webmanifest", views.manifest, name="manifest"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Toutes les autres URL renvoient l'application (routage côté navigateur).
urlpatterns += [re_path(r"^(?!api/|admin/|static/|media/).*$", views.index, name="index")]
