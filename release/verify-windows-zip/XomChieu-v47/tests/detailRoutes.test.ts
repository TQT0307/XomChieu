import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDetailHash,
  getSectionIdFromHash,
  parseDetailHash,
} from '../src/utils/detailRoutes';

test('detail routes remain shareable and preserve encoded identifiers', () => {
  const hash = buildDetailHash('coach', 'HLV 01/Thiện');
  assert.equal(hash, '#section-coaches/detail/coach/HLV%2001%2FThi%E1%BB%87n');
  assert.deepEqual(parseDetailHash(hash), {
    kind: 'coach',
    id: 'HLV 01/Thiện',
    sectionId: 'section-coaches',
  });
});

test('detail routes reject mismatched sections and malformed identifiers', () => {
  assert.equal(parseDetailHash('#section-members/detail/coach/HLV01'), null);
  assert.equal(parseDetailHash('#section-coaches/detail/coach/%E0%A4%A'), null);
  assert.equal(parseDetailHash('#section-coaches'), null);
});

test('section lookup supports both section and detail hashes', () => {
  assert.equal(getSectionIdFromHash('#section-highlights'), 'section-highlights');
  assert.equal(
    getSectionIdFromHash('#section-achievements/detail/achievement/TT01'),
    'section-achievements'
  );
});
