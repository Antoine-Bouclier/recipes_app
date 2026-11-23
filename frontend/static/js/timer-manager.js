/**
 * Gestion globale des minuteurs (F-20 à F-27).
 *
 * Les minuteurs vivent dans les sessions de cuisine (sessions.js) : ils
 * survivent donc à un rechargement et à un changement de page. Ce module :
 *  - affiche le bandeau fixe de tous les minuteurs (F-24), sur toutes les pages ;
 *  - vérifie 4 fois par seconde les minuteurs terminés et déclenche l'alerte
 *    (F-22), avec un setTimeout calé sur la prochaine échéance pour rester
 *    précis quand l'onglet est en arrière-plan (F-25, NF-04) ;
 *  - répète le bip toutes les 5 s pendant 1 min tant que l'alerte n'est pas
 *    acquittée (mains occupées en cuisine).
 */
import * as alerts from "./alerts.js";
import { h, clear } from "./dom.js";
import * as sessions from "./sessions.js";
import * as T from "./timers.js";
import { toggleId } from "./cooking-state.js";

const REPEAT_EVERY = 5000;
const REPEAT_FOR = 60000;
const lastBeep = new Map(); // timerId -> ms
let banner;
let nextTimeout;

export function all() {
  return sessions.allLocal().flatMap(({ recipeId, session }) =>
    (session.timers || []).map((timer) => ({ recipeId, title: session.title || "", timer })),
  );
}

export function forStep(recipeId, stepId) {
  const s = sessions.getLocal(recipeId);
  return ((s && s.timers) || []).find((t) => t.step === stepId) || null;
}

function mutate(recipeId, timerId, fn) {
  sessions.updateSession(recipeId, (s) => ({
    ...s,
    timers: (s.timers || []).map((t) => (t.id === timerId ? fn(t) : t)).filter(Boolean),
  }));
}

/** Lance le minuteur d'une étape (F-20). */
export function startForStep(recipeId, recipeTitle, step) {
  alerts.unlock();
  alerts.askNotificationPermission();
  const existing = forStep(recipeId, step.id);
  sessions.updateSession(recipeId, (s) => ({
    ...s,
    title: recipeTitle,
    timers: [
      ...(s.timers || []).filter((t) => !existing || t.id !== existing.id),
      T.createTimer({ step: step.id, label: step.timer_label || shortLabel(step.text), duration: step.timer_seconds }),
    ],
  }));
}

function shortLabel(text) {
  const t = text.trim().split("\n")[0];
  return t.length > 40 ? `${t.slice(0, 38)}…` : t;
}

export const actions = {
  pause: (r, id) => mutate(r, id, (t) => T.pause(t)),
  resume: (r, id) => { alerts.unlock(); mutate(r, id, (t) => T.resume(t)); },
  reset: (r, id) => mutate(r, id, (t) => T.reset(t)),
  add: (r, id, min) => mutate(r, id, (t) => T.addMinutes(t, min)),
  stop: (r, id) => { lastBeep.delete(id); mutate(r, id, () => null); },
  /** F-27 : coche l'étape liée et arrête le minuteur. */
  checkStep: (r, id) => {
    lastBeep.delete(id);
    sessions.updateSession(r, (s) => {
      const timer = (s.timers || []).find((t) => t.id === id);
      const checked = timer && timer.step && !s.checked_steps.includes(timer.step)
        ? toggleId(s.checked_steps, timer.step) : s.checked_steps;
      return { ...s, checked_steps: checked, timers: (s.timers || []).filter((t) => t.id !== id) };
    });
  },
};

function check() {
  const now = Date.now();
  for (const { recipeId, timer } of all()) {
    if (!T.isFinished(timer, now)) continue;
    if (!timer.alerted) {
      alerts.alertTimer(timer);
      lastBeep.set(timer.id, now);
      mutate(recipeId, timer.id, (t) => ({ ...t, alerted: true }));
    } else if (now - timer.end_at < REPEAT_FOR && now - (lastBeep.get(timer.id) || 0) >= REPEAT_EVERY) {
      lastBeep.set(timer.id, now);
      alerts.beep();
    }
  }
  scheduleNext();
}

function scheduleNext() {
  clearTimeout(nextTimeout);
  const now = Date.now();
  const ends = all().filter(({ timer }) => !timer.paused && timer.end_at > now).map(({ timer }) => timer.end_at);
  if (ends.length) nextTimeout = setTimeout(check, Math.min(...ends) - now + 20);
}

function timerRow({ recipeId, title, timer }) {
  const now = Date.now();
  const finished = T.isFinished(timer, now);
  const session = sessions.getLocal(recipeId);
  const stepPending = timer.step && session && !session.checked_steps.includes(timer.step);
  const btn = (label, onclick, aria) => h("button", { class: "btn btn-small", onclick, "aria-label": aria || label }, label);
  return h(
    "li",
    { class: `timer${finished ? " timer-done" : ""}${timer.paused ? " timer-paused" : ""}` },
    h(
      "a",
      { class: "timer-label", href: `#/recettes/${recipeId}/cuisine` },
      h("strong", {}, timer.label || "Minuteur"),
      title ? h("small", {}, title) : null,
    ),
    h("span", { class: "timer-time", "aria-hidden": "true" }, finished ? "Terminé" : T.formatDuration(T.remainingMs(timer, now))),
    h(
      "span",
      { class: "timer-actions" },
      finished
        ? [
            stepPending && btn("Cocher l'étape", () => actions.checkStep(recipeId, timer.id)),
            btn("OK", () => actions.stop(recipeId, timer.id), `Arrêter le minuteur ${timer.label}`),
          ]
        : [
            btn("−1", () => actions.add(recipeId, timer.id, -1), "Retirer une minute"),
            btn("+1", () => actions.add(recipeId, timer.id, 1), "Ajouter une minute"),
            timer.paused
              ? btn("▶", () => actions.resume(recipeId, timer.id), "Reprendre")
              : btn("❚❚", () => actions.pause(recipeId, timer.id), "Mettre en pause"),
            btn("↺", () => actions.reset(recipeId, timer.id), "Réinitialiser"),
            btn("✕", () => actions.stop(recipeId, timer.id), "Arrêter"),
          ],
    ),
  );
}

/** Hauteur du bandeau exposée au CSS : les messages et le bas de page restent visibles au-dessus. */
function syncHeight() {
  document.documentElement.style.setProperty("--banner-h", `${banner.offsetHeight}px`);
}

function render() {
  const items = all();
  document.body.classList.toggle("has-timers", items.length > 0);
  clear(banner);
  if (!items.length) return syncHeight();
  // Les minuteurs terminés d'abord, puis par temps restant croissant.
  const now = Date.now();
  items.sort((a, b) => T.remainingMs(a.timer, now) - T.remainingMs(b.timer, now));
  banner.append(h("ul", { class: "timer-list" }, items.map(timerRow)));
  syncHeight();
}

/** Texte lu par les lecteurs d'écran uniquement à la fin d'un minuteur. */
function announce(text) {
  const live = document.getElementById("timer-live");
  if (live) live.textContent = text;
}

export function start() {
  banner = document.getElementById("timer-banner");
  // Mise à jour de l'affichage sans reconstruire les boutons (focus clavier conservé).
  const refreshTimes = () => {
    const now = Date.now();
    const rows = banner.querySelectorAll(".timer");
    const items = all().sort((a, b) => T.remainingMs(a.timer, now) - T.remainingMs(b.timer, now));
    const needsRender = rows.length !== items.length
      || items.some(({ timer }, i) => T.isFinished(timer, now) !== rows[i].classList.contains("timer-done"));
    if (needsRender) {
      const done = items.filter(({ timer }) => T.isFinished(timer, now));
      if (done.length) announce(`Minuteur terminé : ${done.map((d) => d.timer.label).join(", ")}`);
      render();
      return;
    }
    items.forEach(({ timer }, i) => {
      const el = rows[i].querySelector(".timer-time");
      if (!T.isFinished(timer, now)) el.textContent = T.formatDuration(T.remainingMs(timer, now));
    });
  };
  sessions.subscribe(() => { render(); scheduleNext(); });
  setInterval(() => { check(); refreshTimes(); }, 250);
  document.addEventListener("visibilitychange", () => { check(); render(); });
  window.addEventListener("resize", syncHeight);
  render();
  check();
}
