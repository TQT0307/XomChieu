import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const user = fs.readFileSync(new URL('../src/components/UserView.tsx', import.meta.url), 'utf8');
const header = fs.readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../src/components/TrainingRegistrationModal.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');

test('training form opens only from Contact navigation or Contact intersection', () => {
  assert.match(header, /sectionId === 'section-contact'/);
  assert.match(user, /vovinam-open-training-registration/);
  assert.match(user, /IntersectionObserver/);
  assert.doesNotMatch(header, /sectionId !== 'section-contact'[\s\S]*vovinam-open-training-registration/);
});

test('training form contains required identity and club fields plus optional message', () => {
  assert.match(modal, /fullName/); assert.match(modal, /type="email"/);
  assert.match(modal, /clubId/); assert.match(modal, /không bắt buộc/);
  assert.match(modal, /trainingDays/); assert.match(modal, /trainingHours/); assert.match(modal, /club\.address/);
  assert.match(modal, /e\.target===e\.currentTarget/); assert.match(modal, /aria-label="Đóng form đăng ký"/);
});

test('registration API stores a signed one-time approval and emails both parties', () => {
  assert.match(api, /TRAINING_REGISTRATION_RECIPIENT = "vovinamxomchieu@gmail.com"/);
  assert.match(api, /signRegistrationConfirmation/); assert.match(api, /timingSafeEqual/);
  assert.match(api, /status === "approved"/); assert.match(api, /registration\.email/);
  assert.match(api, /RESEND_API_KEY/); assert.match(api, /requireSameOrigin/);
});

test('confirmation email uses the requested compact success message', () => {
  assert.match(api, /Xác nhận đăng ký thành công/);
  assert.match(api, /Nhớ tới tập đúng giờ nhé/);
  assert.match(api, /registration\.trainingDays/);
  assert.match(api, /registration\.trainingHours/);
  assert.match(api, /registration\.address/);
});
