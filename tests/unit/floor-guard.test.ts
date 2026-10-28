// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const guard = resolve('scripts/floor-guard.mjs');
let repo = '';

const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
const runGuard = () => spawnSync('node', [guard], { cwd: repo, encoding: 'utf8' });

describe('floor-guard', () => {
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'floor-guard-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    writeFileSync(join(repo, 'a.test.ts'), "it('works', () => {\n  expect(1).toBe(1);\n});\n");
    git('add', '-A');
    git('commit', '-q', '-m', 'init');
  });

  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it('passes a clean change', () => {
    writeFileSync(join(repo, 'b.ts'), 'export const b = 1;\n');
    expect(runGuard().status).toBe(0);
  });

  it('blocks a new @ts-ignore', () => {
    writeFileSync(join(repo, 'b.ts'), '// @ts-ignore\nexport const b: number = "x";\n');
    const r = runGuard();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('silenced-checker');
  });

  it('blocks a skipped test', () => {
    writeFileSync(join(repo, 'a.test.ts'), "it.skip('works', () => {\n  expect(1).toBe(1);\n});\n");
    const r = runGuard();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('test-made-easier');
  });

  it('blocks a removed assertion', () => {
    writeFileSync(join(repo, 'a.test.ts'), "it('works', () => {\n});\n");
    const r = runGuard();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('assertion-removed');
  });

  it('blocks a lowered coverage threshold in CONSTRAINTS.md', () => {
    writeFileSync(join(repo, 'CONSTRAINTS.md'), '| Coverage | Lines ≥ 80% | vitest |\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'constraints');
    writeFileSync(join(repo, 'CONSTRAINTS.md'), '| Coverage | Lines ≥ 60% | vitest |\n');
    const r = runGuard();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('threshold-loosened');
  });
});
