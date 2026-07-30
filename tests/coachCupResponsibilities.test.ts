import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/CoachDetailModal.tsx', import.meta.url), 'utf8');

test('coach details show every responsible club with primary and assistant roles', () => {
  assert.match(modal, /responsibleClubs/);
  assert.match(modal, /club\.headCoach/);
  assert.match(modal, /club\.coachIds/);
  assert.match(modal, /coach\.clubId/);
  assert.match(modal, /role: isPrimary \? 'Chính'/);
  assert.match(modal, /Câu lạc bộ đang phụ trách/);
  assert.match(modal, /Chưa phân công câu lạc bộ/);
});