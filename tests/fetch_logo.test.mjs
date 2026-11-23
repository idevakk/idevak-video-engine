import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(root, 'scripts/fetch_logo.py');

test('fetch_logo.py --help displays usage and zero-fabrication rules', () => {
  const stdout = execFileSync('python', [scriptPath, '--help'], { encoding: 'utf-8' });
  assert.match(stdout, /Fetch official vector\/brand logos from SVGL & FaviconDL/i);
  assert.match(stdout, /--provider/);
  assert.match(stdout, /--theme/);
  assert.match(stdout, /--json/);
});

test('fetch_logo.py retrieves authentic vector SVG via SVGL API', () => {
  const stdout = execFileSync('python', [scriptPath, 'discord', '--dry-run', '--json'], { encoding: 'utf-8' });
  const data = JSON.parse(stdout);
  assert.equal(data.ok, true);
  assert.equal(data.provider, 'svgl');
  assert.equal(data.format, 'svg');
  assert.match(data.url, /discord/i);
  assert.equal(data.schema_snippet.src, 'assets/logos/discord.svg');
});

test('fetch_logo.py retrieves authentic site icon via FaviconDL API', () => {
  const stdout = execFileSync('python', [scriptPath, 'github.com', '--provider', 'favicondl', '--dry-run', '--json'], { encoding: 'utf-8' });
  const data = JSON.parse(stdout);
  assert.equal(data.ok, true);
  assert.equal(data.provider, 'favicondl');
  assert.ok(['svg', 'png', 'ico'].includes(data.format));
  assert.ok(data.url.length > 0);
});

test('fetch_logo.py handles unknown brands with actionable search fallbacks without fabrication', () => {
  let failed = false;
  try {
    execFileSync('python', [scriptPath, 'unknown_brand_12345_xyz', '--dry-run', '--json'], { encoding: 'utf-8' });
  } catch (err) {
    failed = true;
    const data = JSON.parse(err.stdout);
    assert.equal(data.ok, false);
    assert.match(data.error, /No logo found/);
    assert.ok(Array.isArray(data.fallback_instructions));
    assert.ok(data.fallback_instructions.some(s => s.includes('Firecrawl search')));
    assert.ok(data.fallback_instructions.some(s => s.includes('Web search')));
    assert.ok(data.fallback_instructions.some(s => s.includes('Never generate')));
  }
  assert.equal(failed, true, 'Script should exit non-zero for unresolvable brands');
});

test('fetch_logo.py downloads and writes valid SVG to target output path', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'logo-test-'));
  const targetSvg = path.join(tempDir, 'test_discord.svg');

  try {
    execFileSync('python', [scriptPath, 'discord', '-o', targetSvg, '--json'], { encoding: 'utf-8' });
    const content = await readFile(targetSvg, 'utf-8');
    assert.match(content, /<svg[^>]*>/i);
    assert.match(content, /<\/svg>/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
