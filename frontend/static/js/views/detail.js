// Fiche d'une recette : portions ajustables (F-08), favori (F-09), suppression (F-05).
import { Api } from "../api.js";
import { formatQuantity, scaleQuantity } from "../cooking-state.js";
import { categoryLabel, clear, h, setTitle, toast } from "../dom.js";
import * as sessions from "../sessions.js";
import { humanDuration } from "../timers.js";

export function ingredientLine(i, from, to) {
  const q = formatQuantity(scaleQuantity(i.quantity, from, to));
  return [q && h("strong", {}, `${q}${i.unit ? " " + i.unit : ""} `), !q && i.unit ? `${i.unit} ` : "", i.name];
}

export async function detailView(root, { id }) {
  const recipe = await Api.getRecipe(id);
  setTitle(recipe.title);
  let servings = recipe.servings;
  const ingredientsList = h("ul", { class: "ingredients" });
  const servingsOut = h("output", { "aria-live": "polite" });

  function renderIngredients() {
    servingsOut.textContent = `${servings} pers.`;
    clear(ingredientsList).append(...recipe.ingredients.map((i) => h("li", {}, ingredientLine(i, recipe.servings, servings))));
  }

  const favBtn = h("button", { class: "btn", "aria-pressed": String(recipe.favorite) });
  const renderFav = () => {
    favBtn.textContent = recipe.favorite ? "★ Favori" : "☆ Ajouter aux favoris";
    favBtn.setAttribute("aria-pressed", String(recipe.favorite));
  };
  favBtn.addEventListener("click", async () => {
    try {
      const updated = await Api.updateRecipe(recipe.id, { favorite: !recipe.favorite });
      recipe.favorite = updated.favorite;
      renderFav();
    } catch (err) {
      toast(err.message);
    }
  });
  renderFav();

  async function remove() {
    if (!window.confirm(`Supprimer définitivement « ${recipe.title} » ?`)) return;
    try {
      await Api.deleteRecipe(recipe.id);
      sessions.forget(recipe.id);
      toast("Recette supprimée.");
      location.hash = "#/recettes";
    } catch (err) {
      toast(err.message);
    }
  }

  const step = (delta) => () => { servings = Math.max(1, servings + delta); renderIngredients(); };

  root.append(
    h("p", {}, h("a", { href: "#/recettes" }, "← Mes recettes")),
    h("article", { class: "recipe" },
      recipe.photo && h("img", { class: "recipe-photo", src: recipe.photo, alt: `Photo : ${recipe.title}` }),
      h("h1", {}, recipe.title),
      h("p", { class: "muted" },
        categoryLabel(recipe.category),
        recipe.prep_minutes ? ` · Préparation ${recipe.prep_minutes} min` : "",
        recipe.cook_minutes ? ` · Cuisson ${recipe.cook_minutes} min` : ""),
      recipe.tags.length ? h("p", { class: "tags" }, recipe.tags.map((t) => h("span", { class: "chip" }, `#${t}`))) : null,
      recipe.description && h("p", { class: "description" }, recipe.description),
      h("div", { class: "actions" },
        h("a", { class: "btn btn-primary btn-large", href: `#/recettes/${recipe.id}/cuisine` }, "👩‍🍳 Cuisiner"),
        favBtn,
        h("a", { class: "btn", href: `#/recettes/${recipe.id}/modifier` }, "Modifier"),
        h("button", { class: "btn btn-danger", onclick: remove }, "Supprimer")),
      h("section", {},
        h("div", { class: "section-head" },
          h("h2", {}, "Ingrédients"),
          h("div", { class: "stepper", role: "group", "aria-label": "Nombre de portions" },
            h("button", { class: "btn btn-small", onclick: step(-1), "aria-label": "Une portion de moins" }, "−"),
            servingsOut,
            h("button", { class: "btn btn-small", onclick: step(1), "aria-label": "Une portion de plus" }, "+"))),
        ingredientsList),
      h("section", {},
        h("h2", {}, "Étapes"),
        h("ol", { class: "steps" }, recipe.steps.map((s) =>
          h("li", {}, h("p", {}, s.text), s.timer_seconds ? h("p", { class: "muted" }, `⏱ ${humanDuration(s.timer_seconds)}`) : null))))),
  );
  renderIngredients();
}
