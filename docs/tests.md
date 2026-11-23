# Tests

## Lancer les tests

```bash
make test        # équivalent : ./scripts/check.sh
```

Exécute dans l'ordre :

1. `manage.py check` : configuration Django ;
2. `makemigrations --check` : aucune migration oubliée ;
3. tests backend (`manage.py test`) ;
4. vérification de syntaxe de tous les fichiers JavaScript ;
5. tests JavaScript (`frontend/tests/*.test.mjs`).

Le script s'arrête au premier échec et renvoie un code d'erreur.

## Traces

| Fichier | Contenu | Versionné |
| --- | --- | --- |
| `test-reports/HISTORIQUE.md` | une ligne par passage : date, branche, commit de base, résultat, nombre de tests | oui |
| `test-reports/logs/AAAA-MM-JJ_HHMMSS.log` | sortie complète du passage (chaque test, chaque erreur) | non (local) |

Le hook `.githooks/pre-commit` lance `check.sh` avant chaque commit, bloque le
commit en cas d'échec, et ajoute `HISTORIQUE.md` au commit : chaque commit
porte donc la trace des tests qui l'ont validé.

## Tests automatiques

### Backend (`backend/*/tests/`)

| Fichier | Couvre |
| --- | --- |
| `accounts/tests/test_auth.py` | inscription, mot de passe haché, doublons, connexion/déconnexion, export et suppression du compte (NF-08, NF-09) |
| `recipes/tests/test_api.py` | création avec ingrédients/étapes, réordonnancement, modification, suppression, recherche, filtres, isolation entre utilisateurs, photo (F-01 à F-09, NF-08) |
| `cooking/tests/test_session.py` | sauvegarde et relecture de l'avancement, validation des minuteurs, réinitialisation, isolation (F-15, F-16, F-25) |

### Frontend (`frontend/tests/`)

| Fichier | Couvre |
| --- | --- |
| `timers.test.mjs` | heure de fin, pause/reprise, réinitialisation, ±1 min, alertes, minuteurs simultanés, formats (F-20 à F-26, NF-04) |
| `cooking-state.test.mjs` | étape en cours, étapes cochées, annulation, fin de recette, progression, fusion local/serveur, portions (F-08, F-10 à F-15) |

## Recette manuelle

À dérouler avant chaque mise en production, et obligatoirement sur un iPhone et
un téléphone Android réels (point d'attention §7 du cahier des charges).
Noter le résultat (appareil, navigateur, date, OK/KO) en bas de ce fichier.

| # | Scénario | Résultat attendu | Exigences |
| --- | --- | --- | --- |
| 1 | Créer un compte, se déconnecter, se reconnecter | Retour sur « Mes recettes » | NF-08 |
| 2 | Créer une recette avec photo, 3 ingrédients, 3 étapes dont une de 1 min | Fiche affichée avec la photo | F-01 à F-03 |
| 3 | Modifier : monter la 3ᵉ étape en 1ʳᵉ, supprimer un ingrédient | Ordre et contenu enregistrés | F-04, F-05 |
| 4 | Rechercher un ingrédient, filtrer par catégorie, par étiquette, favoris | Résultats corrects | F-06, F-07, F-09 |
| 5 | Fiche : passer de 4 à 8 portions | Quantités doublées | F-08 |
| 6 | Mode cuisine : cocher l'étape 1 | Elle disparaît, l'étape 2 est juste sous les ingrédients, « Annuler » visible ~6 s | F-10, F-11, F-12 |
| 7 | Toucher « Annuler » | L'étape 1 revient | F-12 |
| 8 | Ouvrir « Étapes terminées (n) », décocher une étape | Elle redevient étape en cours | F-12 |
| 9 | Lancer deux minuteurs, faire défiler | Bandeau visible en bas, deux comptes à rebours | F-20, F-23, F-24 |
| 10 | Pause, +1, −1, ↺, ✕ sur un minuteur | Comportements attendus | F-21, F-26 |
| 11 | Laisser finir un minuteur, écran allumé | Son, vibration (Android), bandeau orange, bouton « Cocher l'étape » | F-22, F-27 |
| 12 | Lancer un minuteur, changer d'application, attendre la fin | Notification reçue ; temps juste au retour | F-22, F-25, NF-04 |
| 13 | En cours de recette, recharger la page / verrouiller le téléphone 2 min | Avancement et minuteurs intacts | F-15 |
| 14 | Laisser le téléphone en mode cuisine 3 min sans toucher | L'écran ne s'éteint pas | F-17 |
| 15 | Mode avion, rouvrir une recette déjà consultée, cocher une étape, réactiver le réseau | Recette affichée hors ligne ; avancement synchronisé ensuite | NF-05 |
| 16 | « Recommencer la recette » | Tout est décoché, minuteurs arrêtés | F-16 |
| 17 | Compte : exporter, puis supprimer le compte | Fichier JSON téléchargé ; compte et recettes supprimés | NF-09 |
| 18 | Navigation au clavier seul (Tab, Entrée, Espace) sur un ordinateur | Tout est accessible, focus visible | NF-07 |
| 19 | Installer sur l'écran d'accueil (« Ajouter à l'écran d'accueil ») | S'ouvre en plein écran avec l'icône | NF-05 |

### Résultats de recette manuelle

| Date | Appareil / navigateur | Scénarios | Résultat | Remarques |
| --- | --- | --- | --- | --- |
| 23/11/2026 | Chrome 134 headless (390 px et 1280 px), serveur Docker + PostgreSQL | 1, 2 (sans photo), 3 (réordonner), 4 (recherche), 5, 6, 9, 11 (sans son), 13, 15, 16 | OK | test automatisé ponctuel ; reste à faire sur téléphones réels |
