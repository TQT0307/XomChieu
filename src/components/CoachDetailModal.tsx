import React, { useState } from 'react';
import { X, MapPin, Star, Quote, Trophy } from 'lucide-react';
import { Coach, Club, Achievement, parseBeltRank } from '../types';
import PersonAvatar from './PersonAvatar';
import PersonPhotoLightbox from './PersonPhotoLightbox';
import useModalScrollLock from '../hooks/useModalScrollLock';

interface CoachDetailModalProps {
  coach: Coach | null;
  clubs: Club[];
  achievements: Achievement[];
  onClose: () => void;
  onSelectClub?: (club: Club) => void;
  onSelectAchievement?: (achievement: Achievement) => void;
}

export default function CoachDetailModal({
  coach,
  clubs,
  achievements,
  onClose,
  onSelectClub,
  onSelectAchievement
}: CoachDetailModalProps) {
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  useModalScrollLock(Boolean(coach), onClose);

  if (!coach) return null;

  const coachBeltDetails = parseBeltRank(coach.rank);
  const coachBeltRingClass = coachBeltDetails.beltColor === 'blue' ? 'border-[#0054A6]' :
    coachBeltDetails.beltColor === 'yellow' ? 'border-[#FFF200]' :
    coachBeltDetails.beltColor === 'red' ? 'border-[#EE1C24]' :
    coachBeltDetails.beltColor === 'white' ? 'border-white' : 'border-emerald-500';
  const normalizeIdentity = (value?: string) =>
    String(value || '').trim().toLocaleLowerCase('vi');
  const coachId = normalizeIdentity(coach.id);
  const coachName = normalizeIdentity(coach.fullName);
  const responsibleClubs = clubs
    .map(club => {
      const headCoach = normalizeIdentity(club.headCoach);
      const isPrimary = Boolean(headCoach) && (headCoach === coachId || headCoach === coachName);
      const isAssistant = (club.coachIds || []).some(id => normalizeIdentity(id) === coachId);
      const isLegacyAssignment = normalizeIdentity(club.id) === normalizeIdentity(coach.clubId);
      return {
        club,
        role: isPrimary ? 'Chính' as const : 'Phụ' as const,
        isAssigned: isPrimary || isAssistant || isLegacyAssignment
      };
    })
    .filter(item => item.isAssigned)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'Chính' ? -1 : 1;
      return a.club.name.localeCompare(b.club.name, 'vi');
    });

  const getMedalTheme = (medalType: Achievement['medalType']) => {
    switch (medalType) {
      case 'Vàng':
        return {
          icon: 'text-yellow-300',
          box: 'bg-yellow-400/10 border-yellow-300/30',
          label: 'text-yellow-300'
        };
      case 'Bạc':
        return {
          icon: 'text-slate-200',
          box: 'bg-slate-200/10 border-slate-200/30',
          label: 'text-slate-200'
        };
      case 'Đồng':
        return {
          icon: 'text-orange-400',
          box: 'bg-orange-500/10 border-orange-400/30',
          label: 'text-orange-400'
        };
      default:
        return {
          icon: 'text-sky-300',
          box: 'bg-sky-400/10 border-sky-300/30',
          label: 'text-sky-300'
        };
    }
  };

  const getMedalIcon = (medalType: Achievement['medalType']) => {
    switch (medalType) {
      case 'Vàng': return '🥇';
      case 'Bạc': return '🥈';
      case 'Đồng': return '🥉';
      default: return null;
    }
  };

  const getAchievementYear = (achievement: Achievement) => {
    const explicitYear = Number.parseInt(String(achievement.year || ''), 10);
    if (Number.isFinite(explicitYear)) return explicitYear;
    const yearFromDate = String(achievement.date || '').match(/(?:19|20)\d{2}/);
    return yearFromDate ? Number.parseInt(yearFromDate[0], 10) : Number.MAX_SAFE_INTEGER;
  };

  // Achievement.memberIds is also used by the existing admin form when a coach
  // is selected as the award recipient.
  const coachAchievements = achievements
    .filter(achievement => achievement.memberIds?.includes(coach.id))
    .sort((a, b) => {
      const yearDifference = getAchievementYear(a) - getAchievementYear(b);
      return yearDifference !== 0
        ? yearDifference
        : String(a.date || '').localeCompare(String(b.date || ''));
    });

  return (
    <>
    <div
      className="modal-scroll-lock fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      id={`modal-coach-${coach.id}`}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Đóng cửa sổ chi tiết huấn luyện viên"
      />
      <div className="relative z-10 bg-slate-900 text-white rounded-[1.5rem] sm:rounded-[2rem] max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="relative shrink-0 bg-gradient-to-r from-[#0054A6]/90 to-blue-950 p-6 sm:p-8 border-b border-white/5">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all cursor-pointer z-10 border border-white/10"
            id="close-coach-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Big Avatar with Glow Ring */}
            <button
              type="button"
              onClick={() => {
                if (coach.photo) {
                  setIsPhotoViewerOpen(true);
                }
              }}
              disabled={!coach.photo}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 bg-transparent shadow-xl shadow-blue-950/40 flex-shrink-0 transition-transform ${coachBeltRingClass} ${
                coach.photo ? 'cursor-zoom-in hover:scale-105 active:scale-95' : 'cursor-default'
              }`}
              title={coach.photo ? 'Bấm để xem ảnh chi tiết' : undefined}
              aria-label={coach.photo ? `Xem ảnh chi tiết huấn luyện viên ${coach.fullName}` : undefined}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                <PersonAvatar
                  src={coach.photo}
                  alt={coach.fullName} 
                  className="w-full h-full object-cover"
                  iconClassName="w-12 h-12"
                />
              </div>
            </button>

            <div className="text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] bg-[#0054A6] text-[#FFF200] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#FFF200]/20">
                  Ban Huấn Luyện Võ Đường
                </span>
                {coach.status !== false ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20">
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-500/20">
                    Ngưng hoạt động
                  </span>
                )}
              </div>

              {/* Premium Name Frame styled like a Vovinam Belt */}
              {(() => {
                const details = parseBeltRank(coach.rank);
                
                let frameBg = 'bg-slate-900/60 border-slate-700/80 text-white';
                let beltBg = 'bg-slate-700';
                
                if (details.beltColor === 'blue') {
                  frameBg = 'bg-[#0054A6]/20 border-[#0054A6] text-white shadow-[#0054A6]/10';
                  beltBg = 'bg-[#0054A6]';
                } else if (details.beltColor === 'yellow') {
                  frameBg = 'bg-amber-500/10 border-[#FFF200] text-amber-300 shadow-amber-500/5';
                  beltBg = 'bg-[#FFF200]';
                } else if (details.beltColor === 'red') {
                  frameBg = 'bg-[#EE1C24]/10 border-[#EE1C24] text-red-200 shadow-[#EE1C24]/5';
                  beltBg = 'bg-[#EE1C24]';
                } else if (details.beltColor === 'white') {
                  frameBg = 'bg-white/10 border-white text-slate-100 shadow-white/5';
                  beltBg = 'bg-white';
                }

                return (
                  <div className={`mt-3 p-3 sm:p-4 rounded-2xl border-2 shadow-xl flex items-center justify-between gap-4 relative overflow-hidden backdrop-blur-sm ${frameBg} w-full`}>
                    {/* Background glow texture */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/[0.03] pointer-events-none" />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight font-display break-words">
                        {coach.fullName}
                      </h3>
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                        Sinh năm: {coach.birthYear || 'Chưa cập nhật'}
                      </p>
                    </div>

                    {/* Vovinam Belt Tip Widget integrated right inside the frame */}
                    <div className="flex-shrink-0 flex items-center self-start sm:self-center">
                      <div className={`relative flex items-center h-8 px-2.5 rounded-lg border shadow-lg ${beltBg} border-black/10`}>
                        {/* Belt Rank Label */}
                        <span className={`text-[9px] font-black uppercase tracking-wider ${details.beltColor === 'yellow' ? 'text-[#0054A6]' : 'text-white'}`}>
                          {coach.rank}
                        </span>
                        
                        {/* Vertical stitched belt stripes (gạch) */}
                        {details.stripesCount > 0 && (
                          <div className="flex gap-1 pl-2 ml-2 border-l border-black/15 h-full items-center">
                            {Array.from({ length: details.stripesCount }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`w-1 h-5 rounded-sm shadow-sm ${details.stripeBgClass}`}
                                title={`${coach.rank} - ${details.stripesCount} Gạch`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-scroll-region detail-scrollbar min-h-0 p-5 sm:p-8 space-y-6 overflow-y-auto">
          
          {/* Club responsibilities */}
          <div>            <div className="vovinam-depth-card rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/70 to-slate-900/45 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFF200]/25 bg-[#FFF200]/10 text-[#FFF200] shadow-[0_8px_20px_rgba(255,242,0,0.08)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-wider text-slate-200">Câu lạc bộ đang phụ trách</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">Phân công chính và hỗ trợ chuyên môn</span>
                </div>
              </div>
              {responsibleClubs.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {responsibleClubs.map(({ club, role }) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectClub?.(club);
                      }}
                      aria-label={`Xem chi tiết ${club.name}`}
                      aria-haspopup="dialog"
                      title={`Mở hồ sơ ${club.name}`}
                      className={`flex w-full min-w-0 cursor-pointer touch-manipulation select-none items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-white/60 hover:brightness-110 hover:shadow-lg active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF200] ${
                      role === 'Chính'
                        ? 'border-[#FFF200]/35 bg-gradient-to-r from-[#FFF200]/14 to-white/[0.035]'
                        : 'border-sky-400/20 bg-gradient-to-r from-sky-400/10 to-white/[0.025]'
                    }`}>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${role === 'Chính' ? 'bg-[#FFF200] shadow-[0_0_12px_rgba(255,242,0,0.65)]' : 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]'}`} />
                      <span className="min-w-0 flex-1 break-words text-sm font-extrabold leading-snug text-slate-100">{club.name}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        role === 'Chính'
                          ? 'border-[#FFF200]/60 bg-[#FFF200] text-[#003b73]'
                          : 'border-sky-400/35 bg-sky-400/10 text-sky-300'
                      }`}>
                        {role}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="mt-3 block rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm font-bold text-slate-400">Chưa phân công câu lạc bộ</span>
              )}
            </div>
          </div>

          {/* Experience / Biography */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#FFF200] uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-[#FFF200] fill-current" />
              Quá trình hoạt động & thành tích võ sư
            </h4>
            
            <div className="bg-slate-950/60 border border-white/5 p-5 sm:p-6 rounded-2xl relative overflow-hidden">
              <Quote className="absolute -right-3 -top-3 w-24 h-24 text-white/[0.02] transform rotate-12 pointer-events-none" />
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-line italic">
                "{coach.experience || 'Đang cập nhật tiểu sử chi tiết...'}"
              </p>
            </div>
          </div>

          {/* Coach Achievements - only visible inside the detail modal */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#FFF200] uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFF200]" />
              Thành tích của huấn luyện viên
            </h4>

            {coachAchievements.length === 0 ? (
              <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl text-xs text-slate-400 text-center">
                Chưa có dữ liệu thành tích được liên kết với huấn luyện viên này.
              </div>
            ) : (
              <div className="space-y-3">
                {coachAchievements.map(achievement => {
                  const medalTheme = getMedalTheme(achievement.medalType);
                  return (
                  <button
                    type="button"
                    key={achievement.id}
                    onClick={() => {
                      if (onSelectAchievement) {
                        onClose();
                        onSelectAchievement(achievement);
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border border-white/5 bg-slate-950/40 flex items-center gap-4 text-left transition-all ${
                      onSelectAchievement
                        ? 'hover:border-[#FFF200]/40 hover:bg-slate-900/80 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${medalTheme.box} ${medalTheme.icon}`}>
                      {getMedalIcon(achievement.medalType)
                        ? <span className="text-2xl leading-none" aria-hidden="true">{getMedalIcon(achievement.medalType)}</span>
                        : <Trophy className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[9px] font-black uppercase ${medalTheme.label}`}>
                          Huy chương {achievement.medalType}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {achievement.year || achievement.date}
                        </span>
                      </div>
                      <h5 className="mt-1 text-xs sm:text-sm font-bold text-slate-100 truncate">
                        {achievement.title}
                      </h5>
                      {achievement.tournamentName && (
                        <p className="mt-1 text-[10px] text-slate-400 truncate">
                          Giải đấu: {achievement.tournamentName}
                        </p>
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
    {isPhotoViewerOpen && coach.photo && (
      <PersonPhotoLightbox
        src={coach.photo}
        alt={coach.fullName}
        personType="Huấn luyện viên"
        onClose={() => setIsPhotoViewerOpen(false)}
      />
    )}
    </>
  );
}
