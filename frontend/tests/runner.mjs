// Mini exécuteur de tests (compatible Node 15+, sans dépendance).
// Affiche "ok N - nom" / "not ok N - nom" (format TAP) et sort en erreur si un test échoue.
let n = 0;
let failed = 0;
const queue = [];

export function test(name, fn) {
  queue.push([name, fn]);
}

export async function run(file) {
  console.log(`# ${file}`);
  for (const [name, fn] of queue) {
    n += 1;
    try {
      await fn();
      console.log(`ok ${n} - ${name}`);
    } catch (err) {
      failed += 1;
      console.log(`not ok ${n} - ${name}`);
      console.log(`  ${String(err && err.stack || err).split("\n").join("\n  ")}`);
    }
  }
  console.log(`# ${n - failed}/${n} réussis`);
  if (failed) process.exitCode = 1;
}
