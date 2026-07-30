import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_SHORTCUT_MAX_GAP_MS,
  advanceAdminShortcut,
  type AdminShortcutState
} from '../src/utils/adminShortcut';

test('five consecutive logo clicks reliably open Admin', () => {
  let state: AdminShortcutState = { count: 0, lastClickAt: 0 };
  let opened = false;

  [1000, 1200, 1400, 1600, 1800].forEach(clickedAt => {
    const result = advanceAdminShortcut(state, clickedAt);
    state = result.state;
    opened = result.shouldOpenAdmin;
  });

  assert.equal(opened, true);
  assert.deepEqual(state, { count: 0, lastClickAt: 0 });
});

test('an expired click sequence restarts from one', () => {
  const result = advanceAdminShortcut(
    { count: 4, lastClickAt: 1000 },
    1000 + ADMIN_SHORTCUT_MAX_GAP_MS + 1
  );

  assert.equal(result.shouldOpenAdmin, false);
  assert.equal(result.state.count, 1);
});

