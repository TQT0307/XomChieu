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


test('Gmail SMTP is preferred and Resend remains a fallback', () => {
  assert.match(api, /process\.env\.GMAIL_USER/);
  assert.match(api, /process\.env\.GMAIL_APP_PASSWORD/);
  assert.match(api, /nodemailer\.createTransport/);
  assert.match(api, /service: "gmail"/);
  assert.match(api, /process\.env\.RESEND_API_KEY/);
  assert.match(api, /info\?\.accepted/);
  assert.match(api, /không chấp nhận người nhận/);
  assert.match(api, /text: plainText/);
  assert.match(api, /envelope: \{ from: gmailUser, to: \[recipient\] \}/);
  assert.match(api, /sender: \{ name: senderName, address: gmailUser \}/);
  assert.match(api, /Auto-Submitted/);
  assert.match(api, /miền đã xác minh/);
});


test('form closes after a successful registration but stays open on failure', () => {
  assert.match(modal, /window\.setTimeout\(\(\)=>\{[\s\S]*onClose\(\)\}, 3000\)/);
  assert.match(modal, /if\(!r\.ok\)throw new Error/);
});


test('confirmation page accepts an optional admin reply and GET does not approve', () => {
  assert.match(api, /NỘI DUNG PHẢN HỒI/);
  assert.match(api, /name="replyMessage"/);
  assert.match(api, /app\.post\("\/api\/training-registrations\/:id\/confirm"/);
  const getStart = api.indexOf('app.get("/api/training-registrations/:id/confirm"');
  const postStart = api.indexOf('app.post("/api/training-registrations/:id/confirm"');
  assert.ok(getStart >= 0 && postStart > getStart);
  assert.doesNotMatch(api.slice(getStart, postStart), /status: "approved"/);
  assert.match(api.slice(postStart), /replyMessage/);
});

test('modal focus initialization does not rerun when parent callback identity changes', () => {
  assert.match(modal, /\}, \[isOpen\]\);/);
  assert.doesNotMatch(modal, /\[isOpen,onClose\]/);
});

test('confirmation email presents the registrant name as a highlighted badge', () => {
  assert.match(api, /font-size:24px/);
  assert.match(api, /escapeEmailHtml\(registration\.fullName\)/);
  assert.match(api, /LỜI NHẮN TỪ VOVINAM XÓM CHIẾU/);
});
test('failed confirmation email can be retried safely', () => {
  const retryGuard = /registration\.status === \"approved\" && registration\.notificationSent === true/g;
  assert.equal((api.match(retryGuard) || []).length, 2);
  assert.match(api, /notificationSent: false/);
  assert.match(api, /notificationSent: true/);
});
test('registration spam protection is shared across serverless instances', () => {
  assert.match(api, /consumeRegistrationRateLimit/);
  assert.match(api, /hasVercelKv/);
  assert.match(api, /kv\.incr\(key\)/);
  assert.match(api, /REGISTRATION_RATE_WINDOW_SECONDS/);
  assert.match(api, /Retry-After/);
});
test('confirmed registration link shows approved status and full form details', () => {
  assert.match(api, /renderConfirmedRegistrationDetails/);
  assert.match(api, /ĐÃ XÁC NHẬN/);
  assert.match(api, /Nội dung đăng ký/);
  assert.match(api, /registration\.trainingDays/);
  assert.match(api, /registration\.trainingHours/);
});

test('successful registration remains visible before the form closes', () => {
  assert.match(modal, /\\u0110\\u0103ng k\\u00fd th\\u00e0nh c\\u00f4ng/);
  assert.match(modal, /3000/);
  assert.match(modal, /setResult\(null\);onClose\(\)/);
});
test('Gmail dark mode keeps confirmation text readable', () => {
  assert.match(api, /gmail-blend-screen/);
  assert.match(api, /gmail-blend-difference/);
  assert.match(api, /-webkit-text-fill-color:#0054A6/);
  assert.match(api, /font-size:24px;font-style:normal;font-weight:900/);
  assert.match(api, /-webkit-text-fill-color:#ffffff/);
  assert.match(api, /-webkit-text-fill-color:#003b73/);
  assert.match(api, /prefers-color-scheme: dark/);
  assert.match(api, /data-ogsc/);
});