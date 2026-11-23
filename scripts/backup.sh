#!/usr/bin/env bash
# Sauvegarde de la base PostgreSQL du docker compose (NF-10).
# À lancer chaque jour (cron) depuis la racine du dépôt :
#   0 3 * * * cd /chemin/recipes_app && ./scripts/backup.sh
# Les sauvegardes de plus de 30 jours sont supprimées.
# Restauration : gunzip -c backups/FICHIER.sql.gz | docker compose exec -T db psql -U recettes recettes
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="backups"
KEEP_DAYS="${KEEP_DAYS:-30}"
mkdir -p "$DIR"
FILE="$DIR/recettes-$(date '+%Y-%m-%d_%H%M').sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE"
find "$DIR" -name 'recettes-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "Sauvegarde : $FILE"
