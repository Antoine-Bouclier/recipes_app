"""En-têtes de sécurité ajoutés à toutes les réponses."""
from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """Ajoute l'en-tête Content-Security-Policy (réglage CONTENT_SECURITY_POLICY).

    Placé en tête de MIDDLEWARE pour couvrir aussi les fichiers servis par
    WhiteNoise et les photos (/media/). Une vue peut fournir sa propre politique
    en posant l'en-tête elle-même : elle n'est alors pas écrasée.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.policy = settings.CONTENT_SECURITY_POLICY

    def __call__(self, request):
        response = self.get_response(request)
        if self.policy:
            response.headers.setdefault("Content-Security-Policy", self.policy)
        return response
