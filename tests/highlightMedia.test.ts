import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_HIGHLIGHT_IMAGES,
  MAX_HIGHLIGHT_VIDEO_BYTES,
  MAX_HIGHLIGHT_VIDEO_MB,
  MAX_HIGHLIGHT_VIDEO_SECONDS,
  MAX_HIGHLIGHT_VIDEOS,
  getDailymotionVideoId,
  getHighlightMediaCounts,
  getHighlightVideoEmbedUrl,
  getHighlightVideoProvider,
  getTikTokEmbedUrl,
  getTikTokVideoId,
  getVimeoEmbedUrl,
  getVimeoVideoId,
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

test('recognizes TikTok post URLs and creates a lazy embed player URL', () => {
  const url = 'https://www.tiktok.com/@panhmyxua/video/7672625123857288468?is_from_webapp=1';
  assert.equal(getTikTokVideoId(url), '7672625123857288468');
  assert.equal(
    getTikTokEmbedUrl(url),
    'https://www.tiktok.com/player/v1/7672625123857288468?controls=1&autoplay=0&rel=0'
  );
  assert.deepEqual(getHighlightMediaCounts([url]), { images: 0, videos: 1, total: 1 });
});
test('recognizes Vimeo links and creates a privacy-friendly iframe URL', () => {
  const url = 'https://vimeo.com/76979871';
  assert.equal(getVimeoVideoId(url), '76979871');
  assert.equal(getVimeoEmbedUrl(url), 'https://player.vimeo.com/video/76979871?dnt=1&autoplay=0');
  assert.equal(getHighlightVideoEmbedUrl(url), 'https://player.vimeo.com/video/76979871?dnt=1&autoplay=0');
});

test('accepts supported social post links without treating them as images', () => {
  const dailymotion = 'https://www.dailymotion.com/video/x84sh87';
  const facebook = 'https://www.facebook.com/example/videos/123456789';
  const instagram = 'https://www.instagram.com/reel/ABC123xyz/';
  const instagramPost = 'https://www.instagram.com/p/DEF456xyz/';
  const threads = 'https://www.threads.com/@vovinam/post/ABC123xyz';
  const x = 'https://x.com/vovinam/status/1234567890123456789';
  assert.equal(getDailymotionVideoId(dailymotion), 'x84sh87');
  assert.equal(getHighlightVideoProvider(dailymotion), 'dailymotion');
  assert.equal(getHighlightVideoProvider(facebook), 'facebook');
  assert.equal(getHighlightVideoProvider(instagram), 'instagram');
  assert.equal(getHighlightVideoProvider(instagramPost), 'instagram');
  assert.equal(getHighlightVideoProvider(threads), 'threads');
  assert.equal(getHighlightVideoProvider(x), 'x');
  assert.equal(getHighlightVideoProvider('https://www.threads.com/@vovinam'), null);
  assert.equal(getHighlightVideoProvider('https://x.com/vovinam'), null);
  assert.deepEqual(
    getHighlightMediaCounts([dailymotion, facebook, instagram, instagramPost, threads, x]),
    { images: 0, videos: 6, total: 6 }
  );
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

test('detail viewer does not inject the listing thumbnail into detail media', () => {
  const source = readFileSync('src/components/HighlightDetailModal.tsx', 'utf8');
  assert.match(source, /const mediaList = mediaItems\.map/);
  assert.doesNotMatch(source, /mediaItems\.unshift/);
  assert.doesNotMatch(source, /\[highlight\.thumbnail\]/);
});

test('highlight video viewer supports uncropped fullscreen playback', () => {
  const source = readFileSync('src/components/HighlightDetailModal.tsx', 'utf8');
  assert.match(source, /requestFullscreen/);
  assert.match(source, /fullscreenchange/);
  assert.match(source, /allowFullScreen/);
  assert.match(source, /h-full w-full bg-black object-contain/);
  assert.match(source, /h-\[100dvh\]/);
});