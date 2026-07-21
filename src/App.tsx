import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UserView from './components/UserView';
import AdminPanel from './components/AdminPanel';
import ArticleDetailModal from './components/ArticleDetailModal';
import HighlightDetailModal from './components/HighlightDetailModal';
import ClubDetailModal from './components/ClubDetailModal';
import TournamentDetailModal from './components/TournamentDetailModal';
import AchievementDetailModal from './components/AchievementDetailModal';

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

// Zip generator helper
import { downloadAspNetAndSqlZip } from './aspnetGenerator';

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
  const [activeNavSection, setActiveNavSection] = useState('section-about');
  const [hasLoadedServerData, setHasLoadedServerData] = useState(false);

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

  // Load and poll state from central server API for real-time updates
  useEffect(() => {
    let isMounted = true;

    const fetchServerData = () => {
      fetch('/api/data')
        .then(res => {
          if (!res.ok) throw new Error("Server response not OK");
          return res.json();
        })
        .then(data => {
          if (!isMounted) return;
          if (data) {
            // Update the reference before setting React state to block write loops
            lastServerDataRef.current = {
              categories: data.categories,
              articles: data.articles,
              members: data.members,
              coaches: data.coaches,
              achievements: data.achievements,
              tournaments: data.tournaments,
              clubs: data.clubs,
              highlights: data.highlights,
              webConfig: data.webConfig,
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
                if (JSON.stringify(data.webConfig) !== JSON.stringify(prev)) {
                  return data.webConfig;
                }
                return prev;
              });
            }
          }
          setHasLoadedServerData(true);
        })
        .catch(err => {
          if (!isMounted) return;
          console.warn("Failed to fetch shared database from server API, using local fallback:", err);
          setHasLoadedServerData(true);
        });
    };

    // Initial load
    fetchServerData();

    // Poll every 4 seconds for real-time synchronization across devices
    const intervalId = setInterval(fetchServerData, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // Run exactly once on mount to establish a single stable polling interval

  // Detail Modal selection states
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Helper to save safely to localStorage to avoid QuotaExceededError crashes
  const safeSetItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Không thể lưu ${key} vào localStorage do giới hạn dung lượng trình duyệt (đầy bộ nhớ)!`, e);
    }
  };

  // Helper to sync state changes to production API
  const syncKeyWithServer = (key: string, data: any) => {
    if (!hasLoadedServerData) return;
    pendingSyncsRef.current[key] = Date.now();
    lastServerDataRef.current[key] = data;

    fetch('/api/save-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, data })
    })
    .then(res => {
      if (!res.ok) console.error(`Failed to sync ${key} with server API`);
    })
    .catch(err => {
      console.error(`Network error syncing ${key} to server API:`, err);
    });
  };

  // Synchronize with server and localStorage on change (only if changed locally)
  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_categories', categories);
    
    // Only write back to server if this change did NOT come from a server sync
    const isDifferent = JSON.stringify(categories) !== JSON.stringify(lastServerDataRef.current.categories);
    if (isDifferent) {
      syncKeyWithServer('categories', categories);
    }
  }, [categories, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_articles', articles);
    
    const isDifferent = JSON.stringify(articles) !== JSON.stringify(lastServerDataRef.current.articles);
    if (isDifferent) {
      syncKeyWithServer('articles', articles);
    }
  }, [articles, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_members', members);
    
    const isDifferent = JSON.stringify(members) !== JSON.stringify(lastServerDataRef.current.members);
    if (isDifferent) {
      syncKeyWithServer('members', members);
    }
  }, [members, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_coaches', coaches);
    
    const isDifferent = JSON.stringify(coaches) !== JSON.stringify(lastServerDataRef.current.coaches);
    if (isDifferent) {
      syncKeyWithServer('coaches', coaches);
    }
  }, [coaches, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_achievements', achievements);
    
    const isDifferent = JSON.stringify(achievements) !== JSON.stringify(lastServerDataRef.current.achievements);
    if (isDifferent) {
      syncKeyWithServer('achievements', achievements);
    }
  }, [achievements, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_tournaments', tournaments);
    
    const isDifferent = JSON.stringify(tournaments) !== JSON.stringify(lastServerDataRef.current.tournaments);
    if (isDifferent) {
      syncKeyWithServer('tournaments', tournaments);
    }
  }, [tournaments, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_clubs', clubs);
    
    const isDifferent = JSON.stringify(clubs) !== JSON.stringify(lastServerDataRef.current.clubs);
    if (isDifferent) {
      syncKeyWithServer('clubs', clubs);
    }
  }, [clubs, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_highlights', highlights);
    
    const isDifferent = JSON.stringify(highlights) !== JSON.stringify(lastServerDataRef.current.highlights);
    if (isDifferent) {
      syncKeyWithServer('highlights', highlights);
    }
  }, [highlights, hasLoadedServerData]);

  useEffect(() => {
    if (!hasLoadedServerData) return;
    safeSetItem('vovinam_webConfig', webConfig);
    
    const isDifferent = JSON.stringify(webConfig) !== JSON.stringify(lastServerDataRef.current.webConfig);
    if (isDifferent) {
      syncKeyWithServer('webConfig', webConfig);
    }
  }, [webConfig, hasLoadedServerData]);

  // Export full project to ASP.NET MVC + SQL server script Zip file
  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
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
          <AdminPanel 
            categories={categories}
            setCategories={setCategories}
            articles={articles}
            setArticles={setArticles}
            members={members}
            setMembers={setMembers}
            coaches={coaches}
            setCoaches={setCoaches}
            achievements={achievements}
            setAchievements={setAchievements}
            tournaments={tournaments}
            setTournaments={setTournaments}
            clubs={clubs}
            setClubs={setClubs}
            highlights={highlights}
            setHighlights={setHighlights}
            webConfig={webConfig}
            setWebConfig={setWebConfig}
            onBackToWebsite={() => setIsAdmin(false)}
          />
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

    </div>
  );
}
