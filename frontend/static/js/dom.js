/**
 * Petit utilitaire de création d'éléments. Les enfants texte passent par
 * createTextNode : aucun HTML injecté, donc pas de faille XSS.
 *
 *   h("button", { class: "btn", onclick: fn, "aria-label": "Fermer" }, "×")
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2), value);
    } else if (key === "class") {
      el.className = value;
    } else if (key === "value") {
      el.value = value; // propriété (fonctionne aussi pour <textarea>)
    } else if (key === "dataset") {
      Object.assign(el.dataset, value);
    } else if (key in el && typeof value !== "string") {
      el[key] = value; // ex. checked, value numérique, disabled
    } else {
      el.setAttribute(key, value === true ? "" : value);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Message éphémère annoncé aux lecteurs d'écran ; renvoie une fonction de fermeture. */
export function toast(message, { action, duration = 4000 } = {}) {
  const region = document.getElementById("toasts");
  const close = () => item.remove();
  const item = h(
    "div",
    { class: "toast", role: "status" },
    h("span", {}, message),
    action && h("button", { class: "btn btn-small", onclick: () => { close(); action.run(); } }, action.label),
  );
  region.append(item);
  if (duration) setTimeout(close, duration);
  return close;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const CATEGORIES = [
  ["entree", "Entrée"],
  ["plat", "Plat"],
  ["dessert", "Dessert"],
  ["accompagnement", "Accompagnement"],
  ["boisson", "Boisson"],
  ["autre", "Autre"],
];

export function categoryLabel(value) {
  return (CATEGORIES.find(([v]) => v === value) || [null, value])[1];
}

export function setTitle(text) {
  document.title = text ? `${text} · Recettes` : "Recettes";
}
