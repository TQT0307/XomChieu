import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareTournamentsByStatus,
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
  const first = tournament('first', 'sắp diễn ra');
  const second = tournament('second', 'sắp diễn ra');

  assert.equal(compareTournamentsByStatus(first, second), 0);
});

test('legacy boolean tournament statuses keep the same public priority', () => {
  assert.equal(getNormalizedTournamentStatus(true), 'đang diễn ra');
  assert.equal(getNormalizedTournamentStatus(false), 'đã kết thúc');
});
