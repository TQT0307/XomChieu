import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UserView from './components/UserView';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import PublicErrorBoundary from './components/PublicErrorBoundary';
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ArticleDetailModal = lazy(() => import('./components/ArticleDetailModal'));
const HighlightDetailModal = lazy(() => import('./components/HighlightDetailModal'));
const ClubDetailModal = lazy(() => import('./components/ClubDetailModal'));
const TournamentDetailModal = lazy(() => import('./components/TournamentDetailModal'));
const AchievementDetailModal = lazy(() => import('./components/AchievementDetailModal'));
const CoachDetailModal = lazy(() => import('./components/CoachDetailModal'));

// Initial Mock data
import {
  initialCategories,
  initialArticles,
  initialMembers,
  initialCoaches,
  initialAchievements,
  initialTournaments,
  initialClubs,
  initialHighlights,
  initialWebConfig
} from './initialData';

// Types
import { Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig } from './types';
import { externalizeInlineImages } from './mediaSync';
import {
  closeDetailRoute,
  DetailKind,
  parseDetailHash,
  pushDetailRoute,
  matchesDetailIdentifier,
} from './utils/detailRoutes';
import { mergeConcurrentKeyData } from './utils/syncConflictMerge';
import { formatBrowserTitle } from './utils/browserTitle';
import { isAdminHash } from './utils/adminRoute';
import { warmImageCache } from './utils/imageWarmup';

type SyncKey =
  | 'categories'
  | 'articles'
  | 'members'
  | 'coaches'
  | 'achievements'
  | 'tournaments'
  | 'clubs'
  | 'highlights'
  | 'webConfig';

const SYNC_KEYS: SyncKey[] = [
  'categories',
  'articles',
  'members',
  'coaches',
  'achievements',
  'tournaments',
  'clubs',
  'highlights',
  'webConfig'
];

const readCachedValue = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch (error) {
    console.warn(`Dữ liệu tạm ${key} bị lỗi và đã được bỏ qua.`, error);
    localStorage.removeItem(key);
    return fallback;
  }
};

export default function App() {
  // Load state from localStorage if exists, otherwise fall back to initialData
  const [categories, setCategories] = useState<Category[]>(() =>
    readCachedValue('vovinam_categories', initialCategories)
  );
  const [articles, setArticles] = useState<Article[]>(() =>
    readCachedValue('vovinam_articles', initialArticles)
  );
  const [members, setMembers] = useState<Member[]>(() =>
    readCachedValue('vovinam_members', initialMembers)
  );
  const [coaches, setCoaches] = useState<Coach[]>(() =>
    readCachedValue('vovinam_coaches', initialCoaches)
  );
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    readCachedValue('vovinam_achievements', initialAchievements)
  );
  const [tournaments, setTournaments] = useState<Tournament[]>(() =>
    readCachedValue('vovinam_tournaments', initialTournaments)
  );
  const [clubs, setClubs] = useState<Club[]>(() =>
    readCachedValue('vovinam_clubs', initialClubs)
  );
  const [highlights, setHighlights] = useState<Highlight[]>(() =>
    readCachedValue('vovinam_highlights', initialHighlights)
  );

  const [webConfig, setWebConfig] = useState<WebConfig>(() => {
    const parsed = readCachedValue<WebConfig>('vovinam_webConfig', initialWebConfig);
    if (parsed.logo === '/src/assets/images/h.jpg' || parsed.logo === '/src/assets/images/logo.jpg' || parsed.logo === '/logo_1784192552510.jpg' || parsed.logo === '/logo.jpg') {
      return { ...parsed, logo: '/logo-sharp.png' };
    }
    return parsed;
  });

  // Start important images as soon as cached/server data is available. The hero
  // wins bandwidth first; remaining thumbnails warm in a small background pool.
  useEffect(() => {
    const bannerImages = (webConfig.banners || []).map(banner => banner.image);
    void warmImageCache([webConfig.logo, bannerImages[0], bannerImages[1]], 3);

    const backgroundTimer = window.setTimeout(() => {
      void warmImageCache([
        ...articles.slice(0, 6).map(item => item.image),
        ...tournaments.slice(0, 4).map(item => item.image),
        ...highlights.slice(0, 6).flatMap(item => [item.thumbnail, ...(item.mediaUrls || []).slice(0, 1)]),
        ...achievements.slice(0, 6).map(item => item.image),
        ...clubs.slice(0, 4).map(item => item.image),
        ...coaches.slice(0, 8).map(item => item.photo),
        ...members.slice(0, 8).map(item => item.photo)
      ], 3);
    }, 350);

    return () => window.clearTimeout(backgroundTimer);
  }, [webConfig.logo, webConfig.banners, articles, tournaments, highlights, achievements, clubs, coaches, members]);

  // Mode & navigation
  const [isAdmin, setIsAdmin] = useState(() => isAdminHash(window.location.hash));
  const [isDownloading, setIsDownloading] = useState(false);

  // Keep the browser tab icon and title synchronized with Admin web settings.
  useEffect(() => {
    const logo = webConfig.logo?.trim() || '/logo-sharp.png';
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = logo;

    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = logo;
    document.title = formatBrowserTitle(webConfig.seoTitle, webConfig.clbName);
  }, [webConfig.logo, webConfig.seoTitle, webConfig.clbName]);
  const [activeNavSection, setActiveNavSection] = useState('section-about');

  useEffect(() => {
    const openAdminFromDirectUrl = () => {
      if (isAdminHash(window.location.hash)) setIsAdmin(true);
    };
    window.addEventListener('hashchange', openAdminFromDirectUrl);
    openAdminFromDirectUrl();
    return () => window.removeEventListener('hashchange', openAdminFromDirectUrl);
  }, []);
  const [hasLoadedServerData, setHasLoadedServerData] = useState(false);
  const hasLoadedServerDataRef = useRef(false);

  // Keep track of the last fetched server data to prevent infinite syncing loops
  const lastServerDataRef = useRef<Partial<Record<SyncKey, any>>>({});
  const latestStateRef = useRef<Partial<Record<SyncKey, any>>>({});
  const serverKeyVersionsRef = useRef<Record<string, number>>({});
  const syncQueuesRef = useRef<Record<string, {
    running: boolean;
    queuedData?: any;
    retryCount?: number;
    retryTimer?: ReturnType<typeof setTimeout>;
  }>>({});

  // Track timestamps of the last local write of each key to prevent overwriting with older server polling replies
  const pendingSyncsRef = useRef<Record<string, number>>({});
  const initialSyncCompletedRef = useRef(false);
  const localStorageTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Only state setters passed to AdminPanel are allowed to mark cloud data as
  // dirty. Server polling, initial bundled data, and ordinary visitors must
  // never write anything back to Firebase.
  const adminDirtyKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => () => {
    Object.keys(localStorageTimersRef.current).forEach(key => {
      clearTimeout(localStorageTimersRef.current[key]);
    });
    Object.keys(syncQueuesRef.current).forEach(key => {
      const queue = syncQueuesRef.current[key];
      if (queue.retryTimer) clearTimeout(queue.retryTimer);
    });
  }, []);

  const applyServerKeyData = (key: SyncKey, incomingData: any, force = false) => {
    lastServerDataRef.current[key] = incomingData;
    const updateIfChanged = <T,>(
      setter: React.Dispatch<React.SetStateAction<T>>,
      nextValue: T
    ) => {
      setter(previous => force || JSON.stringify(previous) !== JSON.stringify(nextValue) ? nextValue : previous);
    };

    switch (key) {
      case 'categories': updateIfChanged(setCategories, incomingData || []); break;
      case 'articles': updateIfChanged(setArticles, incomingData || []); break;
      case 'members': updateIfChanged(setMembers, incomingData || []); break;
      case 'coaches': updateIfChanged(setCoaches, incomingData || []); break;
      case 'achievements': updateIfChanged(setAchievements, incomingData || []); break;
      case 'tournaments': updateIfChanged(setTournaments, incomingData || []); break;
      case 'clubs': updateIfChanged(setClubs, incomingData || []); break;
      case 'highlights': updateIfChanged(setHighlights, incomingData || []); break;
      case 'webConfig':
        setWebConfig(previous => {
          const defaultLogoPaths = new Set([
            '',
            '/logo.jpg',
            '/logo-sharp.png',
            '/logo_1784192552510.jpg',
            '/src/assets/images/h.jpg',
            '/src/assets/images/logo.jpg'
          ]);
          const rawServerLogo = String(incomingData?.logo || '').trim();
          const serverLogo = defaultLogoPaths.has(rawServerLogo)
            ? '/logo-sharp.png'
            : rawServerLogo;
          const currentLogo = String(previous.logo || '').trim();
          const shouldKeepCurrentLogo =
            defaultLogoPaths.has(serverLogo) &&
            currentLogo.length > 0 &&
            !defaultLogoPaths.has(currentLogo);
          const nextValue = shouldKeepCurrentLogo
            ? { ...(incomingData || {}), logo: currentLogo }
            : { ...(incomingData || {}), logo: serverLogo };
          lastServerDataRef.current.webConfig = nextValue;
          return force || JSON.stringify(previous) !== JSON.stringify(nextValue) ? nextValue : previous;
        });
        break;
    }
  };

  // Load and poll state from central server API for real-time updates
  useEffect(() => {
    let isMounted = true;
    let requestInFlight = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchServerData = () => {
      if (requestInFlight) return Promise.resolve();
      requestInFlight = true;

      // On the first visit, fetch the complete state immediately instead of
      // waiting for a timestamp request and then making a second round trip.
      const isInitialLoad = !hasLoadedServerDataRef.current;
      return fetch(isInitialLoad ? '/api/data' : '/api/timestamp', { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error("Timestamp endpoint not available");
          return res.json();
        })
        .then(async statusOrData => {
          if (!isMounted || !statusOrData) return;

          const serverUpdated = Number(statusOrData.lastUpdated || 0);
          const remoteVersions = statusOrData.keyVersions && typeof statusOrData.keyVersions === 'object'
            ? statusOrData.keyVersions as Record<string, number>
            : {};
          let data: any = statusOrData;

          if (!isInitialLoad) {
            const changedKeys = SYNC_KEYS.filter(key =>
              Number(remoteVersions[key] || 0) > Number(serverKeyVersionsRef.current[key] || 0)
            );

            if (changedKeys.length === 0) {
              const localUpdated = Number(localStorage.getItem('vovinam_last_updated') || 0);
              if (localUpdated === serverUpdated && serverUpdated > 0) return;
              const changedKey = typeof statusOrData.changedKey === 'string'
                ? statusOrData.changedKey as SyncKey
                : null;
              if (changedKey && SYNC_KEYS.includes(changedKey)) changedKeys.push(changedKey);
            }

            if (changedKeys.length > 0) {
              const payloads = await Promise.all(changedKeys.map(async key => {
                const response = await fetch(`/api/key/${encodeURIComponent(key)}`, { cache: 'no-store' });
                if (!response.ok) throw new Error(`Changed resource ${key} response not OK`);
                return response.json();
              }));
              data = { lastUpdated: serverUpdated, keyVersions: remoteVersions };
              payloads.forEach(payload => {
                if (SYNC_KEYS.includes(payload.key)) {
                  data[payload.key] = payload.data;
                  if (payload.keyVersion) data.keyVersions[payload.key] = payload.keyVersion;
                }
              });
            } else {
              const response = await fetch('/api/data', { cache: 'no-store' });
              if (!response.ok) throw new Error('Full server response not OK');
              data = await response.json();
            }
          }

          if (!isMounted || !data) return;
          const isKeyPending = (key: string) => {
            const lastWrite = pendingSyncsRef.current[key] || 0;
            return Date.now() - lastWrite < 15000;
          };

          SYNC_KEYS.forEach(key => {
            if (data[key] !== undefined && !isKeyPending(key)) {
              applyServerKeyData(key, data[key], isInitialLoad);
            }
          });

          serverKeyVersionsRef.current = {
            ...serverKeyVersionsRef.current,
            ...(data.keyVersions || remoteVersions)
          };
          localStorage.setItem('vovinam_last_updated', String(data.lastUpdated || serverUpdated));
          initialSyncCompletedRef.current = true;
          setHasLoadedServerData(true);
          hasLoadedServerDataRef.current = true;
        })
        .catch(err => {
          if (!isMounted) return;
          console.warn("Failed to fetch shared database from server API, using local fallback:", err);
          // Read failure is NOT a successful initial sync. Keeping this false is
          // critical: otherwise bundled/default data can be written over the real
          // Firebase database after a deploy or a temporary network timeout.
          initialSyncCompletedRef.current = false;
          setHasLoadedServerData(true);
          hasLoadedServerDataRef.current = false;
        })
        .finally(() => {
          requestInFlight = false;
        });
    };

    // Initial load
    fetchServerData();

    // Poll only the tiny Redis/Firebase metadata document. Actual collections
    // are fetched only when their version changed.
    const scheduleNextPoll = () => {
      pollTimer = setTimeout(async () => {
        await fetchServerData();
        if (isMounted) scheduleNextPoll();
      }, document.hidden ? 120000 : 12000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchServerData();
    };
    const handleCrossTabSync = (event: StorageEvent) => {
      if (event.key === 'vovinam_sync_broadcast') fetchServerData();
    };

    scheduleNextPoll();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchServerData);
    window.addEventListener('storage', handleCrossTabSync);

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchServerData);
      window.removeEventListener('storage', handleCrossTabSync);
    };
  }, []); // Run exactly once on mount to establish a single stable polling interval

  // Detail Modal selection states
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const countedArticleRouteRef = useRef<string | null>(null);

  // Helper to save safely to localStorage to avoid QuotaExceededError crashes
  const safeSetItem = (key: string, value: any) => {
    // Images can be large base64 strings. Serializing them synchronously in every
    // state effect blocks the admin UI, so coalesce writes and run after React paints.
    if (localStorageTimersRef.current[key]) {
      clearTimeout(localStorageTimersRef.current[key]);
    }
    const staggerDelay = 250 + Object.keys(localStorageTimersRef.current).length * 80;
    localStorageTimersRef.current[key] = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Không thể lưu ${key} vào localStorage do giới hạn dung lượng trình duyệt (đầy bộ nhớ)!`, e);
      } finally {
        delete localStorageTimersRef.current[key];
      }
    }, staggerDelay);
  };

  // Helper to sync state changes to production API
  const syncKeyWithServer = (key: SyncKey, data: any) => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    latestStateRef.current[key] = data;
    const queue = syncQueuesRef.current[key] || { running: false, retryCount: 0 };
    queue.queuedData = data;
    syncQueuesRef.current[key] = queue;
    if (queue.retryTimer) {
      clearTimeout(queue.retryTimer);
      queue.retryTimer = undefined;
    }
    if (queue.running) return;

    queue.running = true;
    void (async () => {
      try {
        while (queue.queuedData !== undefined) {
          const dataToSave = queue.queuedData;
          queue.queuedData = undefined;
          pendingSyncsRef.current[key] = Date.now();

          // Upload inline images first. The following JSON save then contains
          // short URLs instead of megabytes of base64 data.
          let normalizedData = await externalizeInlineImages(dataToSave);
          let conflictBase = lastServerDataRef.current[key];
          let payload: any = {};
          let conflictResolved = false;

          for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await fetch('/api/save-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key,
                data: normalizedData,
                baseVersion: Number(serverKeyVersionsRef.current[key] || 0)
              })
            });
            payload = await response.json().catch(() => ({}));

            if (response.status === 409 && attempt < 2) {
              const latestResponse = await fetch(`/api/key/${encodeURIComponent(key)}`, {
                cache: 'no-store'
              });
              const latestPayload = await latestResponse.json().catch(() => ({}));
              if (!latestResponse.ok || latestPayload.data === undefined) {
                throw new Error(
                  latestPayload.message
                  || latestPayload.error
                  || `Không thể tải dữ liệu ${key} mới nhất để hợp nhất.`
                );
              }

              normalizedData = mergeConcurrentKeyData(
                conflictBase,
                normalizedData,
                latestPayload.data
              );
              conflictBase = latestPayload.data;
              lastServerDataRef.current[key] = latestPayload.data;
              serverKeyVersionsRef.current[key] = Number(
                latestPayload.keyVersion || payload.currentVersion || 0
              );
              conflictResolved = true;
              continue;
            }

            if (!response.ok) {
              const message = payload.message || payload.error || `Không thể đồng bộ ${key} (${response.status})`;
              throw new Error(message);
            }
            break;
          }

           const savedData = payload.data ?? normalizedData;
          queue.retryCount = 0;
          lastServerDataRef.current[key] = savedData;
          serverKeyVersionsRef.current[key] = Number(payload.keyVersion || payload.lastUpdated || Date.now());
          localStorage.setItem('vovinam_last_updated', String(payload.lastUpdated || Date.now()));
          localStorage.setItem('vovinam_sync_broadcast', JSON.stringify({
            key,
            lastUpdated: payload.lastUpdated || Date.now()
          }));

          // Do not replace a newer edit that was queued while an image upload or
          // network request was still running.
          if (queue.queuedData !== undefined) {
            // A second local edit arrived while the first request was being
            // merged/saved. Rebase that edit onto the newly saved snapshot so
            // it cannot accidentally remove concurrent remote additions.
            queue.queuedData = mergeConcurrentKeyData(
              dataToSave,
              queue.queuedData,
              savedData
            );
            latestStateRef.current[key] = queue.queuedData;
          } else if (latestStateRef.current[key] === dataToSave) {
            adminDirtyKeysRef.current.delete(key);
            if (savedData !== dataToSave) applyServerKeyData(key, savedData);
          }
          window.dispatchEvent(new CustomEvent('vovinam-sync-success', {
            detail: {
              key,
              lastUpdated: payload.lastUpdated || Date.now(),
              conflictResolved
            }
          }));
        }
      } catch (error) {
        console.error(`Network error syncing ${key} to server API:`, error);
        localStorage.setItem('vovinam_last_updated', '0');
        // Keep the newest unsaved Admin state and retry with bounded exponential
        // backoff. A temporary Firebase/Redis/network failure must not silently
        // discard the edit after the UI has already shown it locally.
        const retryData = latestStateRef.current[key];
        if (retryData !== undefined) queue.queuedData = retryData;
        queue.retryCount = Number(queue.retryCount || 0) + 1;
        if (queue.queuedData !== undefined && queue.retryCount <= 5) {
          const retryDelay = Math.min(15000, 1000 * (2 ** (queue.retryCount - 1)));
          queue.retryTimer = setTimeout(() => {
            queue.retryTimer = undefined;
            const pendingData = queue.queuedData;
            queue.queuedData = undefined;
            if (pendingData !== undefined) syncKeyWithServer(key, pendingData);
          }, retryDelay);
        }
        window.dispatchEvent(new CustomEvent('vovinam-sync-error', {
          detail: {
            key,
            message: error instanceof Error ? error.message : String(error),
            retrying: Boolean(queue.retryTimer),
            retryCount: queue.retryCount
          }
        }));
      } finally {
        queue.running = false;
        delete pendingSyncsRef.current[key];
        // An edit may have arrived between the final loop check and cleanup.
        if (queue.queuedData !== undefined && !queue.retryTimer) {
          const pendingData = queue.queuedData;
          queue.queuedData = undefined;
          syncKeyWithServer(key, pendingData);
        }
      }
    })();
  };

  // Synchronize with server and localStorage on change (only if changed locally)
  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_categories', categories);
    
    // Only write back to server if this change did NOT come from a server sync
    const isDifferent = adminDirtyKeysRef.current.has('categories') && categories !== lastServerDataRef.current.categories;
    if (isDifferent) {
      syncKeyWithServer('categories', categories);
    }
  }, [categories, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_articles', articles);
    
    const isDifferent = adminDirtyKeysRef.current.has('articles') && articles !== lastServerDataRef.current.articles;
    if (isDifferent) {
      syncKeyWithServer('articles', articles);
    }
  }, [articles, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_members', members);
    
    const isDifferent = adminDirtyKeysRef.current.has('members') && members !== lastServerDataRef.current.members;
    if (isDifferent) {
      syncKeyWithServer('members', members);
    }
  }, [members, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_coaches', coaches);
    
    const isDifferent = adminDirtyKeysRef.current.has('coaches') && coaches !== lastServerDataRef.current.coaches;
    if (isDifferent) {
      syncKeyWithServer('coaches', coaches);
    }
  }, [coaches, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_achievements', achievements);
    
    const isDifferent = adminDirtyKeysRef.current.has('achievements') && achievements !== lastServerDataRef.current.achievements;
    if (isDifferent) {
      syncKeyWithServer('achievements', achievements);
    }
  }, [achievements, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_tournaments', tournaments);
    
    const isDifferent = adminDirtyKeysRef.current.has('tournaments') && tournaments !== lastServerDataRef.current.tournaments;
    if (isDifferent) {
      syncKeyWithServer('tournaments', tournaments);
    }
  }, [tournaments, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_clubs', clubs);
    
    const isDifferent = adminDirtyKeysRef.current.has('clubs') && clubs !== lastServerDataRef.current.clubs;
    if (isDifferent) {
      syncKeyWithServer('clubs', clubs);
    }
  }, [clubs, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_highlights', highlights);
    
    const isDifferent = adminDirtyKeysRef.current.has('highlights') && highlights !== lastServerDataRef.current.highlights;
    if (isDifferent) {
      syncKeyWithServer('highlights', highlights);
    }
  }, [highlights, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    safeSetItem('vovinam_webConfig', webConfig);
    
    const isDifferent = adminDirtyKeysRef.current.has('webConfig') && webConfig !== lastServerDataRef.current.webConfig;
    if (isDifferent) {
      syncKeyWithServer('webConfig', webConfig);
    }
  }, [webConfig, hasLoadedServerData]);

  // Export full project to ASP.NET MVC + SQL server script Zip file
  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      // JSZip and the large source generator are only downloaded when an admin
      // explicitly requests an export, never during a normal visitor page load.
      const { downloadAspNetAndSqlZip } = await import('./aspnetGenerator');
      const blob = await downloadAspNetAndSqlZip(
        categories,
        articles,
        members,
        coaches,
        achievements,
        tournaments,
        clubs,
        highlights,
        webConfig
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${webConfig.clbName.toLowerCase().replace(/\s+/g, '_')}_solution.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to bundle project ZIP', err);
      alert('Đã xảy ra lỗi khi tạo gói nén nguồn!');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectArticle = (article: Article) => {
    const articleId = String(article.id);
    const optimisticViews = Math.max(0, Number(article.views) || 0) + 1;

    // Show the new count immediately. This visitor-side update is deliberately
    // not marked as an Admin edit; only the dedicated atomic API persists it.
    setSelectedArticle({ ...article, views: optimisticViews });
    setArticles(current => current.map(item =>
      String(item.id) === articleId
        ? { ...item, views: Math.max(0, Number(item.views) || 0) + 1 }
        : item
    ));

    void fetch('/api/article-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: article.id })
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || payload.error || 'Không thể ghi nhận lượt xem');
        }

        const confirmedViews = Math.max(0, Number(payload.views) || 0);
        setArticles(current => current.map(item =>
          String(item.id) === articleId
            ? { ...item, views: Math.max(Number(item.views) || 0, confirmedViews) }
            : item
        ));
        setSelectedArticle(current =>
          current && String(current.id) === articleId
            ? { ...current, views: Math.max(Number(current.views) || 0, confirmedViews) }
            : current
        );

        if (payload.keyVersion) {
          serverKeyVersionsRef.current.articles = Math.max(
            Number(serverKeyVersionsRef.current.articles || 0),
            Number(payload.keyVersion)
          );
        }
        if (payload.lastUpdated) {
          localStorage.setItem(
            'vovinam_last_updated',
            String(Math.max(
              Number(localStorage.getItem('vovinam_last_updated') || 0),
              Number(payload.lastUpdated)
            ))
          );
        }
      })
      .catch(error => {
        // Keep the article readable if the counter service is temporarily
        // unavailable; normal polling will reconcile the displayed count.
        console.warn('Không thể đồng bộ lượt xem bài viết:', error);
      });
  };

  const openArticleDetail = (article: Article) => {
    countedArticleRouteRef.current = `article:${String(article.id)}`;
    pushDetailRoute('article', article.title);
    handleSelectArticle(article);
  };

  const openHighlightDetail = (highlight: Highlight) => {
    pushDetailRoute('highlight', highlight.title);
    setSelectedHighlight(highlight);
  };

  const openClubDetail = (club: Club) => {
    pushDetailRoute('club', club.name);
    setSelectedClub(club);
  };

  const openTournamentDetail = (tournament: Tournament) => {
    pushDetailRoute('tournament', tournament.name);
    setSelectedTournament(tournament);
  };

  const openAchievementDetail = (achievement: Achievement) => {
    pushDetailRoute('achievement', achievement.title);
    setSelectedAchievement(achievement);
  };

  const openCoachDetail = (coach: Coach) => {
    pushDetailRoute('coach', coach.fullName);
    setSelectedCoach(coach);
  };

  const closeSelectedDetail = (
    kind: DetailKind,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    closeDetailRoute(kind);
    setter(null);
  };

  useEffect(() => {
    if (isAdmin) return;

    const syncDetailFromUrl = () => {
      const route = parseDetailHash(window.location.hash);
      if (!route) {
        countedArticleRouteRef.current = null;
        setSelectedArticle(null);
        setSelectedHighlight(null);
        setSelectedClub(null);
        setSelectedCoach(null);
        setSelectedTournament(null);
        setSelectedAchievement(null);
        return;
      }

      setActiveNavSection(route.sectionId);

      if (route.kind !== 'article') setSelectedArticle(null);
      if (route.kind !== 'highlight') setSelectedHighlight(null);
      if (route.kind !== 'club') setSelectedClub(null);
      if (route.kind !== 'coach') setSelectedCoach(null);
      if (route.kind !== 'tournament') setSelectedTournament(null);
      if (route.kind !== 'achievement') setSelectedAchievement(null);

      switch (route.kind) {
        case 'article': {
          const article = articles.find(
            item => matchesDetailIdentifier(route.id, item.id, item.title) && item.status !== false
          );
          const routeKey = `article:${route.id}`;
          if (article && countedArticleRouteRef.current !== routeKey) {
            countedArticleRouteRef.current = routeKey;
            handleSelectArticle(article);
          }
          break;
        }
        case 'highlight':
          setSelectedHighlight(
            highlights.find(item => matchesDetailIdentifier(route.id, item.id, item.title) && item.status !== false) || null
          );
          break;
        case 'club':
          setSelectedClub(
            clubs.find(item => matchesDetailIdentifier(route.id, item.id, item.name) && item.status !== false) || null
          );
          break;
        case 'coach':
          setSelectedCoach(
            coaches.find(item => matchesDetailIdentifier(route.id, item.id, item.fullName) && item.status !== false) || null
          );
          break;
        case 'tournament':
          setSelectedTournament(
            tournaments.find(item => matchesDetailIdentifier(route.id, item.id, item.name)) || null
          );
          break;
        case 'achievement':
          setSelectedAchievement(
            achievements.find(item => matchesDetailIdentifier(route.id, item.id, item.title) && item.status !== false) || null
          );
          break;
        case 'member':
          // Member detail state is owned by UserView, which uses the same URL parser.
          break;
      }
    };

    window.addEventListener('popstate', syncDetailFromUrl);
    window.addEventListener('hashchange', syncDetailFromUrl);
    syncDetailFromUrl();
    return () => {
      window.removeEventListener('popstate', syncDetailFromUrl);
      window.removeEventListener('hashchange', syncDetailFromUrl);
    };
  }, [isAdmin, articles, highlights, clubs, coaches, tournaments, achievements]);

  const handleBackToWebsite = () => {
    setIsAdmin(false);
    window.history.replaceState(
      { vovinamSection: 'section-about' },
      '',
      '#section-about'
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      
      {/* Universal header applying the Vibrant Vovinam Theme */}
      <Header 
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        webConfig={webConfig}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
        activeNavSection={activeNavSection}
        setActiveNavSection={setActiveNavSection}
      />

      {/* Primary views */}
      <main className="flex-1">
        {isAdmin ? (
          <AdminErrorBoundary onBackToWebsite={handleBackToWebsite}>
          <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-[#0054A6]">Đang tải trang quản trị...</div>}>
          <AdminPanel 
            categories={categories}
            setCategories={update => {
              adminDirtyKeysRef.current.add('categories');
              setCategories(update);
            }}
            articles={articles}
            setArticles={update => {
              adminDirtyKeysRef.current.add('articles');
              setArticles(update);
            }}
            members={members}
            setMembers={update => {
              adminDirtyKeysRef.current.add('members');
              setMembers(update);
            }}
            coaches={coaches}
            setCoaches={update => {
              adminDirtyKeysRef.current.add('coaches');
              setCoaches(update);
            }}
            achievements={achievements}
            setAchievements={update => {
              adminDirtyKeysRef.current.add('achievements');
              setAchievements(update);
            }}
            tournaments={tournaments}
            setTournaments={update => {
              adminDirtyKeysRef.current.add('tournaments');
              setTournaments(update);
            }}
            clubs={clubs}
            setClubs={update => {
              adminDirtyKeysRef.current.add('clubs');
              setClubs(update);
            }}
            highlights={highlights}
            setHighlights={update => {
              adminDirtyKeysRef.current.add('highlights');
              setHighlights(update);
            }}
            webConfig={webConfig}
            setWebConfig={update => {
              adminDirtyKeysRef.current.add('webConfig');
              setWebConfig(update);
            }}
            applyCloudSnapshot={data => {
              SYNC_KEYS.forEach(key => {
                if (data[key] !== undefined) {
                  adminDirtyKeysRef.current.delete(key);
                  applyServerKeyData(key, data[key]);
                }
              });
              serverKeyVersionsRef.current = data.keyVersions || {};
              localStorage.setItem('vovinam_last_updated', String(data.lastUpdated || 0));
            }}
            onBackToWebsite={handleBackToWebsite}
          />
          </Suspense>
          </AdminErrorBoundary>
        ) : (
          <PublicErrorBoundary>
          <UserView 
            categories={categories}
            articles={articles}
            members={members}
            coaches={coaches}
            achievements={achievements}
            tournaments={tournaments}
            clubs={clubs}
            highlights={highlights}
            webConfig={webConfig}
            onSelectArticle={openArticleDetail}
            onSelectHighlight={openHighlightDetail}
            onSelectClub={openClubDetail}
            onSelectTournament={openTournamentDetail}
            onSelectAchievement={openAchievementDetail}
            onSelectCoach={openCoachDetail}
            activeNavSection={activeNavSection}
            setActiveNavSection={setActiveNavSection}
          />
          </PublicErrorBoundary>
        )}
      </main>

      {/* Article Detail View Modal */}
      <Suspense fallback={null}>
      <ArticleDetailModal 
        article={selectedArticle}
        categories={categories}
        onClose={() => closeSelectedDetail('article', setSelectedArticle)}
      />

      {/* Highlight Details Carousel/Gallery Modal */}
      <HighlightDetailModal 
        highlight={selectedHighlight}
        onClose={() => closeSelectedDetail('highlight', setSelectedHighlight)}
      />

      {/* Club Details with Embedded Interactive Map Modal */}
      <ClubDetailModal 
        club={selectedClub}
        coaches={coaches}
        onClose={() => closeSelectedDetail('club', setSelectedClub)}
        onSelectCoach={(coach) => {
          setSelectedClub(null);
          openCoachDetail(coach);
        }}
      />

      <CoachDetailModal
        coach={selectedCoach}
        clubs={clubs}
        achievements={achievements}
        onClose={() => closeSelectedDetail('coach', setSelectedCoach)}
        onSelectClub={(club) => {
          setSelectedCoach(null);
          openClubDetail(club);
        }}
        onSelectAchievement={(achievement) => {
          setSelectedCoach(null);
          openAchievementDetail(achievement);
        }}
      />

      {/* Tournament Details Modal */}
      <TournamentDetailModal 
        tournament={selectedTournament}
        onClose={() => closeSelectedDetail('tournament', setSelectedTournament)}
      />

      {/* Achievement Details Modal */}
      <AchievementDetailModal 
        achievement={selectedAchievement}
        onClose={() => closeSelectedDetail('achievement', setSelectedAchievement)}
      />
      </Suspense>

    </div>
  );
}
