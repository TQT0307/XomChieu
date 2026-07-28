import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeConcurrentKeyData } from '../src/utils/syncConflictMerge';

test('keeps a remote addition while applying a local record edit', () => {
  const base = [{ id: 'a', name: 'Original', location: 'Q4' }];
  const local = [{ id: 'a', name: 'Edited locally', location: 'Q4' }];
  const remote = [
    { id: 'a', name: 'Original', location: 'Q4' },
    { id: 'b', name: 'Added remotely', location: 'Q1' }
  ];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 'a', name: 'Edited locally', location: 'Q4' },
    { id: 'b', name: 'Added remotely', location: 'Q1' }
  ]);
});

test('merges different fields edited concurrently on the same record', () => {
  const base = [{ id: 1, name: 'A', location: 'Old' }];
  const local = [{ id: 1, name: 'Local name', location: 'Old' }];
  const remote = [{ id: 1, name: 'A', location: 'Remote location' }];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 1, name: 'Local name', location: 'Remote location' }
  ]);
});

test('prefers the current explicit edit when the same field conflicts', () => {
  const base = [{ id: 1, name: 'A' }];
  const local = [{ id: 1, name: 'Local' }];
  const remote = [{ id: 1, name: 'Remote' }];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 1, name: 'Local' }
  ]);
});

test('keeps an intentional local deletion when remote data is unchanged', () => {
  const base = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const local = [{ id: 2, name: 'B' }];
  const remote = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 2, name: 'B' }
  ]);
});

test('protects a remotely edited record from a concurrent local deletion', () => {
  const base = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const local = [{ id: 2, name: 'B' }];
  const remote = [{ id: 1, name: 'Remote edit' }, { id: 2, name: 'B' }];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 2, name: 'B' },
    { id: 1, name: 'Remote edit' }
  ]);
});

test('respects a remote deletion when the local record was unchanged', () => {
  const base = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const local = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const remote = [{ id: 2, name: 'B' }];

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), [
    { id: 2, name: 'B' }
  ]);
});

test('merges unrelated website configuration changes', () => {
  const base = {
    logo: 'old-logo',
    socialLinks: { facebook: 'old-fb', zalo: 'old-zalo' }
  };
  const local = {
    logo: 'new-logo',
    socialLinks: { facebook: 'old-fb', zalo: 'old-zalo' }
  };
  const remote = {
    logo: 'old-logo',
    socialLinks: { facebook: 'new-fb', zalo: 'old-zalo' }
  };

  assert.deepEqual(mergeConcurrentKeyData(base, local, remote), {
    logo: 'new-logo',
    socialLinks: { facebook: 'new-fb', zalo: 'old-zalo' }
  });
});

