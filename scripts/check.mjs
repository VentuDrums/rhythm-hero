#!/usr/bin/env node
// Ejecuta todas las comprobaciones de CONSTRAINTS.md en orden, se para en el primer fallo
// y muestra cuánto tarda cada una. Si el total pasa de 90 s lo avisa, sin saltarse nada.
import { spawnSync } from 'node:child_process';

const WARN_AFTER_S = 90;

const steps = [
  ['Floor', 'node scripts/floor-guard.mjs'],
  ['Lint + tipos', 'npm run lint'],
  ['Secretos', 'npx secretlint "**/*"'],
  ['Tests + cobertura', 'npx vitest run --coverage'],
  ['Build', 'npx vite build --logLevel warn'],
  ['Peso (bundle)', 'npx size-limit'],
  ['E2E + accesibilidad', 'npx playwright test'],
  ['Rendimiento (Lighthouse)', 'node scripts/lighthouse-check.mjs'],
  ['Dependencias', 'npm audit --audit-level=high'],
];

const times = [];
const start = Date.now();
for (const [name, cmd] of steps) {
  console.log(`\n▶ ${name}: ${cmd}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  const secs = (Date.now() - t0) / 1000;
  times.push([name, secs]);
  if (r.status !== 0) {
    console.error(`\n✖ FALLA: ${name} (${secs.toFixed(1)} s). La tarea no está terminada.`);
    process.exit(1);
  }
}

const total = (Date.now() - start) / 1000;
console.log('\nTiempos:');
for (const [name, secs] of times) console.log(`  ${name.padEnd(26)} ${secs.toFixed(1)} s`);
console.log(`\n✔ Todo en verde en ${total.toFixed(1)} s`);
if (total > WARN_AFTER_S) {
  const [slowest] = [...times].sort((a, b) => b[1] - a[1]);
  console.warn(`⚠ AVISO: la comprobación tardó más de ${WARN_AFTER_S} s. Paso más lento: ${slowest?.[0]} (${slowest?.[1].toFixed(1)} s).`);
}
