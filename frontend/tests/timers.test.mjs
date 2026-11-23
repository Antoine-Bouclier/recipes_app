import assert from "assert/strict";
import { test, run } from "./runner.mjs";
import {
  addMinutes, createTimer, dueForAlert, formatDuration, humanDuration,
  isFinished, pause, remainingMs, reset, resume,
} from "../static/js/timers.js";

const T0 = 1_000_000;

test("createTimer calcule l'heure de fin (F-20, F-25)", () => {
  const t = createTimer({ label: "Pâtes", duration: 600, now: T0, step: 3 });
  assert.equal(t.end_at, T0 + 600_000);
  assert.equal(t.step, 3);
  assert.equal(t.paused, false);
  assert.throws(() => createTimer({ duration: 0, now: T0 }));
});

test("le temps restant se déduit de l'heure, même après une longue absence (F-25, NF-04)", () => {
  const t = createTimer({ duration: 60, now: T0 });
  assert.equal(remainingMs(t, T0 + 59_500), 500);
  assert.equal(remainingMs(t, T0 + 3_600_000), 0);
  assert.equal(isFinished(t, T0 + 59_999), false);
  assert.equal(isFinished(t, T0 + 60_000), true);
});

test("pause puis reprise conservent le temps restant (F-21)", () => {
  let t = createTimer({ duration: 60, now: T0 });
  t = pause(t, T0 + 20_000);
  assert.equal(t.paused, true);
  assert.equal(remainingMs(t, T0 + 999_999), 40_000);
  t = resume(t, T0 + 100_000);
  assert.equal(t.end_at, T0 + 140_000);
  assert.equal(remainingMs(t, T0 + 110_000), 30_000);
});

test("un minuteur terminé ne peut pas être mis en pause", () => {
  const t = createTimer({ duration: 1, now: T0 });
  assert.equal(pause(t, T0 + 5000), t);
});

test("reset revient à la durée initiale, en pause (F-21)", () => {
  const t = reset({ ...createTimer({ duration: 90, now: T0 }), alerted: true });
  assert.equal(t.paused, true);
  assert.equal(remainingMs(t), 90_000);
  assert.equal(t.alerted, false);
});

test("addMinutes ajoute ou retire une minute (F-26)", () => {
  let t = createTimer({ duration: 120, now: T0 });
  t = addMinutes(t, 1, T0);
  assert.equal(remainingMs(t, T0), 180_000);
  t = addMinutes(t, -5, T0);
  assert.equal(remainingMs(t, T0), 0);
  let p = pause(createTimer({ duration: 30, now: T0 }), T0);
  assert.equal(remainingMs(addMinutes(p, 1, T0)), 90_000);
  assert.equal(remainingMs(addMinutes(p, -1, T0)), 0);
});

test("addMinutes sur un minuteur terminé le relance à partir de maintenant", () => {
  const t = { ...createTimer({ duration: 10, now: T0 }), alerted: true };
  const later = T0 + 60_000;
  const t2 = addMinutes(t, 1, later);
  assert.equal(remainingMs(t2, later), 60_000);
  assert.equal(t2.alerted, false);
});

test("dueForAlert ne renvoie que les minuteurs finis non encore signalés (F-22)", () => {
  const a = createTimer({ id: "a", duration: 10, now: T0 });
  const b = createTimer({ id: "b", duration: 100, now: T0 });
  const c = { ...createTimer({ id: "c", duration: 5, now: T0 }), alerted: true };
  const d = pause(createTimer({ id: "d", duration: 5, now: T0 }), T0);
  assert.deepEqual(dueForAlert([a, b, c, d], T0 + 20_000).map((t) => t.id), ["a"]);
});

test("plusieurs minuteurs tournent indépendamment (F-23)", () => {
  const pates = createTimer({ id: "p", label: "Pâtes", duration: 600, now: T0 });
  const sauce = createTimer({ id: "s", label: "Sauce", duration: 1800, now: T0 + 60_000 });
  const now = T0 + 300_000;
  assert.equal(remainingMs(pates, now), 300_000);
  assert.equal(remainingMs(sauce, now), 1_560_000);
});

test("formatDuration et humanDuration", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(4_001), "0:05");
  assert.equal(formatDuration(245_000), "4:05");
  assert.equal(formatDuration(3_723_000), "1:02:03");
  assert.equal(humanDuration(90), "1 min 30 s");
  assert.equal(humanDuration(3600), "1 h");
  assert.equal(humanDuration(null), "");
});

run("timers.test.mjs");
