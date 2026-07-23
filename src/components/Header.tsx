import React, { useEffect, useRef, useState } from 'react';
import { 
  Shield, Eye, FileArchive, Swords, Info, Newspaper, 
  Play, Award, User, CheckCircle, MapPin, Mail, Globe2, ChevronDown
} from 'lucide-react';
import { WebConfig } from '../types';

interface HeaderProps {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  webConfig: WebConfig;
  onDownloadZip: () => void;
  isDownloading: boolean;
  activeNavSection?: string;
  setActiveNavSection?: (secId: string) => void;
}

export default function Header({ 
  isAdmin, 
  setIsAdmin, 
  webConfig, 
  onDownloadZip, 
  isDownloading,
  activeNavSection,
  setActiveNavSection
}: HeaderProps) {

  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const logoReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>(() => {
    const translateCookie = decodeURIComponent(
      document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/)?.[1] || ''
    );
    if (translateCookie.endsWith('/en')) return 'en';
    return localStorage.getItem('vovinam_language') === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    // Vietnamese is the native UI, so do not download the large Google
    // Translate script unless English was explicitly selected.
    if (language !== 'en') return;
    const initializeTranslate = () => {
      const googleTranslate = (window as any).google?.translate?.TranslateElement;
      if (!googleTranslate || document.querySelector('.goog-te-combo')) return;
      new googleTranslate(
        { pageLanguage: 'vi', includedLanguages: 'en,vi', autoDisplay: false },
        'google_translate_element'
      );
    };

    (window as any).vovinamGoogleTranslateInit = initializeTranslate;
    if ((window as any).google?.translate?.TranslateElement) {
      initializeTranslate();
    } else if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=vovinamGoogleTranslateInit';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [language]);

  const handleLanguageChange = (nextLanguage: 'vi' | 'en') => {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    localStorage.setItem('vovinam_language', nextLanguage);
    document.documentElement.lang = nextLanguage;

    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    if (nextLanguage === 'en') {
      document.cookie = 'googtrans=/vi/en; path=/; SameSite=Lax';
    } else {
      document.cookie = `googtrans=; expires=${expires}; path=/; SameSite=Lax`;
      document.cookie = `googtrans=; expires=${expires}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
    }

    // Reload once so Google Translate and the selector always start in the same
    // language. This also restores the original Vietnamese DOM without leftovers.
    window.location.reload();
  };

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [webConfig.logo]);

  const handleLogoClick = () => {
    const now = Date.now();
    if (logoReloadTimerRef.current) {
      clearTimeout(logoReloadTimerRef.current);
      logoReloadTimerRef.current = null;
    }

    if (now - lastClickTime < 3000) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        setIsAdmin(!isAdmin);
        setClickCount(0);
        setLastClickTime(now);
        return;
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);

    // On the public site, a normal logo click returns to the homepage and forces
    // a fresh data load. The short delay preserves the existing five-click admin
    // shortcut when the logo is clicked repeatedly.
    if (!isAdmin) {
      logoReloadTimerRef.current = setTimeout(() => {
        window.location.assign('/');
      }, 650);
    }
  };

  const navSections = [
    { id: 'section-about', name: 'Giới thiệu', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'section-news', name: 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'section-tournaments', name: 'Giải đấu', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'section-highlights', name: 'Highlights', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'section-achievements', name: 'Thành tích', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'section-coaches', name: 'Huấn luyện', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'section-members', name: 'Môn sinh', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { id: 'section-clubs', name: 'Điểm tập', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'section-contact', name: 'Liên hệ', icon: <Mail className="w-3.5 h-3.5" /> }
  ];

  return (
    <header className="bg-[#0054A6] text-white shadow-xl z-30 sticky top-0 border-b-4 border-[#FFF200]" id="vovinam-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex flex-row items-center justify-between gap-3 md:gap-4 overflow-hidden">
        {/* Brand Logo and Name - Left Aligned */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 md:gap-3 flex-shrink-0 cursor-pointer select-none active:scale-95 transition-transform"
          title="CLB Vovinam Xóm Chiếu"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0054A6] rounded-full flex items-center justify-center flex-shrink-0 p-[1px] ring-2 ring-[#FFF200] shadow-md hover:rotate-6 transition-transform duration-300">
            {webConfig.logo && !logoLoadFailed ? (
              <img 
                src={webConfig.logo}
                alt="Vovinam Logo" 
                className="block w-full h-full object-contain [image-rendering:auto]"
                width={1024}
                height={1024}
                decoding="async"
                fetchPriority="high"
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <div className="bg-[#0054A6] w-full h-full rounded-full flex items-center justify-center font-black text-[9px] text-center leading-tight uppercase">
                Vovinam<br/>XC
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-tighter text-[#FFF200] uppercase italic flex items-center gap-1 leading-none">
              <Swords className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#FFF200] animate-pulse flex-shrink-0" />
              <span>VOVINAM XÓM CHIẾU</span>
            </h1>
            <p className="text-[7px] md:text-[8px] lg:text-[9px] text-blue-100 font-medium tracking-wider uppercase hidden sm:block mt-0.5">
              Việt Võ Đạo • Sắt son Võ Đạo Việt Nam
            </p>
          </div>
        </div>

        {/* Empty Space in the Middle */}
        <div className="flex-grow hidden lg:block"></div>

        {/* Navigation & Actions Container - Right Aligned */}
        <div className="flex items-center justify-end gap-3 md:gap-4 flex-grow max-w-full overflow-hidden">
          {!isAdmin && (
            <nav className="flex flex-row items-center justify-end gap-1 md:gap-1.5 py-1 overflow-x-auto no-scrollbar whitespace-nowrap px-1 max-w-[50vw] sm:max-w-[60vw] md:max-w-[70vw] lg:max-w-none">
              {navSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const targetEl = document.getElementById(sec.id);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                    setActiveNavSection?.(sec.id);
                    
                    // Disable scrollspy temporarily to avoid jumpy effects
                    (window as any)._isManualScrolling = true;
                    if ((window as any)._manualScrollTimeout) {
                      clearTimeout((window as any)._manualScrollTimeout);
                    }
                    (window as any)._manualScrollTimeout = setTimeout(() => {
                      (window as any)._isManualScrolling = false;
                    }, 1200);
                  }}
                  className={`flex items-center px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg text-[8.5px] md:text-[9px] xl:text-[9.5px] font-bold uppercase tracking-wide cursor-pointer border transition-all duration-200 ${
                    activeNavSection === sec.id
                      ? 'bg-[#FFF200] text-[#0054A6] border-[#FFF200] font-black shadow-md shadow-yellow-500/20 scale-105'
                      : 'text-blue-100 hover:text-white hover:bg-white/10 hover:shadow border-transparent hover:border-white/15'
                  }`}
                >
                  <span>{sec.name}</span>
                </a>
              ))}
            </nav>
          )}

          {!isAdmin && (
            <div className="relative flex-shrink-0" title="Chọn ngôn ngữ / Select language">
              <span className="pointer-events-none absolute left-1.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[#FFF200]/50 bg-[#003f80] shadow-sm">
                <Globe2 className="h-3.5 w-3.5 text-[#FFF200]" strokeWidth={2.2} />
              </span>
              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value as 'vi' | 'en')}
                aria-label="Chọn ngôn ngữ"
                className="h-9 appearance-none rounded-xl border border-white/25 bg-gradient-to-b from-white/15 to-white/5 pl-8 pr-7 text-[10px] font-black text-white shadow-sm outline-none transition hover:border-[#FFF200]/60 hover:bg-white/20 focus:border-[#FFF200] focus:ring-2 focus:ring-[#FFF200]/20 cursor-pointer"
              >
                <option value="vi" className="text-slate-900">VI</option>
                <option value="en" className="text-slate-900">EN</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white" />
            </div>
          )}

          <div id="google_translate_element" className="google-translate-host" aria-hidden="true" />

        </div>
      </div>
    </header>
  );
}
