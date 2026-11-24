/**
 * Point d'entrée : authentification, routage par ancre (#/...) et démarrage
 * des minuteurs globaux. Chaque vue est une fonction (root, params) qui peut
 * renvoyer une fonction de nettoyage appelée en quittant la page.
 */
import { Api, OfflineError } from "./api.js";
import { clear, h, toast } from "./dom.js";
import * as sessions from "./sessions.js";
import * as storage from "./storage.js";
import * as timers from "./timer-manager.js";
import { accountView } from "./views/account.js";
import { authView } from "./views/auth.js";
import { cookView } from "./views/cook.js";
import { detailView } from "./views/detail.js";
import { editView } from "./views/edit.js";
import { listView } from "./views/list.js";

const root = document.getElementById("app");
const nav = document.getElementById("nav");
let user = null;
let cleanup = null;

const routes = [
  [/^#\/recettes\/nouvelle$/, () => editView],
  [/^#\/recettes\/(\d+)\/modifier$/, () => editView],
  [/^#\/recettes\/(\d+)\/cuisine$/, () => cookView],
  [/^#\/recettes\/(\d+)$/, () => detailView],
  [/^#\/compte$/, () => accountView],
  [/^#\/recettes$/, () => listView],
];

function renderNav() {
  clear(nav);
  if (!user) return;
  nav.append(
    h("a", { href: "#/recettes" }, "Recettes"),
    h("a", { href: "#/compte", "aria-label": "Mon compte" }, user.name || "Compte"),
  );
}

function onLogin(u) {
  user = u;
  storage.save("user", u);
  renderNav();
  location.hash = "#/recettes";
  route();
}

function onLogout() {
  user = null;
  storage.remove("user");
  storage.remove("list-filters");
  sessions.clearAll();
  // Vide le cache hors ligne de l'API : un autre compte pourrait utiliser l'appareil.
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage("clear-api-cache");
  }
  renderNav();
  location.hash = "#/connexion";
  route();
}

async function route() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  clear(root);
  window.scrollTo(0, 0);
  const hash = location.hash || "#/recettes";

  if (!user) {
    await authView(root, { mode: hash === "#/inscription" ? "register" : "login", onLogin });
    return;
  }
  if (hash === "#/connexion" || hash === "#/inscription") {
    location.hash = "#/recettes";
    return;
  }
  for (const [pattern, getView] of routes) {
    const match = hash.match(pattern);
    if (!match) continue;
    try {
      const result = await getView()(root, { id: match[1], user, onLogout });
      if (typeof result === "function") cleanup = result;
    } catch (err) {
      if (err.status === 403) return onLogout();
      clear(root).append(h("div", { class: "empty" },
        h("p", {}, err instanceof OfflineError ? "Hors ligne : cette page n'a pas encore été ouverte sur cet appareil." : err.message),
        h("a", { class: "btn", href: "#/recettes" }, "Retour aux recettes")));
    }
    root.focus({ preventScroll: true });
    return;
  }
  location.hash = "#/recettes";
}

async function init() {
  try {
    user = await Api.me();
    storage.save("user", user);
  } catch (err) {
    // Hors ligne : on reprend le dernier utilisateur connu (NF-05).
    user = err instanceof OfflineError ? storage.load("user") : null;
    if (!user) sessions.clearAll();
  }
  renderNav();
  timers.start();
  window.addEventListener("hashchange", route);
  window.addEventListener("offline", () => toast("Hors ligne : vos modifications d'avancement seront envoyées au retour du réseau."));
  route();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

init();
