"""Protection de la connexion (NF-08).

- django-axes bloque un couple (e-mail, adresse IP) après AXES_FAILURE_LIMIT
  échecs, pendant AXES_COOLOFF_TIME : un attaquant ne peut pas bloquer le vrai
  propriétaire du compte depuis une autre adresse.
- Les throttles DRF limitent le nombre de connexions et d'inscriptions par
  adresse IP (voir REST_FRAMEWORK dans config/settings.py).
"""
from django.conf import settings
from django.http import JsonResponse


def client_ip(request):
    """Adresse IP du visiteur.

    Derrière un proxy HTTPS (production), REMOTE_ADDR est celle du proxy : on lit
    alors X-Forwarded-For, en ne faisant confiance qu'aux TRUSTED_PROXY_COUNT
    dernières entrées (ajoutées par nos propres proxys, impossibles à falsifier).
    """
    count = settings.TRUSTED_PROXY_COUNT
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if count and forwarded:
        chain = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if len(chain) >= count:
            return chain[-count]
    return request.META.get("REMOTE_ADDR")


def lockout_response(request, original_response=None, credentials=None):
    """Réponse JSON en français quand le compte est temporairement bloqué."""
    minutes = int(settings.AXES_COOLOFF_TIME.total_seconds() // 60)
    return JsonResponse(
        {"detail": f"Trop de tentatives de connexion. Réessayez dans {minutes} minutes."},
        status=429,
    )
