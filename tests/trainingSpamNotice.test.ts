import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/TrainingRegistrationModal.tsx', import.meta.url), 'utf8');

test('training form prominently reminds registrants to check Spam', () => {
  assert.match(modal, /AlertTriangle/);
  assert.match(modal, /role="note"/);
  assert.match(modal, /Lưu ý:/);
  assert.match(modal, /Nhớ kiểm tra thư mục/);
  assert.match(modal, /<strong className=.*uppercase.*>Spam<\/strong>/);
  assert.match(modal, /border-\[#FFF200\]/);
});