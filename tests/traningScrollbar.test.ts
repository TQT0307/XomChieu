import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/TrainingRegistrationModal.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('training form uses a scoped slim scrollbar without native gutter or arrow buttons', () => {
  assert.match(modal, /training-form-scrollbar modal-scroll-region/);
  assert.match(css, /\.training-form-scrollbar::\-webkit-scrollbar-thumb/);
  assert.match(css, /scrollbar-color: rgba\(0, 84, 166, 0\.72\) transparent/);
  assert.match(css, /::\-webkit-scrollbar-button/);
  assert.match(css, /display: none/);
  assert.doesNotMatch(css, /#e8f1fa/);
  assert.match(css, /@media \(max-width: 639px\)/);
});