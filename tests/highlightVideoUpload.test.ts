import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('local highlight clips use the protected Firebase Storage-only route', async () => {
  const source = await readFile(new URL('../api/index.ts', import.meta.url), 'utf8');
  const start = source.indexOf('app.post("/api/media/video"');
  const end = source.indexOf('app.post("/api/media/image"', start);
  assert.ok(start > 0 && end > start, 'video upload route must exist before the image route');
  const route = source.slice(start, end);

  assert.match(route, /requireSameOrigin, requireAdminSession/);
  assert.match(route, /MAX_HIGHLIGHT_VIDEO_BYTES/);
  assert.match(route, /MAX_HIGHLIGHT_VIDEO_SECONDS/);
  assert.match(route, /detectVideoContentType/);
  assert.match(route, /storeVideoInFirebaseStorage/);
  assert.match(source, /configuredFirebaseStorageBucket \|\|/);
  assert.match(source, /firebaseProjectIdForStorage.*firebasestorage\.app/s);
  assert.doesNotMatch(route, /MEDIA_COLLECTION|collection\(/, 'video must never fall back to Firestore/base64');
});

test('Admin validates a local clip before uploading and still supports pasted links', async () => {
  const source = await readFile(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
  assert.match(source, /accept="video\/mp4,video\/webm"/);
  assert.match(source, /readVideoDurationSeconds\(typedFile\)/);
  assert.match(source, /file\.size > MAX_HIGHLIGHT_VIDEO_BYTES/);
  assert.ok(source.includes("fetch('/api/media/video'"));
  assert.match(source, /Chi tiết Firebase:/);
  assert.match(source, /result\.message/);
  assert.match(source, /Vimeo, Dailymotion, Facebook\/Instagram Reel/);
});
