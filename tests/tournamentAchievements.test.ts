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
    assert.match(modal, /\{achievedResults\.length\} thành tích/);
    assert.match(modal, /Cuộn để xem đủ \{achievedResults\.length\} thành tích/);
  });
  test('achievement medals use gold, silver and bronze icons based on their text', () => {
    assert.match(modal, /getAchievementMedalTheme/);
    assert.match(modal, /Huy chương Vàng/);
    assert.match(modal, /Huy chương Bạc/);
    assert.match(modal, /Huy chương Đồng/);
    assert.match(modal, /emoji: '🥇'/);
    assert.match(modal, /emoji: '🥈'/);
    assert.match(modal, /emoji: '🥉'/);
    assert.match(modal, /replace\(\/đ\/g, 'd'\)/);
    assert.match(modal, /medalTheme\.emoji/);
    assert.doesNotMatch(modal, /\{index \+ 1\}/);
  });
  test('public tournament details prefer the exact Admin content over legacy samples', () => {
    assert.match(modal, /tournament\.introduction\?\.trim\(\) \|\| details\.about/);
    assert.match(modal, /tournament\.schedule\?\.trim\(\) \|\| details\.schedule\.join/);
    assert.match(modal, /tournament\.rules\?\.trim\(\) \|\| details\.rules\.join/);
    assert.match(modal, /\{introductionContent\}/);
    assert.match(modal, /\{scheduleContent\}/);
    assert.match(modal, /\{rulesContent\}/);
    assert.match(modal, /whitespace-pre-line/);
  });

  test('accented medal names are matched directly before normalized fallback', () => {
    assert.match(modal, /huy chương\\s\*đồng/);
    assert.match(modal, /huy chương\\s\*bạc/);
    assert.match(modal, /huy chương\\s\*vàng/);
  });
  test('tournament detail uses a readable responsive card layout', () => {
    assert.match(modal, /max-w-5xl/);
    assert.match(modal, /grid-cols-1 md:grid-cols-12/);
    assert.equal((modal.match(/rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5/g) || []).length, 3);
    assert.match(modal, /sm:text-\[15px\]/);
  });
  test('tournament achievements stay above the compact map while only article content scrolls on desktop', () => {
    assert.match(modal, /md:overflow-hidden grid grid-cols-1 md:grid-cols-12/);
    assert.match(modal, /md:col-span-7[^"\n]*md:overflow-y-auto/);
    assert.match(modal, /detail-scrollbar relative min-h-0 space-y-2\.5 md:overflow-y-auto/);
    assert.match(modal, /Fixed achieved results above the compact map/);
    const mapPosition = modal.indexOf('Bản đồ định vị tự động theo địa điểm thi đấu');
    const achievementPosition = modal.indexOf('Fixed achieved results above the compact map');
    assert.ok(achievementPosition >= 0 && mapPosition > achievementPosition);
  });