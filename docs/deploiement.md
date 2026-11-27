# Déploiement

## Sur le serveur amaruq.fr

| Dossier | Rôle |
|---|---|
| `~/website/services/recipes_app` | **Production** (https://recettes.amaruq.fr) : conteneurs `recettes` et `recipes_app-db-1` |
| `~/dev/recettes` | Copie de travail pour les branches. Aucune base n'y tourne : `make backup`, `make logs`, `make shell`… y échouent (« service "db" is not running ») |
| `~/website/dev/instances/<nom>` | Previews créées par `preview up` |

Les commandes de prod (`make backup`, `make restart`, `make logs`, `make dbshell`)
se lancent donc **depuis `~/website/services/recipes_app`**.

La sauvegarde quotidienne y est lancée par cron à 3 h avec
`backups/run-backup.sh`, qui sauvegarde la base et les photos (volume `media`).
Ce script n'existe que sur le serveur : il est dans `backups/`, qui est exclu de git.

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
```

Exemple minimal avec Caddy (certificat automatique) :

```
recettes.example.fr {
    reverse_proxy localhost:8000
}
```

Le cahier des charges demande un **hébergeur en Europe** (RGPD).

L'application envoie elle-même une **Content-Security-Policy** stricte sur
toutes les réponses (réglage `CONTENT_SECURITY_POLICY`, middleware
`config.middleware.ContentSecurityPolicyMiddleware`) : tout vient du site,
aucun script ni style inline. Ne pas ajouter de `<script>`/`<style>` inline,
d'attribut `style=` ou `onclick=` dans l'interface : passer par les fichiers de
`frontend/static/` (les tests de `backend/config/tests.py` le vérifient).

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

Sur amaruq.fr, la ligne réellement en place est :

```
0 3 * * * ~/website/services/recipes_app/backups/run-backup.sh >> ~/website/services/recipes_app/backups/backup.log 2>&1
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

## Connexion unique (OIDC)

L'application peut déléguer la connexion à un fournisseur d'identité OpenID Connect
(par exemple Authentik), pour partager un même compte entre plusieurs sites.

1. Chez le fournisseur, créer un client **confidentiel** avec l'adresse de retour
   `https://<domaine>/oidc/callback/`, les scopes `openid email profile` et le flux
   *authorization code*.
2. Renseigner dans `.env` les variables `OIDC_*` (voir `.env.example`). Les adresses
   sont données par `/.well-known/openid-configuration` du fournisseur.
3. Relancer l'application (`make restart`). La migration `accounts.0002` ajoute le champ `oidc_sub`.

Comportement :

- L'écran de connexion n'affiche plus qu'un bouton « Se connecter ». La connexion et
  l'inscription par mot de passe sont désactivées, sauf avec `PASSWORD_LOGIN_ENABLED=1`.
  L'admin Django garde son mot de passe local.
- Un compte est relié au compte partagé par le claim `sub`. Un compte local existant
  n'est relié par e-mail que si le fournisseur envoie `email_verified: true`. Sinon,
  il faut renseigner `oidc_sub` à la main (admin ou shell Django).
- La déconnexion renvoie vers le fournisseur (`OIDC_OP_LOGOUT_ENDPOINT`) pour fermer
  aussi la session partagée.
