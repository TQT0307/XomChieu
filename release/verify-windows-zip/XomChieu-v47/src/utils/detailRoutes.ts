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

const DETAIL_KINDS = new Set<DetailKind>(
  Object.keys(DETAIL_SECTION_BY_KIND) as DetailKind[]
);

export const buildDetailHash = (kind: DetailKind, id: string | number) =>
  `#${DETAIL_SECTION_BY_KIND[kind]}/detail/${kind}/${encodeURIComponent(String(id))}`;

export const parseDetailHash = (hash: string): DetailRoute | null => {
  const normalized = String(hash || '').replace(/^#/, '');
  const [sectionId, marker, rawKind, ...rawIdParts] = normalized.split('/');
  if (marker !== 'detail' || rawIdParts.length === 0) return null;

  const kind = rawKind as DetailKind;
  if (!DETAIL_KINDS.has(kind) || DETAIL_SECTION_BY_KIND[kind] !== sectionId) {
    return null;
  }

  try {
    const id = decodeURIComponent(rawIdParts.join('/')).trim();
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

export const pushDetailRoute = (kind: DetailKind, id: string | number) => {
  const nextHash = buildDetailHash(kind, id);
  if (window.location.hash === nextHash) return;
  window.history.pushState(
    { ...(window.history.state || {}), vovinamDetail: { kind, id: String(id) } },
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
