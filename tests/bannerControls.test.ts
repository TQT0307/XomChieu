import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');

test('banner navigation is accessible, lightweight and keeps automatic carousel controls', () => {
  assert.match(user, /aria-label="Xem banner trước"/);
  assert.match(user, /aria-label="Xem banner tiếp theo"/);
  assert.match(user, /backdrop-blur-md/);
  assert.match(user, /prevBanner/);
  assert.match(user, /nextBanner/);
  assert.match(user, /onTouchStart=\{handleBannerTouchStart\}/);
  assert.match(user, /onTouchEnd=\{handleBannerTouchEnd\}/);
  assert.match(user, /Math\.abs\(distance\) < 50/);
  assert.match(user, /opacity-45/);
  assert.match(user, /safeCurrentBanner === idx/);
  assert.match(user, /shadow-\[0_0_14px/);
});
test('admin banner preview mirrors the public image-only banner', () => {
  const admin = fs.readFileSync(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
  const start = admin.indexOf('REAL-TIME CAROUSEL MULTI-BANNER LIVE PREVIEW');
  const end = admin.indexOf('Navigation Arrows for Preview', start);
  const preview = admin.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(preview, /Content Overlay|from-black\/80|Môn Phái Việt Võ Đạo|Khám phá|Thư viện/);
});
test('banner 3D motion stays compositor-only and respects reduced motion', () => {
  const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(user, /vovinam-banner-stage/);
  assert.match(user, /vovinam-banner-slide/);
  assert.match(user, /vovinam-banner-light/);
  assert.match(css, /@keyframes vovinam-banner-enter/);
  assert.match(css, /@keyframes vovinam-banner-glint/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /WebGLRenderingContext|three\.js/);
});
test('admin image alignment supports persisted zoom without changing legacy banners', () => {
  const admin = fs.readFileSync(new URL('../src/components/AdminPanel.tsx', import.meta.url), 'utf8');
  const types = fs.readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
  assert.match(types, /zoom\?: number/);
  assert.match(admin, /zoomPct: 100/);
  assert.match(admin, /Phóng to từ 100% đến 180%/);
  assert.match(admin, /updateEditorZoom/);
  assert.match(admin, /const editorMaxZoom = 300/);
  assert.match(admin, /Mức rõ nét khuyến nghị/);
  assert.match(admin, /onWheel=\{event =>/);
  assert.match(user, /banners\[safeCurrentBanner\]\?\.zoom \|\| 100/);
});