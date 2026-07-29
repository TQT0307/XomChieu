const removeClubPrefix = (value: string): string =>
  value
    .replace(/^\s*CLB[\s:–—-]+/i, '')
    .replace(/^\s*Câu\s+lạc\s+bộ[\s:–—-]+/i, '')
    .trim();

export const formatBrowserTitle = (
  seoTitle?: string,
  clubName?: string
): string => {
  const source = seoTitle?.trim() || clubName?.trim() || 'Vovinam Xóm Chiếu';
  return removeClubPrefix(source) || 'Vovinam Xóm Chiếu';
};

