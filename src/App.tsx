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

export default function App() {
  // Load state from localStorage if exists, otherwise fall back to initialData
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('vovinam_categories');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('vovinam_articles');
    return saved ? JSON.parse(saved) : initialArticles;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('vovinam_members');
    return saved ? JSON.parse(saved) : initialMembers;
  });

  const [coaches, setCoaches] = useState<Coach[]>(() => {
    const saved = localStorage.getItem('vovinam_coaches');
    return saved ? JSON.parse(saved) : initialCoaches;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('vovinam_achievements');
    return saved ? JSON.parse(saved) : initialAchievements;
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('vovinam_tournaments');
    return saved ? JSON.parse(saved) : initialTournaments;
  });

  const [clubs, setClubs] = useState<Club[]>(() => {
    const saved = localStorage.getItem('vovinam_clubs');
    return saved ? JSON.parse(saved) : initialClubs;
  });

  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    const saved = localStorage.getItem('vovinam_highlights');
    return saved ? JSON.parse(saved) : initialHighlights;
  });

  const [webConfig, setWebConfig] = useState<WebConfig>(() => {
    const saved = localStorage.getItem('vovinam_webConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.logo === '/src/assets/images/h.jpg' || parsed.logo === '/src/assets/images/logo.jpg' || parsed.logo === '/logo_1784192552510.jpg') {
          parsed.logo = '/logo.jpg';
        }
        return parsed;
      } catch (e) {
        return initialWebConfig;
      }
    }
    return initialWebConfig;
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
  const lastServerDataRef = useRef<{
    categories?: any;
    articles?: any;
    members?: any;
    coaches?: any;
    achievements?: any;
    tournaments?: any;
    clubs?: any;
    highlights?: any;
    webConfig?: any;
  }>({});

  // Track timestamps of the last local write of each key to prevent overwriting with older server polling replies
  const pendingSyncsRef = useRef<Record<string, number>>({});
  const initialSyncCompletedRef = useRef(false);
  const localStorageTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Only state setters passed to AdminPanel are allowed to mark cloud data as
  // dirty. Server polling, initial bundled data, and ordinary visitors must
  // never write anything back to Firebase.
  const adminDirtyKeysRef = useRef<Set<string>>(new Set());

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
        .then(statusOrData => {
          if (!isMounted || !statusOrData) return;

          const prefetchedData = isInitialLoad ? statusOrData : null;
          
          const serverUpdated = statusOrData.lastUpdated || 0;
          const savedTimestampStr = localStorage.getItem('vovinam_last_updated');
          const localUpdated = savedTimestampStr ? parseInt(savedTimestampStr, 10) : 0;

          // If the server data hasn't changed since our last update, and we have already
          // loaded server data at least once in this session, skip the heavy fetch!
          if (hasLoadedServerDataRef.current && localUpdated === serverUpdated && serverUpdated > 0) {
            return;
          }

          // 2. Fetch the full heavy data only if there's a mismatch or it's the initial fetch
          const changedKey = !isInitialLoad && typeof statusOrData.changedKey === 'string'
            ? statusOrData.changedKey
            : '';
          return (prefetchedData
            ? Promise.resolve(prefetchedData)
            : changedKey
              ? fetch(`/api/key/${encodeURIComponent(changedKey)}`, { cache: 'no-store' }).then(res => {
                  if (!res.ok) throw new Error("Changed resource response not OK");
                  return res.json().then(payload => ({ [payload.key]: payload.data, lastUpdated: serverUpdated }));
                })
              : fetch('/api/data', { cache: 'no-store' }).then(res => {
                  if (!res.ok) throw new Error("Full server response not OK");
                  return res.json();
                }))
            .then(data => {
              if (!isMounted || !data) return;

              // The shared cloud database is authoritative. Stale localStorage in a
              // visitor's browser must never overwrite data created by an admin.

              // Update the reference before setting React state to block write loops
              lastServerDataRef.current = {
                ...lastServerDataRef.current,
                ...(data.categories !== undefined ? { categories: data.categories } : {}),
                ...(data.articles !== undefined ? { articles: data.articles } : {}),
                ...(data.members !== undefined ? { members: data.members } : {}),
                ...(data.coaches !== undefined ? { coaches: data.coaches } : {}),
                ...(data.achievements !== undefined ? { achievements: data.achievements } : {}),
                ...(data.tournaments !== undefined ? { tournaments: data.tournaments } : {}),
                ...(data.clubs !== undefined ? { clubs: data.clubs } : {}),
                ...(data.highlights !== undefined ? { highlights: data.highlights } : {}),
                ...(data.webConfig !== undefined ? { webConfig: data.webConfig } : {}),
              };

              const isKeyPending = (key: string) => {
                const lastWrite = pendingSyncsRef.current[key] || 0;
                return Date.now() - lastWrite < 5000; // Ignore server updates for 5 seconds after a local write
              };

              // Use functional state updates to compare against the absolute latest state
              if (data.categories && !isKeyPending('categories')) {
                setCategories(prev => {
                  if (JSON.stringify(data.categories) !== JSON.stringify(prev)) {
                    return data.categories;
                  }
                  return prev;
                });
              }
              if (data.articles && !isKeyPending('articles')) {
                setArticles(prev => {
                  if (JSON.stringify(data.articles) !== JSON.stringify(prev)) {
                    return data.articles;
                  }
                  return prev;
                });
              }
              if (data.members && !isKeyPending('members')) {
                setMembers(prev => {
                  if (JSON.stringify(data.members) !== JSON.stringify(prev)) {
                    return data.members;
                  }
                  return prev;
                });
              }
              if (data.coaches && !isKeyPending('coaches')) {
                setCoaches(prev => {
                  if (JSON.stringify(data.coaches) !== JSON.stringify(prev)) {
                    return data.coaches;
                  }
                  return prev;
                });
              }
              if (data.achievements && !isKeyPending('achievements')) {
                setAchievements(prev => {
                  if (JSON.stringify(data.achievements) !== JSON.stringify(prev)) {
                    return data.achievements;
                  }
                  return prev;
                });
              }
              if (data.tournaments && !isKeyPending('tournaments')) {
                setTournaments(prev => {
                  if (JSON.stringify(data.tournaments) !== JSON.stringify(prev)) {
                    return data.tournaments;
                  }
                  return prev;
                });
              }
              if (data.clubs && !isKeyPending('clubs')) {
                setClubs(prev => {
                  if (JSON.stringify(data.clubs) !== JSON.stringify(prev)) {
                    return data.clubs;
                  }
                  return prev;
                });
              }
              if (data.highlights && !isKeyPending('highlights')) {
                setHighlights(prev => {
                  if (JSON.stringify(data.highlights) !== JSON.stringify(prev)) {
                    return data.highlights;
                  }
                  return prev;
                });
              }
              if (data.webConfig && !isKeyPending('webConfig')) {
                setWebConfig(prev => {
                  const defaultLogoPaths = new Set([
                    '',
                    '/logo.jpg',
                    '/logo_1784192552510.jpg',
                    '/src/assets/images/h.jpg',
                    '/src/assets/images/logo.jpg'
                  ]);
                  const serverLogo = String(data.webConfig.logo || '').trim();
                  const currentLogo = String(prev.logo || '').trim();
                  const serverHasOnlyDefaultLogo = defaultLogoPaths.has(serverLogo);
                  const currentHasCustomLogo = currentLogo.length > 0 && !defaultLogoPaths.has(currentLogo);

                  // A deploy or an older frontend must not replace an uploaded logo
                  // with the bundled placeholder. Keep the last real logo and the
                  // normal sync effect will persist it back to the cloud.
                  const nextWebConfig = serverHasOnlyDefaultLogo && currentHasCustomLogo
                    ? { ...data.webConfig, logo: currentLogo }
                    : data.webConfig;

                  if (JSON.stringify(nextWebConfig) !== JSON.stringify(prev)) {
                    return nextWebConfig;
                  }
                  return prev;
                });
              }

              localStorage.setItem('vovinam_last_updated', serverUpdated.toString());
              initialSyncCompletedRef.current = true;
              setHasLoadedServerData(true);
              hasLoadedServerDataRef.current = true;
            });
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

    // Keep the free Firestore quota safe. The previous 1.5-second loop could use
    // more than 50,000 reads/day from one long-running tab. Admin saves are
    // optimistic, while visitors receive updates within at most one minute.
    const scheduleNextPoll = () => {
      pollTimer = setTimeout(async () => {
        await fetchServerData();
        if (isMounted) scheduleNextPoll();
      }, document.hidden ? 300000 : 60000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchServerData();
    };

    scheduleNextPoll();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchServerData);

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchServerData);
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
    localStorageTimersRef.current[key] = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Không thể lưu ${key} vào localStorage do giới hạn dung lượng trình duyệt (đầy bộ nhớ)!`, e);
      } finally {
        delete localStorageTimersRef.current[key];
      }
    }, 100);
  };

  // Helper to sync state changes to production API
  const syncKeyWithServer = (key: string, data: any) => {
    if (!hasLoadedServerData || !initialSyncCompletedRef.current) return;
    pendingSyncsRef.current[key] = Date.now();
    lastServerDataRef.current[key] = data;

    const now = Date.now();
    localStorage.setItem('vovinam_last_updated', now.toString());

    fetch('/api/save-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, data })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to sync ${key} with server API (${res.status})`);
      } else {
        return res.json();
      }
    })
    .then(payload => {
      if (payload && payload.lastUpdated) {
        localStorage.setItem('vovinam_last_updated', payload.lastUpdated.toString());
      }
      adminDirtyKeysRef.current.delete(key);
    })
    .catch(err => {
      console.error(`Network error syncing ${key} to server API:`, err);
      delete pendingSyncsRef.current[key];
      localStorage.setItem('vovinam_last_updated', '0');
      window.dispatchEvent(new CustomEvent('vovinam-sync-error', { detail: { key } }));
    });
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
