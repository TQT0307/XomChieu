type SmartSearchValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SmartSearchValue[];

const collectSearchValues = (value: SmartSearchValue): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectSearchValues);
  if (value === null || value === undefined) return [];
  return [String(value)];
};

/**
 * Makes Vietnamese search forgiving:
 * - ignores upper/lower case and accents;
 * - treats punctuation as spaces;
 * - lets users enter remembered fragments in any order.
 */
export const normalizeSmartSearchText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const matchesSmartSearch = (
  query: string,
  ...values: SmartSearchValue[]
): boolean => {
  const normalizedQuery = normalizeSmartSearchText(query);
  if (!normalizedQuery) return true;

  const keywords = normalizedQuery.split(' ').filter(Boolean);
  const searchableText = normalizeSmartSearchText(
    values.flatMap(collectSearchValues).join(' ')
  );

  return keywords.every(keyword => searchableText.includes(keyword));
};

