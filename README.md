# Recettes

Application web pour enregistrer ses recettes et les suivre en cuisinant :
chaque étape se coche une fois terminée, et un minuteur se lance en un clic
avec la durée prévue par l'étape. Elle s'installe sur l'écran d'accueil (PWA)
et une recette déjà ouverte reste utilisable sans connexion.

- **Besoin** : [docs/cahier-des-charges.md](docs/cahier-des-charges.md)
- **Avancement** : [docs/suivi-exigences.md](docs/suivi-exigences.md)

## Pile technique

| Couche | Choix |
| --- | --- |
| API | Django 4.2 + Django REST Framework (Python 3.8 à 3.12) |
| Base de données | PostgreSQL (Docker) ; SQLite en développement local |
| Interface | HTML/CSS/JavaScript sans framework ni étape de build, PWA |
| Production | Gunicorn + WhiteNoise dans une image Docker |

## Démarrage rapide

### Avec Docker (recommandé)

```bash
cp .env.example .env        # puis adapter DJANGO_SECRET_KEY
docker compose up --build
```

Ouvrir http://localhost:8000 et créer un compte.

### Sans Docker (développement)

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver
```

Ouvrir http://127.0.0.1:8000. La base est un fichier SQLite (`backend/db.sqlite3`).
Pour l'administration Django (`/admin/`) : `../.venv/bin/python manage.py createsuperuser`.

## Tests

```bash
./scripts/check.sh
```

Lance toute la suite : vérifications Django, migrations, tests de l'API et
tests JavaScript (Node 15 ou plus). Chaque passage est tracé :

- `test-reports/HISTORIQUE.md` : une ligne par passage (versionné) ;
- `test-reports/logs/` : le journal complet de chaque passage (local).

Le hook Git `.githooks/pre-commit` lance ce script avant chaque commit et
bloque le commit si un test échoue. À activer une fois par clone :

```bash
git config core.hooksPath .githooks
```

Détail des tests et recette manuelle : [docs/tests.md](docs/tests.md).

## Arborescence

```
backend/            API Django
  config/           réglages, URL, vues qui servent l'interface
  accounts/         utilisateurs (connexion par e-mail), export/suppression RGPD
  recipes/          recettes, ingrédients, étapes, photo
  cooking/          sessions de cuisine (avancement, minuteurs)
frontend/           interface (servie par Django)
  index.html        page unique
  sw.js             service worker (hors ligne)
  static/js/        modules JavaScript (voir docs/architecture.md)
  static/css/       styles
  tests/            tests JavaScript (Node)
docs/               documentation
scripts/            check.sh (tests), backup.sh (sauvegarde)
test-reports/       historique des passages de tests
```

## Documentation

| Document | Contenu |
| --- | --- |
| [cahier-des-charges.md](docs/cahier-des-charges.md) | Le besoin, les exigences F-xx / NF-xx |
| [suivi-exigences.md](docs/suivi-exigences.md) | État de chaque exigence et où elle est codée |
| [architecture.md](docs/architecture.md) | Fonctionnement d'ensemble, choix techniques |
| [api.md](docs/api.md) | Référence de l'API REST |
| [developpement.md](docs/developpement.md) | Installer, coder, tester, committer, faire évoluer |
| [deploiement.md](docs/deploiement.md) | Mise en production, HTTPS, sauvegardes |
| [tests.md](docs/tests.md) | Tests automatiques et cahier de recette manuelle |
