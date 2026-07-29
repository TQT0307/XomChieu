import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('AdminPanel does not shadow the native Map constructor with a UI icon', async () => {
  const source = await readFile(
    new URL('../src/components/AdminPanel.tsx', import.meta.url),
    'utf8'
  );

  assert.doesNotMatch(source, /\bMap\s*,[^}]*\}\s*from\s*['"]lucide-react['"]/s);
});
