import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('belt promotion exam is available and labeled consistently across Admin and public Highlights', () => {
  const admin = readFileSync('src/components/AdminPanel.tsx', 'utf8');
  const cards = readFileSync('src/components/UserView.tsx', 'utf8');
  const detail = readFileSync('src/components/HighlightDetailModal.tsx', 'utf8');
  const clientTypes = readFileSync('src/types.ts', 'utf8');
  const apiTypes = readFileSync('api/types.ts', 'utf8');

  assert.match(admin, /option value="thăng cấp đai">🥋 Thi thăng cấp đai/);
  assert.match(cards, /contentType === 'thăng cấp đai'/);
  assert.match(cards, /'Thi thăng cấp đai'/);
  assert.match(detail, /contentType === 'thăng cấp đai'/);
  assert.match(detail, /'Thi thăng cấp đai'/);
  assert.match(clientTypes, /'thi đấu' \| 'tập luyện' \| 'thăng cấp đai'/);
  assert.match(apiTypes, /'thi đấu' \| 'tập luyện' \| 'thăng cấp đai'/);
});