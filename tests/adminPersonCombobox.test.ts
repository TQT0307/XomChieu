import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const adminSource = readFileSync(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
const comboboxSource = readFileSync(new URL('../src/components/PersonCombobox.tsx', import.meta.url), 'utf8');

test('Admin uses one compact person combobox in each affected form', () => {
  assert.equal((adminSource.match(/<PersonCombobox/g) || []).length, 3);
  assert.doesNotMatch(adminSource, /Dynamic Coach\/Member ID Lookup Section/);
  assert.doesNotMatch(adminSource, /Associated member\/coach profiles/);
  assert.doesNotMatch(adminSource, /club-head-coach-options|highlight-athlete-options/);
});

test('person menu is bounded and does not render the entire database at once', () => {
  assert.match(comboboxSource, /\.slice\(0, 12\)/);
  assert.match(comboboxSource, /max-h-64 overflow-y-auto/);
  assert.match(comboboxSource, /removeEventListener\('pointerdown'/);
});