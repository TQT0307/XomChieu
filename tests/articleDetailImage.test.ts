import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const article = fs.readFileSync(new URL('../src/components/ArticleDetailModal.tsx', import.meta.url), 'utf8');

test('article detail image uses the same framed 16:9 presentation as achievements', () => {
  assert.match(article, /h-\[clamp\(220px,42dvh,420px\)\]/);
  assert.match(article, /foregroundAspectRatio="16:9"/);
  assert.match(article, /bg-slate-950/);
});