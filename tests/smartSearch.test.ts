import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchesSmartSearch,
  matchesSmartSearchExactly,
  normalizeSmartSearchText
} from '../src/utils/smartSearch';

test('smart search ignores Vietnamese accents and letter case', () => {
  assert.equal(normalizeSmartSearchText('Trần Quốc THIỆN'), 'tran quoc thien');
  assert.equal(matchesSmartSearch('thien', 'Trần Quốc Thiện'), true);
  assert.equal(matchesSmartSearch('Đồng', 'Huy chương đồng'), true);
});

test('smart search matches remembered fragments in any order', () => {
  const fields = [
    '#TT2026',
    'Đối kháng 64kg Nam',
    'Trần Quốc Thiện',
    'Giải trẻ Vovinam TP.HCM năm 2026',
    'Huy chương Vàng'
  ];

  assert.equal(matchesSmartSearch('2026 thiện vàng', fields), true);
  assert.equal(matchesSmartSearch('vang tt2026', fields), true);
  assert.equal(matchesSmartSearch('2025 thiện', fields), false);
});

test('smart search accepts numbers, booleans and nested lists', () => {
  assert.equal(matchesSmartSearch('2013 hoat dong', 2013, ['hoạt động', true]), true);
  assert.equal(matchesSmartSearch('', 'anything'), true);
});
test('exact smart search distinguishes similarly named tournaments', () => {
  const cityTournament = 'GIẢI VÔ ĐỊCH VOVINAM TPHCM NĂM 2024';
  const studentTournament = 'GIẢI VÔ ĐỊCH VOVINAM SINH VIÊN TPHCM NĂM 2024';

  assert.equal(matchesSmartSearchExactly(cityTournament, cityTournament), true);
  assert.equal(matchesSmartSearchExactly(cityTournament, studentTournament), false);
  assert.equal(matchesSmartSearch('vô địch 2024', studentTournament), true);
});
