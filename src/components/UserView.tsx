import React, { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Award, Calendar, MapPin, Play, 
  User, CheckCircle, ShieldCheck, Mail, Phone, Clock, Swords, ExternalLink,
  Info, Newspaper, Send, Sparkles
} from 'lucide-react';
import { 
  Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig, compareTournamentsByStatus, getBeltStyle, getNormalizedTournamentStatus
} from '../types';
import PersonAvatar from './PersonAvatar';
import SmartSearchInput from './SmartSearchInput';
import defaultBanner1 from '../assets/images/banner1.jpg';
import defaultBanner2 from '../assets/images/banner2.jpg';
import defaultBanner3 from '../assets/images/banner3.jpg';
import defaultBanner4 from '../assets/images/banner4.jpg';
import defaultBanner5 from '../assets/images/banner5.jpg';
import { articleContentToPlainText } from '../utils/articleContent';
import { closeDetailRoute, parseDetailHash, pushDetailRoute } from '../utils/detailRoutes';
import {
  compareLatestNewsByExpiry,
  getLatestNewsExpiryMs,
  isArticleInLatestNews
} from '../utils/latestNews';
import { matchesSmartSearch } from '../utils/smartSearch';
import { buildTournamentSearchOptions } from '../utils/tournamentSearchOptions';

const MemberDetailModal = lazy(() => import('./MemberDetailModal'));
const TrainingRegistrationModal = lazy(() => import('./TrainingRegistrationModal'));

const LatestNewsCountdown = ({ expiresAt }: { expiresAt: number }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <div
      className="absolute bottom-2 right-2 z-10 inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-full border border-[#FFF200]/75 bg-gradient-to-r from-[#003b78]/95 via-[#0054A6]/95 to-[#0876c9]/95 py-1 pl-1 pr-2 text-white shadow-[0_8px_20px_rgba(0,84,166,0.45)] backdrop-blur-lg transition-transform hover:scale-105"
      title="Thời gian còn lại trong mục Tin tức mới nhất"
      aria-label={`Còn ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`}
    >
      <span className="pointer-events-none absolute -right-2 -top-3 h-9 w-9 rounded-full bg-[#FFF200]/20 blur-lg" />
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF200] to-orange-500 text-[#003b78] shadow-[0_0_12px_rgba(255,242,0,0.5)]">
        <Clock className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.7} />
      </span>
      <span className="relative whitespace-nowrap font-mono text-[9px] font-black tracking-wide">
        {pad(days)}N&nbsp; {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
      <span className="relative flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-1.5 py-1 text-[5px] font-black uppercase tracking-wider text-[#FFF200]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFF200] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FFF200]" />
        </span>
        Live
      </span>
    </div>
  );
};

const bundledBannerImages: Record<string, string> = {
  '/src/assets/images/banner1.jpg': defaultBanner1,
  '/src/assets/images/banner2.jpg': defaultBanner2,
  '/src/assets/images/banner3.jpg': defaultBanner3,
  '/src/assets/images/banner4.jpg': defaultBanner4,
  '/src/assets/images/banner5.jpg': defaultBanner5,
};

const resolveBannerImage = (image?: string) =>
  (image && bundledBannerImages[image]) || image || defaultBanner1;

const getBannerObjectPosition = (position?: string) => {
  const match = position?.match(/object-\[center_(\d+)%\]/);
  const verticalPercent = match ? Math.min(100, Math.max(0, Number(match[1]))) : 50;
  return `center ${verticalPercent}%`;
};

type SocialPlatform = 'facebook' | 'instagram' | 'threads' | 'tiktok';

const normalizeSocialUrl = (platform: SocialPlatform, value?: string) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  if (rawValue.startsWith('//')) return `https:${rawValue}`;

  const cleanValue = rawValue.replace(/^@/, '').replace(/^\/+/, '');
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(cleanValue)) {
    return `https://${cleanValue}`;
  }

  const platformBases: Record<SocialPlatform, string> = {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    threads: 'https://www.threads.net/@',
    tiktok: 'https://www.tiktok.com/@',
  };
  return `${platformBases[platform]}${cleanValue}`;
};

interface UserViewProps {
  categories: Category[];
  articles: Article[];
  members: Member[];
  coaches: Coach[];
  achievements: Achievement[];
  tournaments: Tournament[];
  clubs: Club[];
  highlights: Highlight[];
  webConfig: WebConfig;
  onSelectArticle: (article: Article) => void;
  onSelectHighlight: (highlight: Highlight) => void;
  onSelectClub: (club: Club) => void;
  onSelectTournament: (tournament: Tournament) => void;
  onSelectAchievement: (achievement: Achievement) => void;
  onSelectCoach: (coach: Coach) => void;
  activeNavSection: string;
  setActiveNavSection: (secId: string) => void;
}

export default function UserView({
  categories,
  articles,
  members,
  coaches,
  achievements,
  tournaments,
  clubs,
  highlights,
  webConfig,
  onSelectArticle,
  onSelectHighlight,
  onSelectClub,
  onSelectTournament,
  onSelectAchievement,
  onSelectCoach,
  activeNavSection,
  setActiveNavSection
}: UserViewProps) {

  const banners = useMemo(() => webConfig.banners && webConfig.banners.length > 0
    ? webConfig.banners
    : [
        {
          id: '1',
          image: defaultBanner1,
          title: 'Đồng Hành Cùng Vovinam Xóm Chiếu',
          subtitle: 'Quy tụ tinh hoa võ thuật cổ truyền, rèn luyện thân thể vững vàng và ý chí tự cường kiên định.',
          position: 'object-[center_15%]'
        },
        {
          id: '2',
          image: defaultBanner2,
          title: 'Vinh Quang Việt Võ Đạo',
          subtitle: 'Nhiều huy chương vàng và danh hiệu xuất sắc đạt được tại các giải trẻ toàn quốc.',
          position: 'object-[center_25%]'
        },
        {
          id: '3',
          image: defaultBanner3,
          title: 'Hội Tụ Ban Huấn Luyện Tâm Huyết',
          subtitle: 'Võ sư và HLV dày dặn kinh nghiệm, đồng hành sát cánh hướng dẫn từng động tác cho môn sinh.',
          position: 'object-[center_20%]'
        },
        {
          id: '4',
          image: defaultBanner4,
          title: 'Năng Động Trẻ Trung & Đam Mê',
          subtitle: 'Tinh thần đồng đội gắn kết keo sơn, đoàn kết học hỏi vì màu cờ sắc áo võ đường.',
          position: 'object-[center_70%]'
        },
        {
          id: '5',
          image: defaultBanner5,
          title: 'Học Đường Thể Thao Học Sinh',
          subtitle: 'Tôn vinh rèn luyện đạo đức học sinh, lối sống nghĩa hiệp cao đẹp cùng phong trào thể dục thể thao.',
          position: 'object-[center_50%]'
        }
      ], [webConfig.banners]);

  const [currentBanner, setCurrentBanner] = useState(0);
  const safeCurrentBanner = currentBanner >= banners.length ? 0 : currentBanner;
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const openMemberDetail = (member: Member) => {
    pushDetailRoute('member', member.id);
    setSelectedMember(member);
  };

  const closeMemberDetail = () => {
    closeDetailRoute('member');
    setSelectedMember(null);
  };

  useEffect(() => {
    const syncMemberDetailFromUrl = () => {
      const detailRoute = parseDetailHash(window.location.hash);
      if (detailRoute?.kind !== 'member') {
        setSelectedMember(null);
        return;
      }

      const member = members.find(item => String(item.id) === detailRoute.id) || null;
      setSelectedMember(current =>
        current && member && String(current.id) === String(member.id) ? current : member
      );
    };

    window.addEventListener('popstate', syncMemberDetailFromUrl);
    window.addEventListener('hashchange', syncMemberDetailFromUrl);
    syncMemberDetailFromUrl();
    return () => {
      window.removeEventListener('popstate', syncMemberDetailFromUrl);
      window.removeEventListener('hashchange', syncMemberDetailFromUrl);
    };
  }, [members]);

  useEffect(() => {
    if (banners.length < 2) return;
    const nextIndex = (safeCurrentBanner + 1) % banners.length;
    const preloadImage = new Image();
    preloadImage.src = resolveBannerImage(banners[nextIndex]?.image);
  }, [safeCurrentBanner, banners]);

  const navSections = [
    { id: 'section-about', name: 'Giới thiệu', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'section-news', name: 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'section-tournaments', name: 'Giải đấu', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'section-highlights', name: 'Highlights', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'section-achievements', name: 'Thành tích', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'section-coaches', name: 'Ban huấn luyện', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'section-members', name: 'Môn sinh', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { id: 'section-clubs', name: 'Điểm tập', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'section-contact', name: 'Liên hệ', icon: <Mail className="w-3.5 h-3.5" /> }
  ];

  useEffect(() => {
    let frameId: number | null = null;
    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if ((window as any)._isManualScrolling) return;
        if (parseDetailHash(window.location.hash)) return;

        const scrollPosition = window.scrollY + 160;
        let visibleSectionId = navSections[0].id;

        for (const section of navSections) {
          const el = document.getElementById(section.id);
          if (!el) continue;
          if (scrollPosition >= el.offsetTop) {
            visibleSectionId = section.id;
          } else {
            break;
          }
        }

        setActiveNavSection(visibleSectionId);

        const nextHash = `#${visibleSectionId}`;
        if (window.location.hash !== nextHash) {
          window.history.replaceState(
            { ...(window.history.state || {}), vovinamSection: visibleSectionId },
            '',
            nextHash
          );
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [setActiveNavSection]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };
  const bannerTouchStartXRef = React.useRef<number | null>(null);
  const handleBannerTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    bannerTouchStartXRef.current = event.touches[0]?.clientX ?? null;
  };
  const handleBannerTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const startX = bannerTouchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    bannerTouchStartXRef.current = null;
    if (startX == null || endX == null) return;
    const distance = endX - startX;
    if (Math.abs(distance) < 50) return;
    if (distance < 0) nextBanner();
    else prevBanner();
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const contactWasVisibleRef = React.useRef(false);
  useEffect(() => {
    const openFromNavigation = () => setIsRegistrationOpen(true);
    window.addEventListener('vovinam-open-training-registration', openFromNavigation);
    const section = document.getElementById('section-contact');
    if (!section) return () => window.removeEventListener('vovinam-open-training-registration', openFromNavigation);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !contactWasVisibleRef.current) setIsRegistrationOpen(true);
      contactWasVisibleRef.current = entry.isIntersecting;
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => { observer.disconnect(); window.removeEventListener('vovinam-open-training-registration', openFromNavigation); };
  }, []);

  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const rowScrollRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const achievementsScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollAchievements = (direction: 'left' | 'right') => {
    const container = achievementsScrollRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction === 'left' ? -container.clientWidth * 0.9 : container.clientWidth * 0.9,
      behavior: 'smooth'
    });
  };

  const scrollRow = (rowId: string, direction: 'left' | 'right') => {
    const el = rowScrollRefs.current[rowId];
    if (el) {
      const scrollAmt = 340;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmt : scrollAmt,
        behavior: 'smooth'
      });
    }
  };

  const visibleArticles = useMemo(
    () => articles.filter(a => a.status !== false),
    [articles]
  );
  const [latestNewsClock, setLatestNewsClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setLatestNewsClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  
  const [searchCoachQuery, setSearchCoachQuery] = useState<string>('');
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const clubById = useMemo(
    () => new Map(clubs.map(item => [item.id, item])),
    [clubs]
  );
  const tournamentById = useMemo(
    () => new Map(tournaments.map(item => [item.id, item])),
    [tournaments]
  );
  const memberById = useMemo(
    () => new Map(members.map(item => [item.id, item])),
    [members]
  );
  const coachById = useMemo(
    () => new Map(coaches.map(item => [item.id, item])),
    [coaches]
  );
  const achievementsByPersonId = useMemo(() => {
    const index = new Map<string, Achievement[]>();
    achievements.forEach(achievement => {
      (achievement.memberIds || []).forEach(personId => {
        const current = index.get(personId) || [];
        current.push(achievement);
        index.set(personId, current);
      });
    });
    return index;
  }, [achievements]);

  const visibleCoaches = useMemo(() => coaches.filter(c => {
    if (c.status === false) return false;
    const club = clubById.get(c.clubId);
    const relatedAchievements = achievementsByPersonId.get(c.id) || [];
    return matchesSmartSearch(
      searchCoachQuery,
      c.id,
      c.fullName,
      c.rank,
      c.experience,
      c.birthYear,
      c.clubId,
      club?.name,
      club?.address,
      relatedAchievements.map(item => [
        item.id,
        item.title,
        item.medalType,
        item.date,
        item.year,
        item.tournamentId,
        item.tournamentName
      ])
    );
  }), [achievementsByPersonId, clubById, coaches, searchCoachQuery]);

  const visibleMembers = useMemo(() => members
    .filter(m => {
      if (m.status === false) return false;
      const club = clubById.get(m.clubId);
      const relatedAchievements = achievementsByPersonId.get(m.id) || [];
      return matchesSmartSearch(
        searchMemberQuery,
        m.id,
        m.displayOrder,
        m.fullName,
        m.rank,
        m.birthYear,
        m.clubId,
        club?.name,
        club?.address,
        relatedAchievements.map(item => [
          item.id,
          item.title,
          item.medalType,
          item.date,
          item.year,
          item.tournamentId,
          item.tournamentName
        ])
      );
    })
    .sort((a, b) => {
      const orderDifference = Number(a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
        Number(b.displayOrder ?? Number.MAX_SAFE_INTEGER);
      return orderDifference !== 0
        ? orderDifference
        : a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    }), [achievementsByPersonId, clubById, members, searchMemberQuery]);
  
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState<string>('all');
  const visibleTournaments = useMemo(() => tournaments
    .filter(t => {
      const norm = getNormalizedTournamentStatus(t.status);
      return tournamentStatusFilter === 'all' || norm === tournamentStatusFilter;
    })
    .sort(compareTournamentsByStatus), [tournamentStatusFilter, tournaments]);

  const [searchAchievementQuery, setSearchAchievementQuery] = useState<string>('');
  const [searchHighlightQuery, setSearchHighlightQuery] = useState<string>('');
  const [showAllCoaches, setShowAllCoaches] = useState<boolean>(false);
  const [showAllMembers, setShowAllMembers] = useState<boolean>(false);

  const getYearFromAchievement = (ach: Achievement) => {
    if (ach.year) return ach.year;
    if (ach.date) {
      const yearMatch = ach.date.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch) return yearMatch[1];
      const d = new Date(ach.date);
      if (!isNaN(d.getTime())) return d.getFullYear().toString();
    }
    return '';
  };

  const getMemberPhotoForAchievement = (ach: Achievement) => {
    return ach.image || 'https://images.unsplash.com/photo-1578269174936-2709b5a8c0e6?auto=format&fit=crop&w=1200&q=80';
  };

  const visibleAchievements = useMemo(() => achievements.filter(a => {
    if (a.status === false) return false;
    const tournament = a.tournamentId ? tournamentById.get(a.tournamentId) : undefined;
    const linkedPeople = (a.memberIds || []).flatMap(id => {
      const member = memberById.get(id);
      const coach = coachById.get(id);
      return [id, member?.fullName, coach?.fullName];
    });

    return matchesSmartSearch(
      searchAchievementQuery,
      a.id,
      a.title,
      a.athleteName,
      a.memberIds,
      linkedPeople,
      a.unit,
      a.medalType,
      a.date,
      getYearFromAchievement(a),
      a.tournamentId,
      a.tournamentName,
      tournament?.name,
      tournament?.location,
      a.meaning,
      a.journey,
      a.honorTitle,
      a.honorQuote,
      a.honorAttribution
    );
  }), [
    achievements,
    coachById,
    memberById,
    searchAchievementQuery,
    tournamentById
  ]);
  const visibleHighlights = useMemo(() => highlights.filter(h => {
    if (h.status === false) return false;
    const tournament = h.tournamentId ? tournamentById.get(h.tournamentId) : undefined;
    return matchesSmartSearch(
      searchHighlightQuery,
      h.id,
      h.title,
      h.athleteName,
      h.mediaType,
      h.tournamentId,
      h.tournamentName,
      tournament?.name,
      tournament?.date,
      tournament?.location,
      h.mediaNotes
    );
  }), [highlights, searchHighlightQuery, tournamentById]);
  const visibleClubs = clubs;
  const highlightSearchOptions = useMemo(
    () => buildTournamentSearchOptions(
      highlights,
      tournamentById,
      'highlight',
      'highlight',
      true
    ),
    [highlights, tournamentById]
  );
  const achievementSearchOptions = useMemo(
    () => buildTournamentSearchOptions(
      achievements,
      tournamentById,
      'achievement',
      'thành tích',
      true
    ),
    [achievements, tournamentById]
  );
  const coachSearchOptions = useMemo(() => coaches
    .filter(item => item.status !== false)
    .map(item => ({
      key: String(item.id),
      value: item.fullName,
      label: item.fullName,
      meta: [item.rank, item.birthYear].filter(Boolean).join(' • ')
    })), [coaches]);
  const memberSearchOptions = useMemo(() => members
    .filter(item => item.status !== false)
    .map(item => ({
      key: String(item.id),
      value: item.fullName,
      label: item.fullName,
      meta: [item.rank, item.birthYear].filter(Boolean).join(' • ')
    })), [members]);

  const configHeight = webConfig.bannerHeight || 'medium';
  const zaloPhoneMatch = String(webConfig.phone || '').match(/(?:\+?84|0)(?:[\s.-]?\d){8,9}(?![\s.-]?\d)/);
  const zaloPhone = zaloPhoneMatch ? zaloPhoneMatch[0].replace(/\D/g, '') : '';
  const facebookUrl = normalizeSocialUrl('facebook', webConfig.facebook);
  const instagramUrl = normalizeSocialUrl('instagram', webConfig.instagram);
  const threadsUrl = normalizeSocialUrl('threads', webConfig.threads);
  const tiktokUrl = normalizeSocialUrl('tiktok', webConfig.tiktok);
  const carouselAspectClass =
    configHeight === 'short' ? 'aspect-[18/5]' :
    configHeight === 'large' ? 'aspect-[72/31]' :
    'aspect-[72/25]';

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 font-sans selection:bg-[#0054A6]/20" id="vovinam-user-root">
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Vovinam Watermark Background Logo */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none z-0 select-none overflow-hidden">
        <img 
          src={webConfig.logo || "/logo-sharp.png"} 
          alt="Vovinam Watermark Logo" 
          className="w-[85vw] max-w-[550px] aspect-square object-cover rounded-full scale-[1.08] [clip-path:circle(49%_at_50%_50%)] animate-[spin_120s_linear_infinite] saturate-125 contrast-110"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 1. BANNER TỰ CHUYỂN ĐỘNG 3D */}
      <section
        className={`relative w-full ${carouselAspectClass} touch-pan-y select-none bg-slate-950 overflow-hidden z-10 shadow-[0_15px_40px_rgba(0,0,0,0.4)]`}
        id="section-hero-carousel"
        onTouchStart={handleBannerTouchStart}
        onTouchEnd={handleBannerTouchEnd}
      >
        <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
          <img 
            src={resolveBannerImage(banners[safeCurrentBanner]?.image)} 
            alt="Vovinam Slide" 
            className="w-full h-full object-cover opacity-100 transition-opacity duration-1000 scale-105"
            style={{ objectPosition: getBannerObjectPosition(banners[safeCurrentBanner]?.position) }}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60"></div>
        </div>

        {/* Nút điều hướng Glassmorphism 3D */}
        <button
          type="button"
          onClick={prevBanner}
          aria-label="Xem banner trước"
          className="group absolute left-[clamp(0.65rem,2vw,2rem)] top-1/2 z-20 -translate-y-1/2 cursor-pointer rounded-[1.15rem] border border-white/30 bg-slate-950/20 p-1.5 text-white opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:-translate-x-1 hover:border-[#FFF200] hover:bg-[#0054A6]/80 hover:text-[#FFF200] hover:opacity-100 sm:p-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition duration-300 group-hover:border-[#FFF200]/50 group-hover:bg-white/20 sm:h-11 sm:w-11">
            <ChevronLeft className="h-5 w-5 stroke-[2.6] transition-transform duration-300 group-hover:-translate-x-0.5 sm:h-6 sm:w-6" />
          </span>
        </button>
        <button
          type="button"
          onClick={nextBanner}
          aria-label="Xem banner tiếp theo"
          className="group absolute right-[clamp(0.65rem,2vw,2rem)] top-1/2 z-20 -translate-y-1/2 cursor-pointer rounded-[1.15rem] border border-white/30 bg-slate-950/20 p-1.5 text-white opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:translate-x-1 hover:border-[#FFF200] hover:bg-[#0054A6]/80 hover:text-[#FFF200] hover:opacity-100 sm:p-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition duration-300 group-hover:border-[#FFF200]/50 group-hover:bg-white/20 sm:h-11 sm:w-11">
            <ChevronRight className="h-5 w-5 stroke-[2.6] transition-transform duration-300 group-hover:translate-x-0.5 sm:h-6 sm:w-6" />
          </span>
        </button>

        <div className="absolute bottom-[clamp(0.5rem,2.2vw,2rem)] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/30 bg-slate-950/40 px-3 py-2 shadow-2xl backdrop-blur-lg sm:gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              className={`h-2.5 rounded-full border border-white/30 transition-all duration-500 cursor-pointer ${safeCurrentBanner === idx ? 'w-10 bg-[#FFF200] shadow-[0_0_16px_rgba(255,242,0,0.9)]' : 'w-2.5 bg-white/50 hover:scale-125 hover:bg-white'}`}
            />
          ))}
        </div>
      </section>

      {/* Decorative Ribbon 3D */}
      <section className="bg-gradient-to-r from-[#003d7a] via-[#0054A6] to-[#003d7a] text-white py-4 shadow-xl relative z-20 border-y border-[#FFF200]/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-around items-center gap-6 text-[11px] sm:text-xs font-black uppercase tracking-widest font-display text-center">
          <div className="flex items-center gap-2 drop-shadow-md">
            <span className="text-[#FFF200] text-lg animate-bounce">⚡</span>
            <span>TỰ HÀO VÕ THUẬT CỔ TRUYỀN VIỆT</span>
          </div>
          <div className="hidden md:flex items-center gap-2 border-l border-white/20 pl-6 drop-shadow-md">
            <span className="text-[#FFF200] text-lg">🔥</span>
            <span>RÈN ĐỨC LUYỆN TÀI — HÀO KHÍ XÓM CHIẾU</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/20 pl-6 drop-shadow-md">
            <span className="text-[#FFF200] text-lg">🤝</span>
            <span>TÔN SƯ TRỌNG ĐẠO & LỐI SỐNG LÀNH MẠNH</span>
          </div>
        </div>
      </section>

      {/* 2. GIỚI THIỆU CLB (3D NỔI BẬT) */}
      <section className="relative -mt-6 max-w-6xl mx-auto px-4 sm:px-6 z-25 scroll-mt-32" id="section-about">
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_30px_70px_-15px_rgba(0,40,90,0.22)] border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/60 to-slate-100 relative overflow-hidden transition-all duration-300">
          
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-200/50 to-transparent rounded-bl-full pointer-events-none blur-md"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-yellow-200/50 to-transparent rounded-tr-full pointer-events-none blur-md"></div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-[#0054A6] font-black text-xs uppercase tracking-widest block mb-2 font-display bg-blue-50 border border-blue-200/80 px-4 py-1.5 rounded-full w-fit shadow-sm">
                  Lời ngỏ từ Ban huấn luyện
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic tracking-tight font-display drop-shadow-sm">
                  Giới thiệu CLB Vovinam Xóm Chiếu
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-[#0054A6] via-blue-500 to-[#FFF200] rounded-full mt-3 shadow-sm"></div>
              </div>
              
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans space-y-4">
                <p className="border-l-4 border-[#0054A6] pl-4 italic bg-blue-50/50 py-3 rounded-r-2xl shadow-sm">
                  Được thành lập với tôn chỉ truyền thụ võ thuật và võ đạo Việt Nam, Câu lạc bộ Vovinam Xóm Chiếu là điểm đến rèn luyện sức khỏe, kỷ luật bản thân, và tinh thần tương thân tương ái tuyệt vời của các môn sinh tại Vovinam Xóm Chiếu.
                </p>
                <p>
                  Tại đây, môn sinh không chỉ được trang bị kỹ năng phòng vệ thực chiến, hệ thống đòn chân tấn công danh tiếng, mà còn được nuôi dưỡng tinh thần dũng cảm, tự tôn dân tộc và lối sống lành mạnh, có ích cho xã hội.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
                <div className="bg-gradient-to-b from-white to-blue-50/90 p-4 rounded-2xl border border-blue-200/80 text-center shadow-[0_10px_25px_rgba(0,84,166,0.12)] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,84,166,0.22)] transition-all duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-[#0054A6] font-display drop-shadow-sm">10+</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mt-0.5">Năm hoạt động</p>
                </div>
                <div className="bg-gradient-to-b from-white to-emerald-50/90 p-4 rounded-2xl border border-emerald-200/80 text-center shadow-[0_10px_25px_rgba(16,185,129,0.12)] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(16,185,129,0.22)] transition-all duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-display drop-shadow-sm">300+</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mt-0.5">Võ sinh học tập</p>
                </div>
                <div className="bg-gradient-to-b from-white to-amber-50/90 p-4 rounded-2xl border border-amber-200/80 text-center shadow-[0_10px_25px_rgba(245,158,11,0.12)] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(245,158,11,0.22)] transition-all duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-amber-500 font-display drop-shadow-sm">50+</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mt-0.5">Huy chương giải</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-gradient-to-br from-[#0054A6] via-[#003d7a] to-[#00264d] text-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-[#FFF200] shadow-[0_25px_60px_rgba(0,30,70,0.55)] relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 flex flex-col h-[470px]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                <Swords className="w-56 h-56 text-[#FFF200]" />
              </div>
              
              <h3 className="text-lg font-black text-[#FFF200] uppercase italic tracking-tight mb-4 font-display flex items-center gap-2 flex-shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                <ShieldCheck className="w-5 h-5 text-[#FFF200] drop-shadow-[0_0_8px_rgba(255,242,0,0.8)]" />
                10 Điều Tâm Niệm Vovinam
              </h3>
              
              <div className="overflow-y-auto pr-1.5 flex-1 space-y-3.5 text-xs relative z-10 detail-scrollbar">
                <ul className="space-y-3.5 text-blue-50 font-medium leading-relaxed">
                  {[
                    { n: 1, title: 'Việt Võ Đạo Sinh:', content: 'Nguyện đạt tới cao độ của nghệ thuật để phục vụ dân tộc và nhân loại.', note: 'Hoài bão và mục đích học võ.' },
                    { n: 2, title: 'Việt Võ Đạo Sinh:', content: 'Nguyện trung kiên phát huy môn phái, xây dựng thế hệ thanh niên dấn thân hiến ích.', note: 'Nghĩa vụ đối với môn phái và dân tộc.' },
                    { n: 3, title: 'Việt Võ Đạo Sinh:', content: 'Đồng tâm nhất trí, tôn kính người trên, thương mến đồng đạo.', note: 'Tình đoàn kết trong môn phái.' },
                    { n: 4, title: 'Việt Võ Đạo Sinh:', content: 'Tuyệt đối tôn trọng kỷ luật, nêu cao danh dự võ sĩ.', note: 'Võ kỷ và danh dự võ sĩ.' },
                    { n: 5, title: 'Việt Võ Đạo Sinh:', content: 'Tôn trọng các võ phái khác, chỉ dùng võ để tự vệ và bênh vực lẽ phải.', note: 'Ý thức dụng võ.' },
                    { n: 6, title: 'Việt Võ Đạo Sinh:', content: 'Chuyên cần học tập, rèn luyện tinh thần, trau dồi đạo hạnh.', note: 'Ý hướng học tập và đời sống tinh thần.' },
                    { n: 7, title: 'Việt Võ Đạo Sinh:', content: 'Sống trong sạch, trung thực, giản dị và cao thượng.', note: 'Tâm nguyện sống.' },
                    { n: 8, title: 'Việt Võ Đạo Sinh:', content: 'Kiện toàn một ý chí đanh thép, nỗ lực tự thân cầu tiến.', note: 'Rèn luyện ý chí.' },
                    { n: 9, title: 'Việt Võ Đạo Sinh:', content: 'Sáng suốt nhận định, bền gan tranh đấu, tháo vát hành động.', note: 'Nếp suy cảm, nghị lực và tính thực tế.' },
                    { n: 10, title: 'Việt Võ Đạo Sinh:', content: 'Tự tin, tự thắng, khiêm cung, độ lượng, luôn luôn kiểm điểm để tiến bộ.', note: 'Đức sống và tinh thần cầu tiến.' }
                  ].map((item) => (
                    <li key={item.n} className="flex gap-2.5 items-start bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 hover:border-[#FFF200]/80 transition-all duration-300 shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FFF200] to-yellow-400 text-[#0054A6] text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">{item.n}</span>
                      <span className="space-y-1">
                        <span className="block"><strong>{item.title}</strong> {item.content}</span>
                        <em className="block text-[10px] text-yellow-200/90 font-sans">Ý nghĩa điều {item.n}: {item.note}</em>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. TIN MỚI NHẤT */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-news">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center max-w-2xl mx-auto mb-12 relative z-10">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Báo chí & Tin tức võ phái
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
            Tin tức & Chuyên mục võ đường
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 max-w-lg mx-auto leading-relaxed">
            Cập nhật thường xuyên các hoạt động, sự kiện nổi bật, giáo án huấn luyện và kỹ thuật môn phái Vovinam - Việt Võ Đạo.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 border-b border-slate-200/60 pb-8 relative z-10">
          <button
            onClick={() => {
              const el = document.getElementById('section-news');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 shadow-sm hover:-translate-y-0.5"
          >
            📰 Tất cả chuyên mục
          </button>
          {categories.filter(c => c.status !== false).map((cat) => {
            const count = visibleArticles.filter(a => a.categoryId === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  const el = document.getElementById(`news-category-row-${cat.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 shadow-sm hover:-translate-y-0.5"
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {visibleArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto border border-slate-200/60 shadow-lg relative z-10">
            <Calendar className="w-12 h-12 text-[#0054A6]/20 mx-auto mb-4" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2 font-display">Chưa có bài viết mới</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Hiện tại chưa có bài viết nào được đăng tải trên website.
            </p>
          </div>
        ) : (
          <div className="space-y-16 relative z-10">
            {(() => {
              const latestArticles = visibleArticles
                .filter(article => isArticleInLatestNews(article, latestNewsClock))
                .sort(compareLatestNewsByExpiry);

              if (latestArticles.length === 0) return null;

              return (
                <div id="news-category-row-LATEST" className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-transparent p-6 sm:p-8 rounded-[2.5rem] border border-orange-200/80 shadow-[0_15px_35px_rgba(245,158,11,0.08)] relative group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <span className="text-amber-600 text-[10px] font-black uppercase tracking-widest bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200">Hot News</span>
                      <h3 className="text-lg font-black text-slate-800 uppercase italic mt-1 tracking-tight font-display flex items-center gap-2">
                        <span className="text-amber-500 animate-pulse">🔥</span>
                        <span>Tin tức mới nhất</span>
                      </h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-orange-600/80">
                        Nổi bật liên tục trong những ngày qua
                      </p>
                    </div>
                  </div>

                  <div className="relative px-1">
                    <button
                      type="button"
                      onClick={() => scrollRow('LATEST', 'left')}
                      className="absolute -left-3 sm:-left-6 top-[40%] -translate-y-1/2 bg-white hover:bg-[#0054A6] hover:text-[#FFF200] text-slate-700 p-2.5 rounded-full border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 z-20 cursor-pointer flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
                      title="Lướt qua trái"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div
                      ref={el => { rowScrollRefs.current['LATEST'] = el; }}
                      className="flex gap-6 overflow-x-auto scrollbar-none pb-2 scroll-smooth select-none snap-x snap-mandatory"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {latestArticles.map((article) => {
                        const catName = categories.find(c => c.id === article.categoryId)?.name || 'Tin tức';
                        const expiresAt = getLatestNewsExpiryMs(article);
                        return (
                          <article
                            key={`latest-${article.id}`}
                            onClick={() => onSelectArticle(article)}
                            className="w-[280px] sm:w-[330px] shrink-0 bg-white rounded-[2rem] overflow-hidden shadow-[0_12px_30px_rgba(0,30,70,0.1)] hover:shadow-[0_22px_45px_rgba(0,84,166,0.22)] hover:-translate-y-2 border border-slate-200/80 group cursor-pointer transition-all duration-300 flex flex-col hover:border-[#0054A6]/60 snap-start"
                          >
                            <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                              <img
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
                              <span className="absolute top-4 left-4 max-w-[45%] truncate bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-orange-400/30 shadow-md">
                                {catName}
                              </span>
                              {expiresAt !== null && (
                                <LatestNewsCountdown expiresAt={expiresAt} />
                              )}
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                                    {article.date}
                                  </span>
                                  <span>•</span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm leading-snug uppercase tracking-tight group-hover:text-[#0054A6] transition-colors mt-2.5 mb-2 line-clamp-2 font-display">
                                  {article.title}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-sans whitespace-pre-wrap break-words">
                                  {articleContentToPlainText(article.content)}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#0054A6] uppercase tracking-wider">
                                <span>Xem chi tiết</span>
                                <ChevronRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1.5 text-[#0054A6]" />
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollRow('LATEST', 'right')}
                      className="absolute -right-3 sm:-right-6 top-[40%] -translate-y-1/2 bg-white hover:bg-[#0054A6] hover:text-[#FFF200] text-slate-700 p-2.5 rounded-full border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 z-20 cursor-pointer flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
                      title="Lướt qua phải"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {categories.filter(c => c.status !== false).map((cat) => {
              const catArticles = visibleArticles.filter(a => a.categoryId === cat.id);
              if (catArticles.length === 0) return null;

              return (
                <div key={cat.id} id={`news-category-row-${cat.id}`} className="relative group">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#0054A6] shadow-sm"></span>
                      <div>
                        <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight font-display">
                          {cat.name}
                        </h3>
                        {cat.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 font-sans italic">{cat.description}</p>
                        )}
                      </div>
                      <span className="bg-blue-50 text-[#0054A6] text-[10px] font-black font-mono px-2.5 py-1 rounded-full border border-blue-100">
                        {catArticles.length} bài viết
                      </span>
                    </div>
                  </div>

                  <div className="relative px-1">
                    <button
                      type="button"
                      onClick={() => scrollRow(cat.id, 'left')}
                      className="absolute -left-3 sm:-left-6 top-[45%] -translate-y-1/2 bg-white hover:bg-[#0054A6] hover:text-[#FFF200] text-slate-700 p-2.5 rounded-full border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 z-20 cursor-pointer flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
                      title="Lướt qua trái"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div
                      ref={el => { rowScrollRefs.current[cat.id] = el; }}
                      className="flex gap-6 overflow-x-auto scrollbar-none pb-4 scroll-smooth select-none snap-x snap-mandatory"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {catArticles.map((article) => {
                        return (
                          <article
                            key={article.id}
                            onClick={() => onSelectArticle(article)}
                            className="w-[280px] sm:w-[330px] shrink-0 bg-white rounded-[2rem] overflow-hidden shadow-[0_10px_30px_rgba(0,30,70,0.08)] hover:shadow-[0_20px_40px_rgba(0,84,166,0.2)] hover:-translate-y-1 border border-slate-200/80 group/card cursor-pointer transition-all duration-300 flex flex-col hover:border-[#0054A6]/50 snap-start"
                          >
                            <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                              <img
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                                    {article.date}
                                  </span>
                                  <span>•</span>
                                </div>

                                <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-tight group-hover/card:text-[#0054A6] transition-colors mt-2.5 mb-2 line-clamp-2 font-display">
                                  {article.title}
                                </h3>
                                
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-sans whitespace-pre-wrap break-words">
                                  {articleContentToPlainText(article.content)}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs font-black text-[#0054A6] uppercase tracking-wider">
                                <span>Xem chi tiết</span>
                                <ChevronRight className="w-4.5 h-4.5 transition-transform group-hover/card:translate-x-1.5 text-[#0054A6]" />
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollRow(cat.id, 'right')}
                      className="absolute -right-3 sm:-right-6 top-[45%] -translate-y-1/2 bg-white hover:bg-[#0054A6] hover:text-[#FFF200] text-slate-700 p-2.5 rounded-full border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 z-20 cursor-pointer flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
                      title="Lướt qua phải"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. GIẢI ĐẤU (3D NỔI BẬT) */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-[#f1f5f9] via-white to-[#f8fafc] relative scroll-mt-32 border-t border-slate-200/60" id="section-tournaments">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm inline-block">
              Lịch trình thi đấu & Võ nghiệp
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
              Giải đấu & Sự kiện Vovinam
            </h2>
            <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Nơi ghi nhận các sự kiện thi tài võ thuật, đối kháng, diễn võ nâng đai cấp của võ đường Vovinam Xóm Chiếu.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12 relative z-10">
            {[
              { id: 'all', label: 'Tất cả giải đấu', icon: '🏆', color: 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50' },
              { id: 'đang diễn ra', label: 'Đang diễn ra', icon: '🟢', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50' },
              { id: 'sắp diễn ra', label: 'Sắp diễn ra', icon: '🟡', color: 'border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-50' },
              { id: 'đã kết thúc', label: 'Đã kết thúc', icon: '🔴', color: 'border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-50' }
            ].map(tab => {
              const isActive = tournamentStatusFilter === tab.id;
              let activeClasses = '';
              if (isActive) {
                if (tab.id === 'all') activeClasses = 'bg-[#0054A6] text-white border-[#0054A6] shadow-lg scale-[1.03]';
                else if (tab.id === 'đang diễn ra') activeClasses = 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.03]';
                else if (tab.id === 'sắp diễn ra') activeClasses = 'bg-amber-500 text-white border-amber-500 shadow-lg scale-[1.03]';
                else if (tab.id === 'đã kết thúc') activeClasses = 'bg-rose-600 text-white border-rose-600 shadow-lg scale-[1.03]';
              } else {
                activeClasses = `${tab.color} border shadow-sm`;
              }
              
              const count = tournaments.filter(t => {
                const norm = getNormalizedTournamentStatus(t.status);
                return tab.id === 'all' || norm === tab.id;
              }).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setTournamentStatusFilter(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeClasses}`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 font-bold'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {visibleTournaments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-150 shadow-lg relative z-10">
              <span className="text-4xl block mb-3">🏆</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1 font-display">Không có giải đấu</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Hiện tại không có giải đấu nào thuộc trạng thái này được lưu hành trong võ nghiệp.
              </p>
            </div>
          ) : (
            <div className="relative group/slider">
              {visibleTournaments.length > 1 && (<>
                <button onClick={() => scrollRow('TOURNAMENTS', 'left')} className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer" title="Trượt sang trái">
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button onClick={() => scrollRow('TOURNAMENTS', 'right')} className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer" title="Trượt sang phải">
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
              </>)}
              <div ref={(el) => (rowScrollRefs.current['TOURNAMENTS'] = el)} className="flex gap-5 lg:gap-6 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory px-1 pb-5">
              {visibleTournaments.map((t) => (
                <div 
                  key={t.id}
                  onClick={() => onSelectTournament(t)}
                  className="w-[88%] sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)] shrink-0 snap-start bg-white rounded-[2.2rem] overflow-hidden border border-slate-200/90 shadow-[0_12px_35px_rgba(0,30,70,0.08)] hover:shadow-[0_25px_50px_rgba(0,84,166,0.22)] hover:-translate-y-2 cursor-pointer group transition-all duration-300 flex flex-col hover:border-[#0054A6]/50"
                >
                  <div className="relative h-52 overflow-hidden bg-slate-900">
                    <img 
                      src={t.image || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80'} 
                      alt={t.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent"></div>
                    
                    <span className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-[0_6px_16px_rgba(0,0,0,0.3)] text-white border border-white/20 backdrop-blur-md ${
                      getNormalizedTournamentStatus(t.status) === 'đang diễn ra' ? 'bg-gradient-to-r from-emerald-600 to-green-500 shadow-emerald-950/30 animate-pulse' :
                      getNormalizedTournamentStatus(t.status) === 'sắp diễn ra' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-950/30' : 
                      'bg-gradient-to-r from-rose-600 to-red-500 shadow-rose-950/30'
                    }`}>
                      {getNormalizedTournamentStatus(t.status)}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug uppercase group-hover:text-[#0054A6] transition-colors line-clamp-2 font-display">
                        {t.name}
                      </h3>

                      <div className="space-y-2.5 text-xs text-slate-600 mt-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-150/80">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                          <span className="truncate">Thời gian: <strong className="text-slate-800 font-bold">{t.date}</strong></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                          <span className="truncate">Địa điểm: <strong className="text-slate-800 font-bold">{t.location}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100/80 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
                      <span className="text-[#0054A6] group-hover:translate-x-1.5 transition-transform flex items-center gap-1 font-extrabold">
                        Xem chi tiết <span className="text-sm">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. HIGHLIGHTS (BENTO GALLERY 3D GỌN GÀNG) */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-highlights">
        <div className="absolute top-1/3 right-12 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Khoảnh khắc thi đấu
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
            Highlights trận đấu
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 max-w-lg mx-auto leading-relaxed">
            Tuyển tập những khoảnh khắc biểu diễn quyền thuật kịch tính, những đòn chân tấn công và bài quyền binh khí thượng thừa.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8 relative z-10 px-4 sm:px-0">
          <SmartSearchInput
            value={searchHighlightQuery}
            onChange={setSearchHighlightQuery}
            options={highlightSearchOptions}
            placeholder="Tìm thông minh: tên VĐV, tên giải, năm, tiêu đề, ghi chú..."
            ariaLabel="Tìm kiếm thông minh trong Highlights"
            resultCount={visibleHighlights.length}
            theme="dark"
          />
          {searchHighlightQuery && (
            <p className="text-center text-[10px] text-slate-500 mt-2">
              Tìm thấy <strong className="text-amber-500">{visibleHighlights.length}</strong> highlight phù hợp với các từ khóa đã nhập
            </p>
          )}
        </div>

        <div className="relative z-10 group/slider">
          {visibleHighlights.length > 1 && (<>
            <button onClick={() => scrollRow('HIGHLIGHTS', 'left')} className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer" title="Trượt sang trái">
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button onClick={() => scrollRow('HIGHLIGHTS', 'right')} className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer" title="Trượt sang phải">
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </>)}
          <div ref={(el) => (rowScrollRefs.current['HIGHLIGHTS'] = el)} className="flex gap-5 lg:gap-6 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory px-1 pb-5">
          {visibleHighlights.map((hl) => (
            <div 
              key={hl.id}
              onClick={() => onSelectHighlight(hl)}
              className="w-[88%] sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)] shrink-0 snap-start bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white rounded-[2.2rem] p-4 border border-slate-700/80 cursor-pointer group hover:border-[#FFF200] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between h-[310px] shadow-[0_15px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_22px_45px_rgba(255,242,0,0.22)]"
            >
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-800 shadow-inner border border-white/10">
                <img 
                  src={hl.thumbnail} 
                  alt={hl.title} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 brightness-105 saturate-110 group-hover:brightness-110"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                
                <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                  hl.mediaType === 'video' ? 'bg-slate-950/30 group-hover:bg-slate-950/10' : 'bg-transparent'
                }`}>
                  {hl.mediaType === 'video' && (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#FFF200] via-yellow-400 to-amber-500 text-slate-900 rounded-full flex items-center justify-center pl-1 shadow-[0_0_25px_rgba(255,242,0,0.8)] transform group-hover:scale-115 group-hover:rotate-6 transition-all duration-300 border-2 border-white/50">
                      <Play className="w-6 h-6 text-slate-950 fill-current drop-shadow-md" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 px-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 line-clamp-1 group-hover:text-[#FFF200] transition-colors uppercase tracking-tight font-display">
                    {hl.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl w-fit backdrop-blur-sm">
                    <User className="w-3.5 h-3.5 text-[#FFF200]" />
                    <span className="text-[10px] text-slate-200 font-bold">Biểu diễn: {hl.athleteName}</span>
                  </div>
                  {hl.tournamentName && (
                    <p className="mt-2 text-[10px] text-slate-400 truncate">🏆 {hl.tournamentName}</p>
                  )}
                </div>
                
                <div className="text-right text-[10px] text-[#FFF200] font-black uppercase tracking-wider pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between">
                  <span>Xem Chi Tiết &gt;</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* 6. THÀNH TÍCH (VINH DANH 3D SANG TRỌNG) */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden scroll-mt-32" id="section-achievements">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#FFF200_1px,transparent_1px),linear-gradient(to_bottom,#FFF200_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#FFF200] text-[10px] font-black uppercase tracking-widest bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 shadow-xl inline-block">
              Vinh danh thành tích
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic mt-3 tracking-tight font-display">
              Thành tích xuất sắc & Huy chương đạt được
            </h2>
            <div className="w-12 h-1 bg-[#FFF200] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Sắt son một lòng Võ Đạo Việt Nam, nỗ lực miệt mài gặt hái quả ngọt tại các giải đấu lớn toàn quốc và khu vực.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xl mb-8 max-w-2xl mx-auto backdrop-blur-md relative z-20">
            <SmartSearchInput
              value={searchAchievementQuery}
              onChange={setSearchAchievementQuery}
              options={achievementSearchOptions}
              placeholder="Nhập điều bạn nhớ: 2026, tên VĐV, huy chương, tên giải..."
              ariaLabel="Tìm kiếm thông minh trong thành tích"
              resultCount={visibleAchievements.length}
              label="Tìm kiếm thông minh"
              helperText="Không phân biệt chữ hoa, chữ thường hoặc dấu tiếng Việt. Bấm mũi tên để xem tất cả dữ liệu."
              theme="dark"
            />
          </div>

          {visibleAchievements.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-[2rem] border border-slate-800 max-w-xl mx-auto">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-bold text-slate-400 mt-3">Không tìm thấy thành tích nào phù hợp với bộ lọc!</p>
              <button 
                onClick={() => setSearchAchievementQuery('')}
                className="mt-4 text-xs font-black text-[#FFF200] uppercase tracking-wider border border-[#FFF200]/40 px-4 py-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            </div>
          ) : (
            <div className="relative group/slider">
              {visibleAchievements.length > 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollAchievements('left')}
                    aria-label="Xem các thành tích phía trước"
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
                    title="Trượt sang trái"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollAchievements('right')}
                    aria-label="Xem các thành tích phía sau"
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
                    title="Trượt sang phải"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>
                </>
              )}
              <div
                ref={achievementsScrollRef}
                className="grid grid-rows-2 grid-flow-col auto-cols-[88%] sm:auto-cols-[calc((100%_-_1.5rem)/2)] lg:auto-cols-[calc((100%_-_3rem)/3)] gap-5 lg:gap-6 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-3 scrollbar-none"
              >
              {visibleAchievements.map((ach) => (
                <div 
                  key={ach.id}
                  onClick={() => onSelectAchievement(ach)}
                  className="snap-start bg-slate-900/90 backdrop-blur-md rounded-[2.2rem] p-5 border border-slate-700/80 flex items-center gap-5 hover:border-[#FFF200] hover:shadow-[0_20px_45px_rgba(255,242,0,0.25)] hover:-translate-y-1 transition-all duration-300 group min-w-0 overflow-hidden cursor-pointer"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-[#FFF200]/50 group-hover:border-[#FFF200] transition-colors bg-slate-800 shadow-md">
                    <img 
                      src={getMemberPhotoForAchievement(ach)} 
                      alt={ach.athleteName || 'Môn sinh'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg border ${
                      ach.medalType === 'Vàng' ? 'bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black border-yellow-200' :
                      ach.medalType === 'Bạc' ? 'bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950 font-black border-slate-100' :
                      ach.medalType === 'Đồng' ? 'bg-gradient-to-tr from-amber-700 to-orange-400 text-white font-black border-orange-300' :
                      'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-200 text-white'
                    }`}>
                      {ach.medalType === 'Vàng' ? '🥇' : ach.medalType === 'Bạc' ? '🥈' : ach.medalType === 'Đồng' ? '🥉' : '🏆'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider border flex items-center gap-1 shadow-sm ${
                        ach.medalType === 'Vàng' ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-black border-yellow-300' :
                        ach.medalType === 'Bạc' ? 'bg-gradient-to-r from-slate-300 to-slate-100 text-slate-900 font-black border-slate-200' :
                        ach.medalType === 'Đồng' ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-orange-950 font-black border-orange-300' :
                        'bg-blue-900/80 text-[#FFF200] border-blue-400/40'
                      }`}>
                        {ach.medalType === 'Vàng' ? '🥇' : ach.medalType === 'Bạc' ? '🥈' : ach.medalType === 'Đồng' ? '🥉' : '🏆'} Huy chương {ach.medalType}
                      </span>
                      <span className="text-[9px] text-[#FFF200] font-extrabold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        Chi tiết →
                      </span>
                    </div>

                    <p className="text-xs text-[#FFF200] font-black tracking-tight flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded-lg w-fit border border-yellow-500/20">
                      👤 VĐV: <span className="text-white font-black">{ach.athleteName || 'Khuyết danh'}</span>
                    </p>

                    <h4 className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug truncate group-hover:text-[#FFF200] transition-colors font-display" title={ach.title}>
                      🥋 {ach.title}
                    </h4>

                    {ach.tournamentName && (
                      <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFF200]"></span>
                        🏆 {ach.tournamentName}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-slate-800/80 pt-1.5 mt-1.5">
                      <span className="truncate max-w-[120px]">🏢 {ach.unit}</span>
                      <span>📅 {ach.date}</span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 7. BAN HUẤN LUYỆN (3D KHUÔN MẶT VÕ SƯ) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-coaches">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Đội ngũ võ sư tâm huyết
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 uppercase italic mt-3 tracking-tight font-display">
            Ban huấn luyện chính nhiệm
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Các võ sư, huấn luyện viên có bề dày kinh nghiệm, tâm huyết rèn đức rèn tài cho thế hệ học viên môn phái.
          </p>
        </div>

        <div className="max-w-sm mx-auto mb-6 relative z-10 px-4 sm:px-0">
          <SmartSearchInput
            value={searchCoachQuery}
            onChange={setSearchCoachQuery}
            options={coachSearchOptions}
            placeholder="Tìm theo tên, năm sinh, đai, CLB, thành tích..."
            ariaLabel="Tìm kiếm thông minh trong huấn luyện viên"
            resultCount={visibleCoaches.length}
            theme="light"
          />
          {searchCoachQuery && (
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                Kết quả tìm kiếm cho: <span className="text-[#0054A6]">"{searchCoachQuery}"</span> ({visibleCoaches.length})
              </span>
            </div>
          )}
        </div>

        {!searchCoachQuery.trim() && (
          <div className="flex justify-center mb-8 relative z-10">
            <button
              onClick={() => setShowAllCoaches(!showAllCoaches)}
              className="px-6 py-2.5 rounded-2xl bg-white border-2 border-[#0054A6]/20 hover:border-[#0054A6] hover:bg-slate-50 text-slate-800 hover:text-[#0054A6] font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95 hover:-translate-y-0.5"
            >
              {showAllCoaches ? 'Thu gọn danh sách (Trượt ngang)' : 'Xem tất cả Ban huấn luyện'}
            </button>
          </div>
        )}

        {visibleCoaches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 shadow-sm max-w-md mx-auto relative z-10">
            <span className="text-4xl">🔍</span>
            <p className="text-xs text-slate-500 font-bold mt-3">Không tìm thấy võ sư nào phù hợp với từ khóa.</p>
            <button 
              onClick={() => setSearchCoachQuery('')}
              className="mt-4 px-4 py-1.5 bg-[#0054A6] text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : showAllCoaches || searchCoachQuery.trim() ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {visibleCoaches.map((coach) => (
              <div 
                key={coach.id}
                onClick={() => onSelectCoach(coach)}
                className="bg-white rounded-[2.2rem] p-8 border border-slate-200/90 shadow-[0_12px_35px_rgba(0,30,70,0.08)] hover:shadow-[0_25px_55px_rgba(0,84,166,0.22)] hover:-translate-y-2 text-center group hover:border-[#0054A6]/50 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden p-1.5 bg-gradient-to-tr from-[#0054A6] via-blue-500 to-[#FFF200] shadow-[0_10px_25px_rgba(0,84,166,0.3)] relative group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 border-2 border-white">
                      <PersonAvatar
                        src={coach.photo} 
                        alt={coach.fullName} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        iconClassName="w-14 h-14"
                      />
                    </div>
                  </div>

                  <h3 className="font-black text-slate-950 text-lg sm:text-xl mt-5 uppercase tracking-tight font-display">
                    {coach.fullName}
                  </h3>
                  
                  <div className="flex justify-center items-center gap-2 mt-2.5 flex-wrap">
                    {(() => {
                      const isHoang = String(coach.rank || '').includes('Hoàng');
                      const isHong = String(coach.rank || '').includes('Hồng') || String(coach.rank || '').includes('Võ sư');
                      return (
                        <span className={`text-[10px] font-black border px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-sm ${
                          isHong ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-400' :
                          isHoang ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 border-yellow-400 font-black' :
                          'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400'
                        }`}>
                          {coach.rank}
                        </span>
                      );
                    })()}
                    {coach.status !== false ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
                        Ngưng hoạt động
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#0054A6] font-black uppercase mt-3 font-mono tracking-wider">
                    Sinh năm: {coach.birthYear}
                  </p>

                  <p className="text-xs text-slate-900 font-sans leading-relaxed mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-150/80 italic relative font-semibold shadow-inner">
                    "{coach.experience}"
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 text-[10px] text-[#0054A6] font-black uppercase tracking-wider group-hover:text-[#FFF200] group-hover:bg-[#0054A6] py-2 rounded-xl transition-all duration-300 shadow-sm">
                  Xem chi tiết võ sư →
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative z-10 group/slider">
            <button
              onClick={() => scrollRow('COACHES', 'left')}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
              title="Trượt sang trái"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={() => scrollRow('COACHES', 'right')}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
              title="Trượt sang phải"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>

            <div
              ref={(el) => (rowScrollRefs.current['COACHES'] = el)}
              className="flex gap-6 overflow-x-auto scrollbar-none pb-6 scroll-smooth snap-x snap-mandatory px-2"
            >
              {visibleCoaches.map((coach) => (
                <div 
                  key={coach.id}
                  onClick={() => onSelectCoach(coach)}
                  className="w-[280px] sm:w-[330px] shrink-0 snap-start bg-white rounded-[2.2rem] p-6 border border-slate-200/90 shadow-[0_10px_30px_rgba(0,30,70,0.08)] hover:shadow-[0_25px_50px_rgba(0,84,166,0.2)] hover:-translate-y-1.5 text-center group hover:border-[#0054A6]/40 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="w-28 h-28 mx-auto rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#0054A6] via-blue-500 to-[#FFF200] shadow-md relative group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 border-2 border-white">
                        <PersonAvatar
                          src={coach.photo} 
                          alt={coach.fullName} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          iconClassName="w-12 h-12"
                        />
                      </div>
                    </div>

                    <h3 className="font-black text-slate-950 text-base sm:text-lg mt-4 uppercase tracking-tight font-display">
                      {coach.fullName}
                    </h3>
                    
                    <div className="flex justify-center items-center gap-1.5 mt-2 flex-wrap">
                      {(() => {
                        const isHoang = String(coach.rank || '').includes('Hoàng');
                        const isHong = String(coach.rank || '').includes('Hồng') || String(coach.rank || '').includes('Võ sư');
                        return (
                          <span className={`text-[9px] font-black border px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm ${
                            isHong ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-400' :
                            isHoang ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 border-yellow-400 font-black' :
                            'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400'
                          }`}>
                            {coach.rank}
                          </span>
                        );
                      })()}
                      {coach.status !== false ? (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm">
                          Ngưng HĐ
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-[#0054A6] font-black uppercase mt-2 font-mono tracking-wider">
                      Sinh năm: {coach.birthYear}
                    </p>

                    <p className="text-xs text-slate-900 font-sans leading-relaxed mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-150/80 italic line-clamp-3 relative font-semibold shadow-inner">
                      "{coach.experience}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[9px] text-[#0054A6] font-black uppercase tracking-wider group-hover:text-[#FFF200] group-hover:bg-[#0054A6] py-1.5 rounded-xl transition-all duration-300 shadow-sm">
                    Xem chi tiết võ sư →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 8. THÀNH VIÊN (3D HOÀN CHỈNH - PHẦN ĐÃ ĐƯỢC PHỤC HỒI) */}
      <section className="py-20 bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] border-t border-slate-200/50 scroll-mt-32" id="section-members">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm inline-block">
              Thế hệ tiếp nối xuất sắc
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 uppercase italic mt-3 tracking-tight font-display">
              Thành viên CLB
            </h2>
            <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Các môn sinh xuất sắc, gương sáng chăm ngoan học giỏi và tích cực tham gia phong trào thi đua võ thuật Phường Xóm Chiếu.
            </p>
          </div>

          <div className="max-w-sm mx-auto mb-6 relative z-10 px-4 sm:px-0">
            <SmartSearchInput
              value={searchMemberQuery}
              onChange={setSearchMemberQuery}
              options={memberSearchOptions}
              placeholder="Tìm theo tên, năm sinh, đai, CLB, thành tích..."
              ariaLabel="Tìm kiếm thông minh trong thành viên"
              resultCount={visibleMembers.length}
              theme="light"
            />
            {searchMemberQuery && (
              <div className="text-center mt-2">
                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                  Kết quả tìm kiếm cho: <span className="text-[#0054A6]">"{searchMemberQuery}"</span> ({visibleMembers.length})
                </span>
              </div>
            )}
          </div>

          {!searchMemberQuery.trim() && (
            <div className="flex justify-center mb-8 relative z-10">
              <button
                onClick={() => setShowAllMembers(!showAllMembers)}
                className="px-6 py-2.5 rounded-2xl bg-white border-2 border-[#0054A6]/20 hover:border-[#0054A6] hover:bg-slate-50 text-slate-800 hover:text-[#0054A6] font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95 hover:-translate-y-0.5"
              >
                {showAllMembers ? 'Thu gọn danh sách (Trượt ngang)' : 'Xem tất cả Thành viên'}
              </button>
            </div>
          )}

          {visibleMembers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 shadow-sm max-w-md mx-auto relative z-10">
              <span className="text-4xl">🔍</span>
              <p className="text-xs text-slate-500 font-bold mt-3">Không tìm thấy môn sinh nào phù hợp với từ khóa.</p>
              <button 
                onClick={() => setSearchMemberQuery('')}
                className="mt-4 px-4 py-1.5 bg-[#0054A6] text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : showAllMembers || searchMemberQuery.trim() ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
              {visibleMembers.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => openMemberDetail(m)}
                  className="bg-white rounded-[2rem] p-6 border border-slate-200/90 shadow-[0_8px_25px_rgba(0,30,70,0.06)] hover:shadow-[0_20px_40px_rgba(0,84,166,0.18)] hover:-translate-y-1.5 text-center hover:border-[#0054A6]/40 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-[#0054A6] via-blue-400 to-[#FFF200] shadow-md group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 border-2 border-white">
                        <PersonAvatar
                          src={m.photo} 
                          alt={m.fullName} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          iconClassName="w-10 h-10"
                        />
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-4 line-clamp-1 group-hover:text-[#0054A6] transition-colors font-display">
                      {m.fullName}
                    </h3>
                    
                    <div className="flex justify-center items-center gap-1 mt-2 flex-wrap">
                      <span className="text-[9px] font-black bg-blue-50 text-[#0054A6] border border-blue-200 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                        {m.rank}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono mt-2">
                      Sinh năm: <strong className="text-slate-600">{m.birthYear}</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[9px] text-[#0054A6] font-black uppercase tracking-wider group-hover:text-blue-700">
                    Hồ sơ môn sinh →
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative z-10 group/slider">
              <button
                onClick={() => scrollRow('MEMBERS', 'left')}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
                title="Trượt sang trái"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <button
                onClick={() => scrollRow('MEMBERS', 'right')}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 cursor-pointer"
                title="Trượt sang phải"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>

              <div
                ref={(el) => (rowScrollRefs.current['MEMBERS'] = el)}
                className="flex gap-5 overflow-x-auto scrollbar-none pb-6 scroll-smooth snap-x snap-mandatory px-1"
              >
                {visibleMembers.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => openMemberDetail(m)}
                    className="w-[200px] sm:w-[230px] shrink-0 snap-start bg-white rounded-[2rem] p-5 border border-slate-200/90 shadow-[0_8px_25px_rgba(0,30,70,0.06)] hover:shadow-[0_20px_40px_rgba(0,84,166,0.18)] hover:-translate-y-1.5 text-center hover:border-[#0054A6]/40 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-[#0054A6] via-blue-400 to-[#FFF200] shadow-md group-hover:scale-105 transition-transform duration-300">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 border-2 border-white">
                          <PersonAvatar
                            src={m.photo} 
                            alt={m.fullName} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            iconClassName="w-8 h-8"
                          />
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mt-3 line-clamp-1 group-hover:text-[#0054A6] transition-colors font-display">
                        {m.fullName}
                      </h3>
                      
                      <div className="flex justify-center items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[9px] font-black bg-blue-50 text-[#0054A6] border border-blue-200 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {m.rank}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                        Sinh năm: <strong className="text-slate-600">{m.birthYear}</strong>
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-[9px] text-[#0054A6] font-black uppercase tracking-wider group-hover:text-blue-700">
                      Hồ sơ môn sinh →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 9. ĐIỂM TẬP (CLUBS 3D) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-clubs">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Mạng lưới võ đường
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 uppercase italic mt-3 tracking-tight font-display">
            Các điểm tập luyện
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Hệ thống các sân tập chuẩn hóa, môi trường rèn luyện thể chất và tinh thần lý tưởng cho các võ sinh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleClubs.map((club) => (
            <div 
              key={club.id}
              onClick={() => onSelectClub(club)}
              className="bg-white rounded-[2.2rem] overflow-hidden border border-slate-200/90 shadow-[0_12px_35px_rgba(0,30,70,0.08)] hover:shadow-[0_25px_50px_rgba(0,84,166,0.22)] hover:-translate-y-2 cursor-pointer group transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <img 
                    src={club.image || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80'} 
                    alt={club.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-4 text-white font-black text-base font-display drop-shadow-md">
                    📍 {club.name}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <p className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{club.address}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0054A6] shrink-0" />
                    <span>Lịch tập: <strong>{club.schedule || 'Thứ 2 - 4 - 6 hàng tuần'}</strong></span>
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <div className="w-full py-2.5 rounded-xl bg-blue-50 text-[#0054A6] group-hover:bg-[#0054A6] group-hover:text-white font-black text-xs uppercase tracking-wider text-center transition-all duration-300 shadow-sm">
                  Chi tiết điểm tập →
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. LIÊN HỆ (CONTACT 3D GLASSMOPRHISM) */}
      <section className="py-20 bg-gradient-to-br from-[#00264d] via-[#003d7a] to-[#0054A6] text-white relative overflow-hidden scroll-mt-32" id="section-contact">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FFF200]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[#FFF200] text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full border border-white/20 shadow-sm inline-block backdrop-blur-md">
                Gắn kết võ đường
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight font-display drop-shadow-md">
                Liên hệ & Đăng ký ghi danh
              </h2>
              <div className="w-20 h-1 bg-[#FFF200] rounded-full"></div>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-sans">
                Chào mừng bạn đến với CLB Vovinam Xóm Chiếu! Đăng ký ngay hôm nay để rèn luyện sức khỏe, ý chí kiên cường và tinh thần võ đạo Việt Nam.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md hover:border-[#FFF200]/60 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF200] text-[#0054A6] flex items-center justify-center font-black shadow-md">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-blue-200 font-bold">Hotline / Zalo</p>
                    <a href={`tel:${zaloPhone}`} className="text-sm font-black text-white hover:text-[#FFF200] transition-colors font-mono">
                      {webConfig.phone || '090 000 0000'}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md hover:border-[#FFF200]/60 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF200] text-[#0054A6] flex items-center justify-center font-black shadow-md">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-blue-200 font-bold">Email chính thức</p>
                    <p className="text-sm font-black text-white font-mono">{webConfig.email || 'vovinamxomchieu@gmail.com'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white text-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border-4 border-[#FFF200]">
              <h3 className="text-xl font-black text-[#0054A6] uppercase italic tracking-tight font-display mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Đăng ký tập luyện ngay
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Nhập thông tin bên dưới, Ban huấn luyện sẽ liên hệ hỗ trợ tư vấn lớp tập phù hợp nhất.
              </p>

              <button
                type="button"
                onClick={() => setIsRegistrationOpen(true)}
                className="w-full py-4 bg-gradient-to-r from-[#0054A6] via-blue-600 to-[#0054A6] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_10px_25px_rgba(0,84,166,0.35)] hover:shadow-[0_15px_35px_rgba(0,84,166,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#FFF200]" />
                Mở Form Đăng Ký Tập Luyện 3D
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* MODALS DỰ ÁN */}
      <Suspense fallback={null}>
        {selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={closeMemberDetail}
            clubs={clubs}
            achievements={achievements}
          />
        )}
        {isRegistrationOpen && (
          <TrainingRegistrationModal
            isOpen={isRegistrationOpen}
            onClose={() => setIsRegistrationOpen(false)}
            clubs={clubs}
          />
        )}
      </Suspense>

    </div>
  );
}