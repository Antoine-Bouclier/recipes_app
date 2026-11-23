/**
 * Logique pure des minuteurs (F-20 à F-26). Aucune dépendance au DOM : testée
 * par frontend/tests/timers.test.mjs.
 *
 * Un minuteur en cours stocke son heure de fin (`end_at`, ms epoch) et non un
 * compte à rebours : il reste juste si l'onglet est en arrière-plan ou après un
 * rechargement (F-25, NF-04). En pause, on stocke `remaining` (ms).
 *
 * Toutes les fonctions renvoient un nouvel objet (pas de mutation).
 */

let counter = 0;

export function newTimerId(now = Date.now()) {
  counter += 1;
  return `t${now.toString(36)}${counter.toString(36)}`;
}

export function createTimer({ step = null, label = "", duration, now = Date.now(), id = newTimerId(now) }) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Durée invalide");
  return { id, step, label, duration, end_at: now + duration * 1000, paused: false, remaining: null, alerted: false };
}

export function remainingMs(timer, now = Date.now()) {
  if (timer.paused) return Math.max(0, timer.remaining ?? 0);
  return Math.max(0, timer.end_at - now);
}

export function isFinished(timer, now = Date.now()) {
  return !timer.paused && timer.end_at <= now;
}

export function pause(timer, now = Date.now()) {
  if (timer.paused || isFinished(timer, now)) return timer;
  return { ...timer, paused: true, remaining: remainingMs(timer, now), end_at: null };
}

export function resume(timer, now = Date.now()) {
  if (!timer.paused) return timer;
  return { ...timer, paused: false, end_at: now + (timer.remaining ?? 0), remaining: null, alerted: false };
}

/** Revient à la durée initiale, en pause (l'utilisateur relance quand il veut). */
export function reset(timer) {
  return { ...timer, paused: true, end_at: null, remaining: timer.duration * 1000, alerted: false };
}

/** Ajoute (ou retire si négatif) des minutes à un minuteur (F-26). */
export function addMinutes(timer, minutes, now = Date.now()) {
  const delta = minutes * 60000;
  if (timer.paused) {
    return { ...timer, remaining: Math.max(0, (timer.remaining ?? 0) + delta) };
  }
  const base = Math.max(timer.end_at, now);
  const end = Math.max(now, base + delta);
  return { ...timer, end_at: end, alerted: end > now ? false : timer.alerted };
}

/** Minuteurs terminés dont l'alerte n'a pas encore été donnée. */
export function dueForAlert(timers, now = Date.now()) {
  return timers.filter((t) => isFinished(t, now) && !t.alerted);
}

/** "4:05", "1:02:03" — arrondi à la seconde supérieure. */
export function formatDuration(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Durée lisible pour une étape : 90 -> "1 min 30 s". */
export function humanDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h} h`, m && `${m} min`, s && `${s} s`].filter(Boolean).join(" ");
}
