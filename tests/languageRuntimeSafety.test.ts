import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const boundary = fs.readFileSync(new URL('../src/components/PublicErrorBoundary.tsx', import.meta.url), 'utf8');

test('Google Translate loads only for English and guards React DOM updates', () => {
  assert.match(header, /if \(language !== 'en'\) return/);
  assert.match(header, /installGoogleTranslateReactSafety/);
  assert.match(header, /child\?\.parentNode !== this/);
  assert.match(header, /referenceNode\.parentNode !== this/);
  assert.doesNotMatch(header, /setLanguage\(nextLanguage\)/);
});

test('language switching gives feedback and public runtime errors recover without a white page', () => {
  assert.match(header, /isLanguageSwitching/);
  assert.match(header, /Đang chuyển sang English/);
  assert.match(app, /<PublicErrorBoundary>/);
  assert.match(boundary, /Khôi phục tiếng Việt/);
  assert.match(boundary, /vovinam_language', 'vi'/);
});