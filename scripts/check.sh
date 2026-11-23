#!/usr/bin/env bash
# Suite de vérifications complète du projet.
#
#   ./scripts/check.sh            lancer tous les tests (à la main, quand on veut)
#
# Exécutée aussi automatiquement avant chaque commit par .githooks/pre-commit.
# Traces :
#   test-reports/logs/AAAA-MM-JJ_HHMMSS.log  journal complet de chaque passage (local, non versionné)
#   test-reports/HISTORIQUE.md               une ligne par passage (versionné)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${PYTHON:-$ROOT/.venv/bin/python}"
[ -x "$PY" ] || PY=python3

REPORTS="$ROOT/test-reports"
STAMP="$(date '+%Y-%m-%d_%H%M%S')"
LOG="$REPORTS/logs/$STAMP.log"
HIST="$REPORTS/HISTORIQUE.md"
mkdir -p "$REPORTS/logs"

run_checks() {
  set -e
  echo "### Vérifications du $(date '+%d/%m/%Y %H:%M:%S')"
  echo "### Commit de base : $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo 'aucun')"
  echo

  echo "==> Django : vérification de la configuration"
  (cd "$ROOT/backend" && "$PY" manage.py check)

  echo "==> Django : migrations à jour"
  (cd "$ROOT/backend" && "$PY" manage.py makemigrations --check --dry-run >/dev/null) \
    || { echo "Des migrations manquent : lancer 'python manage.py makemigrations'."; return 1; }

  echo "==> Backend : tests"
  (cd "$ROOT/backend" && "$PY" manage.py test --verbosity 2 2>&1)

  if command -v node >/dev/null 2>&1; then
    echo "==> Frontend : syntaxe JavaScript"
    for f in "$ROOT"/frontend/sw.js "$ROOT"/frontend/static/js/*.js; do
      [ -f "$f" ] || continue
      node --check "$f" || { echo "Erreur de syntaxe : $f"; return 1; }
    done
    echo "==> Frontend : tests"
    for t in "$ROOT"/frontend/tests/*.test.mjs; do
      [ -f "$t" ] || continue
      node "$t"
    done
  else
    echo "!! node introuvable : tests frontend ignorés"
  fi
}

run_checks 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}

BACK=$(grep -Eo '^Ran [0-9]+ tests?' "$LOG" | grep -Eo '[0-9]+' | tail -1)
FRONT=$(grep -Eo '^ok [0-9]+ ' "$LOG" | wc -l | tr -d ' ')
RESULT=$([ "$STATUS" -eq 0 ] && echo "✅ OK" || echo "❌ ÉCHEC")
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "-")
BASE=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "-")

if [ ! -f "$HIST" ]; then
  cat > "$HIST" <<'HEAD'
# Historique des tests

Une ligne est ajoutée à chaque passage de `./scripts/check.sh` (à la main ou
avant un commit). « Commit de base » est le commit sur lequel les changements
testés s'appliquent. Le journal complet de chaque passage est dans
`test-reports/logs/` (local, non versionné).

| Date | Branche | Commit de base | Résultat | Tests backend | Tests frontend | Journal |
| --- | --- | --- | --- | --- | --- | --- |
HEAD
fi
echo "| $(date '+%d/%m/%Y %H:%M') | $BRANCH | $BASE | $RESULT | ${BACK:-0} | ${FRONT:-0} | logs/$STAMP.log |" >> "$HIST"

echo
if [ "$STATUS" -eq 0 ]; then
  echo "==> Tout est vert. Journal : test-reports/logs/$STAMP.log"
else
  echo "==> ÉCHEC. Journal : test-reports/logs/$STAMP.log"
fi
exit "$STATUS"
