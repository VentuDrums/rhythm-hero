#!/usr/bin/env node
// Mide LCP y CLS con Lighthouse (móvil emulado) contra `vite preview` del build actual.
// Umbrales: CONSTRAINTS.md (LCP ≤ 2500 ms, CLS ≤ 0.1). Requiere haber ejecutado `npm run build`.
import { existsSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

const LCP_MAX_MS = 2500;
const CLS_MAX = 0.1;
const PORT = 4174;

// chrome-launcher busca Chrome; si no lo encuentra se usa Edge, que también es Chromium.
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = process.env.CHROME_PATH || (chromeLauncher.Launcher.getInstallations()[0] ?? (existsSync(EDGE) ? EDGE : undefined));

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'silent' });
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
let failed = false;
try {
  const result = await lighthouse(`http://localhost:${PORT}/`, {
    port: chrome.port,
    onlyCategories: ['performance'],
    output: 'json',
    logLevel: 'error',
  });
  if (!result) throw new Error('Lighthouse did not return a result');
  const audits = result.lhr.audits;
  const lcp = audits['largest-contentful-paint']?.numericValue;
  const cls = audits['cumulative-layout-shift']?.numericValue;
  if (typeof lcp !== 'number' || typeof cls !== 'number') throw new Error('LCP/CLS missing from Lighthouse report');
  console.log(`lighthouse: LCP ${Math.round(lcp)} ms (max ${LCP_MAX_MS}), CLS ${cls.toFixed(3)} (max ${CLS_MAX})`);
  if (lcp > LCP_MAX_MS) {
    console.error(`lighthouse: LCP too high`);
    failed = true;
  }
  if (cls > CLS_MAX) {
    console.error(`lighthouse: CLS too high`);
    failed = true;
  }
} finally {
  await chrome.kill();
  await new Promise((r) => server.httpServer.close(r));
}
process.exit(failed ? 1 : 0);
