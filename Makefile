# Commandes courantes du projet. `make` (ou `make help`) affiche la liste.
#
# Deux façons de lancer l'application :
#   - Docker (PostgreSQL, comme en production) : make up / make restart / make down
#   - Local (SQLite, rechargement automatique du code) : make dev

# Python ≥ 3.10 utilisé pour créer .venv : le plus récent trouvé (python3.13, 3.12…).
PY_BOOT  ?= $(shell for v in 3.13 3.12 3.11 3.10; do command -v python$$v && break; done)
PYTHON   ?= .venv/bin/python
PIP      ?= .venv/bin/pip
MANAGE    = cd backend && ../$(PYTHON) manage.py
COMPOSE  ?= docker compose
PORT     ?= 8001

.DEFAULT_GOAL := help
.PHONY: help install dev migrate superuser test seed seed-docker unseed \
        e2e e2e-install up down restart rebuild logs ps shell dbshell unlock backup clean

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[1m%-10s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- Local ----

.venv:
	@[ -n "$(PY_BOOT)" ] || { echo "Python 3.10 ou plus introuvable (ex. : uv python install 3.12)."; exit 1; }
	@echo "Création de .venv avec $(PY_BOOT)"
	@$(PY_BOOT) -m venv .venv

install: .venv ## Installe les dépendances et active le hook de tests
	@$(PIP) install -q --upgrade pip
	@$(PIP) install -q -r backend/requirements.txt
	@git config core.hooksPath .githooks
	@[ -f .env ] || cp .env.example .env
	@echo "Installation terminée. Lancer : make dev (local) ou make up (Docker)."

dev: migrate ## Lance le serveur local (SQLite) sur le port 8001 (modifiable : make dev PORT=9000)
	@echo "→ http://127.0.0.1:$(PORT)  (Ctrl+C pour arrêter)"
	@$(MANAGE) runserver 127.0.0.1:$(PORT)

migrate: ## Applique les migrations (base locale)
	@$(MANAGE) migrate
	@$(MANAGE) createcachetable

superuser: ## Crée un compte administrateur (base locale)
	@$(MANAGE) createsuperuser

test: ## Lance la suite de tests complète (avec trace dans test-reports/)
	@./scripts/check.sh

seed: migrate ## Comptes et recettes de démo dans la base locale (demo@recettes.local)
	@$(MANAGE) seed_demo

unseed: ## Supprime les comptes de démo de la base locale
	@$(MANAGE) seed_demo --remove

E2E_URL ?= http://localhost:8000

e2e-install: ## Installe les dépendances des tests navigateur (une fois)
	@cd e2e && npm install --silent
	@echo "Prêt. Lancer l'application (make up) puis : make e2e"

e2e: ## Tests navigateur (Chrome) contre l'app lancée ; autre adresse : make e2e E2E_URL=http://127.0.0.1:8001
	@E2E_URL=$(E2E_URL) ./scripts/e2e.sh

# --------------------------------------------------------------- Docker ----

up: ## Démarre l'application avec Docker (PostgreSQL) en arrière-plan
	@[ -f .env ] || cp .env.example .env
	@$(COMPOSE) up --build -d
	@echo "→ http://localhost:8000"

down: ## Arrête l'application Docker (les données sont conservées)
	@$(COMPOSE) down

restart: ## Relance l'application Docker en prenant en compte le code modifié
	@$(COMPOSE) up --build -d --force-recreate web
	@echo "→ http://localhost:8000"

rebuild: ## Reconstruit l'image sans cache puis relance tout
	@$(COMPOSE) build --no-cache
	@$(COMPOSE) up -d --force-recreate
	@echo "→ http://localhost:8000"

logs: ## Affiche les logs de l'application (Ctrl+C pour quitter)
	@$(COMPOSE) logs -f --tail 100 web

ps: ## État des conteneurs
	@$(COMPOSE) ps

shell: ## Shell Django dans le conteneur
	@$(COMPOSE) exec web python manage.py shell

dbshell: ## Console PostgreSQL
	@$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" "$$POSTGRES_DB"'

seed-docker: ## Comptes et recettes de démo dans la base Docker
	@$(COMPOSE) exec web python manage.py seed_demo

unlock: ## Débloque les comptes bloqués après trop d'échecs de connexion (Docker)
	@$(COMPOSE) exec web python manage.py axes_reset

backup: ## Sauvegarde la base PostgreSQL dans backups/
	@./scripts/backup.sh

# ------------------------------------------------------------- Nettoyage ----

clean: ## Supprime les fichiers générés (caches Python, statiques collectés)
	@find . -path ./.venv -prune -o -name __pycache__ -type d -exec rm -r {} +
	@rm -rf staticfiles e2e/screenshots
