import assert from 'node:assert/strict';
import test from 'node:test';
import { findPersonByIdOrName, formatPersonLookupValue } from '../src/utils/personLookup';

const people = [
  { id: 'HLV_THIEN', fullName: 'Võ sư Thiện' },
  { id: 'TV001', fullName: 'Nguyễn Văn An' }
];

test('finds a person by ID or name without case sensitivity', () => {
  assert.equal(findPersonByIdOrName(people, 'hlv_thien')?.fullName, 'Võ sư Thiện');
  assert.equal(findPersonByIdOrName(people, 'nguyễn văn an')?.id, 'TV001');
});

test('accepts the combined value shown by the merged lookup field', () => {
  const displayValue = formatPersonLookupValue(people[0]);
  assert.equal(displayValue, 'Võ sư Thiện (HLV_THIEN)');
  assert.equal(findPersonByIdOrName(people, displayValue)?.id, 'HLV_THIEN');
});