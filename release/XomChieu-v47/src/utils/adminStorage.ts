import type { AdminAccount, EditHistory } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const parseStoredAdminAccount = (
  rawValue: string | null
): AdminAccount | null => {
  if (!rawValue) return null;
  try {
    const value = JSON.parse(rawValue);
    if (!isRecord(value) || typeof value.username !== 'string') return null;

    const role =
      value.role === 'super'
        ? 'super'
        : value.role === 'assistant' || value.role === 'sub'
          ? 'assistant'
          : null;
    if (!role) return null;

    return {
      id: typeof value.id === 'string' ? value.id : value.username,
      username: value.username,
      name: typeof value.name === 'string' ? value.name : value.username,
      role,
      permissions: Array.isArray(value.permissions)
        ? value.permissions.filter(
            (permission): permission is string => typeof permission === 'string'
          )
        : []
    };
  } catch {
    return null;
  }
};

export const parseStoredEditHistories = (
  rawValue: string | null
): EditHistory[] | null => {
  if (!rawValue) return null;
  try {
    const value = JSON.parse(rawValue);
    if (!Array.isArray(value)) return null;

    return value.filter((entry): entry is EditHistory =>
      isRecord(entry) &&
      typeof entry.id === 'number' &&
      typeof entry.timestamp === 'string' &&
      typeof entry.username === 'string' &&
      (entry.role === 'super' || entry.role === 'assistant') &&
      typeof entry.action === 'string' &&
      typeof entry.tab === 'string' &&
      typeof entry.details === 'string'
    );
  } catch {
    return null;
  }
};
