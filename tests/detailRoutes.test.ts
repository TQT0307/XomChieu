import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDetailHash,
  getSectionIdFromHash,
  matchesDetailIdentifier,
  parseDetailHash,
  toPublicDetailSlug,
} from '../src/utils/detailRoutes';

test('public detail routes use readable slugs instead of internal IDs', () => {
  const hash = buildDetailHash('article', 'Giải trẻ Vovinam TP.HCM 2026');
  assert.equal(hash, '#section-news/bai-viet/giai-tre-vovinam-tp-hcm-2026');
  assert.deepEqual(parseDetailHash(hash), {
    kind: 'article',
    id: 'giai-tre-vovinam-tp-hcm-2026',
    sectionId: 'section-news',
  });
  assert.equal(toPublicDetailSlug('Trần Quốc Thiện'), 'tran-quoc-thien');
});

test('legacy ID links remain readable after the public URL upgrade', () => {
  const legacyHash = '#section-coaches/detail/coach/HLV%2001%2FThi%E1%BB%87n';
  assert.deepEqual(parseDetailHash(legacyHash), {
    kind: 'coach',
    id: 'HLV 01/Thiện',
    sectionId: 'section-coaches',
  });
  assert.equal(matchesDetailIdentifier('HLV01', 'HLV01', 'Trần Quốc Thiện'), true);
  assert.equal(matchesDetailIdentifier('tran-quoc-thien', 'HLV01', 'Trần Quốc Thiện'), true);
});

test('detail routes reject mismatched sections and malformed identifiers', () => {
  assert.equal(parseDetailHash('#section-members/huan-luyen-vien/tran-quoc-thien'), null);
  assert.equal(parseDetailHash('#section-coaches/detail/coach/%E0%A4%A'), null);
  assert.equal(parseDetailHash('#section-coaches'), null);
});

test('section lookup supports section, public detail and legacy hashes', () => {
  assert.equal(getSectionIdFromHash('#section-highlights'), 'section-highlights');
  assert.equal(getSectionIdFromHash('#section-achievements/thanh-tich/huy-chuong-vang'), 'section-achievements');
  assert.equal(getSectionIdFromHash('#section-achievements/detail/achievement/TT01'), 'section-achievements');
});