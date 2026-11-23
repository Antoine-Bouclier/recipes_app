# Suivi des exigences

État de chaque exigence du [cahier des charges](cahier-des-charges.md), où
elle est codée et comment elle est vérifiée. À mettre à jour dans le même
commit que le code concerné.

Légende : ✅ fait · 🟡 partiel ou à valider · ⬜ à faire

Tests : **B** = test backend automatique, **F** = test JavaScript automatique,
**E** = test de bout en bout dans Chrome (`make e2e`), **M** = recette manuelle
([tests.md](tests.md)). La correspondance scénario ↔ exigence des tests **E**
est dans [tests.md](tests.md#bout-en-bout-e2erunjs).

## Gestion des recettes

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-01 Créer une recette (photo facultative) | ✅ | `recipes/models.py`, `recipes/images.py` (redimensionnement, miniature), `views/edit.js` | B, E, M |
| F-02 Ingrédients (quantité, unité, nom) | ✅ | `recipes/serializers.py`, `views/edit.js` | B, E |
| F-03 Étapes ordonnées avec durée facultative | ✅ | `recipes/models.py` (`Step`), `views/edit.js` | B, E |
| F-04 Réordonner, modifier, supprimer une étape | ✅ | `views/edit.js` (↑ ↓ ✕), écriture en bloc | B, E, M |
| F-05 Modifier, supprimer avec confirmation | ✅ | `views/detail.js` | B, E, M |
| F-06 Liste et recherche titre/ingrédient | ✅ | `recipes/views.py`, `views/list.js` | B, E |
| F-07 Filtre catégorie / étiquette | ✅ | `recipes/views.py`, `views/list.js` | B, E |
| F-08 Ajuster les portions | ✅ | `cooking-state.js` (`scaleQuantity`, `sessionServings`), fiche et mode cuisine, mémorisé dans la session | F, E |
| F-09 Favoris | ✅ | `views/detail.js`, filtre `favorite=1` | B, E |

## Mode cuisine

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-10 Mode cuisine : ingrédients en haut, étape en cours dessous | ✅ | `views/cook.js`, `.cook-*` dans `app.css` | F, E, M |
| F-11 Étape cochée disparaît, la suivante remonte | ✅ | `cooking-state.js` (`splitSteps`) | F, E, M |
| F-12 Annuler + barre « Étapes terminées (n) » repliée | ✅ | `views/cook.js` | F, E, M |
| F-13 Cocher les ingrédients | ✅ | `views/cook.js`, `cooking/` | B, E, M |
| F-14 Progression « 3 étapes sur 7 » | ✅ | `cooking-state.js` (`progressLabel`) | F, E |
| F-15 Avancement conservé (rechargement, veille) | ✅ | `sessions.js`, `cooking/` | B, F, E, M |
| F-16 Réinitialiser | ✅ | `DELETE /session/`, bouton « Recommencer » | B, E, M |
| F-17 Écran toujours allumé | ✅ | Wake Lock dans `views/cook.js` | M |

## Minuteurs

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-20 Bouton « Lancer le minuteur » préréglé | ✅ | `views/cook.js`, `timer-manager.js` | F, E, M |
| F-21 Pause, reprise, réinitialiser, arrêter | ✅ | `timers.js`, bandeau | F |
| F-22 Alerte son, vibration, notification | 🟡 | `alerts.js` — à valider sur iPhone et Android réels | M |
| F-23 Plusieurs minuteurs simultanés, nommés | ✅ | `timer-manager.js` | F, M |
| F-24 Bandeau toujours visible | ✅ | `#timer-banner` fixe | M |
| F-25 Justes en arrière-plan (heure de fin) | ✅ | `timers.js` (`end_at`) | F, E, M |
| F-26 ±1 minute | ✅ | `timers.js` (`addMinutes`) | F |
| F-27 Proposer de cocher l'étape à la fin | ✅ | bouton « Cocher l'étape » du bandeau | E, M |
| F-28 Minuteur libre | ⬜ | prévu en V2 | — |

## Exigences non fonctionnelles

| ID | État | Remarque |
| --- | --- | --- |
| NF-01 Responsive 360 → 1920 px | ✅ | mobile d'abord ; vérifié à 390 et 1280 px |
| NF-02 Zones tactiles 48 px, texte ≥ 18 px en cuisine | ✅ | `--tap: 48px`, étapes en 1,125 à 1,35 rem |
| NF-03 Recette ouverte en < 2 s en 4G | 🟡 | pas de build, ~60 Ko de JS/CSS, photos ≤ 1600 px et miniatures de 600 px dans la liste ; à mesurer (Lighthouse) |
| NF-04 Précision < 1 s | ✅ | recalcul sur l'heure de fin toutes les 250 ms |
| NF-05 Hors ligne (PWA) | ✅ | `sw.js` + localStorage ; testé par `make e2e` (scénario 8) |
| NF-06 Navigateurs récents | 🟡 | testé sur Chrome ; Safari, Firefox et Edge à vérifier |
| NF-07 Accessibilité WCAG 2.1 AA | 🟡 | labels, `aria-live`, focus visible, contrastes ; audit complet à faire |
| NF-08 Sécurité | ✅ | HTTPS via `DJANGO_HTTPS`, mots de passe hachés, isolation par utilisateur (tests B et `make e2e` scénario 10), blocage après 5 échecs de connexion et limites de débit (`accounts/security.py`) |
| NF-09 RGPD : export et suppression | ✅ | `/api/auth/export/`, `DELETE /api/auth/me/` ; tests B et `make e2e` scénario 12 |
| NF-10 Sauvegarde quotidienne 30 jours | 🟡 | `scripts/backup.sh` prêt ; cron à installer sur le serveur |
| NF-11 Interface en français | ✅ | |

## Reste à faire identifié

- Recette manuelle sur téléphones réels (F-22, NF-06), notamment iPhone.
- Audit d'accessibilité (NF-07) et mesure de performance (NF-03).
- F-28 et pistes V2.
- Questions ouvertes du §10 du cahier des charges.
