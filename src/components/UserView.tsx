import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Award, Calendar, MapPin, Play, 
  User, CheckCircle, ShieldCheck, Mail, Phone, Clock, Swords, ExternalLink,
  Facebook, Instagram, AtSign, Music, Info, Newspaper
} from 'lucide-react';
import { 
  Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig 
} from '../types';
import MemberDetailModal from './MemberDetailModal';

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
  activeNavSection,
  setActiveNavSection
}: UserViewProps) {

  // Auto-sliding banners
  const banners = [
    {
      image: '/src/assets/images/vovinam_banner_1_1784098827901.jpg',
      title: 'Đồng Hành Cùng Vovinam Xóm Chiếu',
      subtitle: 'Quy tụ tinh hoa võ thuật cổ truyền, rèn luyện thân thể vững vàng và ý chí tự cường kiên định.'
    },
    {
      image: '/src/assets/images/vovinam_banner_2_1784098844275.jpg',
      title: 'Vinh Quang Việt Võ Đạo',
      subtitle: 'Nhiều huy chương vàng và danh hiệu xuất sắc đạt được tại các giải trẻ toàn quốc.'
    },
    {
      image: '/src/assets/images/vovinam_banner_3_1784098855945.jpg',
      title: 'Hội Tụ Ban Huấn Luyện Tâm Huyết',
      subtitle: 'Võ sư và HLV dày dặn kinh nghiệm, đồng hành sát cánh hướng dẫn từng động tác cho môn sinh.'
    },
    {
      image: '/src/assets/images/vovinam_banner_4_1784098867770.jpg',
      title: 'Năng Động Trẻ Trung & Đam Mê',
      subtitle: 'Tinh thần đồng đội gắn kết keo sơn, đoàn kết học hỏi vì màu cờ sắc áo võ đường.'
    },
    {
      image: '/src/assets/images/vovinam_banner_5_1784098879680.jpg',
      title: 'Học Đường Thể Thao Học Sinh',
      subtitle: 'Tôn vinh rèn luyện đạo đức học sinh, lối sống nghĩa hiệp cao đẹp cùng phong trào thể dục thể thao.'
    },
    {
      image: '/src/assets/images/vovinam_banner_6_1784098891691.jpg',
      title: 'Rèn Luyện Thể Chất Toàn Diện',
      subtitle: 'Củng cố sức khỏe bền bỉ, dẻo dai và bồi đắp khí phách tự tin, sẵn sàng trước mọi thử thách.'
    }
  ];

  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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
    const handleScroll = () => {
      // If manual scrolling is occurring, bypass scrollspy updates to avoid jumping
      if ((window as any)._isManualScrolling) return;

      const scrollPosition = window.scrollY + 160;

      for (const section of navSections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNavSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setActiveNavSection]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Contact state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // News category filter tab selection state
  const [activeNewsTab, setActiveNewsTab] = useState<'LATEST' | string>('LATEST');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setContactName('');
      setContactPhone('');
      setContactMsg('');
    }, 4000);
  };

  // Filter visible items based on status
  const visibleArticles = articles.filter(a => a.status !== false);
  const visibleCoaches = coaches;
  const visibleMembers = members;
  // Filter state for achievements section
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('');
  const [searchAchievementQuery, setSearchAchievementQuery] = useState<string>('');
  const [searchAthleteQuery, setSearchAthleteQuery] = useState<string>(''); // For filtering by athlete name (e.g., "Thiện")

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

  const uniqueYears = Array.from(
    new Set(
      achievements
        .map(a => getYearFromAchievement(a))
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const uniqueTournaments = Array.from(
    new Set(
      achievements
        .map(a => {
          if (a.tournamentName) return a.tournamentName;
          if (a.tournamentId) {
            const tour = tournaments.find(t => t.id === a.tournamentId);
            if (tour) return tour.name;
          }
          return '';
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Helper to find athlete photo
  const getMemberPhotoForAchievement = (ach: Achievement) => {
    if (!ach.athleteName) return ach.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80";
    const normName = ach.athleteName.toLowerCase().trim();
    const matchedMember = members.find(m => {
      const normM = m.fullName.toLowerCase().trim();
      return normM.includes(normName) || normName.includes(normM);
    });
    return (matchedMember && matchedMember.photo) ? matchedMember.photo : (ach.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80");
  };

  const visibleAchievements = achievements.filter(a => {
    if (a.status === false) return false;
    
    // Search query match (achievement title or unit)
    if (searchAchievementQuery.trim()) {
      const q = searchAchievementQuery.toLowerCase();
      const titleMatch = a.title.toLowerCase().includes(q);
      const unitMatch = a.unit && a.unit.toLowerCase().includes(q);
      if (!titleMatch && !unitMatch) return false;
    }

    // Search by athlete name ("ví dụ thiện, không nhất thiết họ và tên")
    if (searchAthleteQuery.trim()) {
      const q = searchAthleteQuery.toLowerCase();
      const athleteMatch = a.athleteName && a.athleteName.toLowerCase().includes(q);
      if (!athleteMatch) return false;
    }
    
    // Tournament match ("theo giải (dựa vào tên giải đấu bên admin tạo)")
    if (selectedTournamentFilter) {
      const tName = a.tournamentName || (a.tournamentId ? tournaments.find(t => t.id === a.tournamentId)?.name : '');
      if (!tName || tName !== selectedTournamentFilter) return false;
    }
    
    // Year match ("theo năm (dựa vào ngày tháng năm bên admin chọn)")
    if (selectedYearFilter) {
      const aYear = getYearFromAchievement(a);
      if (aYear !== selectedYearFilter) return false;
    }
    
    return true;
  });
  const visibleHighlights = highlights.filter(h => h.status !== false);
  const visibleClubs = clubs;

  // Filter articles based on activeNewsTab (Latest vs specific Category)
  const displayedArticles = visibleArticles.filter(article => {
    if (activeNewsTab === 'LATEST') {
      if (!article.showInNews) return false;
      const itemDate = new Date(article.date);
      const now = new Date();
      const d1 = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 2;
    } else {
      return article.categoryId === activeNewsTab;
    }
  });

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 font-sans selection:bg-[#0054A6]/20" id="vovinam-user-root">
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Vovinam Watermark Background Logo */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 select-none overflow-hidden">
        <img 
          src={webConfig.logo || "https://upload.wikimedia.org/wikipedia/vi/8/87/Logo_Vovinam.gif"} 
          alt="Vovinam Watermark Logo" 
          className="w-[85vw] max-w-[550px] aspect-square object-contain animate-[spin_120s_linear_infinite] filter blur-[1px]"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 1. BANNER TỰ CHUYỂN ĐỘNG */}
      <section className="relative h-[360px] sm:h-[500px] bg-slate-950 overflow-hidden z-10" id="section-hero-carousel">
        {/* Carousel slide track */}
        <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
          <img 
            src={banners[currentBanner].image} 
            alt="Vovinam Slide" 
            className="w-full h-full object-cover opacity-100 scale-105 transition-transform duration-[5000ms]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/20 to-transparent"></div>
          {/* Sports style subtle diagonal overlay pattern */}
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(45deg,#0054A6_25%,transparent_25%,transparent_50%,#0054A6_50%,#0054A6_75%,transparent_75%,transparent)] bg-[length:24px_24px]"></div>
        </div>

        {/* Content Box - Positioned elegantly at the bottom left to avoid covering the center graphics */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-end pb-10 sm:pb-12 text-white">
          <div className="max-w-sm bg-slate-950/65 backdrop-blur-[4px] p-4 sm:p-5 rounded-xl border border-white/10 shadow-xl">
            <div className="inline-flex items-center gap-1 bg-[#0054A6]/95 text-[#FFF200] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 border border-[#FFF200]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFF200] animate-ping"></span>
              <span>Môn Phái Việt Võ Đạo</span>
            </div>
            
            <h2 className="text-sm sm:text-base lg:text-lg font-black text-[#FFF200] uppercase tracking-tight italic leading-tight mb-1.5 drop-shadow-md">
              {banners[currentBanner].title}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-200 font-normal leading-relaxed drop-shadow max-w-xs opacity-90">
              {banners[currentBanner].subtitle}
            </p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <a 
                href="#section-about"
                className="bg-gradient-to-r from-[#FFF200] to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-[#0054A6] px-3.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-100 duration-200"
              >
                Khám Phá Võ Đường
              </a>
              <a 
                href="#section-highlights"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3.5 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider backdrop-blur-md transition-all hover:scale-105 active:scale-100 duration-200"
              >
                Thư Viện Ảnh & Video
              </a>
            </div>
          </div>
        </div>

        {/* Manual navigation buttons */}
        <button 
          onClick={prevBanner}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-slate-900/40 hover:bg-[#0054A6] hover:text-[#FFF200] text-white p-3 rounded-full border border-white/10 transition-all cursor-pointer backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={nextBanner}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-slate-900/40 hover:bg-[#0054A6] hover:text-[#FFF200] text-white p-3 rounded-full border border-white/10 transition-all cursor-pointer backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              className={`h-2.5 rounded-full transition-all duration-350 cursor-pointer ${currentBanner === idx ? 'w-10 bg-[#FFF200]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </section>

      {/* Decorative Brand Ribbon to break monotony and space */}
      <section className="bg-gradient-to-r from-[#0054A6] via-[#003d7a] to-[#0054A6] text-white py-4 shadow-md relative z-20 border-y border-[#FFF200]/20">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-around items-center gap-6 text-[11px] sm:text-xs font-black uppercase tracking-widest font-display text-center">
          <div className="flex items-center gap-2">
            <span className="text-[#FFF200] text-lg">⚡</span>
            <span>TỰ HÀO VÕ THUẬT CỔ TRUYỀN VIỆT</span>
          </div>
          <div className="hidden md:flex items-center gap-2 border-l border-white/20 pl-6">
            <span className="text-[#FFF200] text-lg">🔥</span>
            <span>RÈN ĐỨC LUYỆN TÀI — HÀO KHÍ XÓM CHIẾU</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/20 pl-6">
            <span className="text-[#FFF200] text-lg">🤝</span>
            <span>TÔN SƯ TRỌNG ĐẠO & LỐI SỐNG LÀNH MẠNH</span>
          </div>
        </div>
      </section>

      {/* 2. BANNER NẰM TRÊN PHẦN GIỚI THIỆU CLB */}
      <section className="relative -mt-6 max-w-6xl mx-auto px-4 sm:px-6 z-25 scroll-mt-32" id="section-about">
        <div className="bg-white rounded-[2rem] p-8 sm:p-12 shadow-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          
          {/* Absolute corner designs for premium feel */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-yellow-50/50 to-transparent rounded-tr-full pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-[#0054A6] font-black text-xs uppercase tracking-widest block mb-2 font-display bg-blue-50 border border-blue-100 px-3.5 py-1 rounded-full w-fit">
                  Lời ngỏ từ Ban huấn luyện
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic tracking-tight font-display">
                  Giới thiệu CLB Vovinam Xóm Chiếu
                </h2>
                <div className="w-20 h-1.5 bg-gradient-to-r from-[#0054A6] to-[#FFF200] rounded-full mt-3"></div>
              </div>
              
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans space-y-4">
                <p className="border-l-4 border-[#0054A6] pl-4 italic">
                  Được thành lập với tôn chỉ truyền thụ võ thuật và võ đạo Việt Nam, Câu lạc bộ Vovinam Xóm Chiếu là điểm đến rèn luyện sức khỏe, kỷ luật bản thân, và tinh thần tương thân tương ái tuyệt vời của các môn sinh tại Quận 4.
                </p>
                <p>
                  Tại đây, môn sinh không chỉ được trang bị kỹ năng phòng vệ thực chiến, hệ thống đòn chân tấn công danh tiếng, mà còn được nuôi dưỡng tinh thần dũng cảm, tự tôn dân tộc và lối sống lành mạnh, có ích cho xã hội.
                </p>
              </div>
              
              {/* Highlight metrics */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-[#0054A6] font-display">15+</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Năm hoạt động</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-display">300+</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Võ sinh học tập</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-black text-amber-500 font-display">100+</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Huy chương giải</p>
                </div>
              </div>
            </div>

            {/* Club Brand Card Presentation */}
            <div className="md:col-span-5 bg-[#0054A6] text-white p-6 sm:p-8 rounded-3xl border-4 border-[#FFF200] shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 flex flex-col h-[460px]">
              {/* Decorative radial blur background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Swords className="w-48 h-48" />
              </div>
              
              <h3 className="text-lg font-black text-[#FFF200] uppercase italic tracking-tight mb-4 font-display flex items-center gap-2 flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FFF200]" />
                10 Điều Tâm Niệm Vovinam
              </h3>
              
              <div className="overflow-y-auto pr-1 flex-1 space-y-3 text-xs relative z-10 scrollbar-thin scrollbar-thumb-amber-400/50 scrollbar-track-transparent">
                <ul className="space-y-3 text-blue-50 font-medium leading-relaxed">
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Việt Võ Đạo sinh nguyện đạt tới cao độ của Võ thuật để phục vụ dân tộc và nhân loại.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Việt Võ Đạo sinh nguyện tích cực xây dựng đại gia đình Vovinam, cùng nhau đoàn kết thương yêu giúp đỡ lẫn nhau.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Việt Võ Đạo sinh nguyện tôn trọng kỷ luật võ phái, tôn kính sư trưởng, mến yêu đồng môn.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <span>Việt Võ Đạo sinh nguyện tôn trọng pháp luật, bảo vệ danh dự võ phái, giữ gìn thanh danh môn sinh.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                    <span>Việt Võ Đạo sinh nguyện tôn trọng các võ phái khác, chỉ dùng võ để tự vệ và bảo vệ lẽ phải.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
                    <span>Việt Võ Đạo sinh nguyện rèn luyện tâm trí, giữ gìn nề nếp sống trong sạch, giản dị, thành thật và cao thượng.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">7</span>
                    <span>Việt Võ Đạo sinh nguyện kiên trì, vượt qua khó khăn, không kiêu căng, không nản chí trước thử thách.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">8</span>
                    <span>Việt Võ Đạo sinh nguyện thận trọng, suy xét kỹ càng trước khi hành động, luôn sáng suốt quyết định.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">9</span>
                    <span>Việt Võ Đạo sinh nguyện sống vị tha, khoan dung, biết giúp người khác sống và cùng sống lành mạnh.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-[#FFF200] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">10</span>
                    <span>Việt Võ Đạo sinh nguyện bền bỉ rèn luyện, nâng cao ý chí tiến thủ, quyết tâm xây dựng bản thân thành võ đạo sinh gương mẫu.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* 3. TIN MỚI NHẤT (Newspaper layout) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-news">
        {/* Soft decorative background glow to eliminate simple white space */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

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

        {/* Dynamic Category Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12 border-b border-slate-200/60 pb-8 relative z-10">
          <button
            onClick={() => setActiveNewsTab('LATEST')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm border ${
              activeNewsTab === 'LATEST' 
                ? 'bg-gradient-to-r from-[#0054A6] to-blue-800 text-[#FFF200] border-[#FFF200] shadow-blue-900/10 scale-105' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <span className="text-amber-500 animate-pulse text-sm">🔥</span>
            <span>Tin tức mới nhất (2 ngày)</span>
          </button>

          {categories.filter(c => c.status !== false).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveNewsTab(cat.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                activeNewsTab === cat.id 
                  ? 'bg-[#0054A6] text-[#FFF200] border-[#FFF200] shadow-md shadow-blue-900/10 scale-105' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {displayedArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto border border-slate-200/60 shadow-lg relative z-10 animate-in fade-in duration-300">
            <Calendar className="w-12 h-12 text-[#0054A6]/20 mx-auto mb-4" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2 font-display">Chưa có bài viết mới</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              {activeNewsTab === 'LATEST' 
                ? 'Hiện tại không có tin tức tiêu điểm mới nào được đẩy lên trong vòng 2 ngày qua. Bạn vui lòng bấm chọn các danh mục chi tiết phía trên để xem các lưu trữ bài báo cũ.' 
                : 'Hiện tại chưa có bài viết nào thuộc danh mục này, hoặc đang chờ cập nhật.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {displayedArticles.map((article) => {
              const catName = categories.find(c => c.id === article.categoryId)?.name || 'Tin tức';
              return (
                <article 
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl border border-slate-100/80 group cursor-pointer transition-all duration-300 transform hover:-translate-y-2 flex flex-col hover:border-[#0054A6]/30"
                >
                  {/* Responsive Image with requested zoom hover */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                    
                    {/* Category badge */}
                    <span className="absolute top-4 left-4 bg-[#0054A6] text-[#FFF200] text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-[#FFF200]/20 shadow-lg">
                      {catName}
                    </span>
                  </div>

                  {/* Info and excerpt */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                          <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                          {article.date}
                        </span>
                        <span>•</span>
                        <span>Mã: #{article.id}</span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-tight group-hover:text-[#0054A6] transition-colors mt-3 mb-2 line-clamp-2 font-display">
                        {article.title}
                      </h3>
                      
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-sans">
                        {article.content}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/80 flex items-center justify-between text-xs font-black text-[#0054A6] uppercase tracking-wider">
                      <span>Xem chi tiết bài báo</span>
                      <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#FFF200] fill-[#0054A6]" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>


      {/* 4. GIẢI ĐẤU (Tournaments) */}
      <section className="py-20 bg-gradient-to-b from-[#f1f5f9] to-white relative scroll-mt-32" id="section-tournaments">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm inline-block">
              Lịch trình thi đấu & Võ nghiệp
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
              Giải đấu & Sự kiện võ thuật
            </h2>
            <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Nơi ghi nhận các sự kiện thi tài võ thuật, đối kháng, diễn võ nâng đai cấp của võ đường Vovinam Xóm Chiếu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((t) => (
              <div 
                key={t.id}
                onClick={() => onSelectTournament(t)}
                className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-md hover:shadow-2xl cursor-pointer group transition-all duration-300 transform hover:-translate-y-2 flex flex-col hover:border-[#0054A6]/20"
              >
                <div className="relative h-52 overflow-hidden bg-slate-900">
                  <img 
                    src={t.image || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80'} 
                    alt={t.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  
                  {/* Status Indicator Badge with custom colors */}
                  <span className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-lg text-white ${
                    t.status === 'đang diễn ra' ? 'bg-gradient-to-r from-emerald-600 to-green-500 shadow-emerald-950/20' :
                    t.status === 'sắp diễn ra' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-950/20' : 
                    'bg-gradient-to-r from-rose-600 to-red-500 shadow-rose-950/20'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug uppercase group-hover:text-[#0054A6] transition-colors line-clamp-2 font-display">
                      {t.name}
                    </h3>

                    <div className="space-y-2.5 text-xs text-slate-500 mt-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/60">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                        <span className="truncate">Thời gian: <strong className="text-slate-700 font-bold">{t.date}</strong></span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="truncate">Địa điểm: <strong className="text-slate-700 font-bold">{t.location}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100/80 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    <span>Mã sự kiện: #{t.id}</span>
                    <span className="text-[#0054A6] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-extrabold">
                      Xem chi tiết <span className="text-sm">→</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* 5. HIGHLIGHTS (Bento gallery gọn gàng, dễ nhìn, dễ thao tác) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-highlights">
        {/* Soft background decor to avoid monotony */}
        <div className="absolute top-1/3 right-12 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Khoảnh khắc võ thuật tinh anh
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
            Thư viện Highlights tinh hoa
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 max-w-lg mx-auto leading-relaxed">
            Tuyển tập những khoảnh khắc biểu diễn quyền thuật kịch tính, những đòn chân tấn công và bài quyền binh khí thượng thừa.
          </p>
        </div>

        {/* Bento grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {visibleHighlights.map((hl) => (
            <div 
              key={hl.id}
              onClick={() => onSelectHighlight(hl)}
              className="bg-slate-950 text-white rounded-[2rem] p-4 border border-slate-800 cursor-pointer group hover:border-[#FFF200] transition-all duration-300 flex flex-col justify-between h-[310px] hover:shadow-xl hover:shadow-yellow-500/5 hover:-translate-y-1.5"
            >
              {/* Thumbnail Container */}
              <div className="relative h-48 rounded-2xl overflow-hidden bg-black shadow-inner">
                <img 
                  src={hl.thumbnail} 
                  alt={hl.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                
                {/* Dark overlay & play button if video */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                  {hl.mediaType === 'video' && (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#FFF200] to-yellow-400 text-slate-900 rounded-full flex items-center justify-center pl-1 shadow-xl transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-slate-950 fill-current" />
                    </div>
                  )}
                </div>

                {/* Media type badge */}
                <span className="absolute top-3.5 left-3.5 bg-black/75 border border-slate-800 text-[9px] px-2.5 py-1 rounded-xl uppercase font-extrabold tracking-wider text-white">
                  {hl.mediaType} ({hl.mediaUrls?.length || 1})
                </span>
              </div>

              {/* Text Title details */}
              <div className="pt-4 px-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 line-clamp-1 group-hover:text-[#FFF200] transition-colors uppercase tracking-tight font-display">
                    {hl.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl w-fit">
                    <User className="w-3.5 h-3.5 text-[#FFF200]" />
                    <span className="text-[10px] text-slate-300 font-bold">Biểu diễn: {hl.athleteName}</span>
                  </div>
                </div>
                
                <div className="text-right text-[10px] text-[#FFF200] font-black uppercase tracking-wider pt-3 border-t border-slate-900 mt-2 flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-mono">#{hl.id}</span>
                  <span>Xem Chi Tiết &gt;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* 6. THÀNH TÍCH (Achievements) */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden scroll-mt-32" id="section-achievements">
        {/* Dynamic sport background lines and glows */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#FFF200_1px,transparent_1px),linear-gradient(to_bottom,#FFF200_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#FFF200] text-[10px] font-black uppercase tracking-widest bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 shadow-xl inline-block">
              Bảng vàng vinh danh võ đường
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic mt-3 tracking-tight font-display">
              Thành tích xuất sắc & Huy chương đạt được
            </h2>
            <div className="w-12 h-1 bg-[#FFF200] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Sắt son một lòng Võ Đạo Việt Nam, nỗ lực miệt mài gặt hái quả ngọt tại các giải đấu lớn toàn quốc và khu vực.
            </p>
          </div>

          {/* Interactive filter and search controls */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-2xl mb-10 max-w-5xl mx-auto backdrop-blur-md relative z-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Search by Athlete Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#FFF200]">Tìm theo tên môn sinh</label>
                <input 
                  type="text" 
                  value={searchAthleteQuery}
                  onChange={e => setSearchAthleteQuery(e.target.value)}
                  placeholder="Ví dụ: thiện, hải..."
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFF200] placeholder-slate-600 transition-all font-semibold"
                />
              </div>

              {/* Search Input (general query) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Tìm tên thành tích</label>
                <input 
                  type="text" 
                  value={searchAchievementQuery}
                  onChange={e => setSearchAchievementQuery(e.target.value)}
                  placeholder="Nhập tên thành tích, đơn vị..."
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFF200] placeholder-slate-600 transition-all font-semibold"
                />
              </div>

              {/* Tournament Filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Lọc theo Giải đấu</label>
                <select 
                  value={selectedTournamentFilter}
                  onChange={e => setSelectedTournamentFilter(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFF200] font-semibold"
                >
                  <option value="">Tất cả giải đấu ({uniqueTournaments.length})</option>
                  {uniqueTournaments.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Lọc theo Năm</label>
                <select 
                  value={selectedYearFilter}
                  onChange={e => setSelectedYearFilter(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFF200] font-semibold"
                >
                  <option value="">Tất cả các năm ({uniqueYears.length})</option>
                  {uniqueYears.map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Indicator */}
            {(searchAchievementQuery || searchAthleteQuery || selectedTournamentFilter || selectedYearFilter) && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-[10px]">
                <p className="text-slate-400 font-medium">
                  Đang lọc hiển thị: <strong className="text-[#FFF200]">{visibleAchievements.length}</strong> kết quả phù hợp.
                </p>
                <button 
                  onClick={() => {
                    setSearchAchievementQuery('');
                    setSearchAthleteQuery('');
                    setSelectedTournamentFilter('');
                    setSelectedYearFilter('');
                  }}
                  className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Thiết lập lại (Xóa bộ lọc)
                </button>
              </div>
            )}
          </div>

          {visibleAchievements.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 rounded-[2rem] border border-slate-800 max-w-xl mx-auto">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-bold text-slate-400 mt-3">Không tìm thấy thành tích nào phù hợp với bộ lọc!</p>
              <button 
                onClick={() => {
                  setSearchAchievementQuery('');
                  setSearchAthleteQuery('');
                  setSelectedTournamentFilter('');
                  setSelectedYearFilter('');
                }}
                className="mt-4 text-xs font-black text-[#FFF200] uppercase tracking-wider border border-[#FFF200]/30 px-4 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                Xóa các bộ lọc tìm kiếm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleAchievements.map((ach) => (
                <div 
                  key={ach.id}
                  onClick={() => onSelectAchievement(ach)}
                  className="bg-slate-900/60 backdrop-blur-md rounded-[2rem] p-5 border border-slate-800/80 flex items-center gap-5 hover:border-[#FFF200] hover:shadow-2xl hover:shadow-yellow-500/10 hover:-translate-y-1.5 transform cursor-pointer transition-all duration-300 group"
                >
                  {/* Athlete Photo with Medal Badge Overlay */}
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-[#FFF200]/20 group-hover:border-[#FFF200] transition-colors bg-slate-800">
                    <img 
                      src={getMemberPhotoForAchievement(ach)} 
                      alt={ach.athleteName || 'Môn sinh'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    {/* Medal overlay at bottom-right */}
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-slate-900/95 rounded-full flex items-center justify-center text-sm shadow border border-slate-800">
                      {ach.medalType === 'Vàng' ? '🥇' : ach.medalType === 'Bạc' ? '🥈' : ach.medalType === 'Đồng' ? '🥉' : '🏆'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] bg-[#0054A6] text-[#FFF200] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-[#FFF200]/20 flex items-center gap-1">
                        {ach.medalType === 'Vàng' ? '🥇' : ach.medalType === 'Bạc' ? '🥈' : ach.medalType === 'Đồng' ? '🥉' : '🏆'} Huy chương {ach.medalType}
                      </span>
                      <span className="text-[9px] text-[#FFF200] font-extrabold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        Chi tiết →
                      </span>
                    </div>

                    <p className="text-xs text-[#FFF200] font-black tracking-tight flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded-lg w-fit border border-yellow-500/20">
                      👤 Môn sinh: <span className="text-white font-black">{ach.athleteName || 'Khuyết danh'}</span>
                    </p>

                    <h4 className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug truncate group-hover:text-[#FFF200] transition-colors font-display" title={ach.title}>
                      🥋 Nội dung: {ach.title}
                    </h4>

                    {ach.tournamentName && (
                      <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        🏅 {ach.tournamentName}
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
          )}

        </div>
      </section>


      {/* 7. BAN HUẤN LUYỆN (Coaches) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 relative scroll-mt-32" id="section-coaches">
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
          <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
            Đội ngũ võ sư tâm huyết
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
            Ban huấn luyện chính nhiệm
          </h2>
          <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Các võ sư, huấn luyện viên có bề dày kinh nghiệm, tâm huyết rèn đức rèn tài cho thế hệ học viên môn phái.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {visibleCoaches.map((coach) => (
            <div 
              key={coach.id}
              className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-md text-center group hover:border-[#0054A6]/30 hover:shadow-2xl transition-all duration-350 transform hover:-translate-y-2 flex flex-col justify-between"
            >
              <div>
                {/* Photo with beautiful dual ring indicator */}
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden p-1.5 bg-gradient-to-tr from-[#0054A6] to-[#FFF200] shadow-xl relative group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 border border-white">
                    <img 
                      src={coach.photo} 
                      alt={coach.fullName} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <h3 className="font-black text-slate-800 text-base sm:text-lg mt-5 uppercase tracking-tight font-display">
                  {coach.fullName}
                </h3>
                
                <div className="flex justify-center items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-black text-[#0054A6] bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                    {coach.rank}
                  </span>
                  {coach.status !== false ? (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                      Ngưng hoạt động
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-2.5 font-mono">
                  Sinh năm: {coach.birthYear}
                </p>

                <p className="text-xs text-slate-600 font-sans leading-relaxed mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-100/80 italic relative">
                  "{coach.experience}"
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                Môn Phái Vovinam Việt Võ Đạo
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* 8. THÀNH VIÊN (Members) */}
      <section className="py-20 bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] border-t border-slate-200/50 scroll-mt-32" id="section-members">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm inline-block">
              Thế hệ tiếp nối xuất sắc
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
              Hồ sơ môn sinh nổi bật
            </h2>
            <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Các môn sinh xuất sắc, gương sáng chăm ngoan học giỏi và tích cực tham gia phong trào thi đua võ thuật Quận 4.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleMembers.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center hover:shadow-xl hover:border-[#0054A6]/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-20 h-20 mx-auto rounded-full p-1 bg-slate-50 border-2 border-slate-200/80 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={m.photo} 
                      alt={m.fullName} 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <h4 className="font-black text-slate-800 text-xs sm:text-sm mt-4 line-clamp-1 font-display uppercase tracking-tight group-hover:text-[#0054A6] transition-colors">
                    {m.fullName}
                  </h4>
                  
                  <div className="flex justify-center items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl uppercase tracking-wider">
                      {m.rank}
                    </span>
                    {m.status !== false ? (
                      <span className="text-[8px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Ngưng HĐ
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[9px] text-slate-400 mt-2.5 uppercase font-extrabold tracking-wider font-mono">
                    Sinh năm {m.birthYear} • ID: {m.id}
                  </div>
                </div>

                <div className="text-[9px] text-[#0054A6] font-extrabold uppercase mt-3.5 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-all duration-300 tracking-wider">
                  Hồ sơ chi tiết →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* 9. CÂU LẠC BỘ (Clubs - embedded map on click) */}
      <section className="py-20 bg-white scroll-mt-32" id="section-clubs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#0054A6] text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm inline-block">
              Mạng lưới điểm tập quận 4
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase italic mt-3 tracking-tight font-display">
              Các điểm tập luyện Vovinam Xóm Chiếu
            </h2>
            <div className="w-12 h-1 bg-[#0054A6] mx-auto mt-3 rounded-full"></div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Môn sinh có thể lựa chọn địa điểm phòng tập và thời gian phù hợp nhất để tham gia rèn luyện. Click để định vị Google Maps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleClubs.map((club) => (
              <div 
                key={club.id}
                onClick={() => onSelectClub(club)}
                className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200/60 hover:border-[#0054A6]/30 cursor-pointer group shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <img 
                    src={club.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80'} 
                    alt={club.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 right-4 z-10">
                    {club.status !== false ? (
                      <span className="bg-emerald-600/90 text-white text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="bg-rose-600/90 text-white text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                        Ngưng hoạt động
                      </span>
                    )}
                  </div>
                  
                  {/* Map Pin Overlay */}
                  <div className="absolute bottom-4 left-4 bg-white text-slate-950 text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                    <span>Xem Bản Đồ Google Map</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-3 leading-tight uppercase group-hover:text-[#0054A6] transition-colors font-display">
                    {club.name}
                  </h3>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                      <span>Phụ trách: <strong className="text-slate-800 font-bold">{club.headCoach}</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                      <span>Lịch & Giờ tập: <strong className="text-slate-800 font-bold">{club.trainingDays} ({club.trainingHours})</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-150 pt-2.5 line-clamp-1 italic">
                      Đ/C: {club.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* 10. LIÊN HỆ & LIÊN KẾT */}
      <section className="py-16 bg-gradient-to-r from-[#0054A6] to-[#003d7a] text-white border-t-4 border-[#FFF200] scroll-mt-32" id="section-contact">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-10">
          
          <div className="max-w-2xl mx-auto">
            <span className="text-[#FFF200] text-[10px] font-black uppercase tracking-widest bg-blue-900/60 px-3 py-1 rounded-xl border border-[#FFF200]/20 inline-block mb-3">
              Khai tâm mở lối võ nghiệp
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase italic text-[#FFF200] font-display">
              Liên hệ võ đường
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-3 leading-relaxed font-sans">
              Bạn có bất cứ thắc mắc nào về khóa học, lịch rèn luyện, đăng ký võ phục hay tham gia câu lạc bộ? Ban huấn luyện luôn sẵn sàng chào đón và giải đáp mọi thông tin!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800">
            {/* Address Card */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl border border-white/10 flex flex-col items-center text-center space-y-3 transform hover:-translate-y-1 transition-all duration-300">
              <div className="bg-gradient-to-br from-[#0054A6] to-blue-800 p-3 rounded-2xl text-[#FFF200] shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-[#0054A6] uppercase text-[9px] tracking-wider mb-1">Địa chỉ võ đường chính</p>
                <p className="text-slate-700 font-bold text-xs leading-relaxed">{webConfig.address}</p>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl border border-white/10 flex flex-col items-center text-center space-y-3 transform hover:-translate-y-1 transition-all duration-300">
              <div className="bg-gradient-to-br from-[#0054A6] to-blue-800 p-3 rounded-2xl text-[#FFF200] shadow-md">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-[#0054A6] uppercase text-[9px] tracking-wider mb-1">Điện thoại hotline hỗ trợ</p>
                <p className="text-slate-700 font-bold text-xs leading-relaxed">{webConfig.phone}</p>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl border border-white/10 flex flex-col items-center text-center space-y-3 transform hover:-translate-y-1 transition-all duration-300">
              <div className="bg-gradient-to-br from-[#0054A6] to-blue-800 p-3 rounded-2xl text-[#FFF200] shadow-md">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-[#0054A6] uppercase text-[9px] tracking-wider mb-1">Hòm thư điện tử Email</p>
                <p className="text-slate-700 font-bold text-xs leading-relaxed break-all">{webConfig.email}</p>
              </div>
            </div>
          </div>

          {/* Social media connections */}
          <div className="pt-8 border-t border-white/10 flex flex-col items-center space-y-4">
            <p className="text-[10px] font-black text-[#FFF200] uppercase tracking-wider">Kết nối qua mạng xã hội truyền thông:</p>
            <div className="flex gap-4">
              {webConfig.facebook && (
                <a 
                  href={webConfig.facebook} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-[#FFF200] hover:text-[#0054A6] transition-all duration-300 font-black"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {webConfig.instagram && (
                <a 
                  href={webConfig.instagram} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-[#FFF200] hover:text-[#0054A6] transition-all duration-300 font-black"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {webConfig.threads && (
                <a 
                  href={webConfig.threads} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-[#FFF200] hover:text-[#0054A6] transition-all duration-300 font-black"
                  title="Threads"
                >
                  <AtSign className="w-5 h-5" />
                </a>
              )}
              {webConfig.tiktok && (
                <a 
                  href={webConfig.tiktok} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-[#FFF200] hover:text-[#0054A6] transition-all duration-300 font-black"
                  title="TikTok"
                >
                  <Music className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <p className="text-[#FFF200] font-black uppercase tracking-widest mb-2 font-display text-base">Vovinam Xóm Chiếu - Việt Võ Đạo</p>
          <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">{webConfig.footerText}</p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-600 font-semibold flex-wrap">
            <span>SEO Title: {webConfig.seoTitle}</span>
            <span>•</span>
            <span>SEO Description: {webConfig.seoDescription}</span>
          </div>
          <div className="w-16 h-0.5 bg-slate-800 mx-auto"></div>
          <p className="text-slate-600 text-[10px] tracking-wider font-mono">© 2026 Toàn bộ mã nguồn & bản quyền được phân phối dưới giấy phép Apache-2.0. Phát triển bởi AI Studio.</p>
        </div>
      </footer>

      {selectedMember && (
        <MemberDetailModal 
          member={selectedMember} 
          achievements={achievements} 
          clubs={clubs} 
          onClose={() => setSelectedMember(null)} 
        />
      )}

    </div>
  );
}
