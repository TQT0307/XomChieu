import React from 'react';
import { X, Calendar, Clock, MapPin, User, ShieldCheck } from 'lucide-react';
import { Club } from '../types';

interface ClubDetailModalProps {
  club: Club | null;
  onClose: () => void;
}

export default function ClubDetailModal({ club, onClose }: ClubDetailModalProps) {
  if (!club) return null;

  // Elegant embed maps search query
  const mapSearchQuery = encodeURIComponent(club.address || club.name);
  const mapIframeUrl = `https://maps.google.com/maps?q=${mapSearchQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Block */}
        <div className="relative h-48 sm:h-60 w-full overflow-hidden">
          <img 
            src={club.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80'} 
            alt={club.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 text-white">
            {club.status !== false ? (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                Đang hoạt động
              </span>
            ) : (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                Ngưng hoạt động
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-black text-[#FFF200] uppercase italic tracking-tight drop-shadow-md">
              {club.name}
            </h3>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b pb-2">Thông tin huấn luyện</h4>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-[#0054A6] mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-bold">HLV Phụ Trách</p>
                <p className="text-sm font-bold text-slate-800">{club.headCoach}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-[#0054A6] mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-bold">Lịch Tập Hàng Tuần</p>
                <p className="text-sm font-bold text-slate-800">{club.trainingDays}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-[#0054A6] mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-bold">Giờ Tập</p>
                <p className="text-sm font-bold text-slate-800">{club.trainingHours}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-[#0054A6] mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-bold">Địa Chỉ Phòng Tập</p>
                <p className="text-xs text-slate-600 font-semibold">{club.address}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Google Map Embed */}
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3">Vị trí Google Map</h4>
            
            <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden min-h-[200px] border border-slate-200 shadow-inner relative">
              <iframe
                title={`Bản đồ ${club.name}`}
                src={mapIframeUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Thông tin đã được xác minh bởi Tổng Đàn Xóm Chiếu
          </span>
          <button 
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
