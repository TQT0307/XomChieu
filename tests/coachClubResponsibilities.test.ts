import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/CoachDetailModal.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('coach details show every responsible club with primary and assistant roles in single rows', () => {
  assert.match(modal, /responsibleClubs/);
  assert.match(modal, /isPrimary/);
  assert.match(modal, /isAssistant/);
  assert.match(modal, /role: isPrimary \? 'Chính'/);
  assert.match(modal, /Câu lạc bộ đang phụ trách/);
  assert.match(modal, /className="mt-3 space-y-2"/);
  assert.match(modal, /onSelectClub\?\.\(club\)/);
  assert.match(modal, /aria-label={`Xem chi tiết \${club\.name}`}/);
  assert.doesNotMatch(modal, /sm:grid-cols-2 lg:grid-cols-3/);
});

test('coach detail omits the redundant martial belt summary card', () => {
  assert.doesNotMatch(modal, /Đai đẳng môn phái/);
  assert.doesNotMatch(modal, /getBeltStyle/);
});
test('coach club rows open the statically available club dialog with clear pointer feedback', () => {
  assert.match(app, /import ClubDetailModal from '\.\/components\/ClubDetailModal'/);
  assert.doesNotMatch(app, /loadClubDetailModal/);
  assert.match(app, /setSelectedCoach\(null\);\s*openClubDetail\(club\)/);
  assert.match(modal, /cursor-pointer/);
  assert.match(modal, /touch-manipulation/);
  assert.match(modal, /aria-haspopup="dialog"/);
  assert.match(modal, /event\.preventDefault\(\)/);
  assert.match(modal, /event\.stopPropagation\(\)/);
  assert.match(app, /case 'club':[\s\S]*clubs\.find\(item => matchesDetailIdentifier\(route\.id, item\.id, item\.name\)\) \|\| null/);
  assert.doesNotMatch(app, /case 'club':[\s\S]{0,250}item\.status !== false/);
});
