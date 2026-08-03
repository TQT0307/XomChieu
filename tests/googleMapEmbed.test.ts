import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mapComponent = readFileSync(new URL('../src/components/GoogleMapEmbed.tsx', import.meta.url), 'utf8');
const adminSource = readFileSync(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
const clubSource = readFileSync(new URL('../src/components/ClubDetailModal.tsx', import.meta.url), 'utf8');
const tournamentSource = readFileSync(new URL('../src/components/TournamentDetailModal.tsx', import.meta.url), 'utf8');

test('all coordinate and place-name maps render an application pin fixed at the center', () => {
  assert.match(mapComponent, /left-1\/2 top-1\/2/);
  assert.match(mapComponent, /-translate-x-1\/2 -translate-y-full/);
  assert.match(mapComponent, /data-map-center-pin="true"/);
  assert.doesNotMatch(mapComponent, /hasExactCenter/);
});

test('Admin previews and public club/tournament maps share the centered map component', () => {
  assert.equal((adminSource.match(/<GoogleMapEmbed/g) || []).length, 2);
  assert.equal((clubSource.match(/<GoogleMapEmbed/g) || []).length, 1);
  assert.equal((tournamentSource.match(/<GoogleMapEmbed/g) || []).length, 1);
});
test('tournament map keeps its visual center inside the visible modal viewport', () => {
  assert.match(tournamentSource, /h-\[220px\].*sm:h-\[240px\]/s);
  assert.match(tournamentSource, /self-start/);
  assert.doesNotMatch(tournamentSource, /h-\[250px\] md:h-full/);
});