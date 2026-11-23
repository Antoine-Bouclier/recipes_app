/**
 * Mode cuisine (F-10 à F-17, F-20).
 *
 * Disposition : ingrédients en haut (à cocher, F-13), étape en cours juste en
 * dessous en gros caractères, puis les étapes suivantes. Une étape cochée
 * disparaît (F-11), un bouton « Annuler » reste quelques secondes (F-12) et
 * les étapes terminées sont rangées dans « Étapes terminées (n) », fermé par
 * défaut. L'avancement est sauvegardé localement et sur le serveur (F-15).
 */
import { Api } from "../api.js";
import { progressLabel, sessionServings, splitSteps, stepServings, toggleId } from "../cooking-state.js";
import { clear, h, setTitle, toast } from "../dom.js";
import * as sessions from "../sessions.js";
import * as timers from "../timer-manager.js";
import { formatDuration, humanDuration, isFinished, remainingMs } from "../timers.js";
import { ingredientLine } from "./detail.js";

const UNDO_DELAY = 6000;

export async function cookView(root, { id }) {
  const recipeId = Number(id);
  const recipe = await Api.getRecipe(recipeId);
  setTitle(`Cuisiner : ${recipe.title}`);
  await sessions.loadSession(recipeId, recipe.title);
  document.body.classList.add("cook-mode");

  const ingredientsBox = h("section", { class: "cook-ingredients", "aria-label": "Ingrédients" });
  const stepsBox = h("section", { class: "cook-steps", "aria-live": "polite" });
  const progress = h("p", { class: "progress" });
  let doneOpen = false;
  let closeUndo = null;

  const session = () => sessions.getLocal(recipeId) || { checked_steps: [], checked_ingredients: [], timers: [] };
  const update = (fn) => sessions.updateSession(recipeId, (s) => ({ ...fn(s), title: recipe.title }));

  function checkStep(step) {
    update((s) => ({ ...s, checked_steps: toggleId(s.checked_steps, step.id) }));
    if (closeUndo) closeUndo();
    closeUndo = toast(`Étape cochée : ${step.text.slice(0, 40)}`, {
      duration: UNDO_DELAY,
      action: { label: "Annuler", run: () => update((s) => ({ ...s, checked_steps: s.checked_steps.filter((x) => x !== step.id) })) },
    });
  }

  function timerButton(step) {
    if (!step.timer_seconds) return null;
    const t = timers.forStep(recipeId, step.id);
    if (!t) {
      return h("button", { class: "btn btn-primary btn-large", onclick: () => timers.startForStep(recipeId, recipe.title, step) },
        `⏱ Lancer le minuteur (${humanDuration(step.timer_seconds)})`);
    }
    const label = isFinished(t) ? "Minuteur terminé" : t.paused
      ? `Minuteur en pause · ${formatDuration(remainingMs(t))}` : "Minuteur en cours (voir en bas)";
    return h("p", { class: "timer-status" }, `⏱ ${label}`);
  }

  function changeServings(delta) {
    update((s) => {
      const next = stepServings(sessionServings(s, recipe), delta);
      return { ...s, servings: next === recipe.servings ? null : next };
    });
  }

  function renderIngredients() {
    const s = session();
    const servings = sessionServings(s, recipe);
    clear(ingredientsBox).append(
      h("div", { class: "cook-ingredients-head" },
        h("h2", {}, "Ingrédients"),
        h("div", { class: "stepper", role: "group", "aria-label": "Nombre de portions" },
          h("button", { class: "btn btn-small", onclick: () => changeServings(-1), "aria-label": "Une portion de moins" }, "−"),
          h("output", { "aria-live": "polite" }, `${servings} pers.`),
          h("button", { class: "btn btn-small", onclick: () => changeServings(1), "aria-label": "Une portion de plus" }, "+"))),
      h("ul", { class: "cook-ingredient-list" }, recipe.ingredients.map((ing) => {
        const checked = s.checked_ingredients.includes(ing.id);
        return h("li", { class: checked ? "is-checked" : "" },
          h("label", { class: "check" },
            h("input", { type: "checkbox", checked, onchange: () => update((x) => ({ ...x, checked_ingredients: toggleId(x.checked_ingredients, ing.id) })) }),
            h("span", {}, ingredientLine(ing, recipe.servings, servings))));
      })));
  }

  function renderSteps() {
    const s = session();
    const { current, upcoming, done, finished, progress: p } = splitSteps(recipe.steps, s.checked_steps);
    progress.textContent = progressLabel(p);
    clear(stepsBox);
    if (finished) {
      stepsBox.append(h("div", { class: "cook-finished" },
        h("p", { class: "big" }, "🎉 Recette terminée !"),
        h("button", { class: "btn", onclick: restart }, "Recommencer la recette")));
    } else if (current) {
      stepsBox.append(h("article", { class: "cook-current" },
        h("p", { class: "step-number" }, `Étape ${recipe.steps.indexOf(current) + 1}`),
        h("p", { class: "step-text" }, current.text),
        h("div", { class: "actions" },
          timerButton(current),
          h("button", { class: "btn btn-check btn-large", onclick: () => checkStep(current) }, "✓ Étape terminée"))));
    } else {
      stepsBox.append(h("p", { class: "muted" }, "Cette recette n'a pas d'étape."));
    }
    if (upcoming.length) {
      stepsBox.append(h("ol", { class: "cook-upcoming", "aria-label": "Étapes suivantes" }, upcoming.map((st) =>
        h("li", {},
          h("span", { class: "step-number" }, `${recipe.steps.indexOf(st) + 1}.`),
          h("span", {}, st.text),
          h("span", { class: "row-actions" },
            st.timer_seconds && !timers.forStep(recipeId, st.id) && h("button", {
              class: "btn btn-small", onclick: () => timers.startForStep(recipeId, recipe.title, st),
              "aria-label": `Lancer le minuteur de l'étape ${recipe.steps.indexOf(st) + 1}`,
            }, `⏱ ${humanDuration(st.timer_seconds)}`),
            h("button", { class: "btn btn-small", onclick: () => checkStep(st), "aria-label": `Cocher l'étape ${recipe.steps.indexOf(st) + 1}` }, "✓"))))));
    }
    if (done.length) {
      const details = h("details", { class: "cook-done", open: doneOpen, ontoggle: (e) => { doneOpen = e.target.open; } },
        h("summary", {}, `Étapes terminées (${done.length})`),
        h("ul", {}, done.map((st) => h("li", {},
          h("label", { class: "check" },
            h("input", { type: "checkbox", checked: true, onchange: () => update((x) => ({ ...x, checked_steps: x.checked_steps.filter((i) => i !== st.id) })) }),
            h("span", { class: "done-text" }, `${recipe.steps.indexOf(st) + 1}. ${st.text}`))))));
      stepsBox.append(details);
    }
  }

  async function restart() {
    if (!window.confirm("Recommencer : toutes les étapes seront décochées et les minuteurs arrêtés.")) return;
    const { servings } = session(); // les portions choisies sont conservées
    await sessions.resetSession(recipeId);
    await sessions.loadSession(recipeId, recipe.title);
    if (servings) update((s) => ({ ...s, servings }));
    render();
  }

  function render() {
    renderIngredients();
    renderSteps();
  }

  // F-17 : garder l'écran allumé tant que le mode cuisine est ouvert.
  let wakeLock = null;
  async function lockScreen() {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      /* refusé (batterie faible, navigateur) : sans conséquence */
    }
  }
  const onVisible = () => { if (document.visibilityState === "visible") lockScreen(); };
  document.addEventListener("visibilitychange", onVisible);
  lockScreen();

  const unsubscribe = sessions.subscribe((changed) => {
    if (changed === recipeId || changed === null) render();
  });

  root.append(
    h("div", { class: "cook-head" },
      h("a", { href: `#/recettes/${recipeId}`, class: "btn btn-small" }, "← Quitter"),
      h("h1", {}, recipe.title),
      progress,
      h("button", { class: "btn btn-small", onclick: restart }, "↺ Recommencer")),
    ingredientsBox,
    stepsBox,
  );
  render();

  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    document.body.classList.remove("cook-mode");
    if (wakeLock) wakeLock.release().catch(() => {});
    if (closeUndo) closeUndo();
  };
}
