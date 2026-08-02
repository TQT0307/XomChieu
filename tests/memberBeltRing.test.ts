import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');
const memberModal = fs.readFileSync(new URL('../src/components/MemberDetailModal.tsx', import.meta.url), 'utf8');
const coachModal = fs.readFileSync(new URL('../src/components/CoachDetailModal.tsx', import.meta.url), 'utf8');

test('coach and member cards use a faint belt ring that becomes clear on hover', () => {
  assert.equal((user.match(/coach-avatar-ring/g) || []).length, 2);
  assert.equal((user.match(/member-avatar-ring/g) || []).length, 2);
  assert.equal((user.match(/getBeltAvatarRingClass\((?:coach|m)\.rank\)/g) || []).length, 4);
  assert.match(user, /border-\[#0054A6\]\/35 group-hover:border-\[#0054A6\]/);
  assert.match(user, /border-\[#FFF200\]\/40 group-hover:border-\[#FFF200\]/);
  assert.match(user, /border-\[#EE1C24\]\/35 group-hover:border-\[#EE1C24\]/);
  assert.doesNotMatch(user, /getMemberBeltHoverBorder/);
});

test('coach and member details keep a strong avatar ring matching the belt', () => {
  assert.match(memberModal, /memberBeltRingClass/);
  assert.match(memberModal, /memberBeltDetails\.beltColor/);
  assert.match(coachModal, /coachBeltRingClass/);
  assert.match(coachModal, /coachBeltDetails\.beltColor/);
  assert.match(coachModal, /border-4 bg-transparent/);
  assert.match(memberModal, /border-4 bg-transparent/);
  assert.doesNotMatch(coachModal, /bg-slate-950 p-1 shadow-xl/);
  assert.doesNotMatch(memberModal, /bg-slate-950 p-1 shadow-xl/);
  assert.doesNotMatch(coachModal, /from-\[#FFF200\] to-orange-400/);
});

test('member cards expose the same persistent detail action style as coach cards', () => {
  assert.equal((user.match(/Xem chi tiết thành viên →/g) || []).length, 2);
  assert.match(user, /group-hover:text-\[#FFF200\] group-hover:bg-\[#0054A6\]/);
  assert.doesNotMatch(user, /Hồ sơ chi tiết →/);
});