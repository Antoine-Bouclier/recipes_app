/**
 * Service worker (NF-05) : l'application et les recettes déjà ouvertes
 * restent disponibles hors ligne.
 *
 * - Fichiers statiques : servis depuis le cache, mis à jour en arrière-plan.
 * - Pages et GET /api/ : réseau d'abord, cache en secours.
 * - Le reste (POST, PUT…) passe directement au réseau.
 *
 * ⚠ Incrémenter VERSION à chaque modification de la liste SHELL ou de ce fichier.
 */
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const API_CACHE = "api";

const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/static/css/app.css",
  "/static/js/app.js",
  "/static/js/api.js",
  "/static/js/alerts.js",
  "/static/js/cooking-state.js",
  "/static/js/dom.js",
  "/static/js/sessions.js",
  "/static/js/storage.js",
  "/static/js/timer-manager.js",
  "/static/js/timers.js",
  "/static/js/views/account.js",
  "/static/js/views/auth.js",
  "/static/js/views/cook.js",
  "/static/js/views/detail.js",
  "/static/js/views/edit.js",
  "/static/js/views/list.js",
  "/static/icons/icon.svg",
  "/static/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl || request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(fallbackUrl || request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/auth/export")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
  } else if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (url.pathname.startsWith("/static/") || url.pathname.startsWith("/media/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-api-cache") event.waitUntil(caches.delete(API_CACHE));
});

// Clic sur la notification de fin de minuteur : revenir à l'application.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => "focus" in c);
      return client ? client.focus() : self.clients.openWindow("/");
    }),
  );
});
