import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_CONTENT_TABS } from '../src/utils/adminNavigation';

test('Admin content navigation has unique, renderable tab definitions', () => {
  const ids = ADMIN_CONTENT_TABS.map(tab => tab.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ADMIN_CONTENT_TABS.every(tab => Boolean(tab.icon)));
  assert.equal(ADMIN_CONTENT_TABS.find(tab => tab.id === 'clubs')?.icon.displayName, 'MapPinned');
});

