import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');
const heroSource = readFileSync(new URL('../src/components/DetailHeroImage.tsx', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const warmupSource = readFileSync(new URL('../src/utils/imageWarmup.ts', import.meta.url), 'utf8');

test('Firestore media uses a bounded hot cache and immutable browser caching', () => {
  assert.match(apiSource, /MEDIA_MEMORY_CACHE_MAX_BYTES = 24 \* 1024 \* 1024/);
  assert.match(apiSource, /getCachedMedia\(id\)/);
  assert.match(apiSource, /while \(mediaMemoryCacheBytes > MEDIA_MEMORY_CACHE_MAX_BYTES/);
  assert.match(apiSource, /max-age=31536000.*immutable/);
});

test('detail hero decodes one high-priority image instead of duplicate foreground and blur images', () => {
  assert.equal((heroSource.match(/<img/g) || []).length, 1);
  assert.match(heroSource, /fetchPriority="high"/);
  assert.match(heroSource, /decoding="async"/);
});

test('page connects early to Firebase Storage for cloud images', () => {
  assert.match(htmlSource, /rel="preconnect" href="https:\/\/firebasestorage\.googleapis\.com"/);
});
test('critical images warm immediately and thumbnails warm with bounded concurrency', () => {
  assert.match(appSource, /warmImageCache\(\[webConfig\.logo, bannerImages\[0\], bannerImages\[1\]\], 3\)/);
  assert.match(appSource, /setTimeout\(\(\) =>/);
  assert.match(warmupSource, /const warmedImageUrls = new Set<string>/);
  assert.match(warmupSource, /Math\.min\(concurrency, urls\.length\)/);
});