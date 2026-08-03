import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/CoachDetailModal.tsx', import.meta.url), 'utf8');

test('coach details show every responsible club with primary and assistant roles in single rows', () => {
  assert.match(modal, /responsibleClubs/);
  assert.match(modal, /isPrimary/);
  assert.match(modal, /isAssistant/);
  assert.match(modal, /role: isPrimary \? 'Chính'/);
  assert.match(modal, /Câu lạc bộ đang phụ trách/);
  assert.match(modal, /className="mt-3 space-y-2"/);
  assert.doesNotMatch(modal, /sm:grid-cols-2 lg:grid-cols-3/);
});

test('coach detail omits the redundant martial belt summary card', () => {
  assert.doesNotMatch(modal, /Đai đẳng môn phái/);
  assert.doesNotMatch(modal, /getBeltStyle/);
});