/**
 * Tests de bout en bout dans un vrai Chrome (headless), sur l'application lancée.
 *
 *   make e2e                         # contre http://localhost:8000 (make up)
 *   make e2e E2E_URL=http://127.0.0.1:8001   # contre make dev
 *
 * Variables : E2E_URL (adresse de l'application), CHROME_PATH (navigateur),
 * E2E_HEADFUL=1 (voir le navigateur), E2E_SCREENSHOTS (dossier des captures).
 *
 * Les scénarios s'enchaînent (chacun part de l'état laissé par le précédent) ;
 * après un échec, les suivants sont marqués « ignorés ». Les comptes créés pour
 * le test sont supprimés à la fin, même en cas d'échec : la base n'est pas polluée.
 * Sortie au format TAP ("ok N - …"), lue par scripts/e2e.sh.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.E2E_URL || "http://localhost:8000").replace(/\/$/, "");
const SHOTS = process.env.E2E_SCREENSHOTS || path.join(__dirname, "screenshots");
const PASSWORD = "E2e-Sel-poivre-42";

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome introuvable : définir CHROME_PATH.");
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.trim());
const clickText = (page, sel, txt) =>
  page.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(txt));
    if (!el) throw new Error(`Élément « ${txt} » introuvable`);
    el.click();
  }, sel, txt);
/** Appel d'API depuis la page (même session et cookie CSRF que l'utilisateur). */
const api = (page, method, url, body) =>
  page.evaluate(async (method, url, body) => {
    const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || "";
    const r = await fetch(url, {
      method, headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
  }, method, url, body);

const scenarios = [];
const scenario = (name, fn) => scenarios.push({ name, fn });

// État partagé entre scénarios.
const ctx = { email: `e2e-${Date.now()}@test.local`, recipeId: null, accounts: [] };

scenario("Inscription et arrivée sur « Mes recettes » (NF-08)", async ({ page }) => {
  await page.goto(`${BASE}/#/inscription`, { waitUntil: "networkidle0" });
  await page.type("#f-name", "Robot E2E");
  await page.type("#f-email", ctx.email);
  await page.type("#f-password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForSelector(".page-head");
  ctx.accounts.push({ page, password: PASSWORD });
  assert((await page.evaluate(() => location.hash)) === "#/recettes", "pas redirigé vers #/recettes");
});

scenario("Création d'une recette avec ingrédients, étapes et réordonnancement (F-01 à F-04)", async ({ page }) => {
  await page.click('a[href="#/recettes/nouvelle"]');
  await page.waitForSelector("#r-title");
  await page.type("#r-title", "Pâtes E2E à la tomate");
  await page.type("#r-description", "Créée par le test de bout en bout.");
  await page.click("#r-servings", { clickCount: 3 });
  await page.keyboard.type("2");
  await page.select("#r-category", "plat");
  await page.type("#r-tags", "e2e, rapide");
  let rows = await page.$$(".ing-row");
  await (await rows[0].$("input[type=number]")).type("200");
  await (await rows[0].$("input[id$='-u']")).type("g");
  await (await rows[0].$("input[id$='-n']")).type("spaghetti");
  await clickText(page, "button", "Ajouter un ingrédient");
  await page.keyboard.type("1");
  rows = await page.$$(".ing-row");
  await (await rows[1].$("input[id$='-n']")).type("boîte de tomates");

  let steps = await page.$$(".step-row");
  await (await steps[0].$("textarea")).type("Servir");
  await clickText(page, "button", "Ajouter une étape");
  await page.keyboard.type("Faire bouillir l'eau salée");
  await clickText(page, "button", "Ajouter une étape");
  await page.keyboard.type("Cuire les pâtes");
  steps = await page.$$(".step-row");
  await (await steps[2].$("input[id$='-s']")).type("3");
  await (await steps[2].$("input[id$='-l']")).type("Pâtes");
  // « Servir » est en 1re position : le descendre deux fois.
  await page.click('button[aria-label="Descendre l\'étape 1"]');
  await page.click('button[aria-label="Descendre l\'étape 2"]');
  await page.click("button[type=submit]");
  await page.waitForSelector(".recipe h1");
  ctx.recipeId = Number((await page.evaluate(() => location.hash)).match(/\d+/)[0]);
  const stepsText = await page.$$eval(".steps li > p:first-child", (els) => els.map((e) => e.textContent));
  assert(JSON.stringify(stepsText) === JSON.stringify(["Faire bouillir l'eau salée", "Cuire les pâtes", "Servir"]),
    `ordre des étapes inattendu : ${stepsText}`);
});

scenario("Fiche : portions ajustées et favori (F-08, F-09)", async ({ page }) => {
  await page.click('button[aria-label="Une portion de plus"]');
  await page.click('button[aria-label="Une portion de plus"]');
  const ingredients = await page.$$eval(".ingredients li", (els) => els.map((e) => e.textContent));
  assert(ingredients[0] === "400 g spaghetti", `quantité recalculée inattendue : ${ingredients[0]}`);
  await clickText(page, "button", "Ajouter aux favoris");
  await page.waitForFunction(() => document.querySelector("[aria-pressed=true]"));
});

scenario("Liste : recherche, catégorie, étiquette, favoris (F-06, F-07, F-09)", async ({ page }) => {
  await page.goto(`${BASE}/#/recettes`, { waitUntil: "networkidle0" });
  const titles = () => page.$$eval(".recipe-card h2 a", (els) => els.map((e) => e.textContent));
  const waitList = () => sleep(600);
  await page.type("#search", "tomates"); // nom d'ingrédient
  await waitList();
  assert((await titles()).includes("Pâtes E2E à la tomate"), "recherche par ingrédient");
  await page.click("#search", { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.select("#category", "dessert");
  await waitList();
  assert(!(await titles()).includes("Pâtes E2E à la tomate"), "filtre catégorie");
  await page.select("#category", "");
  await page.click("#favorite");
  await waitList();
  assert((await titles()).includes("Pâtes E2E à la tomate"), "filtre favoris");
  await page.click("#favorite");
  await waitList();
  await clickText(page, ".recipe-card button.chip", "#e2e");
  await waitList();
  assert((await titles()).length === 1, "filtre étiquette");
  await clickText(page, ".active-tag button", "#e2e");
});

scenario("Mode cuisine : étape cochée, annuler, étapes terminées repliées (F-10 à F-12, F-14)", async ({ page }) => {
  await page.goto(`${BASE}/#/recettes/${ctx.recipeId}/cuisine`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".cook-current");
  assert((await text(page, ".progress")) === "0 étape sur 3", "progression initiale");
  // Ingrédients au-dessus de l'étape en cours.
  const order = await page.evaluate(() =>
    document.querySelector(".cook-ingredients").getBoundingClientRect().top
    < document.querySelector(".cook-current").getBoundingClientRect().top);
  assert(order, "les ingrédients doivent être au-dessus de l'étape en cours");
  await page.click(".cook-ingredient-list input");
  await page.click(".btn-check");
  await page.waitForFunction(() => document.querySelector(".cook-current .step-text").textContent === "Cuire les pâtes");
  assert(await page.$eval(".cook-done", (e) => !e.open), "la barre « Étapes terminées » doit être fermée");
  await clickText(page, ".toast button", "Annuler");
  await page.waitForFunction(() => document.querySelector(".cook-current .step-text").textContent === "Faire bouillir l'eau salée");
  await page.click(".btn-check");
  await page.waitForFunction(() => document.querySelector(".progress").textContent === "1 étape sur 3");
});

scenario("Minuteur : lancement, rechargement, fin et « Cocher l'étape » (F-15, F-20 à F-25, F-27)", async ({ page }) => {
  await clickText(page, ".cook-current button", "Lancer le minuteur");
  await page.waitForSelector(".timer");
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".cook-current");
  assert((await text(page, ".cook-current .step-text")) === "Cuire les pâtes", "avancement perdu au rechargement");
  assert((await page.$$(".timer")).length === 1, "minuteur perdu au rechargement");
  await page.waitForSelector(".timer-done", { timeout: 8000 });
  await page.screenshot({ path: path.join(SHOTS, "minuteur-termine.png") });
  await clickText(page, ".timer button", "Cocher l'étape");
  await page.waitForFunction(() => document.querySelector(".cook-current .step-text").textContent === "Servir");
  assert((await page.$$(".timer")).length === 0, "le minuteur aurait dû s'arrêter");
});

scenario("Avancement enregistré sur le serveur (F-15)", async ({ page }) => {
  await sleep(1500); // envoi différé de 0,8 s
  const { status, data } = await api(page, "GET", `/api/recipes/${ctx.recipeId}/session/`);
  assert(status === 200, `statut ${status}`);
  assert(data.checked_steps.length === 2, `étapes cochées côté serveur : ${data.checked_steps}`);
  assert(data.checked_ingredients.length === 1, "ingrédient coché côté serveur");
});

scenario("Hors ligne : rechargement et synchronisation au retour du réseau (NF-05)", async ({ page }) => {
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".cook-current", { timeout: 8000 });
  await page.click(".btn-check");
  await page.waitForSelector(".cook-finished");
  await page.setOfflineMode(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await sleep(1500);
  const { data } = await api(page, "GET", `/api/recipes/${ctx.recipeId}/session/`);
  assert(data.checked_steps.length === 3, `après retour du réseau : ${data.checked_steps}`);
});

scenario("Recommencer la recette (F-16)", async ({ page }) => {
  await clickText(page, ".cook-finished button", "Recommencer");
  await page.waitForFunction(() => document.querySelector(".progress").textContent === "0 étape sur 3");
});

scenario("Un autre compte ne voit pas la recette (NF-08)", async ({ browser }) => {
  const other = await browser.createIncognitoBrowserContext();
  const page2 = await other.newPage();
  await page2.goto(`${BASE}/#/inscription`, { waitUntil: "networkidle0" });
  await page2.type("#f-email", `e2e-autre-${Date.now()}@test.local`);
  await page2.type("#f-password", PASSWORD);
  await page2.click("button[type=submit]");
  await page2.waitForSelector(".page-head");
  ctx.accounts.push({ page: page2, password: PASSWORD });
  const { status } = await api(page2, "GET", `/api/recipes/${ctx.recipeId}/`);
  assert(status === 404, `statut ${status} au lieu de 404`);
  const list = await api(page2, "GET", "/api/recipes/");
  assert(list.data.length === 0, "la liste d'un nouveau compte doit être vide");
});

scenario("Suppression de la recette avec confirmation (F-05)", async ({ page }) => {
  await page.goto(`${BASE}/#/recettes/${ctx.recipeId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".recipe h1");
  await clickText(page, "button", "Supprimer");
  await page.waitForFunction(() => location.hash === "#/recettes");
  const { status } = await api(page, "GET", `/api/recipes/${ctx.recipeId}/`);
  assert(status === 404, "la recette existe encore");
});

scenario("Compte : export puis suppression des données (NF-09)", async ({ page }) => {
  const exported = await api(page, "GET", "/api/auth/export/");
  assert(exported.status === 200 && exported.data.user.email === ctx.email, "export");
  await page.goto(`${BASE}/#/compte`, { waitUntil: "networkidle0" });
  await page.type("#del-password", PASSWORD);
  await clickText(page, "button", "Supprimer définitivement");
  await page.waitForSelector("#f-email");
  ctx.accounts = ctx.accounts.filter((a) => a.page !== page);
});

async function cleanup() {
  // Supprime les comptes de test restants (en cas d'échec en cours de route).
  for (const { page, password } of ctx.accounts) {
    try {
      await api(page, "DELETE", "/api/auth/me/", { password });
    } catch {
      /* page fermée : rien à faire */
    }
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  console.log(`# Tests de bout en bout sur ${BASE}`);
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: !process.env.E2E_HEADFUL,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page.on("dialog", (d) => d.accept());
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 10000 });
  } catch {
    console.log(`Bail out! Application injoignable sur ${BASE} (lancer make up ou make dev).`);
    await browser.close();
    process.exit(1);
  }

  let failed = 0;
  let broken = false;
  for (const [i, { name, fn }] of scenarios.entries()) {
    const n = i + 1;
    if (broken) {
      console.log(`ok ${n} - ${name} # SKIP scénario précédent en échec`);
      continue;
    }
    try {
      await fn({ page, browser });
      console.log(`ok ${n} - ${name}`);
    } catch (err) {
      failed += 1;
      broken = true;
      const shot = path.join(SHOTS, `echec-${n}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      console.log(`not ok ${n} - ${name}`);
      console.log(`  ${String(err.message || err).split("\n").join("\n  ")}`);
      console.log(`  capture : ${shot}`);
    }
  }
  if (pageErrors.length) {
    failed += 1;
    console.log(`not ok ${scenarios.length + 1} - Aucune erreur JavaScript dans la page`);
    pageErrors.forEach((e) => console.log(`  ${e}`));
  } else {
    console.log(`ok ${scenarios.length + 1} - Aucune erreur JavaScript dans la page`);
  }
  await cleanup();
  await browser.close();
  const total = scenarios.length + 1;
  console.log(`# ${total - failed}/${total} réussis`);
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.log(`Bail out! ${err.message}`);
  await cleanup().catch(() => {});
  process.exit(1);
});
