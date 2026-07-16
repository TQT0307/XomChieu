import React, { useState, useEffect } from 'react';
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
    return saved ? JSON.parse(saved) : initialWebConfig;
  });

  // Mode & navigation
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState('section-about');

  // Detail Modal selection states
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Synchronize with localStorage on change
  useEffect(() => {
    localStorage.setItem('vovinam_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('vovinam_articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('vovinam_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('vovinam_coaches', JSON.stringify(coaches));
  }, [coaches]);

  useEffect(() => {
    localStorage.setItem('vovinam_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('vovinam_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('vovinam_clubs', JSON.stringify(clubs));
  }, [clubs]);

  useEffect(() => {
    localStorage.setItem('vovinam_highlights', JSON.stringify(highlights));
  }, [highlights]);

  useEffect(() => {
    localStorage.setItem('vovinam_webConfig', JSON.stringify(webConfig));
  }, [webConfig]);

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
