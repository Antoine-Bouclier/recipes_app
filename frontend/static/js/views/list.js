// Liste des recettes, recherche et filtres (F-06, F-07, F-09).
import { Api } from "../api.js";
import { CATEGORIES, categoryLabel, clear, debounce, h, setTitle } from "../dom.js";
import * as storage from "../storage.js";

const FILTERS_KEY = "list-filters";

export function listView(root) {
  setTitle("Mes recettes");
  const filters = storage.load(FILTERS_KEY, { q: "", category: "", tag: "", favorite: false });
  const results = h("div", { class: "recipe-grid", "aria-live": "polite" });
  const tagChip = h("div", { class: "active-tag" });

  const search = h("input", {
    type: "search", id: "search", placeholder: "Titre ou ingrédient…", value: filters.q, autocomplete: "off",
  });
  const category = h(
    "select",
    { id: "category" },
    h("option", { value: "" }, "Toutes les catégories"),
    CATEGORIES.map(([v, l]) => h("option", { value: v, selected: filters.category === v }, l)),
  );
  const favorite = h("input", { type: "checkbox", id: "favorite", checked: filters.favorite });

  let requestId = 0;

  async function refresh() {
    storage.save(FILTERS_KEY, filters);
    renderTag();
    const current = (requestId += 1);
    let recipes;
    try {
      recipes = await Api.listRecipes({
        q: filters.q, category: filters.category, tag: filters.tag, favorite: filters.favorite ? 1 : "",
      });
    } catch (err) {
      if (current === requestId) clear(results).append(h("p", { class: "form-error" }, err.message));
      return;
    }
    if (current !== requestId) return; // une recherche plus récente est en cours
    clear(results);
    if (!recipes.length) {
      const empty = !filters.q && !filters.category && !filters.tag && !filters.favorite;
      results.append(
        h("div", { class: "empty" },
          h("p", {}, empty ? "Aucune recette pour l'instant." : "Aucune recette ne correspond."),
          empty && h("a", { class: "btn btn-primary", href: "#/recettes/nouvelle" }, "Créer ma première recette")),
      );
      return;
    }
    results.append(...recipes.map(card));
  }

  function renderTag() {
    clear(tagChip);
    if (filters.tag) {
      tagChip.append(
        h("span", { class: "muted" }, "Étiquette : "),
        h("button", { class: "chip chip-active", onclick: () => { filters.tag = ""; refresh(); },
          "aria-label": `Retirer le filtre ${filters.tag}` }, `#${filters.tag} ✕`),
      );
    }
  }

  function card(r) {
    const total = (r.prep_minutes || 0) + (r.cook_minutes || 0);
    return h(
      "article",
      { class: "recipe-card" },
      r.photo ? h("img", { src: r.photo_thumb || r.photo, alt: "", loading: "lazy" }) : h("div", { class: "recipe-card-placeholder", "aria-hidden": "true" }, "🍽"),
      h(
        "div",
        { class: "recipe-card-body" },
        h("h2", {}, h("a", { href: `#/recettes/${r.id}` }, r.title), r.favorite ? h("span", { class: "fav", "aria-label": "favori" }, " ★") : null),
        h("p", { class: "muted" }, categoryLabel(r.category), total ? ` · ${total} min` : "", ` · ${r.servings} pers.`),
        r.tags.length ? h("p", { class: "tags" }, r.tags.map((t) =>
          h("button", { class: "chip", onclick: () => { filters.tag = t; refresh(); } }, `#${t}`))) : null,
      ),
    );
  }

  search.addEventListener("input", debounce(() => { filters.q = search.value.trim(); refresh(); }, 250));
  category.addEventListener("change", () => { filters.category = category.value; refresh(); });
  favorite.addEventListener("change", () => { filters.favorite = favorite.checked; refresh(); });

  root.append(
    h("div", { class: "page-head" },
      h("h1", {}, "Mes recettes"),
      h("a", { class: "btn btn-primary", href: "#/recettes/nouvelle" }, "+ Nouvelle recette")),
    h("div", { class: "filters", role: "search" },
      h("div", { class: "field field-grow" }, h("label", { for: "search" }, "Rechercher"), search),
      h("div", { class: "field" }, h("label", { for: "category" }, "Catégorie"), category),
      h("label", { class: "check", for: "favorite" }, favorite, " Favoris")),
    tagChip,
    results,
  );
  refresh();
}
