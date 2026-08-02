export type DetailKind =
  | 'article'
  | 'tournament'
  | 'highlight'
  | 'achievement'
  | 'coach'
  | 'member'
  | 'club';

export interface DetailRoute {
  kind: DetailKind;
  /** Public slug for new links; an internal ID only when reading a legacy link. */
  id: string;
  sectionId: string;
}

export const DETAIL_SECTION_BY_KIND: Record<DetailKind, string> = {
  article: 'section-news',
  tournament: 'section-tournaments',
  highlight: 'section-highlights',
  achievement: 'section-achievements',
  coach: 'section-coaches',
  member: 'section-members',
  club: 'section-clubs',
};

const PUBLIC_PATH_BY_KIND: Record<DetailKind, string> = {
  article: 'bai-viet',
  tournament: 'giai-dau',
  highlight: 'highlight',
  achievement: 'thanh-tich',
  coach: 'huan-luyen-vien',
  member: 'mon-sinh',
  club: 'cau-lac-bo',
};

const DETAIL_KINDS = new Set<DetailKind>(Object.keys(DETAIL_SECTION_BY_KIND) as DetailKind[]);
const DETAIL_KIND_BY_PUBLIC_PATH = Object.fromEntries(
  Object.entries(PUBLIC_PATH_BY_KIND).map(([kind, path]) => [path, kind])
) as Record<string, DetailKind>;

export const toPublicDetailSlug = (value: string | number) => {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'chi-tiet';
};

export const matchesDetailIdentifier = (
  identifier: string,
  internalId: string | number,
  publicLabel: string
) => String(internalId) === identifier || toPublicDetailSlug(publicLabel) === identifier;

export const buildDetailHash = (kind: DetailKind, publicLabel: string | number) =>
  `#${DETAIL_SECTION_BY_KIND[kind]}/${PUBLIC_PATH_BY_KIND[kind]}/${encodeURIComponent(toPublicDetailSlug(publicLabel))}`;

export const parseDetailHash = (hash: string): DetailRoute | null => {
  const parts = String(hash || '').replace(/^#/, '').split('/');
  const sectionId = parts[0];

  // Keep bookmarked links made before public slugs working.
  if (parts[1] === 'detail') {
    const kind = parts[2] as DetailKind;
    if (!DETAIL_KINDS.has(kind) || DETAIL_SECTION_BY_KIND[kind] !== sectionId || parts.length < 4) return null;
    try {
      const id = decodeURIComponent(parts.slice(3).join('/')).trim();
      return id ? { kind, id, sectionId } : null;
    } catch {
      return null;
    }
  }

  const kind = DETAIL_KIND_BY_PUBLIC_PATH[parts[1]];
  if (!kind || DETAIL_SECTION_BY_KIND[kind] !== sectionId || parts.length < 3) return null;
  try {
    const id = decodeURIComponent(parts.slice(2).join('/')).trim();
    return id ? { kind, id, sectionId } : null;
  } catch {
    return null;
  }
};

export const getSectionIdFromHash = (hash: string) => {
  const detailRoute = parseDetailHash(hash);
  if (detailRoute) return detailRoute.sectionId;
  return String(hash || '').replace(/^#/, '').split('/')[0];
};

export const pushDetailRoute = (kind: DetailKind, publicLabel: string | number) => {
  const nextHash = buildDetailHash(kind, publicLabel);
  if (window.location.hash === nextHash) return;
  window.history.pushState(
    { ...(window.history.state || {}), vovinamDetail: { kind, slug: toPublicDetailSlug(publicLabel) } },
    '',
    nextHash
  );
};

export const closeDetailRoute = (kind: DetailKind) => {
  const sectionId = DETAIL_SECTION_BY_KIND[kind];
  window.history.replaceState(
    { ...(window.history.state || {}), vovinamSection: sectionId, vovinamDetail: null },
    '',
    `#${sectionId}`
  );
};