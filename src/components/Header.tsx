import React, { useEffect, useRef, useState } from 'react';
import { 
  Shield, Eye, FileArchive, Swords, Info, Newspaper, 
  Play, Award, User, CheckCircle, MapPin, Mail, Globe2, ChevronDown
} from 'lucide-react';
import { WebConfig } from '../types';
import { getSectionIdFromHash } from '../utils/detailRoutes';
import {
  advanceAdminShortcut,
  type AdminShortcutState
} from '../utils/adminShortcut';
import { ADMIN_HASH } from '../utils/adminRoute';

const PUBLIC_SECTION_IDS = [
  'section-about',
  'section-news',
  'section-tournaments',
  'section-highlights',
  'section-achievements',
  'section-coaches',
  'section-members',
  'section-clubs',
  'section-contact'
] as const;

type PublicLanguage = 'vi' | 'en';

const readPublicLanguage = (): PublicLanguage => {
  try {
    const translateCookie = decodeURIComponent(
      document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/)?.[1] || ''
    );
    if (translateCookie.endsWith('/en')) return 'en';
  } catch {
    // Ignore a malformed browser cookie and use the saved preference instead.
  }
  return localStorage.getItem('vovinam_language') === 'en' ? 'en' : 'vi';
};

const writeGoogleTranslateCookie = (language: PublicLanguage) => {
  const hostname = window.location.hostname;
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';

  if (language === 'en') {
    document.cookie = 'googtrans=/vi/en; path=/; SameSite=Lax';
    document.cookie = `googtrans=/vi/en; domain=${hostname}; path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `googtrans=; expires=${expires}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=; expires=${expires}; domain=${hostname}; path=/; SameSite=Lax`;
};

/**
 * Google Translate rewrites text nodes outside React. Guard the two DOM
 * operations that otherwise throw NotFoundError when React updates a translated
 * carousel or API-backed section. Installed only for an English session.
 */
const installGoogleTranslateReactSafety = () => {
  const nodePrototype = Node.prototype as any;
  if (nodePrototype.__vovinamTranslateSafetyInstalled) return;

  const originalRemoveChild = nodePrototype.removeChild;
  const originalInsertBefore = nodePrototype.insertBefore;

  nodePrototype.removeChild = function (child: Node) {
    if (child?.parentNode !== this) return child;
    return originalRemoveChild.call(this, child);
  };
  nodePrototype.insertBefore = function (newNode: Node, referenceNode: Node | null) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
  nodePrototype.__vovinamTranslateSafetyInstalled = true;
};
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

  const adminShortcutRef = useRef<AdminShortcutState>({ count: 0, lastClickAt: 0 });
  const historyNavigationFrameRef = useRef<number | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [language] = useState<PublicLanguage>(readPublicLanguage);
  const [isLanguageSwitching, setIsLanguageSwitching] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    if (language !== 'en') return;

    installGoogleTranslateReactSafety();
    const initializeTranslate = () => {
      try {
        const googleTranslate = (window as any).google?.translate?.TranslateElement;
        if (!googleTranslate || document.querySelector('.goog-te-combo')) return;
        new googleTranslate(
          { pageLanguage: 'vi', includedLanguages: 'en,vi', autoDisplay: false },
          'google_translate_element'
        );
      } catch (error) {
        console.error('[Language] Không thể khởi tạo bản dịch an toàn.', error);
      }
    };

    (window as any).vovinamGoogleTranslateInit = initializeTranslate;
    if ((window as any).google?.translate?.TranslateElement) {
      initializeTranslate();
    } else if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=vovinamGoogleTranslateInit';
      script.async = true;
      script.defer = true;
      script.onerror = () => console.error('[Language] Không thể tải dịch vụ Google Translate.');
      document.head.appendChild(script);
    }
  }, [language]);

  const handleLanguageChange = (nextLanguage: PublicLanguage) => {
    if (nextLanguage === language || isLanguageSwitching) return;
    setIsLanguageSwitching(true);
    try {
      localStorage.setItem('vovinam_language', nextLanguage);
      writeGoogleTranslateCookie(nextLanguage);
    } catch (error) {
      console.error('[Language] Không thể lưu lựa chọn ngôn ngữ.', error);
    }
    // Let the progress layer paint first, then reload exactly once. Avoiding a
    // state render before reload reduces work on image-heavy pages.
    window.setTimeout(() => window.location.reload(), 80);
  };

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [webConfig.logo]);

  const markManualNavigation = () => {
    (window as any)._isManualScrolling = true;
    if ((window as any)._manualScrollTimeout) {
      clearTimeout((window as any)._manualScrollTimeout);
    }
    (window as any)._manualScrollTimeout = setTimeout(() => {
      (window as any)._isManualScrolling = false;
    }, 1200);
  };

  const scrollToSection = (sectionId: string, behavior: ScrollBehavior = 'smooth') => {
    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return false;
    markManualNavigation();
    targetEl.scrollIntoView({ behavior, block: 'start' });
    setActiveNavSection?.(sectionId);
    return true;
  };

  const navigateToSection = (sectionId: string) => {
    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState({ vovinamSection: sectionId }, '', nextHash);
    }
    window.dispatchEvent(new CustomEvent('vovinam:section-view', { detail: { path: nextHash } }));
    scrollToSection(sectionId);
    if (sectionId === 'section-contact') {
      window.dispatchEvent(new CustomEvent('vovinam-open-training-registration'));
    }
  };

  useEffect(() => {
    if (isAdmin) return;

    const restoreHistoryPosition = (behavior: ScrollBehavior) => {
      if (historyNavigationFrameRef.current !== null) {
        window.cancelAnimationFrame(historyNavigationFrameRef.current);
      }
      historyNavigationFrameRef.current = window.requestAnimationFrame(() => {
        historyNavigationFrameRef.current = null;
        const sectionId = getSectionIdFromHash(window.location.hash);
        if (PUBLIC_SECTION_IDS.includes(sectionId as (typeof PUBLIC_SECTION_IDS)[number])) {
          scrollToSection(sectionId, behavior);
        } else if (!window.location.hash) {
          markManualNavigation();
          window.scrollTo({ top: 0, behavior });
          setActiveNavSection?.('section-about');
        }
      });
    };

    const handleHistoryNavigation = () => restoreHistoryPosition('smooth');
    window.addEventListener('popstate', handleHistoryNavigation);
    window.addEventListener('hashchange', handleHistoryNavigation);
    restoreHistoryPosition('auto');

    return () => {
      window.removeEventListener('popstate', handleHistoryNavigation);
      window.removeEventListener('hashchange', handleHistoryNavigation);
      if (historyNavigationFrameRef.current !== null) {
        window.cancelAnimationFrame(historyNavigationFrameRef.current);
      }
    };
  }, [isAdmin, setActiveNavSection]);

  const handleLogoClick = () => {
    const shortcut = advanceAdminShortcut(adminShortcutRef.current, Date.now());
    adminShortcutRef.current = shortcut.state;
    if (shortcut.shouldOpenAdmin) {
      window.history.pushState({ vovinamAdmin: true }, '', ADMIN_HASH);
      setIsAdmin(true);
      return;
    }

    // Return home instantly without reloading React, API data, fonts or images.
    if (!isAdmin) {
      if (window.location.hash) {
        window.history.pushState({ vovinamSection: 'section-about' }, '', '/');
      }
      setActiveNavSection?.('section-about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navSections = [
    { id: 'section-about', name: language === 'en' ? 'About' : 'Giới thiệu', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'section-news', name: language === 'en' ? 'News' : 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'section-tournaments', name: language === 'en' ? 'Tournaments' : 'Giải đấu', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'section-highlights', name: 'Highlights', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'section-achievements', name: language === 'en' ? 'Achievements' : 'Thành tích', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'section-coaches', name: language === 'en' ? 'Coaches' : 'Huấn luyện', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'section-members', name: language === 'en' ? 'Members' : 'Môn sinh', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { id: 'section-clubs', name: language === 'en' ? 'Locations' : 'Điểm tập', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'section-contact', name: language === 'en' ? 'Contact' : 'Liên hệ', icon: <Mail className="w-3.5 h-3.5" /> }
  ];

  return (
    <header className="vovinam-dimensional-header bg-[#0054A6] text-white shadow-xl z-30 sticky top-0 border-b-4 border-[#FFF200]" id="vovinam-header">
      {isLanguageSwitching && (
        <div className="notranslate fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm" translate="no" role="status" aria-live="polite">
          <div className="rounded-2xl border border-white/20 bg-[#0054A6] px-6 py-5 text-center shadow-2xl">
            <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-[#FFF200]" />
            <p className="text-sm font-black text-white">{language === 'vi' ? 'Đang chuyển sang English…' : 'Switching to Vietnamese…'}</p>
            <p className="mt-1 text-xs text-blue-100">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
      <div className="mx-auto flex h-20 w-full max-w-[1600px] flex-row items-center gap-2 px-2 sm:px-3 lg:px-4">
        {/* Brand Logo and Name - Left Aligned */}
        <div 
          onClick={handleLogoClick}
          onDoubleClick={event => event.preventDefault()}
          className="notranslate group flex flex-shrink-0 cursor-pointer touch-manipulation select-none items-center gap-2 active:scale-[0.98] transition-transform md:gap-2.5" translate="no"
          title="CLB Vovinam Xóm Chiếu"
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleLogoClick();
            }
          }}
        >
          <div className="vovinam-logo-stage relative flex-shrink-0 p-1">
            <span className="vovinam-logo-aura absolute inset-0 rounded-full bg-[#FFF200]/40 blur-md" aria-hidden="true" />
            <span className="vovinam-logo-orbit vovinam-logo-orbit-outer absolute inset-0 rounded-full border border-dashed border-[#FFF200]/80" aria-hidden="true">
              <span className="absolute left-1/2 top-[-3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#FFF200] shadow-[0_0_8px_2px_rgba(255,242,0,0.9)]" />
            </span>
            <span className="vovinam-logo-orbit vovinam-logo-orbit-inner absolute inset-[3px] rounded-full border border-blue-200/55" aria-hidden="true">
              <span className="absolute bottom-[-2px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_7px_2px_rgba(255,255,255,0.8)]" />
            </span>
            <div className="vovinam-logo-core relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#FFF200] bg-gradient-to-br from-[#0877d1] to-[#003d7a] p-[2px] shadow-[0_0_0_3px_rgba(255,242,0,0.14),0_7px_18px_rgba(0,30,70,0.48)] transition-transform duration-500 group-hover:scale-110 md:h-14 md:w-14">
              {webConfig.logo && !logoLoadFailed ? (
                <img 
                  src={webConfig.logo}
                  alt="Vovinam Logo" 
                  className="vovinam-logo-image block h-full w-full object-contain [image-rendering:auto]"
                  width={1024}
                  height={1024}
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0054A6] text-center text-[9px] font-black uppercase leading-tight text-white">
                  Vovinam<br/>XC
                </div>
              )}
              <span className="vovinam-logo-glint pointer-events-none absolute -inset-y-2 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/55 to-transparent blur-[1px]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-[2px] rounded-full ring-1 ring-inset ring-white/30" aria-hidden="true" />
            </div>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.09] via-white/[0.04] to-transparent px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-3">
            <span className="pointer-events-none absolute -left-10 top-0 h-full w-12 skew-x-[-20deg] bg-white/10 blur-sm transition-transform duration-700 group-hover:translate-x-64" aria-hidden="true" />
            <div className="relative mb-0.5 hidden items-center gap-1.5 sm:flex">
              <span className="h-px w-5 bg-gradient-to-r from-transparent to-[#FFF200]" />
              <span className="text-[7px] font-black uppercase tracking-[0.22em] text-blue-100">{language === 'en' ? 'Viet Vo Dao' : 'Việt Võ Đạo'}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#FFF200] to-transparent" />
            </div>
            <h1 className="relative flex items-center gap-1 whitespace-nowrap text-[11px] font-black uppercase italic leading-none tracking-[-0.025em] text-[#FFF200] drop-shadow-[0_2px_2px_rgba(0,22,55,0.9)] sm:text-sm md:text-base lg:text-lg">
              <Swords className="h-3.5 w-3.5 flex-shrink-0 text-[#FFF200] drop-shadow-[0_0_5px_rgba(255,242,0,0.8)] md:h-4 md:w-4" />
              <span>Vovinam Xóm Chiếu</span>
            </h1>
            <div className="relative mt-1 hidden items-center gap-1.5 sm:flex">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#FFF200] shadow-[0_0_7px_rgba(255,242,0,0.9)] animate-pulse" />
              <p className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-white/90 md:text-[8px] lg:text-[9px]">
                {language === 'en' ? 'Unwavering spirit of Vietnamese martial arts' : 'Sắt son võ đạo Việt Nam'}
              </p>
            </div>
          </div>        </div>

{/* Navigation & Actions Container - Right Aligned */}
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 md:gap-2">
          {!isAdmin && (
            <nav className="notranslate no-scrollbar flex min-w-0 flex-1 flex-row items-center justify-start gap-0.5 overflow-x-auto xl:justify-end whitespace-nowrap py-1 pl-1 md:gap-1" translate="no">
              {navSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToSection(sec.id);
                  }}
                  className={`flex items-center px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg text-[8px] md:text-[8.5px] xl:text-[9px] font-bold uppercase tracking-wide cursor-pointer border transition-all duration-200 ${
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
            <div className="notranslate relative flex-shrink-0" translate="no" title="Chọn ngôn ngữ / Select language">
              <span className="pointer-events-none absolute left-1.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[#FFF200]/50 bg-[#003f80] shadow-sm">
                <Globe2 className="h-3.5 w-3.5 text-[#FFF200]" strokeWidth={2.2} />
              </span>
              <select
                value={language}
                disabled={isLanguageSwitching}
                aria-busy={isLanguageSwitching}
                onChange={(event) => handleLanguageChange(event.target.value as PublicLanguage)}
                aria-label={language === 'en' ? 'Select language' : 'Chọn ngôn ngữ'}
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
