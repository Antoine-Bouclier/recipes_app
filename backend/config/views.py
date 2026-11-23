from django.conf import settings
from django.http import FileResponse
from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
@never_cache
def index(request):
    """Page unique de l'application ; pose le cookie CSRF utilisé par l'API."""
    return render(request, "index.html")


@never_cache
def service_worker(request):
    response = FileResponse(open(settings.FRONTEND_DIR / "sw.js", "rb"), content_type="application/javascript")
    response["Service-Worker-Allowed"] = "/"
    return response


def manifest(request):
    return FileResponse(
        open(settings.FRONTEND_DIR / "manifest.webmanifest", "rb"), content_type="application/manifest+json"
    )
