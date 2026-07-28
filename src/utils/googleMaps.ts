const createSearchEmbedUrl = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

export const buildGoogleMapsEmbedUrl = (configuredUrl: string | undefined, fallbackQuery: string) => {
  const fallback = createSearchEmbedUrl(fallbackQuery);
  let rawUrl = String(configuredUrl || '').trim();
  if (!rawUrl) return fallback;

  const iframeSource = rawUrl.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
  if (iframeSource) rawUrl = iframeSource;

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isGoogleMapsHost =
      hostname === 'maps.google.com' ||
      hostname === 'www.google.com' ||
      hostname.endsWith('.google.com');

    if (!isGoogleMapsHost) return fallback;
    if (
      parsed.pathname.includes('/maps/embed') ||
      parsed.searchParams.get('output') === 'embed'
    ) {
      return parsed.href;
    }

    const configuredQuery =
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('query') ||
      fallbackQuery;
    return createSearchEmbedUrl(configuredQuery);
  } catch {
    return fallback;
  }
};
