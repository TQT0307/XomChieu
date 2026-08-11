import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('public navigation anchors stop close to the sticky header with a compact heading gap', () => {
  for (const id of ['about', 'news', 'tournaments', 'highlights', 'achievements', 'coaches', 'members', 'clubs', 'contact']) {
    assert.match(css, new RegExp(`#section-${id}`));
  }
  assert.match(css, /scroll-margin-top: 5\.25rem/);
  assert.match(css, /padding-top: clamp\(1\.25rem, 2vw, 1\.75rem\)/);
  assert.doesNotMatch(css, /padding-top: clamp\(2\.25rem, 4vw, 3\.25rem\)/);
});