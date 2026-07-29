import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');
const heroSource = readFileSync(new URL('../src/components/DetailHeroImage.tsx', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

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