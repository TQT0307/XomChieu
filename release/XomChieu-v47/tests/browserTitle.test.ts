import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBrowserTitle } from '../src/utils/browserTitle';

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

