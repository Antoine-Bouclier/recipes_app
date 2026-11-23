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

## Trois niveaux de tests

| Niveau | Commande | Quand | Durée |
| --- | --- | --- | --- |
| Tests automatiques (API + logique JS) | `make test` | à chaque commit (hook) | ~15 s |
| Tests de bout en bout dans Chrome | `make e2e` | avant chaque fusion dans `dev` et chaque version | ~30 s |
| Recette manuelle sur téléphones réels | voir plus bas | avant chaque version | ~30 min |

## Traces

| Fichier | Contenu | Versionné |
| --- | --- | --- |
| `test-reports/HISTORIQUE.md` | une ligne par passage : date, branche, commit de base, résultat, nombre de tests | oui |
| `test-reports/logs/AAAA-MM-JJ_HHMMSS.log` | sortie complète du passage (chaque test, chaque erreur) | non (local) |

| `test-reports/HISTORIQUE-E2E.md` | une ligne par passage de `make e2e` : URL testée, réussis, échecs, ignorés | oui |
| `test-reports/logs/e2e-AAAA-MM-JJ_HHMMSS.log` et dossier du même nom | sortie complète et captures d'écran (dont celle d'un éventuel échec) | non (local) |

Le hook `.githooks/pre-commit` lance `check.sh` avant chaque commit, bloque le
commit en cas d'échec, et ajoute `HISTORIQUE.md` au commit : chaque commit
porte donc la trace des tests qui l'ont validé.

## Tests automatiques

### Backend (`backend/*/tests/`)

| Fichier | Couvre |
| --- | --- |
| `accounts/tests/test_auth.py` | inscription, mot de passe haché, doublons, connexion/déconnexion, export et suppression du compte (NF-08, NF-09) |
| `accounts/tests/test_security.py` | blocage après 5 échecs (même avec le bon mot de passe ensuite), blocage limité au couple e-mail + IP, remise à zéro après succès, limites de débit connexion/inscription, adresse IP derrière un proxy (NF-08) |
| `recipes/tests/test_api.py` | création avec ingrédients/étapes, réordonnancement, modification, suppression, recherche, filtres, isolation entre utilisateurs (F-01 à F-09, NF-08) ; photos : redimensionnement, rotation, suppression des métadonnées GPS, transparence, taille maximale, miniature, suppression des fichiers |
| `cooking/tests/test_session.py` | sauvegarde et relecture de l'avancement, validation des minuteurs, réinitialisation, isolation (F-15, F-16, F-25) |
| `recipes/tests/test_seed_demo.py` | données de démo : création, validité, toutes les catégories, relance sans doublon, autres comptes intacts, refus en production |

### Frontend (`frontend/tests/`)

| Fichier | Couvre |
| --- | --- |
| `timers.test.mjs` | heure de fin, pause/reprise, réinitialisation, ±1 min, alertes, minuteurs simultanés, formats (F-20 à F-26, NF-04) |
| `cooking-state.test.mjs` | étape en cours, étapes cochées, annulation, fin de recette, progression, fusion local/serveur, portions (F-08, F-10 à F-15) |

### Bout en bout (`e2e/run.js`)

Pilote un vrai Chrome (headless, écran de téléphone 390 × 844) avec
[puppeteer-core](https://pptr.dev/) contre l'application lancée.

```bash
make e2e-install                              # une fois (npm install dans e2e/)
make up && make e2e                           # contre Docker, http://localhost:8000
make e2e E2E_URL=http://127.0.0.1:8001        # contre make dev
E2E_HEADFUL=1 make e2e                        # voir le navigateur
CHROME_PATH=/chemin/chrome make e2e           # autre navigateur Chromium
```

| # | Scénario | Exigences |
| --- | --- | --- |
| 1 | Inscription, arrivée sur « Mes recettes » | NF-08 |
| 2 | Création d'une recette avec photo (vérifiée en 1600 px), ingrédients, étapes, réordonnancement | F-01 à F-04 |
| 3 | Portions ajustées, favori | F-08, F-09 |
| 4 | Recherche par ingrédient, catégorie, favoris, étiquette ; miniature dans la liste | F-06, F-07, F-09, NF-03 |
| 5 | Mode cuisine : ingrédients au-dessus, étape cochée, « Annuler », barre repliée | F-10 à F-12, F-14 |
| 6 | Minuteur lancé, conservé au rechargement, terminé, « Cocher l'étape » | F-15, F-20 à F-25, F-27 |
| 7 | Avancement présent côté serveur | F-15 |
| 8 | Rechargement hors ligne, étape cochée hors ligne puis synchronisée | NF-05 |
| 9 | « Recommencer la recette » | F-16 |
| 10 | Un second compte reçoit 404 sur la recette du premier | NF-08 |
| 11 | Suppression de la recette avec confirmation | F-05 |
| 12 | Export puis suppression du compte | NF-09 |
| 13 | Aucune erreur JavaScript pendant tout le parcours | — |

Les scénarios s'enchaînent ; après un échec, les suivants sont « ignorés » et
une capture d'écran est enregistrée. Les comptes créés (`e2e-…@test.local`)
sont supprimés à la fin, même en cas d'échec. Pour ajouter un scénario :
`scenario("Nom (F-xx)", async ({ page, browser }) => { … })` dans `e2e/run.js`.

Non couvert par ces tests (à vérifier à la main) : son et vibration (F-22),
notifications système, écran maintenu allumé (F-17), comportement sur Safari
iOS.

## Données de démonstration

`make seed` (base locale) ou `make seed-docker` (base Docker) crée deux comptes
au mot de passe `demo-recettes` :

- `demo@recettes.local` : 8 recettes couvrant toutes les catégories, avec
  étiquettes, favoris et minuteurs ; la recette **« Test des minuteurs (durées
  courtes) »** a trois minuteurs de 10, 20 et 5 s pour tester les minuteurs
  simultanés et les alertes sans attendre ;
- `autre@recettes.local` : 1 recette (« Gratin dauphinois ») qui ne doit
  jamais apparaître dans le compte Démo.

La commande supprime puis recrée ces deux comptes : la relancer remet tout à
zéro (recettes modifiées, avancement). Les autres comptes ne sont pas touchés.
`make unseed` (ou `seed_demo --remove`) les supprime. En production
(`DJANGO_DEBUG=0` et `DJANGO_HTTPS=1`), elle refuse sauf `--force`.

Contenu : `backend/recipes/demo_data.py`.

## Recette manuelle

À dérouler avant chaque mise en production, et obligatoirement sur un iPhone et
un téléphone Android réels (point d'attention §7 du cahier des charges). Le plus
simple : `make seed-docker`, se connecter avec `demo@recettes.local`, et
utiliser la recette « Test des minuteurs » pour les scénarios 9 à 12.
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
