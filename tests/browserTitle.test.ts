import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBrowserTitle, formatSectionBrowserTitle } from '../src/utils/browserTitle';

test('removes the CLB prefix from the browser tab title', () => {
  assert.equal(
    formatBrowserTitle('CLB Vovinam Xóm Chiếu - Việt Võ Đạo Quận 4'),
    'Vovinam Xóm Chiếu - Việt Võ Đạo Quận 4'
  );
});

test('removes the full Vietnamese club prefix', () => {
  assert.equal(
    formatBrowserTitle('Câu lạc bộ Vovinam Xóm Chiếu'),
    'Vovinam Xóm Chiếu'
  );
});

test('keeps an already clean title unchanged', () => {
  assert.equal(
    formatBrowserTitle('Vovinam Xóm Chiếu'),
    'Vovinam Xóm Chiếu'
  );
});
test('browser tab title follows the active public section', () => {
  assert.equal(formatSectionBrowserTitle('section-about'), 'Vovinam Xóm Chiếu - Giới thiệu');
  assert.equal(formatSectionBrowserTitle('section-news'), 'Vovinam Xóm Chiếu - Tin tức');
  assert.equal(formatSectionBrowserTitle('section-tournaments'), 'Vovinam Xóm Chiếu - Giải đấu');
  assert.equal(formatSectionBrowserTitle('section-highlights'), 'Vovinam Xóm Chiếu - Highlights');
  assert.equal(formatSectionBrowserTitle('section-achievements'), 'Vovinam Xóm Chiếu - Thành tích');
  assert.equal(formatSectionBrowserTitle('section-coaches'), 'Vovinam Xóm Chiếu - Huấn luyện viên');
  assert.equal(formatSectionBrowserTitle('section-members'), 'Vovinam Xóm Chiếu - Môn sinh');
  assert.equal(formatSectionBrowserTitle('section-clubs'), 'Vovinam Xóm Chiếu - Điểm tập');
  assert.equal(formatSectionBrowserTitle('section-contact'), 'Vovinam Xóm Chiếu - Liên hệ');
});

test('browser tab title identifies Admin and safely falls back to About', () => {
  assert.equal(formatSectionBrowserTitle('unknown-section'), 'Vovinam Xóm Chiếu - Giới thiệu');
  assert.equal(formatSectionBrowserTitle('section-news', true), 'Vovinam Xóm Chiếu - Quản trị');
});
