import React, { useEffect, useRef, useState } from 'react';
import { 
  Shield, Eye, FileArchive, Swords, Info, Newspaper, 
  Play, Award, User, CheckCircle, MapPin, Mail, Languages, ChevronDown
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
  const [language, setLanguage] = useState<'vi' | 'en'>(() =>
    localStorage.getItem('vovinam_language') === 'en' ? 'en' : 'vi'
  );

  useEffect(() => {
    const applyLanguage = (nextLanguage: 'vi' | 'en') => {
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (!select) return false;
      select.value = nextLanguage === 'en' ? 'en' : '';
      select.dispatchEvent(new Event('change'));
      return true;
    };

    const initializeTranslate = () => {
      const googleTranslate = (window as any).google?.translate?.TranslateElement;
      if (!googleTranslate || document.querySelector('.goog-te-combo')) return;
      new googleTranslate(
        { pageLanguage: 'vi', includedLanguages: 'en,vi', autoDisplay: false },
        'google_translate_element'
      );
      window.setTimeout(() => applyLanguage(language), 250);
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
  }, []);

  const handleLanguageChange = (nextLanguage: 'vi' | 'en') => {
    setLanguage(nextLanguage);
    localStorage.setItem('vovinam_language', nextLanguage);
    document.documentElement.lang = nextLanguage;

    const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (select) {
      select.value = nextLanguage === 'en' ? 'en' : '';
      select.dispatchEvent(new Event('change'));
    }
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
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0054A6] rounded-full flex items-center justify-center overflow-hidden border-2 border-[#FFF200] shadow-md transform hover:rotate-12 transition-transform duration-300">
            {webConfig.logo && !logoLoadFailed ? (
              <img 
                src={webConfig.logo}
                alt="Vovinam Logo" 
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
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
              <Languages className="pointer-events-none absolute left-2 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#FFF200]" />
              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value as 'vi' | 'en')}
                aria-label="Chọn ngôn ngữ"
                className="h-8 appearance-none rounded-lg border border-white/20 bg-white/10 pl-7 pr-6 text-[10px] font-black text-white outline-none transition hover:bg-white/20 focus:border-[#FFF200] cursor-pointer"
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
