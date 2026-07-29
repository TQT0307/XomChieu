import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTournamentSearchOptions } from '../src/utils/tournamentSearchOptions';

test('tournament dropdown uses canonical tournament names and removes duplicates', () => {
  const tournaments = new Map([
    ['G1', { name: 'Giải Vô địch TP.HCM 2026' }]
  ]);
  const result = buildTournamentSearchOptions(
    [
      { tournamentId: 'G1', tournamentName: 'Tên cũ' },
      { tournamentId: 'G1', tournamentName: 'Tên cũ' }
    ],
    tournaments,
    'highlight',
    'highlight'
  );

  assert.deepEqual(result, [{
    key: 'highlight-tournament-giai vo dich tp hcm 2026',
    value: 'Giải Vô địch TP.HCM 2026',
    label: 'Giải Vô địch TP.HCM 2026',
    meta: '2 highlight'
  }]);
});

test('public dropdown excludes hidden records and never uses competition content as a label', () => {
  const result = buildTournamentSearchOptions(
    [
      { tournamentName: 'Giải Trẻ 2026', status: true },
      { tournamentName: 'Giải Ẩn 2025', status: false }
    ],
    new Map(),
    'achievement',
    'thành tích',
    true
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].label, 'Giải Trẻ 2026');
});
