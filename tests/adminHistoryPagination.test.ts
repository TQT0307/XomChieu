import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src', 'components', 'AdminPanel.tsx'), 'utf8');

test('admin system history uses its own filtered pagination', () => {
  assert.match(source, /const HISTORY_PAGE_SIZE = 20/);
  assert.match(source, /const pagedHistoryLogs = useMemo/);
  assert.match(source, /filteredHistoryLogs\.slice/);
  assert.match(source, /setHistoryPage\(page => Math\.max\(1, page - 1\)\)/);
  assert.match(source, /setHistoryPage\(page => Math\.min\(historyPageCount, page \+ 1\)\)/);
});