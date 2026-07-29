import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdminHash } from '../src/utils/adminRoute';

test('direct admin hashes open the admin page', () => {
  assert.equal(isAdminHash('#admin'), true);
  assert.equal(isAdminHash('#/admin'), true);
  assert.equal(isAdminHash('#admin-login'), true);
});

test('public section and detail hashes do not open admin', () => {
  assert.equal(isAdminHash('#section-members'), false);
  assert.equal(isAdminHash('#section-coaches/detail/coach/1'), false);
});
