// Création et modification d'une recette (F-01 à F-05).
import { Api } from "../api.js";
import { CATEGORIES, clear, h, setTitle, toast } from "../dom.js";

let uid = 0;
const key = () => `row${(uid += 1)}`;

export async function editView(root, { id }) {
  const recipe = id
    ? await Api.getRecipe(id)
    : { title: "", description: "", servings: 4, prep_minutes: 0, cook_minutes: 0, category: "plat", tags: [], ingredients: [], steps: [] };
  setTitle(id ? `Modifier ${recipe.title}` : "Nouvelle recette");

  // État des listes dynamiques ; chaque ligne garde une clé stable pour les libellés.
  const ingredients = recipe.ingredients.map((i) => ({ ...i, _k: key() }));
  const steps = recipe.steps.map((s) => ({
    ...s, _k: key(), min: s.timer_seconds ? Math.floor(s.timer_seconds / 60) : "", sec: s.timer_seconds ? s.timer_seconds % 60 : "",
  }));
  if (!ingredients.length) ingredients.push({ quantity: "", unit: "", name: "", _k: key() });
  if (!steps.length) steps.push({ text: "", min: "", sec: "", timer_label: "", _k: key() });

  const ingList = h("ol", { class: "edit-list" });
  const stepList = h("ol", { class: "edit-list" });
  const error = h("p", { class: "form-error", role: "alert" });

  function moveButtons(list, index, render, noun) {
    const move = (delta) => () => {
      const j = index + delta;
      [list[index], list[j]] = [list[j], list[index]];
      render(list[j]._k);
    };
    return h("div", { class: "row-actions" },
      h("button", { type: "button", class: "btn btn-small", disabled: index === 0, onclick: move(-1), "aria-label": `Monter ${noun} ${index + 1}` }, "↑"),
      h("button", { type: "button", class: "btn btn-small", disabled: index === list.length - 1, onclick: move(1), "aria-label": `Descendre ${noun} ${index + 1}` }, "↓"),
      h("button", { type: "button", class: "btn btn-small btn-danger", onclick: () => { list.splice(index, 1); render(); }, "aria-label": `Supprimer ${noun} ${index + 1}` }, "✕"));
  }

  const bind = (obj, prop) => (e) => { obj[prop] = e.target.value; };

  function renderIngredients(focusKey) {
    clear(ingList).append(...ingredients.map((ing, i) =>
      h("li", { class: "edit-row ing-row", dataset: { k: ing._k } },
        h("div", { class: "field field-qty" }, h("label", { for: `${ing._k}-q` }, "Quantité"),
          h("input", { id: `${ing._k}-q`, type: "number", min: "0", step: "any", inputmode: "decimal", value: ing.quantity ?? "", oninput: bind(ing, "quantity") })),
        h("div", { class: "field field-unit" }, h("label", { for: `${ing._k}-u` }, "Unité"),
          h("input", { id: `${ing._k}-u`, value: ing.unit, placeholder: "g, cl, c. à s.", oninput: bind(ing, "unit") })),
        h("div", { class: "field field-grow" }, h("label", { for: `${ing._k}-n` }, "Ingrédient"),
          h("input", { id: `${ing._k}-n`, value: ing.name, oninput: bind(ing, "name") })),
        moveButtons(ingredients, i, renderIngredients, "l'ingrédient"))));
    focusRow(ingList, focusKey);
  }

  function renderSteps(focusKey) {
    clear(stepList).append(...steps.map((st, i) =>
      h("li", { class: "edit-row step-row", dataset: { k: st._k } },
        h("div", { class: "field field-full" }, h("label", { for: `${st._k}-t` }, `Étape ${i + 1}`),
          h("textarea", { id: `${st._k}-t`, rows: 2, value: st.text, oninput: bind(st, "text") })),
        h("fieldset", { class: "duration" },
          h("legend", {}, "Minuteur (facultatif)"),
          h("div", { class: "field field-qty" }, h("label", { for: `${st._k}-m` }, "min"),
            h("input", { id: `${st._k}-m`, type: "number", min: "0", max: "1440", inputmode: "numeric", value: st.min, oninput: bind(st, "min") })),
          h("div", { class: "field field-qty" }, h("label", { for: `${st._k}-s` }, "s"),
            h("input", { id: `${st._k}-s`, type: "number", min: "0", max: "59", inputmode: "numeric", value: st.sec, oninput: bind(st, "sec") })),
          h("div", { class: "field field-grow" }, h("label", { for: `${st._k}-l` }, "Nom du minuteur"),
            h("input", { id: `${st._k}-l`, value: st.timer_label || "", placeholder: "ex. Cuisson des pâtes", oninput: bind(st, "timer_label") }))),
        moveButtons(steps, i, renderSteps, "l'étape"))));
    focusRow(stepList, focusKey);
  }

  function focusRow(list, k) {
    if (!k) return;
    const row = list.querySelector(`[data-k="${k}"]`);
    if (row) row.querySelector("input, textarea").focus();
  }

  const input = (name, label, attrs = {}) => h("div", { class: `field ${attrs.wrap || ""}` },
    h("label", { for: `r-${name}` }, label),
    h(attrs.tag || "input", { id: `r-${name}`, name, value: recipe[name] ?? "", ...attrs, wrap: undefined, tag: undefined }));

  const photoInput = h("input", { id: "r-photo", type: "file", accept: "image/*" });
  let removePhoto = false;

  const form = h("form", { class: "edit-form" },
    h("h1", {}, id ? "Modifier la recette" : "Nouvelle recette"),
    input("title", "Titre", { required: true, maxlength: 200, wrap: "field-full" }),
    input("description", "Description", { tag: "textarea", rows: 3, wrap: "field-full" }),
    h("div", { class: "grid-3" },
      input("servings", "Portions", { type: "number", min: 1, max: 100, required: true }),
      input("prep_minutes", "Préparation (min)", { type: "number", min: 0 }),
      input("cook_minutes", "Cuisson (min)", { type: "number", min: 0 })),
    h("div", { class: "grid-2" },
      h("div", { class: "field" }, h("label", { for: "r-category" }, "Catégorie"),
        h("select", { id: "r-category", name: "category" },
          CATEGORIES.map(([v, l]) => h("option", { value: v, selected: recipe.category === v }, l)))),
      input("tags", "Étiquettes (séparées par des virgules)", { value: recipe.tags.join(", "), placeholder: "rapide, végétarien" })),
    h("div", { class: "field" }, h("label", { for: "r-photo" }, "Photo (facultative)"), photoInput,
      recipe.photo && h("label", { class: "check" },
        h("input", { type: "checkbox", onchange: (e) => { removePhoto = e.target.checked; } }), " Retirer la photo actuelle")),
    h("section", {}, h("h2", {}, "Ingrédients"), ingList,
      h("button", { type: "button", class: "btn", onclick: () => {
        const row = { quantity: "", unit: "", name: "", _k: key() };
        ingredients.push(row);
        renderIngredients(row._k);
      } }, "+ Ajouter un ingrédient")),
    h("section", {}, h("h2", {}, "Étapes"), stepList,
      h("button", { type: "button", class: "btn", onclick: () => {
        const row = { text: "", min: "", sec: "", timer_label: "", _k: key() };
        steps.push(row);
        renderSteps(row._k);
      } }, "+ Ajouter une étape")),
    error,
    h("div", { class: "actions sticky-actions" },
      h("button", { type: "submit", class: "btn btn-primary" }, "Enregistrer"),
      h("a", { class: "btn", href: id ? `#/recettes/${id}` : "#/recettes" }, "Annuler")));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.textContent = "";
    const fd = new FormData(form);
    const payload = {
      title: fd.get("title").trim(),
      description: fd.get("description").trim(),
      servings: Number(fd.get("servings")) || 1,
      prep_minutes: Number(fd.get("prep_minutes")) || 0,
      cook_minutes: Number(fd.get("cook_minutes")) || 0,
      category: fd.get("category"),
      tags: fd.get("tags").split(",").map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()).map((i) => ({
        quantity: i.quantity === "" || i.quantity === null ? null : String(i.quantity), unit: i.unit.trim(), name: i.name.trim(),
      })),
      steps: steps.filter((s) => s.text.trim()).map((s) => {
        const seconds = (Number(s.min) || 0) * 60 + (Number(s.sec) || 0);
        return { text: s.text.trim(), timer_seconds: seconds || null, timer_label: (s.timer_label || "").trim() };
      }),
    };
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const saved = id ? await Api.updateRecipe(id, payload) : await Api.createRecipe(payload);
      if (photoInput.files[0]) await Api.uploadPhoto(saved.id, photoInput.files[0]);
      else if (removePhoto) await Api.deletePhoto(saved.id);
      toast("Recette enregistrée.");
      location.hash = `#/recettes/${saved.id}`;
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  });

  root.append(form);
  renderIngredients();
  renderSteps();
  if (!id) form.querySelector("#r-title").focus();
}
