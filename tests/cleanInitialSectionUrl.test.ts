import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const userView = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const header = fs.readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');

test('a clean public entry URL stays hash-free until a menu item is clicked', () => {
  assert.match(userView, /if \(!window\.location\.hash\) return;/);
  assert.match(header, /pushState\(\{ vovinamSection: sectionId \}, '', nextHash\)/);
});

test('returning from Admin opens the clean public root URL', () => {
  assert.match(app, /handleBackToWebsite[\s\S]*?replaceState\([\s\S]*?'\/'[\s\S]*?\);/);
});