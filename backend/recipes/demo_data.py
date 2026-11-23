"""Données de démonstration chargées par `python manage.py seed_demo` (`make seed`).

Pour ajouter une recette de démo : ajouter un dictionnaire dans DEMO_RECIPES
(même format que le corps JSON de POST /api/recipes/, voir docs/api.md).
Les durées de minuteur sont en secondes.
"""

DEMO_PASSWORD = "demo-recettes"

DEMO_USERS = [
    {"email": "demo@recettes.local", "name": "Démo"},
    # Second compte : sert à vérifier que chacun ne voit que ses recettes (NF-08).
    {"email": "autre@recettes.local", "name": "Autre cuisinier"},
]

MIN = 60

DEMO_RECIPES = {
    "demo@recettes.local": [
        {
            "title": "Test des minuteurs (durées courtes)",
            "description": "Recette factice pour essayer les minuteurs sans attendre : "
            "lancer les trois minuteurs, ils sonnent à quelques secondes d'intervalle.",
            "servings": 1,
            "prep_minutes": 1,
            "cook_minutes": 1,
            "category": "autre",
            "tags": ["test"],
            "favorite": True,
            "ingredients": [{"quantity": "1", "unit": "", "name": "chronomètre imaginaire"}],
            "steps": [
                {"text": "Lancer ce minuteur de 10 secondes.", "timer_seconds": 10, "timer_label": "10 secondes"},
                {"text": "Lancer en même temps ce minuteur de 20 secondes.", "timer_seconds": 20, "timer_label": "20 secondes"},
                {"text": "Et celui-ci de 5 secondes, puis attendre les alertes.", "timer_seconds": 5, "timer_label": "5 secondes"},
                {"text": "Cocher cette dernière étape pour terminer la recette."},
            ],
        },
        {
            "title": "Spaghetti à la bolognaise",
            "description": "Le classique du dimanche. La sauce mijote pendant que les pâtes cuisent : "
            "idéal pour tester deux minuteurs en parallèle.",
            "servings": 4,
            "prep_minutes": 15,
            "cook_minutes": 45,
            "category": "plat",
            "tags": ["italien", "familial"],
            "favorite": True,
            "ingredients": [
                {"quantity": "400", "unit": "g", "name": "spaghetti"},
                {"quantity": "500", "unit": "g", "name": "bœuf haché"},
                {"quantity": "1", "unit": "", "name": "oignon"},
                {"quantity": "2", "unit": "gousses", "name": "ail"},
                {"quantity": "1", "unit": "", "name": "carotte"},
                {"quantity": "800", "unit": "g", "name": "tomates concassées"},
                {"quantity": "2", "unit": "c. à s.", "name": "huile d'olive"},
                {"quantity": None, "unit": "", "name": "sel, poivre, parmesan"},
            ],
            "steps": [
                {"text": "Émincer l'oignon, l'ail et la carotte."},
                {"text": "Faire revenir les légumes dans l'huile d'olive.", "timer_seconds": 5 * MIN, "timer_label": "Légumes"},
                {"text": "Ajouter la viande et la faire dorer en remuant.", "timer_seconds": 5 * MIN, "timer_label": "Viande"},
                {"text": "Verser les tomates, saler, poivrer et laisser mijoter à feu doux.", "timer_seconds": 30 * MIN, "timer_label": "Sauce"},
                {"text": "Pendant ce temps, cuire les spaghetti dans l'eau bouillante salée.", "timer_seconds": 10 * MIN, "timer_label": "Pâtes"},
                {"text": "Égoutter, servir avec la sauce et le parmesan."},
            ],
        },
        {
            "title": "Crêpes",
            "description": "Pâte à crêpes simple, avec un temps de repos.",
            "servings": 6,
            "prep_minutes": 10,
            "cook_minutes": 20,
            "category": "dessert",
            "tags": ["sucré", "goûter"],
            "favorite": False,
            "ingredients": [
                {"quantity": "250", "unit": "g", "name": "farine"},
                {"quantity": "4", "unit": "", "name": "œufs"},
                {"quantity": "50", "unit": "cl", "name": "lait"},
                {"quantity": "50", "unit": "g", "name": "beurre fondu"},
                {"quantity": "1", "unit": "pincée", "name": "sel"},
            ],
            "steps": [
                {"text": "Mélanger la farine et le sel, creuser un puits, ajouter les œufs."},
                {"text": "Incorporer le lait petit à petit en fouettant, puis le beurre fondu."},
                {"text": "Laisser reposer la pâte.", "timer_seconds": 60 * MIN, "timer_label": "Repos de la pâte"},
                {"text": "Cuire les crêpes dans une poêle chaude, environ 1 minute par face.", "timer_seconds": 1 * MIN, "timer_label": "Une face"},
            ],
        },
        {
            "title": "Salade de chèvre chaud",
            "description": "",
            "servings": 2,
            "prep_minutes": 10,
            "cook_minutes": 5,
            "category": "entree",
            "tags": ["rapide", "végétarien"],
            "favorite": False,
            "ingredients": [
                {"quantity": "4", "unit": "tranches", "name": "pain de campagne"},
                {"quantity": "1", "unit": "", "name": "bûche de chèvre"},
                {"quantity": "100", "unit": "g", "name": "salade mélangée"},
                {"quantity": "1", "unit": "c. à s.", "name": "miel"},
                {"quantity": None, "unit": "", "name": "vinaigrette"},
            ],
            "steps": [
                {"text": "Préchauffer le four en position gril."},
                {"text": "Poser une rondelle de chèvre sur chaque tranche de pain, un filet de miel dessus."},
                {"text": "Passer au four.", "timer_seconds": 5 * MIN, "timer_label": "Chèvre au four"},
                {"text": "Servir sur la salade assaisonnée."},
            ],
        },
        {
            "title": "Riz basmati",
            "description": "Cuisson par absorption.",
            "servings": 4,
            "prep_minutes": 2,
            "cook_minutes": 17,
            "category": "accompagnement",
            "tags": ["rapide", "basique"],
            "favorite": False,
            "ingredients": [
                {"quantity": "300", "unit": "g", "name": "riz basmati"},
                {"quantity": "45", "unit": "cl", "name": "eau"},
                {"quantity": None, "unit": "", "name": "sel"},
            ],
            "steps": [
                {"text": "Rincer le riz jusqu'à ce que l'eau soit claire."},
                {"text": "Porter l'eau salée à ébullition, ajouter le riz, couvrir, feu doux.", "timer_seconds": 12 * MIN, "timer_label": "Cuisson du riz"},
                {"text": "Couper le feu et laisser reposer à couvert.", "timer_seconds": 5 * MIN, "timer_label": "Repos du riz"},
                {"text": "Égrainer à la fourchette."},
            ],
        },
        {
            "title": "Velouté de potimarron",
            "description": "Pas besoin d'éplucher le potimarron.",
            "servings": 4,
            "prep_minutes": 15,
            "cook_minutes": 25,
            "category": "entree",
            "tags": ["végétarien", "hiver"],
            "favorite": True,
            "ingredients": [
                {"quantity": "1", "unit": "kg", "name": "potimarron"},
                {"quantity": "1", "unit": "", "name": "oignon"},
                {"quantity": "1", "unit": "l", "name": "bouillon de légumes"},
                {"quantity": "10", "unit": "cl", "name": "crème"},
            ],
            "steps": [
                {"text": "Couper le potimarron en cubes (retirer les graines) et émincer l'oignon."},
                {"text": "Faire suer l'oignon, ajouter le potimarron et le bouillon.", "timer_seconds": 25 * MIN, "timer_label": "Velouté"},
                {"text": "Mixer, ajouter la crème, rectifier l'assaisonnement."},
            ],
        },
        {
            "title": "Tarte aux pommes",
            "description": "",
            "servings": 6,
            "prep_minutes": 20,
            "cook_minutes": 35,
            "category": "dessert",
            "tags": ["sucré", "four"],
            "favorite": False,
            "ingredients": [
                {"quantity": "1", "unit": "", "name": "pâte brisée"},
                {"quantity": "5", "unit": "", "name": "pommes"},
                {"quantity": "40", "unit": "g", "name": "sucre"},
                {"quantity": "30", "unit": "g", "name": "beurre"},
            ],
            "steps": [
                {"text": "Préchauffer le four à 200 °C et étaler la pâte dans le moule."},
                {"text": "Éplucher et trancher finement les pommes, les disposer en rosace."},
                {"text": "Saupoudrer de sucre, parsemer de beurre et enfourner.", "timer_seconds": 35 * MIN, "timer_label": "Tarte au four"},
            ],
        },
        {
            "title": "Citronnade maison",
            "description": "",
            "servings": 6,
            "prep_minutes": 10,
            "cook_minutes": 0,
            "category": "boisson",
            "tags": ["été", "sans cuisson"],
            "favorite": False,
            "ingredients": [
                {"quantity": "4", "unit": "", "name": "citrons"},
                {"quantity": "100", "unit": "g", "name": "sucre"},
                {"quantity": "1.5", "unit": "l", "name": "eau fraîche"},
                {"quantity": None, "unit": "", "name": "menthe"},
            ],
            "steps": [
                {"text": "Presser les citrons, mélanger le jus avec le sucre jusqu'à dissolution."},
                {"text": "Ajouter l'eau et la menthe, laisser infuser au frais.", "timer_seconds": 10 * MIN, "timer_label": "Infusion"},
                {"text": "Servir bien frais."},
            ],
        },
    ],
    "autre@recettes.local": [
        {
            "title": "Gratin dauphinois",
            "description": "Recette du second compte : ne doit pas apparaître pour le compte Démo.",
            "servings": 6,
            "prep_minutes": 20,
            "cook_minutes": 60,
            "category": "accompagnement",
            "tags": ["four"],
            "favorite": True,
            "ingredients": [
                {"quantity": "1.5", "unit": "kg", "name": "pommes de terre"},
                {"quantity": "50", "unit": "cl", "name": "crème"},
                {"quantity": "50", "unit": "cl", "name": "lait"},
                {"quantity": "1", "unit": "gousse", "name": "ail"},
            ],
            "steps": [
                {"text": "Éplucher et trancher finement les pommes de terre."},
                {"text": "Frotter le plat avec l'ail, disposer les pommes de terre, couvrir de lait et de crème."},
                {"text": "Cuire au four à 160 °C.", "timer_seconds": 60 * MIN, "timer_label": "Gratin"},
            ],
        },
    ],
}
