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
const SECTION_BROWSER_TITLES: Record<string, string> = {
  'section-about': 'Giới thiệu',
  'section-news': 'Tin tức',
  'section-tournaments': 'Giải đấu',
  'section-highlights': 'Highlights',
  'section-achievements': 'Thành tích',
  'section-coaches': 'Huấn luyện viên',
  'section-members': 'Môn sinh',
  'section-clubs': 'Điểm tập',
  'section-contact': 'Liên hệ',
};

export const formatSectionBrowserTitle = (
  sectionId?: string,
  isAdmin = false
): string => {
  const sectionTitle = isAdmin
    ? 'Quản trị'
    : SECTION_BROWSER_TITLES[sectionId || ''] || 'Giới thiệu';
  return `Vovinam Xóm Chiếu - ${sectionTitle}`;
};
