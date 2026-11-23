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

Toutes les commandes courantes passent par le `Makefile` ; `make` seul affiche
la liste.

```bash
make install    # une seule fois : dépendances Python, hook de tests, fichier .env
make up         # démarre l'application avec Docker  →  http://localhost:8000
```

Puis créer un compte dans l'application.

### Commandes du Makefile

| Commande | Effet |
| --- | --- |
| `make install` | Crée `.venv`, installe les dépendances, active le hook de tests, crée `.env` depuis `.env.example` |
| `make up` | Démarre l'application avec Docker et PostgreSQL, en arrière-plan → http://localhost:8000 |
| `make restart` | **Relance** l'application en prenant en compte le code modifié (reconstruit l'image) |
| `make down` | Arrête l'application (les données sont conservées) |
| `make rebuild` | Reconstruit l'image sans cache puis relance tout (en cas de souci de dépendances) |
| `make logs` | Suit les logs de l'application |
| `make ps` | État des conteneurs |
| `make dev` | Serveur de développement **local** (SQLite, rechargement automatique) → http://127.0.0.1:8001 |
| `make migrate` | Applique les migrations sur la base locale |
| `make superuser` | Crée un compte administrateur (base locale, pour `/admin/`) |
| `make test` | Lance la suite de tests complète, avec trace |
| `make shell` / `make dbshell` | Shell Django / console PostgreSQL dans Docker |
| `make backup` | Sauvegarde la base PostgreSQL dans `backups/` |
| `make clean` | Supprime les fichiers générés |

`make dev` et `make up` peuvent tourner en même temps (ports 8001 et 8000).
Autre port local : `make dev PORT=9000`.

### Sans make

```bash
cp .env.example .env && docker compose up --build        # Docker
# ou, en local :
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
cd backend && ../.venv/bin/python manage.py migrate && ../.venv/bin/python manage.py runserver
```

## Tests

```bash
make test       # équivalent : ./scripts/check.sh
```

Lance toute la suite : vérifications Django, migrations, tests de l'API et
tests JavaScript (Node 15 ou plus). Chaque passage est tracé :

- `test-reports/HISTORIQUE.md` : une ligne par passage (versionné) ;
- `test-reports/logs/` : le journal complet de chaque passage (local).

Le hook Git `.githooks/pre-commit` lance ce script avant chaque commit et
bloque le commit si un test échoue. Il refuse aussi tout commit direct sur
`main`. À activer une fois par clone :

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
Makefile            commandes courantes (make help)
test-reports/       historique des passages de tests
```

## Branches

`main` = production (tags `v1.0.0`…), `dev` = intégration, et une branche par
tâche (`feature/…`, `fix/…`, `docs/…`, `hotfix/…`) fusionnée par Pull Request.
Détail : [docs/developpement.md](docs/developpement.md#branches-et-versions).

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
