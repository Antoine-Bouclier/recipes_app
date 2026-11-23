# Suivi des exigences

État de chaque exigence du [cahier des charges](cahier-des-charges.md), où
elle est codée et comment elle est vérifiée. À mettre à jour dans le même
commit que le code concerné.

Légende : ✅ fait · 🟡 partiel ou à valider · ⬜ à faire

Tests : **B** = test backend automatique, **F** = test JavaScript automatique,
**M** = recette manuelle ([tests.md](tests.md)).

## Gestion des recettes

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-01 Créer une recette (photo facultative) | ✅ | `recipes/models.py`, `views/edit.js` | B, M |
| F-02 Ingrédients (quantité, unité, nom) | ✅ | `recipes/serializers.py`, `views/edit.js` | B |
| F-03 Étapes ordonnées avec durée facultative | ✅ | `recipes/models.py` (`Step`), `views/edit.js` | B |
| F-04 Réordonner, modifier, supprimer une étape | ✅ | `views/edit.js` (↑ ↓ ✕), écriture en bloc | B, M |
| F-05 Modifier, supprimer avec confirmation | ✅ | `views/detail.js` | B, M |
| F-06 Liste et recherche titre/ingrédient | ✅ | `recipes/views.py`, `views/list.js` | B |
| F-07 Filtre catégorie / étiquette | ✅ | `recipes/views.py`, `views/list.js` | B |
| F-08 Ajuster les portions | ✅ | `cooking-state.js` (`scaleQuantity`), `views/detail.js` | F |
| F-09 Favoris | ✅ | `views/detail.js`, filtre `favorite=1` | B |

## Mode cuisine

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-10 Mode cuisine : ingrédients en haut, étape en cours dessous | ✅ | `views/cook.js`, `.cook-*` dans `app.css` | F, M |
| F-11 Étape cochée disparaît, la suivante remonte | ✅ | `cooking-state.js` (`splitSteps`) | F, M |
| F-12 Annuler + barre « Étapes terminées (n) » repliée | ✅ | `views/cook.js` | F, M |
| F-13 Cocher les ingrédients | ✅ | `views/cook.js`, `cooking/` | B, M |
| F-14 Progression « 3 étapes sur 7 » | ✅ | `cooking-state.js` (`progressLabel`) | F |
| F-15 Avancement conservé (rechargement, veille) | ✅ | `sessions.js`, `cooking/` | B, F, M |
| F-16 Réinitialiser | ✅ | `DELETE /session/`, bouton « Recommencer » | B, M |
| F-17 Écran toujours allumé | ✅ | Wake Lock dans `views/cook.js` | M |

## Minuteurs

| ID | État | Code | Tests |
| --- | --- | --- | --- |
| F-20 Bouton « Lancer le minuteur » préréglé | ✅ | `views/cook.js`, `timer-manager.js` | F, M |
| F-21 Pause, reprise, réinitialiser, arrêter | ✅ | `timers.js`, bandeau | F |
| F-22 Alerte son, vibration, notification | 🟡 | `alerts.js` — à valider sur iPhone et Android réels | M |
| F-23 Plusieurs minuteurs simultanés, nommés | ✅ | `timer-manager.js` | F, M |
| F-24 Bandeau toujours visible | ✅ | `#timer-banner` fixe | M |
| F-25 Justes en arrière-plan (heure de fin) | ✅ | `timers.js` (`end_at`) | F, M |
| F-26 ±1 minute | ✅ | `timers.js` (`addMinutes`) | F |
| F-27 Proposer de cocher l'étape à la fin | ✅ | bouton « Cocher l'étape » du bandeau | M |
| F-28 Minuteur libre | ⬜ | prévu en V2 | — |

## Exigences non fonctionnelles

| ID | État | Remarque |
| --- | --- | --- |
| NF-01 Responsive 360 → 1920 px | ✅ | mobile d'abord ; vérifié à 390 et 1280 px |
| NF-02 Zones tactiles 48 px, texte ≥ 18 px en cuisine | ✅ | `--tap: 48px`, étapes en 1,125 à 1,35 rem |
| NF-03 Recette ouverte en < 2 s en 4G | 🟡 | pas de build, ~60 Ko de JS/CSS ; à mesurer (Lighthouse) |
| NF-04 Précision < 1 s | ✅ | recalcul sur l'heure de fin toutes les 250 ms |
| NF-05 Hors ligne (PWA) | ✅ | `sw.js` + localStorage ; testé (rechargement hors ligne, resynchronisation) |
| NF-06 Navigateurs récents | 🟡 | testé sur Chrome ; Safari, Firefox et Edge à vérifier |
| NF-07 Accessibilité WCAG 2.1 AA | 🟡 | labels, `aria-live`, focus visible, contrastes ; audit complet à faire |
| NF-08 Sécurité | ✅ | HTTPS via `DJANGO_HTTPS`, mots de passe hachés, isolation par utilisateur (testée) |
| NF-09 RGPD : export et suppression | ✅ | `/api/auth/export/`, `DELETE /api/auth/me/` |
| NF-10 Sauvegarde quotidienne 30 jours | 🟡 | `scripts/backup.sh` prêt ; cron à installer sur le serveur |
| NF-11 Interface en français | ✅ | |

## Reste à faire identifié

- Redimensionner les photos à l'envoi (§7 du cahier des charges).
- Recette manuelle sur téléphones réels (F-22, NF-06), notamment iPhone.
- Audit d'accessibilité (NF-07) et mesure de performance (NF-03).
- F-28 et pistes V2.
- Questions ouvertes du §10 du cahier des charges.
