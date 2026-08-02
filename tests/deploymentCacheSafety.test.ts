import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const indexCss = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const vercelConfig = JSON.parse(vercel) as {
  headers: Array<{ source: string; headers: Array<Record<string, string>> }>;
};

test('HTML shell is never cached across Vercel deployments', () => {
  assert.match(vercel, /"source": "\/"/);
  assert.match(vercel, /"source": "\/index\.html"/);
  assert.match(vercel, /no-store, no-cache, must-revalidate/);
  assert.match(vercel, /"source": "\/assets\/\(\.\*\)"/);
  assert.match(vercel, /max-age=31536000, immutable/);
  for (const rule of vercelConfig.headers) {
    assert.deepEqual(Object.keys(rule).sort(), ['headers', 'source']);
    for (const header of rule.headers) {
      assert.deepEqual(Object.keys(header).sort(), ['key', 'value']);
    }
  }
});

test('a stale missing module automatically reloads a fresh HTML shell once', () => {
  assert.match(html, /vovinam_asset_recovery/);
  assert.match(html, /HTMLScriptElement/);
  assert.match(html, /vite:preloadError/);
  assert.match(html, /searchParams\.set\('refresh'/);
});
test('browser production bundle rejects Node test code', () => {
  const vite = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const modal = fs.readFileSync(new URL('../src/components/TrainingRegistrationModal.tsx', import.meta.url), 'utf8');
  assert.match(vite, /browser-bundle-node-guard/);
  assert.match(vite, /readFileSync/);
  assert.doesNotMatch(modal, /readFileSync|node:test|training form opens only from Contact navigation/);
  assert.match(html, /Website cần tải lại dữ liệu mới/);
});
test('stylesheet never contains server or TypeScript imports', () => {
  assert.match(indexCss, /^@import "tailwindcss";/);
  assert.match(indexCss, /No canvas, WebGL or data-layer dependency/);
});
test('dimensional UI remains CSS-only and motion-safe', () => {
  assert.match(indexCss, /Dimensional UI system/);
  assert.match(indexCss, /prefers-reduced-motion: reduce/);
  assert.match(indexCss, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(indexCss, /No canvas, WebGL or data-layer dependency/);
});
