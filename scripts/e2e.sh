#!/usr/bin/env bash
# Tests de bout en bout dans Chrome, contre l'application lancée (make up ou make dev).
#
#   ./scripts/e2e.sh                          # http://localhost:8000
#   E2E_URL=http://127.0.0.1:8001 ./scripts/e2e.sh
#
# Traces :
#   test-reports/logs/e2e-AAAA-MM-JJ_HHMMSS.log   journal complet (local)
#   test-reports/logs/e2e-AAAA-MM-JJ_HHMMSS/      captures d'écran (local)
#   test-reports/HISTORIQUE-E2E.md                une ligne par passage (versionné)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${E2E_URL:-http://localhost:8000}"
REPORTS="$ROOT/test-reports"
STAMP="$(date '+%Y-%m-%d_%H%M%S')"
LOG="$REPORTS/logs/e2e-$STAMP.log"
HIST="$REPORTS/HISTORIQUE-E2E.md"
mkdir -p "$REPORTS/logs"

if [ ! -d "$ROOT/e2e/node_modules/puppeteer-core" ]; then
  echo "Dépendances manquantes : lancer 'make e2e-install'."
  exit 1
fi

E2E_URL="$URL" E2E_SCREENSHOTS="$REPORTS/logs/e2e-$STAMP" node "$ROOT/e2e/run.js" 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}

OK=$(grep -cE '^ok [0-9]+ - ' "$LOG" | tr -d ' ')
SKIP=$(grep -cE '^ok [0-9]+ - .*# SKIP' "$LOG" | tr -d ' ')
KO=$(grep -cE '^not ok [0-9]+ - ' "$LOG" | tr -d ' ')
RESULT=$([ "$STATUS" -eq 0 ] && echo "✅ OK" || echo "❌ ÉCHEC")
BRANCH=$(git -C "$ROOT" symbolic-ref --short -q HEAD 2>/dev/null || echo "-")
BASE=$(git -C "$ROOT" rev-parse -q --verify --short HEAD 2>/dev/null || echo "-")

if [ ! -f "$HIST" ]; then
  cat > "$HIST" <<'HEAD'
# Historique des tests de bout en bout

Une ligne par passage de `make e2e` (Chrome headless contre l'application
lancée). Journal complet et captures d'écran dans `test-reports/logs/` (local).

| Date | Branche | Commit de base | URL testée | Résultat | Réussis | Échecs | Ignorés | Journal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
HEAD
fi
echo "| $(date '+%d/%m/%Y %H:%M') | $BRANCH | $BASE | $URL | $RESULT | $((OK - SKIP)) | $KO | $SKIP | logs/e2e-$STAMP.log |" >> "$HIST"

echo
echo "==> $RESULT. Journal : test-reports/logs/e2e-$STAMP.log"
exit "$STATUS"
