import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');

test('banner navigation is accessible, lightweight and keeps automatic carousel controls', () => {
  assert.match(user, /aria-label="Xem banner trước"/);
  assert.match(user, /aria-label="Xem banner tiếp theo"/);
  assert.match(user, /backdrop-blur-md/);
  assert.match(user, /prevBanner/);
  assert.match(user, /nextBanner/);
  assert.match(user, /safeCurrentBanner === idx/);
  assert.match(user, /shadow-\[0_0_14px/);
});