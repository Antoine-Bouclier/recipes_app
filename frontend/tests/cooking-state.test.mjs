import assert from "assert/strict";
import { test, run } from "./runner.mjs";
import {
  emptySession, formatQuantity, pickNewest, progressLabel, scaleQuantity, sessionServings, splitSteps,
  stepServings, toggleId,
} from "../static/js/cooking-state.js";

const steps = [1, 2, 3, 4].map((id) => ({ id, text: `Étape ${id}` }));

test("sans rien cocher, l'étape en cours est la première (F-10)", () => {
  const s = splitSteps(steps, []);
  assert.equal(s.current.id, 1);
  assert.deepEqual(s.upcoming.map((x) => x.id), [2, 3, 4]);
  assert.equal(s.done.length, 0);
  assert.equal(s.finished, false);
});

test("cocher une étape la retire et fait remonter la suivante (F-11)", () => {
  const s = splitSteps(steps, [1]);
  assert.equal(s.current.id, 2);
  assert.deepEqual(s.done.map((x) => x.id), [1]);
});

test("les étapes cochées dans le désordre restent dans l'ordre de la recette (F-12)", () => {
  const s = splitSteps(steps, [3, 1]);
  assert.deepEqual(s.done.map((x) => x.id), [1, 3]);
  assert.equal(s.current.id, 2);
  assert.deepEqual(s.upcoming.map((x) => x.id), [4]);
});

test("décocher (annuler) remet l'étape en place (F-12)", () => {
  const checked = toggleId(toggleId([], 1), 1);
  assert.deepEqual(checked, []);
  assert.equal(splitSteps(steps, checked).current.id, 1);
});

test("toutes les étapes cochées => recette terminée", () => {
  const s = splitSteps(steps, [1, 2, 3, 4]);
  assert.equal(s.current, null);
  assert.equal(s.finished, true);
  assert.equal(splitSteps([], []).finished, false);
});

test("progression (F-14)", () => {
  assert.equal(progressLabel(splitSteps(steps, [1, 2, 3]).progress), "3 étapes sur 4");
  assert.equal(progressLabel(splitSteps(steps, [1]).progress), "1 étape sur 4");
});

test("pickNewest garde la copie la plus récente (F-15, NF-05)", () => {
  const local = { ...emptySession(), checked_steps: [1], savedAt: 2000 };
  const server = { checked_steps: [1, 2], checked_ingredients: [], timers: [], updated_at: new Date(1000).toISOString() };
  assert.deepEqual(pickNewest(local, server).checked_steps, [1]);
  const newer = { ...server, updated_at: new Date(5000).toISOString() };
  assert.deepEqual(pickNewest(local, newer).checked_steps, [1, 2]);
  assert.deepEqual(pickNewest(null, newer).checked_steps, [1, 2]);
  assert.deepEqual(pickNewest(local, null).checked_steps, [1]);
});

test("ajustement des portions (F-08)", () => {
  assert.equal(scaleQuantity("400.00", 4, 2), 200);
  assert.equal(scaleQuantity("1", 3, 2), 0.67);
  assert.equal(scaleQuantity(null, 4, 2), null);
  assert.equal(formatQuantity(200), "200");
  assert.equal(formatQuantity(null), "");
});

test("les portions choisies sont gardées pour le mode cuisine (F-08)", () => {
  const recipe = { servings: 4 };
  assert.equal(sessionServings(null, recipe), 4);
  assert.equal(sessionServings(emptySession(), recipe), 4);
  assert.equal(sessionServings({ servings: 8 }, recipe), 8);
  assert.equal(sessionServings({ servings: 0 }, recipe), 4);
  assert.equal(stepServings(1, -1), 1);
  assert.equal(stepServings(100, 1), 100);
  assert.equal(stepServings(4, 1), 5);
});

run("cooking-state.test.mjs");
