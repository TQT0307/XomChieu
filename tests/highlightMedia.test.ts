import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HIGHLIGHT_IMAGES,
  MAX_HIGHLIGHT_VIDEO_BYTES,
  MAX_HIGHLIGHT_VIDEO_MB,
  MAX_HIGHLIGHT_VIDEO_SECONDS,
  MAX_HIGHLIGHT_VIDEOS,
  getHighlightMediaCounts,
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  validateHighlightMediaUrls
} from '../shared/highlightMedia';

test('keeps local clip uploads inside the serverless-safe envelope', () => {
  assert.equal(MAX_HIGHLIGHT_VIDEO_SECONDS, 30);
  assert.equal(MAX_HIGHLIGHT_VIDEO_MB, 3);
  assert.equal(MAX_HIGHLIGHT_VIDEO_BYTES, 3 * 1024 * 1024);
});

test('recognizes common YouTube URLs and creates privacy-friendly embeds', () => {
  assert.equal(getYouTubeVideoId('https://youtu.be/abc123XYZ_0'), 'abc123XYZ_0');
  assert.equal(getYouTubeVideoId('https://www.youtube.com/shorts/abc123XYZ_0'), 'abc123XYZ_0');
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ_0'), 'https://www.youtube-nocookie.com/embed/abc123XYZ_0?rel=0');
});

test('counts images and clips separately', () => {
  assert.deepEqual(getHighlightMediaCounts([
    '/api/media/image/abc',
    'https://youtu.be/abc123XYZ_0',
    'https://cdn.example.com/training.mp4?token=1'
  ]), { images: 1, videos: 2, total: 3 });
});

test('enforces twenty images and three clips', () => {
  assert.equal(validateHighlightMediaUrls(Array.from({ length: MAX_HIGHLIGHT_IMAGES }, (_, i) => `/image/${i}`)), null);
  assert.match(validateHighlightMediaUrls(Array.from({ length: MAX_HIGHLIGHT_IMAGES + 1 }, (_, i) => `/image/${i}`)) || '', /20 ảnh/);
  assert.equal(validateHighlightMediaUrls(Array.from({ length: MAX_HIGHLIGHT_VIDEOS }, (_, i) => `https://youtu.be/clip${i}`)), null);
  assert.match(validateHighlightMediaUrls(Array.from({ length: MAX_HIGHLIGHT_VIDEOS + 1 }, (_, i) => `https://youtu.be/clip${i}`)) || '', /3 clip/);
  assert.match(validateHighlightMediaUrls(['data:video/mp4;base64,AAAA']) || '', /base64/);
});
