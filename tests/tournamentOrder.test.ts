import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareTournamentsByStatus,
  getTournamentStartTimestamp,
  getNormalizedTournamentStatus,
  type Tournament
} from '../src/types';

const tournament = (id: string, status: Tournament['status']): Tournament => ({
  id,
  image: '',
  name: id,
  date: '',
  location: '',
  status
});

test('tournaments are ordered ongoing, upcoming, then completed', () => {
  const sorted = [
    tournament('completed', 'đã kết thúc'),
    tournament('upcoming', 'sắp diễn ra'),
    tournament('ongoing', 'đang diễn ra')
  ].sort(compareTournamentsByStatus);

  assert.deepEqual(sorted.map(item => item.id), [
    'ongoing',
    'upcoming',
    'completed'
  ]);
});

test('tournaments in the same status group keep their Admin order', () => {
  const first = { ...tournament('first', 'sắp diễn ra'), date: '' };
  const second = { ...tournament('second', 'sắp diễn ra'), date: '' };

  assert.equal(compareTournamentsByStatus(first, second), 0);
});

test('legacy boolean tournament statuses keep the same public priority', () => {
  assert.equal(getNormalizedTournamentStatus(true), 'đang diễn ra');
  assert.equal(getNormalizedTournamentStatus(false), 'đã kết thúc');
});

test('newer dates are first inside the same tournament status', () => {
  const older = {
    ...tournament('older', 'đã kết thúc'),
    date: '22/05-30/05/2026'
  };
  const newer = {
    ...tournament('newer', 'đã kết thúc'),
    date: '28/06/2026'
  };

  assert.deepEqual(
    [older, newer].sort(compareTournamentsByStatus).map(item => item.id),
    ['newer', 'older']
  );
});

test('tournament date parser supports ISO dates and date ranges', () => {
  assert.equal(
    getTournamentStartTimestamp('2026-06-28'),
    Date.UTC(2026, 5, 28)
  );
  assert.equal(
    getTournamentStartTimestamp('10/08-15/08/2026'),
    Date.UTC(2026, 7, 10)
  );
});
