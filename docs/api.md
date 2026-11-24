# API REST

Toutes les routes sont préfixées par `/api/`. Format JSON. Authentification par
cookie de session ; les requêtes qui modifient des données (`POST`, `PUT`,
`PATCH`, `DELETE`) doivent envoyer l'en-tête `X-CSRFToken` avec la valeur du
cookie `csrftoken` (posé par la page d'accueil).

Sauf mention contraire, une route exige d'être connecté (sinon `403`). Une
ressource d'un autre utilisateur répond `404`.

En développement (`DJANGO_DEBUG=1`), l'API est explorable dans le navigateur :
http://127.0.0.1:8000/api/

## Comptes — `accounts/`

| Méthode | Route | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/auth/config/` *(public)* | — | `{sso, sso_login_url, password_login}` : modes de connexion proposés |
| POST | `/auth/register/` *(public)* | `{email, name?, password}` | `201` utilisateur, connecté ; `403` si la connexion par mot de passe est désactivée |
| POST | `/auth/login/` *(public)* | `{email, password}` | `200` utilisateur ; `400` si invalide ; `403` si désactivée |
| POST | `/auth/logout/` *(public)* | — | `204` ; compte partagé : `200 {redirect}`, adresse de déconnexion du fournisseur d'identité |
| GET | `/auth/me/` | — | `{id, email, name, date_joined, has_password}` (`has_password` faux pour un compte partagé) |
| DELETE | `/auth/me/` | `{password}`, ou `{email}` pour un compte partagé | `204` ; supprime le compte et toutes ses données (NF-09) |
| GET | `/auth/export/` | — | fichier JSON : utilisateur + recettes complètes (NF-09) |

## Recettes — `recipes/`

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/recipes/` | Liste (version allégée, sans ingrédients ni étapes) |
| POST | `/recipes/` | Crée une recette (avec ingrédients et étapes) |
| GET | `/recipes/:id/` | Recette complète |
| PATCH | `/recipes/:id/` | Modifie les champs envoyés |
| PUT | `/recipes/:id/` | Remplace la recette |
| DELETE | `/recipes/:id/` | Supprime la recette, sa photo et ses sessions |
| POST | `/recipes/:id/photo/` | Multipart, champ `photo` : ajoute ou remplace la photo |
| DELETE | `/recipes/:id/photo/` | Retire la photo |

Filtres de la liste (cumulables) :

| Paramètre | Effet |
| --- | --- |
| `q` | texte dans le titre **ou** le nom d'un ingrédient (F-06) |
| `category` | `entree`, `plat`, `dessert`, `accompagnement`, `boisson`, `autre` (F-07) |
| `tag` | une étiquette (F-07) |
| `favorite=1` | favoris seulement (F-09) |

Recette complète :

```json
{
  "id": 1,
  "title": "Pâtes bolognaise",
  "description": "",
  "photo": "http://…/media/recipes/2026/11/x.jpg",
  "servings": 4,
  "prep_minutes": 15,
  "cook_minutes": 40,
  "category": "plat",
  "tags": ["italien", "rapide"],
  "favorite": false,
  "created_at": "…",
  "updated_at": "…",
  "ingredients": [
    {"id": 10, "quantity": "400.00", "unit": "g", "name": "spaghetti"}
  ],
  "steps": [
    {"id": 20, "text": "Cuire les pâtes", "timer_seconds": 600, "timer_label": "Pâtes"}
  ]
}
```

Règles d'écriture :

- `ingredients` et `steps` sont **remplacés en bloc** : envoyer la liste
  complète dans l'ordre voulu. Les `id` envoyés sont ignorés (de nouveaux ids
  sont créés). Omettre la clé laisse la liste inchangée.
- `quantity` est facultative (`null`) ; `timer_seconds` à `0` ou `null` = pas de minuteur.
- `tags` : liste de textes, mis en minuscules, doublons retirés.

## Session de cuisine — `cooking/`

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/recipes/:id/session/` | Avancement (créé vide si besoin) |
| PUT | `/recipes/:id/session/` | Enregistre l'avancement (champs envoyés seulement) (F-15) |
| DELETE | `/recipes/:id/session/` | Réinitialise (F-16) |

```json
{
  "recipe": 1,
  "started_at": "…",
  "updated_at": "…",
  "checked_steps": [20],
  "checked_ingredients": [10],
  "timers": [
    {
      "id": "tmabc1",
      "step": 21,
      "label": "Pâtes",
      "duration": 600,
      "end_at": 1795480000000,
      "paused": false,
      "remaining": null,
      "alerted": false
    }
  ]
}
```

- `end_at` : heure de fin en millisecondes depuis 1970 (minuteur en cours).
- En pause : `paused: true`, `end_at: null`, `remaining` = millisecondes restantes.
- Les ids d'étapes ou d'ingrédients inconnus sont ignorés ; 20 minuteurs maximum.
