import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('HTML shell is never cached across Vercel deployments', () => {
  assert.match(vercel, /"source": "\/"/);
  assert.match(vercel, /"source": "\/index\.html"/);
  assert.match(vercel, /no-store, no-cache, must-revalidate/);
  assert.match(vercel, /"source": "\/assets\/\(\.\*\)"/);
  assert.match(vercel, /max-age=31536000, immutable/);
});

test('a stale missing module automatically reloads a fresh HTML shell once', () => {
  assert.match(html, /vovinam_asset_recovery/);
  assert.match(html, /HTMLScriptElement/);
  assert.match(html, /vite:preloadError/);
  assert.match(html, /searchParams\.set\('refresh'/);
});