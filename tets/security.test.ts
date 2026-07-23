import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessAdminPermission,
  hashPassword,
  isAllowedRequestOrigin,
  normalizeUsername,
  toPublicAdminAccount,
  validatePassword,
  validateUsername,
  verifyPassword
} from "../api/security.js";

test("password hashes are salted and verifiable", async () => {
  const password = "Vovinam2026!";
  const first = await hashPassword(password);
  const second = await hashPassword(password);

  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.deepEqual(
    await verifyPassword({ passwordHash: first }, password),
    { valid: true, needsMigration: false }
  );
  assert.equal((await verifyPassword({ passwordHash: first }, "wrong-password")).valid, false);
});

test("legacy plaintext passwords are accepted only for migration", async () => {
  assert.deepEqual(
    await verifyPassword({ password: "legacy123" }, "legacy123"),
    { valid: true, needsMigration: true }
  );
  assert.equal((await verifyPassword({ password: "legacy123" }, "nope")).valid, false);
});

test("public account metadata never exposes credentials", () => {
  const publicAccount = toPublicAdminAccount({
    id: "admin",
    username: " ADMIN ",
    passwordHash: "scrypt-v1$secret$sensitive",
    role: "super",
    name: "Admin",
    permissions: ["articles"],
    credentialVersion: 3
  });

  assert.equal(publicAccount.username, "admin");
  assert.equal(publicAccount.hasPassword, true);
  assert.equal("password" in publicAccount, false);
  assert.equal("passwordHash" in publicAccount, false);
});

test("server-side permissions allow only assigned sections", () => {
  assert.equal(
    canAccessAdminPermission({ role: "assistant", permissions: ["articles"] }, "articles"),
    true
  );
  assert.equal(
    canAccessAdminPermission({ role: "assistant", permissions: ["articles"] }, "members"),
    false
  );
  assert.equal(
    canAccessAdminPermission({ role: "super", permissions: [] }, "webConfig"),
    true
  );
});

test("credential and origin validation reject unsafe input", () => {
  assert.equal(normalizeUsername("  Minh.Admin "), "minh.admin");
  assert.equal(validateUsername("minh.admin"), null);
  assert.ok(validateUsername("Tên có khoảng trắng"));
  assert.equal(validatePassword("Vovinam2026!", "admin"), null);
  assert.ok(validatePassword("123", "admin"));
  assert.equal(isAllowedRequestOrigin("https://example.com", "example.com"), true);
  assert.equal(isAllowedRequestOrigin("https://evil.example", "example.com"), false);
});
