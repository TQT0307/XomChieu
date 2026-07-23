import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UserView from './components/UserView';
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
    if (parsed.logo === '/src/assets/images/h.jpg' || parsed.logo === '/src/assets/images/logo.jpg' || parsed.logo === '/logo_1784192552510.jpg') {
      return { ...parsed, logo: '/logo.jpg' };
    }
    return parsed;
  });

  // Mode & navigation
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Keep the browser tab icon and title synchronized with Admin web settings.
  useEffect(() => {
    const logo = webConfig.logo?.trim() || '/logo.jpg';
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
    document.title = webConfig.seoTitle?.trim() || webConfig.clbName || 'Vovinam Xóm Chiếu';
  }, [webConfig.logo, webConfig.seoTitle, webConfig.clbName]);
  const [activeNavSection, setActiveNavSection] = useState('section-about');
  const [hasLoadedServerData, setHasLoadedServerData] = useState(false);
  const hasLoadedServerDataRef = useRef(false);

  // Keep track of the last fetched server data to prevent infinite syncing loops
  const lastServerDataRef = useRef<Partial<Record<SyncKey, any>>>({});
  const latestStateRef = useRef<Partial<Record<SyncKey, any>>>({});
  const serverKeyVersionsRef = useRef<Record<string, number>>({});
  const syncQueuesRef = useRef<Record<string, {
    running: boolean;
    queuedData?: any;
  }>>({});

  // Track timestamps of the last local write of each key to prevent overwriting with older server polling replies
  const pendingSyncsRef = useRef<Record<string, number>>({});
  const initialSyncCompletedRef = useRef(false);
  const localStorageTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Only state setters passed to AdminPanel are allowed to mark cloud data as
  // dirty. Server polling, initial bundled data, and ordinary visitors must
  // never write anything back to Firebase.
  const adminDirtyKeysRef = useRef<Set<string>>(new Set());

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
            '/logo_1784192552510.jpg',
            '/src/assets/images/h.jpg',
            '/src/assets/images/logo.jpg'
          ]);
          const serverLogo = String(incomingData?.logo || '').trim();
          const currentLogo = String(previous.logo || '').trim();
          const shouldKeepCurrentLogo =
            defaultLogoPaths.has(serverLogo) &&
            currentLogo.length > 0 &&
            !defaultLogoPaths.has(currentLogo);
          const nextValue = shouldKeepCurrentLogo
            ? { ...(incomingData || {}), logo: currentLogo }
            : incomingData || {};
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
  const [selectedClubCoach, setSelectedClubCoach] = useState<Coach | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

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
    const queue = syncQueuesRef.current[key] || { running: false };
    queue.queuedData = data;
    syncQueuesRef.current[key] = queue;
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
          const normalizedData = await externalizeInlineImages(dataToSave);
          const response = await fetch('/api/save-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key,
              data: normalizedData,
              baseVersion: Number(serverKeyVersionsRef.current[key] || 0)
            })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const message = payload.message || payload.error || `Không thể đồng bộ ${key} (${response.status})`;
            throw new Error(message);
          }

          const savedData = payload.data ?? normalizedData;
          lastServerDataRef.current[key] = savedData;
          serverKeyVersionsRef.current[key] = Number(payload.keyVersion || payload.lastUpdated || Date.now());
          localStorage.setItem('vovinam_last_updated', String(payload.lastUpdated || Date.now()));
          localStorage.setItem('vovinam_sync_broadcast', JSON.stringify({
            key,
            lastUpdated: payload.lastUpdated || Date.now()
          }));

          // Do not replace a newer edit that was queued while an image upload or
          // network request was still running.
          if (queue.queuedData === undefined && latestStateRef.current[key] === dataToSave) {
            adminDirtyKeysRef.current.delete(key);
            if (savedData !== dataToSave) applyServerKeyData(key, savedData);
          }
          window.dispatchEvent(new CustomEvent('vovinam-sync-success', {
            detail: { key, lastUpdated: payload.lastUpdated || Date.now() }
          }));
        }
      } catch (error) {
        console.error(`Network error syncing ${key} to server API:`, error);
        localStorage.setItem('vovinam_last_updated', '0');
        window.dispatchEvent(new CustomEvent('vovinam-sync-error', {
          detail: {
            key,
            message: error instanceof Error ? error.message : String(error)
          }
        }));
      } finally {
        queue.running = false;
        delete pendingSyncsRef.current[key];
        // An edit may have arrived between the final loop check and cleanup.
        if (queue.queuedData !== undefined) {
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
            onBackToWebsite={() => setIsAdmin(false)}
          />
          </Suspense>
        ) : (
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
            onSelectArticle={setSelectedArticle}
            onSelectHighlight={setSelectedHighlight}
            onSelectClub={setSelectedClub}
            onSelectTournament={setSelectedTournament}
            onSelectAchievement={setSelectedAchievement}
            activeNavSection={activeNavSection}
            setActiveNavSection={setActiveNavSection}
          />
        )}
      </main>

      {/* Article Detail View Modal */}
      <Suspense fallback={null}>
      <ArticleDetailModal 
        article={selectedArticle}
        categories={categories}
        onClose={() => setSelectedArticle(null)}
      />

      {/* Highlight Details Carousel/Gallery Modal */}
      <HighlightDetailModal 
        highlight={selectedHighlight}
        onClose={() => setSelectedHighlight(null)}
      />

      {/* Club Details with Embedded Interactive Map Modal */}
      <ClubDetailModal 
        club={selectedClub}
        coaches={coaches}
        onClose={() => setSelectedClub(null)}
        onSelectCoach={(coach) => {
          setSelectedClub(null);
          setSelectedClubCoach(coach);
        }}
      />

      <CoachDetailModal
        coach={selectedClubCoach}
        clubs={clubs}
        achievements={achievements}
        onClose={() => setSelectedClubCoach(null)}
        onSelectAchievement={(achievement) => {
          setSelectedClubCoach(null);
          setSelectedAchievement(achievement);
        }}
      />

      {/* Tournament Details Modal */}
      <TournamentDetailModal 
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />

      {/* Achievement Details Modal */}
      <AchievementDetailModal 
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
      </Suspense>

    </div>
  );
}
