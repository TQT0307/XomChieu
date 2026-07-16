import React from 'react';
import { 
  Shield, Eye, FileArchive, Swords, Info, Newspaper, 
  Play, Award, User, CheckCircle, MapPin, Mail 
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
        {/* Brand Logo and Name */}
        <div className="flex items-center gap-2.5 md:gap-3 flex-shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center p-1 border-2 border-[#FFF200] shadow-md transform hover:rotate-12 transition-transform duration-300">
            {webConfig.logo ? (
              <img 
                src={webConfig.logo} 
                alt="Vovinam Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
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
              <span className="truncate max-w-[120px] xs:max-w-none">{webConfig.clbName}</span>
            </h1>
            <p className="text-[7px] md:text-[8px] lg:text-[9px] text-blue-100 font-medium tracking-wider uppercase hidden sm:block mt-0.5">
              Việt Võ Đạo • Sắt son Võ Đạo Việt Nam
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        {!isAdmin && (
          <nav className="flex flex-row items-center gap-1 md:gap-1.5 py-1 flex-1 justify-center max-w-full overflow-x-auto no-scrollbar whitespace-nowrap px-1 md:px-2">
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

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            id="btn-export-aspnet"
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="hidden md:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md cursor-pointer border border-emerald-500 hover:scale-105 active:scale-95"
            title="Xuất trọn bộ Source Code ASP.NET Core MVC & file SQL Server"
          >
            <FileArchive className="w-3.5 h-3.5 text-[#FFF200]" />
            <span>
              {isDownloading ? 'Đang xuất...' : 'Xuất ASP.NET'}
            </span>
          </button>

          <button
            id="btn-toggle-view-mode"
            onClick={() => setIsAdmin(!isAdmin)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-md transition-all duration-300 cursor-pointer ${
              isAdmin 
                ? 'bg-[#FFF200] text-[#0054A6] border border-white hover:bg-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            {isAdmin ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xem Trang Chủ</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-[#FFF200]" />
                <span className="hidden sm:inline">Quản Trị</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
