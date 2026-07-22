import React from 'react';
import { X, Award, Calendar, User, ShieldCheck, MapPin, Trophy, Star } from 'lucide-react';
import { Member, Achievement, Club, getBeltStyle, parseBeltRank } from '../types';
import PersonAvatar from './PersonAvatar';

interface MemberDetailModalProps {
  member: Member | null;
  achievements: Achievement[];
  clubs: Club[];
  onClose: () => void;
  onSelectAchievement?: (achievement: Achievement) => void;
  onZoomPhoto?: (url: string) => void;
}

export default function MemberDetailModal({
  member,
  achievements,
  clubs,
  onClose,
  onSelectAchievement,
  onZoomPhoto
}: MemberDetailModalProps) {
  if (!member) return null;

  // Resolve Club Name
  const clubName = clubs.find(c => c.id === member.clubId)?.name || 'Chưa xác định';

  // Get achievements associated with this member
  const getAchievementYear = (achievement: Achievement) => {
    const explicitYear = Number.parseInt(String(achievement.year || ''), 10);
    if (Number.isFinite(explicitYear)) return explicitYear;
    const yearFromDate = String(achievement.date || '').match(/(?:19|20)\d{2}/);
    return yearFromDate ? Number.parseInt(yearFromDate[0], 10) : Number.MAX_SAFE_INTEGER;
  };

  const memberAchievements = achievements
    .filter(ach => ach.memberIds && ach.memberIds.includes(member.id))
    .sort((a, b) => {
      const yearDifference = getAchievementYear(a) - getAchievementYear(b);
      if (yearDifference !== 0) return yearDifference;
      return String(a.date || '').localeCompare(String(b.date || ''));
    });

  const getMedalEmoji = (medalType: string) => {
    switch (medalType) {
      case 'Vàng': return '🥇';
      case 'Bạc': return '🥈';
      case 'Đồng': return '🥉';
      default: return '🏆';
    }
  };

  const getMedalBg = (medalType: string) => {
    switch (medalType) {
      case 'Vàng': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Bạc': return 'bg-slate-300/15 text-slate-300 border-slate-300/20';
      case 'Đồng': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200" id={`modal-member-${member.id}`}>
      <div className="bg-slate-900 text-white rounded-[2rem] max-w-2xl w-full overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-[#0054A6]/90 to-blue-950 p-6 sm:p-8 border-b border-white/5">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all cursor-pointer z-10 border border-white/10"
            id="close-member-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Big Avatar with Glow Ring */}
            <div 
              onClick={() => {
                if (member.photo && onZoomPhoto) {
                  onZoomPhoto(member.photo);
                }
              }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#FFF200] to-cyan-400 shadow-xl shadow-blue-950/40 flex-shrink-0 cursor-zoom-in hover:scale-105 active:scale-95 transition-transform"
              title="Bấm để xem ảnh phóng to"
            >
              <PersonAvatar
                src={member.photo}
                alt={member.fullName} 
                className="w-full h-full rounded-full object-cover bg-slate-800"
                iconClassName="w-12 h-12"
              />
            </div>

            <div className="text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] bg-[#0054A6] text-[#FFF200] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#FFF200]/20">
                  Hồ sơ môn sinh
                </span>
                {member.status !== false ? (
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
                const details = parseBeltRank(member.rank);
                
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
                        {member.fullName}
                      </h3>
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                        Sinh năm: {member.birthYear}
                      </p>
                    </div>

                    {/* Vovinam Belt Tip Widget integrated right inside the frame */}
                    <div className="flex-shrink-0 flex items-center self-start sm:self-center">
                      <div className={`relative flex items-center h-8 px-2.5 rounded-lg border shadow-lg ${beltBg} border-black/10`}>
                        {/* Belt Rank Label */}
                        <span className={`text-[9px] font-black uppercase tracking-wider ${details.beltColor === 'yellow' ? 'text-[#0054A6]' : 'text-white'}`}>
                          {member.rank}
                        </span>
                        
                        {/* Vertical stitched belt stripes (gạch) */}
                        {details.stripesCount > 0 && (
                          <div className="flex gap-1 pl-2 ml-2 border-l border-black/15 h-full items-center">
                            {Array.from({ length: details.stripesCount }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`w-1 h-5 rounded-sm shadow-sm ${details.stripeBgClass}`}
                                title={`${member.rank} - ${details.stripesCount} Gạch`}
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
        <div className="p-6 sm:p-8 max-h-[55vh] overflow-y-auto space-y-6">
          
          {/* Quick Profile Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trình độ võ thuật</span>
              {(() => {
                const style = getBeltStyle(member.rank);
                return (
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${style.bgClass} ${style.borderClass} ${style.textClass}`}>
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Đẳng cấp (Đai):</span>
                      <strong className={`text-xs px-2.5 py-0.5 rounded border font-black uppercase tracking-wide inline-block mt-0.5 ${style.bgClass} ${style.textClass} ${style.borderClass}`}>
                        {member.rank}
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nơi sinh hoạt</span>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Võ đường / Câu lạc bộ:</span>
                  <strong className="text-slate-200 font-black text-sm">{clubName}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements History Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#FFF200] uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Bảng vàng thành tích ({memberAchievements.length})
            </h4>

            {memberAchievements.length === 0 ? (
              <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-6 text-center text-slate-400 text-xs italic">
                Chưa có dữ liệu thành tích được ghi nhận cho môn sinh này trên hệ thống.
              </div>
            ) : (
              <div className="space-y-3">
                {memberAchievements.map((ach) => (
                  <div 
                    key={ach.id}
                    onClick={() => {
                      if (onSelectAchievement) {
                        onClose();
                        onSelectAchievement(ach);
                      }
                    }}
                    className={`p-4 rounded-2xl border bg-slate-950/40 flex items-center gap-4 transition-all duration-300 ${
                      onSelectAchievement 
                        ? 'hover:border-[#FFF200]/40 cursor-pointer hover:bg-slate-900/80 group' 
                        : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {getMedalEmoji(ach.medalType)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getMedalBg(ach.medalType)}`}>
                          Huy chương {ach.medalType}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">{ach.date}</span>
                      </div>
                      <h5 className="font-bold text-slate-100 text-xs sm:text-sm truncate group-hover:text-[#FFF200] transition-colors">
                        {ach.title}
                      </h5>
                      {ach.tournamentName && (
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          Giải đấu: {ach.tournamentName} {ach.year ? `(${ach.year})` : ''}
                        </p>
                      )}
                    </div>
                    
                    {onSelectAchievement && (
                      <span className="text-[10px] text-[#FFF200] font-black uppercase opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        Xem chi tiết &gt;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950/60 px-6 py-4 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-[#0054A6] hover:bg-blue-800 text-[#FFF200] text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl cursor-pointer shadow-lg transition-all"
          >
            Đóng hồ sơ
          </button>
        </div>

      </div>
    </div>
  );
}
