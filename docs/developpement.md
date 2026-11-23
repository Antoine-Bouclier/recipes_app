# Guide de développement

## Installation

Prérequis : Python 3.8 ou plus, `make`, Node 15 ou plus (pour les tests
JavaScript), Docker (pour lancer l'application comme en production).

```bash
make install      # .venv, dépendances, hook de tests, .env
make dev          # serveur local SQLite → http://127.0.0.1:8001
make superuser    # facultatif : accès à /admin/
```

`make help` liste toutes les commandes. Sans `make`, voir les commandes
équivalentes dans le `Makefile` (chaque cible est courte et lisible).

## Lancer et relancer l'application

| Besoin | Commande |
| --- | --- |
| Coder avec rechargement automatique (Python, JS, CSS) | `make dev` (Ctrl+C pour arrêter) |
| Voir l'application comme en production (PostgreSQL, Gunicorn) | `make up` → http://localhost:8000 |
| Après une modification du code, mettre à jour la version Docker | `make restart` |
| Après une modification de `requirements.txt` ou du `Dockerfile` | `make rebuild` |
| Comprendre une erreur côté serveur | `make logs` |
| Tout arrêter | `make down` (les données restent dans les volumes Docker) |

En `make dev`, Django recharge le Python tout seul ; pour le JS et le CSS il
suffit de recharger la page (voir plus bas pour le cache du service worker).
La version Docker, elle, embarque une copie du code : il faut `make restart`
pour qu'elle prenne les modifications.

Pour développer sur PostgreSQL plutôt que SQLite :

```bash
docker compose up -d db
export DATABASE_URL=postgres://recettes:recettes@localhost:5432/recettes
```

(exposer le port 5432 du service `db` dans `docker-compose.yml` si besoin).

## Variables d'environnement

Voir `.env.example`. Les principales :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DJANGO_DEBUG` | `1` | Mode développement |
| `DJANGO_SECRET_KEY` | clé de dev | **Obligatoire** si `DJANGO_DEBUG=0` |
| `DATABASE_URL` | SQLite | Base de données |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Noms de domaine acceptés |
| `DJANGO_HTTPS` | `1` | En production : redirection HTTPS, cookies sécurisés, HSTS |
| `DJANGO_SERVE_MEDIA` | = `DEBUG` | Django sert les photos |

## Tests

```bash
make test                                           # tout, avec trace (= ./scripts/check.sh)
cd backend && ../.venv/bin/python manage.py test recipes   # une app
cd frontend && node tests/timers.test.mjs            # un fichier JS
```

- Tests backend : `backend/<app>/tests/test_*.py` (DRF `APITestCase`).
- Tests frontend : `frontend/tests/*.test.mjs`, exécutés par un mini-runner
  sans dépendance (`tests/runner.mjs`). Ils couvrent les modules purs
  `timers.js` et `cooking-state.js`.
- Chaque test cite l'exigence qu'il vérifie (ex. `# F-15`) : garder cette
  habitude, c'est ce qui alimente [suivi-exigences.md](suivi-exigences.md).

Le détail (et la recette manuelle sur téléphone) est dans [tests.md](tests.md).

## Règles de commit

1. `make test` doit être vert : le hook `pre-commit` le lance et
   bloque le commit sinon. Il ajoute aussi une ligne à
   `test-reports/HISTORIQUE.md`, incluse dans le commit.
2. Un commit = une étape cohérente (une fonctionnalité, une correction).
3. Messages en français : une ligne de titre courte, puis le détail si utile.
4. Si le besoin change : mettre à jour `docs/cahier-des-charges.md` et
   `docs/suivi-exigences.md` **dans le même commit** que le code.

Ne jamais contourner le hook (`--no-verify`) : si un test échoue, on corrige.

## Recettes de maintenance courantes

### Ajouter un champ à une recette

1. `backend/recipes/models.py` : ajouter le champ.
2. `cd backend && ../.venv/bin/python manage.py makemigrations recipes`, puis
   `make migrate` (`make test` échoue tant qu'une migration manque).
3. `backend/recipes/serializers.py` : l'ajouter dans `fields` de
   `RecipeSerializer` (et `RecipeListSerializer` si utile dans la liste).
4. `frontend/static/js/views/edit.js` (formulaire) et `detail.js` (affichage).
5. Un test dans `backend/recipes/tests/test_api.py`.
6. Mettre à jour [api.md](api.md).

### Ajouter un écran

1. Créer `frontend/static/js/views/mon-ecran.js` exportant
   `function monEcran(root, params)`.
2. L'ajouter dans `routes` de `frontend/static/js/app.js`.
3. Ajouter le fichier à la liste `SHELL` de `frontend/sw.js` et incrémenter
   `VERSION`.

### Modifier l'interface (JS/CSS)

Les navigateurs gardent l'ancienne version en cache via le service worker.
**Incrémenter `VERSION` dans `frontend/sw.js`** à chaque livraison qui touche
`frontend/`. En développement, cocher « Update on reload » dans les outils
de développement (onglet Application → Service workers).

### Modifier le comportement des minuteurs ou du mode cuisine

La logique est dans `timers.js` et `cooking-state.js`, sans DOM : écrire
d'abord le test dans `frontend/tests/`, puis le code. `timer-manager.js` et
`views/cook.js` ne font qu'appeler ces fonctions.

## Conventions de code

- Python : PEP 8, lignes ≤ 120 caractères, docstrings en français.
- JavaScript : modules ES, pas de dépendance externe, pas d'`innerHTML`
  (utiliser `h()` de `dom.js`), textes de l'interface en français (NF-11).
- CSS : couleurs uniquement via les variables de `:root` (thème sombre
  automatique), zones cliquables d'au moins 48 px (NF-02).
- Accessibilité (NF-07) : chaque champ a un `<label>`, chaque bouton-icône un
  `aria-label`, les messages passent par une zone `aria-live`.
