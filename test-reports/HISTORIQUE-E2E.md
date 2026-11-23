# Historique des tests de bout en bout

Une ligne par passage de `make e2e` (Chrome headless contre l'application
lancée). Journal complet et captures d'écran dans `test-reports/logs/` (local).

| Date | Branche | Commit de base | URL testée | Résultat | Réussis | Échecs | Ignorés | Journal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 23/11/2026 23:49 | feature/donnees-demo | 4e44cb1 | http://localhost:8000 | ✅ OK | 13 | 0 | 0 | logs/e2e-2026-11-23_234932.log |
| 23/11/2026 23:49 | feature/donnees-demo | 4e44cb1 | http://127.0.0.1:9 | ❌ ÉCHEC | 0 | 0 | 0 | logs/e2e-2026-11-23_234957.log |
| 24/11/2026 00:28 | feature/donnees-demo | d73ab0c | http://localhost:8000 | ❌ ÉCHEC | 0 | 0 | 0 | logs/e2e-2026-11-24_002846.log |
| 24/11/2026 00:32 | feature/donnees-demo | d73ab0c | http://localhost:8000 | ✅ OK | 13 | 0 | 0 | logs/e2e-2026-11-24_003219.log |
| 24/11/2026 00:34 | chore/django-5-2 | d73ab0c | http://localhost:8000 | ✅ OK | 13 | 0 | 0 | logs/e2e-2026-11-24_003420.log |
| 24/11/2026 00:37 | fix/portions-mode-cuisine | 489c50b | http://localhost:8000 | ✅ OK | 13 | 0 | 0 | logs/e2e-2026-11-24_003646.log |
