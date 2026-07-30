import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt-v1";
const PASSWORD_KEY_LENGTH = 64;

export type AdminRole = "super" | "assistant";

export interface StoredAdminAccount {
  id: string;
  username: string;
  password?: string;
  passwordHash?: string;
  role: AdminRole;
  name: string;
  permissions: string[];
  credentialVersion?: number;
}

export interface PublicAdminAccount {
  id: string;
  username: string;
  role: AdminRole;
  name: string;
  permissions: string[];
  hasPassword: boolean;
}

export function normalizeUsername(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    return "Tên đăng nhập phải dài 3-50 ký tự và chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.";
  }
  return null;
}

export function validatePassword(password: string, username = ""): string | null {
  if (password.length < 8) return "Mật khẩu phải dài ít nhất 8 ký tự.";
  if (password.length > 128) return "Mật khẩu không được dài quá 128 ký tự.";
  if (!/[A-Za-zÀ-ỹ]/u.test(password) || !/\d/.test(password)) {
    return "Mật khẩu phải có ít nhất một chữ và một số.";
  }
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return "Mật khẩu không được chứa tên đăng nhập.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH) as Buffer;
  return `${PASSWORD_HASH_PREFIX}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(
  account: Pick<StoredAdminAccount, "password" | "passwordHash">,
  candidate: string
): Promise<{ valid: boolean; needsMigration: boolean }> {
  if (account.passwordHash?.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, saltValue, hashValue] = account.passwordHash.split("$");
    if (!saltValue || !hashValue) return { valid: false, needsMigration: false };
    try {
      const expected = Buffer.from(hashValue, "base64url");
      const actual = await scryptAsync(
        candidate,
        Buffer.from(saltValue, "base64url"),
        expected.length
      ) as Buffer;
      return {
        valid: expected.length === actual.length && timingSafeEqual(expected, actual),
        needsMigration: false
      };
    } catch {
      return { valid: false, needsMigration: false };
    }
  }

  // Compatibility path for accounts created by older releases. A successful
  // login immediately replaces this plaintext value with a scrypt hash.
  if (typeof account.password === "string") {
    const expected = Buffer.from(account.password);
    const actual = Buffer.from(candidate);
    return {
      valid: expected.length === actual.length && timingSafeEqual(expected, actual),
      needsMigration: expected.length === actual.length && timingSafeEqual(expected, actual)
    };
  }

  return { valid: false, needsMigration: false };
}

export function toPublicAdminAccount(account: StoredAdminAccount): PublicAdminAccount {
  return {
    id: String(account.id || ""),
    username: normalizeUsername(account.username),
    role: account.role === "super" ? "super" : "assistant",
    name: String(account.name || "").trim(),
    permissions: Array.isArray(account.permissions)
      ? [...new Set(account.permissions.filter(value => typeof value === "string"))]
      : [],
    hasPassword: Boolean(account.passwordHash || account.password)
  };
}

export function canAccessAdminPermission(
  account: Pick<PublicAdminAccount, "role" | "permissions"> | null | undefined,
  permission: string
): boolean {
  if (!account) return false;
  return account.role === "super" || account.permissions.includes(permission);
}

export function isAllowedRequestOrigin(origin: string, host: string): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
