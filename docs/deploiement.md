# Déploiement

## Image Docker

Le `Dockerfile` produit une image unique : Django servi par Gunicorn, fichiers
statiques servis par WhiteNoise. Au démarrage, le conteneur applique les
migrations.

```bash
make install      # crée .env depuis .env.example (ou : cp .env.example .env)
# éditer .env : DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS, mots de passe PostgreSQL
make up           # = docker compose up --build -d
```

Suivi : `make ps` (état), `make logs` (logs), `make down` (arrêt).

Générer une clé secrète :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

## Mise en production (HTTPS, NF-08)

Placer un proxy HTTPS (Caddy, Nginx, Traefik ou celui de l'hébergeur) devant le
port 8000, qui transmet l'en-tête `X-Forwarded-Proto`. Dans `.env` :

```
DJANGO_DEBUG=0
DJANGO_HTTPS=1
DJANGO_ALLOWED_HOSTS=recettes.example.fr
DJANGO_CSRF_TRUSTED_ORIGINS=https://recettes.example.fr
DJANGO_TRUSTED_PROXY_COUNT=1
```

`DJANGO_TRUSTED_PROXY_COUNT=1` est **indispensable** derrière un proxy : sans
lui, tous les visiteurs ont l'adresse IP du proxy, et le blocage après échecs
de connexion ainsi que les limites de débit s'appliqueraient à tout le monde à
la fois. Ne pas le mettre sans proxy : l'en-tête `X-Forwarded-For` serait
falsifiable.

Débloquer un utilisateur bloqué après trop d'échecs : `make unlock`.

Exemple minimal avec Caddy (certificat automatique) :

```
recettes.example.fr {
    reverse_proxy localhost:8000
}
```

Le cahier des charges demande un **hébergeur en Europe** (RGPD).

Vérification : `docker compose exec web python manage.py check --deploy`.
Créer un administrateur : `docker compose exec web python manage.py createsuperuser`.

## Photos

Par défaut (`DJANGO_SERVE_MEDIA=1`), Django sert lui-même les photos depuis le
volume `media`. C'est suffisant pour un usage personnel. Pour plus de trafic :
les faire servir par le proxy, ou passer à un stockage objet de type S3
(`django-storages`), comme le propose le cahier des charges.

## Sauvegardes (NF-10)

`make backup` (ou `scripts/backup.sh`) fait un `pg_dump` compressé dans `backups/` et supprime les
fichiers de plus de 30 jours. Le planifier chaque jour :

```
0 3 * * * cd /chemin/recipes_app && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Restauration :

```bash
gunzip -c backups/recettes-AAAA-MM-JJ_HHMM.sql.gz | docker compose exec -T db psql -U recettes recettes
```

Penser à sauvegarder aussi le volume `media` (photos) et à copier `backups/`
hors du serveur.

## Mise à jour

```bash
git pull
make test
make restart      # reconstruit l'image et relance l'application
```

Si `frontend/` a changé, vérifier que `VERSION` a été incrémenté dans
`frontend/sw.js`, sinon les utilisateurs garderont l'ancienne interface en cache.
