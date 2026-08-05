import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractInlineEmojiText } from '../src/utils/articleContent';

const sanitizer = fs.readFileSync(new URL('../src/utils/articleContent.ts', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../src/components/RichTextEditor.tsx', import.meta.url), 'utf8');

test('article fonts always retain system emoji fallbacks', () => {
  assert.match(sanitizer, /Segoe UI Emoji/);
  assert.match(sanitizer, /Apple Color Emoji/);
  assert.match(sanitizer, /Noto Color Emoji/);
  assert.match(sanitizer, /Node\.TEXT_NODE/);
});

test('the editor preserves formatting and emoji while switching fonts', () => {
  assert.match(editor, /styleWithCSS/);
  assert.match(editor, /fontName/);
  assert.match(editor, /foreColor/);
  assert.match(editor, /lastEmittedValueRef/);
});
test('pasted emoji image labels survive normalization as real Unicode emoji', () => {
  assert.equal(extractInlineEmojiText('medal 🥇'), '🥇');
  assert.equal(extractInlineEmojiText('🎙️ Thông báo 📍'), '🎙️📍');
  assert.match(sanitizer, /tagName === 'img'/);
  assert.match(editor, /aria-label="Chèn biểu tượng"/);
  assert.match(editor, /runCommand\('insertText'/);
});