import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../src/components/MemberDetailModal.tsx', import.meta.url), 'utf8');

test('member cards use a white idle ring and belt-colored hover ring in both layouts', () => {
  assert.equal((user.match(/member-avatar-ring/g) || []).length, 2);
  assert.match(user, /border-2 border-white/);
  assert.match(user, /getMemberBeltHoverBorder\(m\.rank\)/);
  assert.match(user, /group-hover:border-\[#0054A6\]/);
  assert.match(user, /group-hover:border-\[#FFF200\]/);
  assert.match(user, /group-hover:border-\[#EE1C24\]/);
});

test('member detail keeps the avatar ring in the member belt color', () => {
  assert.match(modal, /memberBeltRingClass/);
  assert.match(modal, /border-4/);
  assert.match(modal, /memberBeltDetails\.beltColor/);
});

test('member cards expose the same persistent detail action style as coach cards', () => {
  assert.equal((user.match(/Xem chi tiết thành viên →/g) || []).length, 2);
  assert.match(user, /group-hover:text-\[#FFF200\] group-hover:bg-\[#0054A6\]/);
  assert.doesNotMatch(user, /Hồ sơ chi tiết →/);
});