import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseStoredAdminAccount,
  parseStoredEditHistories
} from '../src/utils/adminStorage';

test('legacy assistant session without permissions cannot crash Admin', () => {
  const account = parseStoredAdminAccount(JSON.stringify({
    id: 'old-admin',
    username: 'minh',
    name: 'Hoàng Minh',
    role: 'assistant'
  }));

  assert.deepEqual(account?.permissions, []);
  assert.equal(account?.role, 'assistant');
});

test('legacy sub role is normalized and secrets are not returned', () => {
  const account = parseStoredAdminAccount(JSON.stringify({
    username: 'legacy',
    role: 'sub',
    password: 'must-not-survive',
    passwordHash: 'must-not-survive'
  }));

  assert.equal(account?.role, 'assistant');
  assert.equal('password' in (account || {}), false);
  assert.equal('passwordHash' in (account || {}), false);
});

test('malformed Admin cache and history are ignored safely', () => {
  assert.equal(parseStoredAdminAccount('{"username":'), null);
  assert.equal(parseStoredEditHistories('{"not":"an array"}'), null);
});
