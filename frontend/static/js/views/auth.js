// Écrans de connexion et d'inscription.
import { Api } from "../api.js";
import { h, setTitle } from "../dom.js";

function field(label, attrs) {
  const id = `f-${attrs.name}`;
  return h("div", { class: "field" }, h("label", { for: id }, label), h("input", { id, required: true, ...attrs }));
}

export function authView(root, { mode, onLogin }) {
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
