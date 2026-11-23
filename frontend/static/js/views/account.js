// Compte : export et suppression des données (NF-09), déconnexion.
import { Api } from "../api.js";
import { h, setTitle } from "../dom.js";

export function accountView(root, { user, onLogout }) {
  setTitle("Mon compte");
  const error = h("p", { class: "form-error", role: "alert" });
  const password = h("input", { id: "del-password", type: "password", required: true, autocomplete: "current-password" });
  const delForm = h("form", { class: "danger-zone" },
    h("h2", {}, "Supprimer mon compte"),
    h("p", {}, "Toutes vos recettes et votre avancement seront définitivement effacés."),
    h("div", { class: "field" }, h("label", { for: "del-password" }, "Mot de passe"), password),
    error,
    h("button", { class: "btn btn-danger", type: "submit" }, "Supprimer définitivement"));
  delForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.confirm("Supprimer votre compte et toutes vos données ?")) return;
    try {
      await Api.deleteAccount(password.value);
      onLogout();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  root.append(
    h("h1", {}, "Mon compte"),
    h("div", { class: "card" },
      h("p", {}, h("strong", {}, user.name || user.email)),
      h("p", { class: "muted" }, user.email),
      h("div", { class: "actions" },
        h("a", { class: "btn", href: "/api/auth/export/", download: "mes-recettes.json" }, "Exporter mes données"),
        h("button", { class: "btn", onclick: async () => { await Api.logout().catch(() => {}); onLogout(); } }, "Se déconnecter"))),
    delForm,
  );
}
