// Écrans de connexion et d'inscription.
import { Api } from "../api.js";
import { h, setTitle } from "../dom.js";

function field(label, attrs) {
  const id = `f-${attrs.name}`;
  return h("div", { class: "field" }, h("label", { for: id }, label), h("input", { id, required: true, ...attrs }));
}

// Modes de connexion proposés par le serveur ; hors ligne, on garde le formulaire classique.
let configPromise = null;
function authConfig() {
  configPromise ??= Api.authConfig().catch(() => ({ sso: false, password_login: true }));
  return configPromise;
}

/** Connexion unique : le compte partagé de tous les sites (inscription comprise). */
function ssoCard(config) {
  const failed = new URLSearchParams(location.search).get("connexion") === "echec";
  setTitle("Connexion");
  return h(
    "div",
    { class: "card auth-card" },
    h("h1", {}, "Connexion"),
    h("p", { class: "muted" }, "Utilisez votre compte antoine-bouclier.fr, le même pour tous les sites. Pas encore de compte ? Vous pourrez le créer à l'étape suivante."),
    failed && h("p", { class: "form-error", role: "alert" }, "La connexion n'a pas abouti. Réessayez."),
    h("a", { class: "btn btn-primary btn-block", href: `${config.sso_login_url}?next=/` }, "Se connecter"),
  );
}

export async function authView(root, { mode, onLogin }) {
  const config = await authConfig();
  if (config.sso && !config.password_login) {
    root.append(ssoCard(config));
    return;
  }
  const isLogin = mode === "login";
  setTitle(isLogin ? "Connexion" : "Créer un compte");
  const error = h("p", { class: "form-error", role: "alert" });
  const form = h(
    "form",
    { class: "card auth-card", novalidate: false },
    h("h1", {}, isLogin ? "Connexion" : "Créer un compte"),
    !isLogin && field("Nom", { name: "name", autocomplete: "name", required: false }),
    field("E-mail", { name: "email", type: "email", autocomplete: "email" }),
    field("Mot de passe", {
      name: "password", type: "password", autocomplete: isLogin ? "current-password" : "new-password", minlength: 8,
    }),
    error,
    h("button", { class: "btn btn-primary btn-block", type: "submit" }, isLogin ? "Se connecter" : "Créer mon compte"),
    h(
      "p",
      { class: "muted center" },
      isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? ",
      h("a", { href: isLogin ? "#/inscription" : "#/connexion" }, isLogin ? "Créer un compte" : "Se connecter"),
    ),
    config.sso && h("p", { class: "center" }, h("a", { class: "btn btn-block", href: `${config.sso_login_url}?next=/` }, "Se connecter avec le compte partagé")),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const user = isLogin ? await Api.login(data.email, data.password) : await Api.register(data);
      onLogin(user);
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
  root.append(form);
  form.querySelector("input").focus();
}
