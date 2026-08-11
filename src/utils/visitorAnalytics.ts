const VISITOR_STORAGE_KEY = 'vovinam_anonymous_visitor';
const SESSION_STORAGE_KEY = 'vovinam_anonymous_session';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

const createAnonymousId = () => {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}_${random}_${random}`;
};

const getOrCreateId = (storage: Storage, key: string) => {
  try {
    const existing = storage.getItem(key);
    if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
    const created = createAnonymousId();
    storage.setItem(key, created);
    return created;
  } catch {
    return createAnonymousId();
  }
};

const currentSection = () => {
  const section = window.location.hash.match(/^#(section-[a-z-]+)/i)?.[1];
  return section ? `#${section.toLowerCase()}` : '#section-about';
};

const sendAnalyticsEvent = (
  visitorId: string,
  sessionId: string,
  event: 'pageview' | 'heartbeat'
) => {
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      visitorId,
      sessionId,
      event,
      path: currentSection(),
      language: navigator.language || 'vi',
      referrer: document.referrer || ''
    })
  }).catch(() => {
    // Analytics is intentionally best-effort and cannot interrupt the website.
  });
};

export function startVisitorAnalytics() {
  if (typeof window === 'undefined' || window.location.hash.startsWith('#admin')) {
    return () => undefined;
  }
  const visitorId = getOrCreateId(window.localStorage, VISITOR_STORAGE_KEY);
  const sessionId = getOrCreateId(window.sessionStorage, SESSION_STORAGE_KEY);
  let lastSection = '';
  let lastSentAt = 0;

  const trackPageview = () => {
    const section = currentSection();
    if (section === lastSection) return;
    lastSection = section;
    lastSentAt = Date.now();
    sendAnalyticsEvent(visitorId, sessionId, 'pageview');
  };
  const heartbeat = () => {
    if (document.visibilityState !== 'visible') return;
    lastSentAt = Date.now();
    sendAnalyticsEvent(visitorId, sessionId, 'heartbeat');
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastSentAt >= HEARTBEAT_INTERVAL_MS) {
      heartbeat();
    }
  };

  trackPageview();
  const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  window.addEventListener('hashchange', trackPageview, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('hashchange', trackPageview);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
