// Compte : export et suppression des données (NF-09), déconnexion.
import { Api } from "../api.js";
import { h, setTitle } from "../dom.js";

export function accountView(root, { user, onLogout }) {
  setTitle("Mon compte");
  const error = h("p", { class: "form-error", role: "alert" });
  // Compte partagé (connexion unique) : pas de mot de passe propre à l'app, on retape l'e-mail.
  const confirmField = user.has_password === false
    ? { label: "Retapez votre e-mail pour confirmer", key: "email", attrs: { type: "email", autocomplete: "off" } }
    : { label: "Mot de passe", key: "password", attrs: { type: "password", autocomplete: "current-password" } };
  const password = h("input", { id: "del-password", required: true, ...confirmField.attrs });
  const delForm = h("form", { class: "danger-zone" },
    h("h2", {}, "Supprimer mon compte"),
    h("p", {}, "Toutes vos recettes et votre avancement seront définitivement effacés."),
    h("div", { class: "field" }, h("label", { for: "del-password" }, confirmField.label), password),
    error,
    h("button", { class: "btn btn-danger", type: "submit" }, "Supprimer définitivement"));
  delForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.confirm("Supprimer votre compte et toutes vos données ?")) return;
    try {
      await Api.deleteAccount({ [confirmField.key]: password.value });
      onLogout();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  async function logout() {
    const result = await Api.logout().catch(() => null);
    onLogout();
    // Compte partagé : ferme aussi la session sur auth.antoine-bouclier.fr.
    if (result && result.redirect) window.location.assign(result.redirect);
  }

  root.append(
    h("h1", {}, "Mon compte"),
    h("div", { class: "card" },
      h("p", {}, h("strong", {}, user.name || user.email)),
      h("p", { class: "muted" }, user.email),
      h("div", { class: "actions" },
        h("a", { class: "btn", href: "/api/auth/export/", download: "mes-recettes.json" }, "Exporter mes données"),
        h("button", { class: "btn", onclick: logout }, "Se déconnecter"))),
    delForm,
  );
}
