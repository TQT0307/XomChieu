  import test from 'node:test';
  import assert from 'node:assert/strict';
  import fs from 'node:fs';
  
  const types = fs.readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
  const admin = fs.readFileSync(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
  const modal = fs.readFileSync(new URL('../src/components/TournamentDetailModal.tsx', import.meta.url), 'utf8');
  
  test('tournament achievements are optional and editable in Admin', () => {
    assert.match(types, /achievements\?: string/);
    assert.match(admin, /tournamentForm\.achievements \|\| ''/);
    assert.match(admin, /Thành tích đạt được \(không bắt buộc\)/);
    assert.match(admin, /maxLength=\{3000\}/);
  });
  
  test('achievement showcase renders only when tournament achievements exist', () => {
    assert.match(modal, /const achievedResults/);
    assert.match(modal, /achievedResults\.length > 0/);
    assert.match(modal, /achievedResults\.map/);
    assert.match(modal, /Thành tích đạt được/);
  });