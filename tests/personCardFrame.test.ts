import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8');

test('coach and member cards keep a device-scale-safe black frame during hover', () => {
  assert.match(css, /#section-coaches :is\(\.vovinam-depth-card, \.snap-start\)[\s\S]*border: 2px solid #0f172a !important/);
  assert.match(css, /inset 0 0 0 1px #0f172a/);
  assert.match(css, /#section-coaches :is\(\.vovinam-depth-card, \.snap-start\):hover[\s\S]*border-color: #0f172a !important/);
});
