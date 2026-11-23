/**
 * Avancement en cuisine (F-15, NF-05).
 *
 * Chaque session est écrite immédiatement dans localStorage (clé `cook:<id>`),
 * puis envoyée au serveur avec un léger délai. Hors ligne, l'envoi est retenté
 * au retour de la connexion. À l'ouverture, la copie la plus récente gagne.
 */
import { Api, OfflineError } from "./api.js";
import { emptySession, pickNewest } from "./cooking-state.js";
import * as storage from "./storage.js";

const PREFIX = "cook:";
const PUSH_DELAY = 800;
const pending = new Map(); // recipeId -> timeout
const listeners = new Set();

const key = (recipeId) => `${PREFIX}${recipeId}`;

export function getLocal(recipeId) {
  return storage.load(key(recipeId));
}

export function allLocal() {
  return storage
    .keys(PREFIX)
    .map((k) => ({ recipeId: Number(k.slice(PREFIX.length)), session: storage.load(k) }))
    .filter((x) => x.session);
}

/** Abonnement aux changements (bandeau des minuteurs, mode cuisine). */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(recipeId) {
  listeners.forEach((fn) => fn(recipeId));
}

export function setSession(recipeId, session) {
  const value = { ...session, savedAt: Date.now() };
  storage.save(key(recipeId), value);
  schedulePush(recipeId);
  notify(recipeId);
  return value;
}

export function updateSession(recipeId, fn) {
  const current = getLocal(recipeId) || emptySession();
  return setSession(recipeId, fn(current));
}

function schedulePush(recipeId) {
  clearTimeout(pending.get(recipeId));
  pending.set(recipeId, setTimeout(() => push(recipeId), PUSH_DELAY));
}

async function push(recipeId) {
  const session = getLocal(recipeId);
  if (!session) return;
  try {
    await Api.saveSession(recipeId, {
      checked_steps: session.checked_steps,
      checked_ingredients: session.checked_ingredients,
      timers: session.timers,
    });
    pending.delete(recipeId);
  } catch (err) {
    if (err instanceof OfflineError) return; // retenté par flush() au retour du réseau
    if (err.status === 404) storage.remove(key(recipeId)); // recette supprimée
    pending.delete(recipeId);
  }
}

/** Renvoie la session à jour (locale ou serveur, la plus récente). */
export async function loadSession(recipeId, title) {
  const local = getLocal(recipeId);
  let server = null;
  try {
    server = await Api.getSession(recipeId);
  } catch {
    /* hors ligne : on garde la copie locale */
  }
  const session = { ...pickNewest(local, server), title };
  storage.save(key(recipeId), session);
  return session;
}

export async function resetSession(recipeId) {
  clearTimeout(pending.get(recipeId));
  pending.delete(recipeId);
  storage.remove(key(recipeId));
  notify(recipeId);
  try {
    await Api.resetSession(recipeId);
  } catch {
    /* hors ligne : la session vide locale sera renvoyée plus tard */
    storage.save(key(recipeId), { ...emptySession(), savedAt: Date.now() });
    schedulePush(recipeId);
  }
}

export function forget(recipeId) {
  clearTimeout(pending.get(recipeId));
  pending.delete(recipeId);
  storage.remove(key(recipeId));
  notify(recipeId);
}

/** Supprime toutes les sessions locales (déconnexion). */
export function clearAll() {
  storage.keys(PREFIX).forEach(storage.remove);
  notify(null);
}

/** Renvoie au serveur toutes les sessions locales (retour en ligne). */
export function flush() {
  allLocal().forEach(({ recipeId }) => push(recipeId));
}

window.addEventListener("online", flush);
