# Image unique : API Django + interface (fichiers statiques servis par WhiteNoise).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_STATIC_ROOT=/app/staticfiles \
    DJANGO_MEDIA_ROOT=/app/media

WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

RUN DJANGO_DEBUG=0 DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && useradd --create-home app && mkdir -p /app/media && chown app /app/media
USER app

EXPOSE 8000
# Santé : Django répond sur le manifeste (pas de curl dans l'image → Python).
# Host = premier nom de DJANGO_ALLOWED_HOSTS, X-Forwarded-Proto évite la redirection HTTPS.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["python", "-c", "import os,urllib.request as u; h=os.environ.get('DJANGO_ALLOWED_HOSTS','localhost').split(',')[0].lstrip('.*') or 'localhost'; u.urlopen(u.Request('http://127.0.0.1:8000/manifest.webmanifest', headers={'Host': h, 'X-Forwarded-Proto': 'https'}), timeout=4)"]
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
