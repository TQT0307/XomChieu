import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');
const swipeHook = fs.readFileSync(new URL('../src/hooks/useModalScrollLock.ts', import.meta.url), 'utf8');
const modalFiles = [
  'ArticleDetailModal.tsx', 'AchievementDetailModal.tsx', 'ClubDetailModal.tsx',
  'CoachDetailModal.tsx', 'HighlightDetailModal.tsx', 'MemberDetailModal.tsx',
  'TournamentDetailModal.tsx', 'TrainingRegistrationModal.tsx'
];

const modalSources = modalFiles.map(file =>
  fs.readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8')
);

test('contact cards open Maps, phone calling and Gmail compose', () => {
  assert.match(user, /google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(user, /href=\{`tel:/);
  assert.match(user, /mail\.google\.com\/mail\/\?view=cm&fs=1&to=/);
  assert.match(user, /aria-label="Mở địa chỉ võ đường trên Google Maps"/);
});

test('mobile edge swipe closes every public detail and registration modal', () => {
  assert.match(swipeHook, /touch\.clientX <= 42/);
  assert.match(swipeHook, /deltaX >= 80/);
  assert.match(swipeHook, /onSwipeBackRef\.current\?\.\(\)/);
  modalSources.forEach((source, index) => {
    assert.match(source, /useModalScrollLock\([^;]+, onClose\);/, modalFiles[index]);
  });
});