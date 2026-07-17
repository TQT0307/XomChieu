import React from 'react';
import { X, Calendar, User, MapPin, Award, Star, Quote } from 'lucide-react';
import { Coach, Club, getBeltStyle } from '../types';

interface CoachDetailModalProps {
  coach: Coach | null;
  clubs: Club[];
  onClose: () => void;
}

export default function CoachDetailModal({
  coach,
  clubs,
  onClose
}: CoachDetailModalProps) {
  if (!coach) return null;

  // Resolve Club Name
  const clubName = clubs.find(c => c.id === coach.clubId)?.name || 'Chưa xác định';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200" id={`modal-coach-${coach.id}`}>
      <div className="bg-slate-900 text-white rounded-[2rem] max-w-2xl w-full overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-[#0054A6]/90 to-blue-950 p-6 sm:p-8 border-b border-white/5">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all cursor-pointer z-10 border border-white/10"
            id="close-coach-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Big Avatar with Glow Ring */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#FFF200] to-orange-400 shadow-xl shadow-blue-950/40 flex-shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                <img 
                  src={coach.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'} 
                  alt={coach.fullName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

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

              <h3 className="text-xl sm:text-2xl font-black text-[#FFF200] uppercase italic tracking-tight font-display">
                {coach.fullName}
              </h3>

              <p className="text-xs text-slate-300 font-semibold uppercase tracking-wide">
                ID: {coach.id} • Năm sinh: {coach.birthYear || 'Chưa cập nhật'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Quick Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
              {(() => {
                const style = getBeltStyle(coach.rank);
                return (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${style.bgClass} ${style.borderClass} ${style.textClass}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Đai đẳng môn phái</span>
                      <span className={`text-xs px-2 py-0.5 rounded border font-black uppercase tracking-wide inline-block mt-0.5 ${style.bgClass} ${style.textClass} ${style.borderClass}`}>
                        {coach.rank}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF200]/10 flex items-center justify-center text-[#FFF200] border border-[#FFF200]/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Câu lạc bộ sinh hoạt</span>
                <span className="text-sm font-black text-slate-100">{clubName}</span>
              </div>
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

          {/* Action Footer */}
          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase px-6 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
