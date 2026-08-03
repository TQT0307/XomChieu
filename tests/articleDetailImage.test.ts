import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const article = fs.readFileSync(new URL('../src/components/ArticleDetailModal.tsx', import.meta.url), 'utf8');

test('article detail image uses the same framed 16:9 presentation as achievements', () => {
  assert.match(article, /h-\[clamp\(200px,36dvh,360px\)\]/);
  assert.match(article, /foregroundAspectRatio="16:9"/);
  assert.match(article, /bg-slate-950/);
  const sharedFrame = fs.readFileSync(new URL('../src/components/DetailHeroImage.tsx', import.meta.url), 'utf8');
  assert.match(sharedFrame, /relative h-full w-full overflow-hidden/);
  assert.doesNotMatch(sharedFrame, /aspect-video h-full max-h-full max-w-full/);
});