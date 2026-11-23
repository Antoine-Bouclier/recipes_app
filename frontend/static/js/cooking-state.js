/**
 * Logique pure du mode cuisine (F-10 à F-16). Sans DOM : testée par
 * frontend/tests/cooking-state.test.mjs.
 */

/**
 * Répartit les étapes : `current` = première étape non cochée (affichée juste
 * sous les ingrédients, F-10/F-11), `upcoming` = les suivantes non cochées,
 * `done` = les cochées (barre repliable, F-12). L'ordre de la recette est conservé.
 */
export function splitSteps(steps, checkedIds) {
  const checked = new Set(checkedIds);
  const done = steps.filter((s) => checked.has(s.id));
  const remaining = steps.filter((s) => !checked.has(s.id));
  return {
    done,
    current: remaining[0] || null,
    upcoming: remaining.slice(1),
    finished: steps.length > 0 && remaining.length === 0,
    progress: { done: done.length, total: steps.length }, // F-14
  };
}

/** Ajoute ou retire un id d'une liste (sans doublon). */
export function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function progressLabel({ done, total }) {
  return `${done} étape${done > 1 ? "s" : ""} sur ${total}`;
}

/** État vide d'une session de cuisine (F-16). */
export function emptySession() {
  return { checked_steps: [], checked_ingredients: [], timers: [], savedAt: Date.now() };
}

/**
 * Choisit entre la copie locale et celle du serveur : la plus récente gagne.
 * Permet de reprendre hors ligne puis de resynchroniser (F-15, NF-05).
 */
export function pickNewest(local, server) {
  if (!server) return local || emptySession();
  if (!local) return { ...server, savedAt: Date.parse(server.updated_at) || 0 };
  const serverTime = Date.parse(server.updated_at) || 0;
  return local.savedAt >= serverTime ? local : { ...server, savedAt: serverTime };
}

/** Ajuste une quantité au nombre de portions (F-08). */
export function scaleQuantity(quantity, from, to) {
  if (quantity === null || quantity === undefined || quantity === "") return null;
  const q = Number(quantity) * (to / from);
  return Math.round(q * 100) / 100;
}

export function formatQuantity(q) {
  if (q === null) return "";
  return Number.isInteger(q) ? String(q) : q.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
