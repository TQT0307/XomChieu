export const ADMIN_HASH = '#admin';

export const isAdminHash = (hash: string): boolean =>
  /^#\/?admin(?:-login)?\/?$/i.test(hash.trim());
