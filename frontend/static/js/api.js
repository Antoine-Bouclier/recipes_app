/**
 * Client de l'API REST (voir docs/api.md). Authentification par session
 * Django : le cookie `csrftoken` est posé par la page d'accueil et renvoyé
 * dans l'en-tête X-CSRFToken pour toute requête qui modifie des données.
 */

export class ApiError extends Error {
  constructor(status, data) {
    super(errorMessage(data) || `Erreur ${status}`);
    this.status = status;
    this.data = data;
  }
}

/** Erreur réseau : le serveur n'est pas joignable (hors ligne). */
export class OfflineError extends Error {
  constructor() {
    super("Pas de connexion au serveur.");
  }
}

function errorMessage(data) {
  if (!data || typeof data !== "object") return "";
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([field, msgs]) => `${field === "non_field_errors" ? "" : field + " : "}${[].concat(msgs).join(" ")}`)
    .join(" ");
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function request(path, { method = "GET", body, form } = {}) {
  const headers = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRFToken"] = csrfToken();
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: payload, credentials: "same-origin" });
  } catch {
    throw new OfflineError();
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString();
  return s ? `?${s}` : "";
};

export const Api = {
  me: () => request("/auth/me/"),
  login: (email, password) => request("/auth/login/", { method: "POST", body: { email, password } }),
  register: (data) => request("/auth/register/", { method: "POST", body: data }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  deleteAccount: (password) => request("/auth/me/", { method: "DELETE", body: { password } }),

  listRecipes: (params = {}) => request(`/recipes/${qs(params)}`),
  getRecipe: (id) => request(`/recipes/${id}/`),
  createRecipe: (data) => request("/recipes/", { method: "POST", body: data }),
  updateRecipe: (id, data) => request(`/recipes/${id}/`, { method: "PATCH", body: data }),
  deleteRecipe: (id) => request(`/recipes/${id}/`, { method: "DELETE" }),
  uploadPhoto: (id, file) => {
    const form = new FormData();
    form.append("photo", file);
    return request(`/recipes/${id}/photo/`, { method: "POST", form });
  },
  deletePhoto: (id) => request(`/recipes/${id}/photo/`, { method: "DELETE" }),

  getSession: (id) => request(`/recipes/${id}/session/`),
  saveSession: (id, data) => request(`/recipes/${id}/session/`, { method: "PUT", body: data }),
  resetSession: (id) => request(`/recipes/${id}/session/`, { method: "DELETE" }),
};
