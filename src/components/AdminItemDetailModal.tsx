import React from 'react';
import { 
  X, Calendar, MapPin, User, Clock, Shield, Award, Play, Image as ImageIcon, CheckCircle, XCircle, Tag, Eye 
} from 'lucide-react';
import { Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight } from '../types';

interface AdminItemDetailModalProps {
  tab: string | null;
  item: any | null;
  categories: Category[];
  achievements?: Achievement[];
  clubs?: Club[];
  members?: Member[];
  onClose: () => void;
}

export default function AdminItemDetailModal({ 
  tab, 
  item, 
  categories, 
  achievements = [], 
  clubs = [], 
  members = [], 
  onClose 
}: AdminItemDetailModalProps) {
  if (!tab || !item) return null;

  const renderStatus = (status: any) => {
    if (status === 'đang diễn ra') {
      return <span className="px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 text-xs font-bold rounded-full uppercase">Đang diễn ra</span>;
    }
    if (status === 'sắp diễn ra') {
      return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-bold rounded-full uppercase">Sắp diễn ra</span>;
    }
    if (status === 'đã kết thúc') {
      return <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 text-xs font-bold rounded-full uppercase">Đã kết thúc</span>;
    }
    if (status === true || status === undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full uppercase">
          <CheckCircle className="w-3.5 h-3.5" />
          Kích hoạt / Hoạt động
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-full uppercase">
        <XCircle className="w-3.5 h-3.5" />
        Đang ẩn / Ngưng hoạt động
      </span>
    );
  };

  const getTabTitle = () => {
    switch (tab) {
      case 'articles': return 'Chi tiết Bài viết';
      case 'categories': return 'Chi tiết Danh mục';
      case 'coaches': return 'Chi tiết Huấn luyện viên';
      case 'members': return 'Chi tiết Môn sinh';
      case 'achievements': return 'Chi tiết Bảng vàng Thành tích';
      case 'tournaments': return 'Chi tiết Giải đấu';
      case 'clubs': return 'Chi tiết Câu lạc bộ';
      case 'highlights': return 'Chi tiết Highlights';
      default: return 'Chi tiết bản ghi';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="admin-detail-modal">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header bar */}
        <div className="bg-[#0054A6] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#FFF200] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FFF200]" />
            <h3 className="text-base font-black uppercase tracking-tight italic font-display text-[#FFF200]">
              {getTabTitle()}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-[#FFF200] p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          
          {/* 1. ARTICLE DETAIL VIEW */}
          {tab === 'articles' && (
            <div className="space-y-4">
              {item.image && (
                <div className="h-48 sm:h-64 rounded-2xl overflow-hidden border bg-slate-100">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div>
                <span className="text-[10px] bg-blue-50 text-[#0054A6] border border-blue-100 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                  {categories.find(c => c.id === item.categoryId)?.name || 'Bài viết'}
                </span>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic mt-2.5 font-display leading-tight">
                  {item.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Mã bài viết</span>
                  <span className="font-mono font-bold text-slate-700">#{item.id}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Ngày đăng</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                    {item.date}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Lượt xem</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[#0054A6]" />
                    {item.views} lượt xem
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Hiển thị ở Tin tức mới nhất</span>
                  <span className="font-semibold text-slate-700">
                    {item.showInNews ? 'Có (Tối đa 2 ngày)' : 'Không'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Trạng thái</span>
                  <span className="mt-1 block">{renderStatus(item.status)}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">Nội dung bài viết</span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {item.content}
                </div>
              </div>
            </div>
          )}

          {/* 2. CATEGORY DETAIL VIEW */}
          {tab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-[#0054A6]/5 p-5 rounded-2xl border border-[#0054A6]/10">
                <span className="text-[10px] bg-[#0054A6] text-[#FFF200] px-2 py-0.5 rounded font-black tracking-widest uppercase">Mã danh mục: {item.id}</span>
                <h4 className="text-lg font-black text-slate-800 uppercase italic mt-2.5 font-display">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">Thứ tự hiển thị: <strong className="text-slate-800">{item.order}</strong></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Mô tả danh mục</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border leading-relaxed">{item.description || 'Không có mô tả phụ'}</p>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Trạng thái hoạt động</span>
                  <div className="mt-1">{renderStatus(item.status)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. COACHES DETAIL VIEW */}
          {tab === 'coaches' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#0054A6] to-[#FFF200] shadow-md flex-shrink-0">
                  <img src={item.photo} alt={item.fullName} className="w-full h-full object-cover rounded-full bg-white" referrerPolicy="no-referrer" />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[9px] bg-[#0054A6] text-[#FFF200] px-2.5 py-1 rounded-md font-black tracking-widest uppercase">
                    {item.rank}
                  </span>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tight font-display">
                    {item.fullName}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">Mã HLV: #{item.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Năm sinh</span>
                  <strong className="text-slate-700 text-sm block mt-0.5">{item.birthYear}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Câu lạc bộ</span>
                  <strong className="text-slate-700 text-sm block mt-0.5">{clubs.find(c => c.id === item.clubId)?.name || item.clubId || 'Chưa phân bổ'}</strong>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Trạng thái huấn luyện</span>
                  <div className="mt-1">{renderStatus(item.status)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">Kinh nghiệm & Tiểu sử</span>
                <p className="bg-slate-50 p-4 rounded-2xl border text-sm text-slate-700 leading-relaxed font-sans">
                  "{item.experience || 'Chưa cập nhật kinh nghiệm huấn luyện'}"
                </p>
              </div>
            </div>
          )}

          {/* 4. MEMBERS DETAIL VIEW */}
          {tab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-full overflow-hidden p-1 bg-slate-250 flex-shrink-0 border">
                  <img src={item.photo} alt={item.fullName} className="w-full h-full object-cover rounded-full bg-white" referrerPolicy="no-referrer" />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[9px] bg-emerald-600 text-white px-2.5 py-1 rounded-md font-black tracking-widest uppercase">
                    {item.rank}
                  </span>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tight font-display">
                    {item.fullName}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">Mã môn sinh: #{item.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Năm sinh</span>
                  <strong className="text-slate-700 text-sm block mt-0.5">{item.birthYear}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Câu lạc bộ (Điểm tập)</span>
                  <strong className="text-slate-700 text-sm block mt-0.5">{clubs.find(c => c.id === item.clubId)?.name || item.clubId || 'Chưa phân bổ'}</strong>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Trạng thái</span>
                  <div>{renderStatus(item.status)}</div>
                </div>
              </div>

              {/* Achievements of Member */}
              <div className="space-y-2 pt-2">
                <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">Bảng vàng thành tích cá nhân ({achievements.filter(ach => ach.memberIds?.includes(item.id)).length})</span>
                {achievements.filter(ach => ach.memberIds?.includes(item.id)).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border text-center">Chưa ghi nhận thành tích nào.</p>
                ) : (
                  <div className="space-y-2">
                    {achievements.filter(ach => ach.memberIds?.includes(item.id)).map(ach => (
                      <div key={ach.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border text-xs">
                        <span className="text-lg">{ach.medalType === 'Vàng' ? '🥇' : ach.medalType === 'Bạc' ? '🥈' : ach.medalType === 'Đồng' ? '🥉' : '🏆'}</span>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-800 truncate">{ach.title}</h5>
                          <p className="text-[10px] text-slate-400 truncate">
                            {ach.date} {ach.tournamentName ? `• Giải: ${ach.tournamentName}` : ''} {ach.year ? `(${ach.year})` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. ACHIEVEMENTS DETAIL VIEW */}
          {tab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
                <div className="w-16 h-16 rounded-xl bg-[#FFF200]/10 border border-[#FFF200]/30 flex items-center justify-center text-3xl">
                  {item.medalType === 'Vàng' ? '🥇' : item.medalType === 'Bạc' ? '🥈' : item.medalType === 'Đồng' ? '🥉' : '🏆'}
                </div>
                <div>
                  <span className="text-[9px] bg-[#FFF200] text-slate-900 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                    Huy chương {item.medalType}
                  </span>
                  <h4 className="text-base font-black text-white uppercase italic tracking-tight font-display mt-1">
                    {item.title}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Mã bản ghi</span>
                  <strong className="text-slate-700 block mt-0.5 font-mono">#{item.id}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Thời gian đạt</span>
                  <strong className="text-slate-700 block mt-0.5">{item.date}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Năm</span>
                  <strong className="text-slate-700 block mt-0.5">{item.year || 'Chưa cập nhật'}</strong>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Giải đấu</span>
                  <strong className="text-slate-700 block mt-0.5">{item.tournamentName || 'Chưa cập nhật'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Đơn vị / Võ đường</span>
                  <strong className="text-slate-700 block mt-0.5">{item.unit}</strong>
                </div>
                <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3 rounded-xl border">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Trạng thái hiển thị</span>
                  <div>{renderStatus(item.status)}</div>
                </div>
              </div>

              {/* Associated Members */}
              <div className="space-y-2 pt-2">
                <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">Môn sinh đạt thành tích ({members.filter(m => item.memberIds?.includes(m.id)).length})</span>
                {members.filter(m => item.memberIds?.includes(m.id)).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border text-center">Chưa gắn thông tin môn sinh đạt giải.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {members.filter(m => item.memberIds?.includes(m.id)).map(m => (
                      <div key={m.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border text-xs">
                        <img src={m.photo} alt={m.fullName} className="w-8 h-8 rounded-full object-cover bg-white border" referrerPolicy="no-referrer" />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-slate-800 truncate">{m.fullName}</h5>
                          <p className="text-[9px] text-slate-400 truncate">{m.rank} • ID: {m.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {item.image && (
                <div className="space-y-1.5 pt-2">
                  <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">Hình ảnh chứng nhận</span>
                  <div className="h-44 rounded-xl overflow-hidden border">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. TOURNAMENTS DETAIL VIEW */}
          {tab === 'tournaments' && (
            <div className="space-y-4">
              {item.image && (
                <div className="h-48 sm:h-64 rounded-2xl overflow-hidden border bg-slate-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic font-display leading-tight">
                {item.name}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                    Thời gian diễn ra
                  </span>
                  <strong className="text-slate-700 mt-1 block">{item.date}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Địa điểm thi đấu
                  </span>
                  <strong className="text-slate-700 mt-1 block">{item.location}</strong>
                </div>
                <div className="col-span-1 sm:col-span-2 pt-2 border-t">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Trạng thái giải đấu</span>
                  <div>{renderStatus(item.status)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 7. CLUBS DETAIL VIEW */}
          {tab === 'clubs' && (
            <div className="space-y-4">
              {item.image && (
                <div className="h-48 sm:h-64 rounded-2xl overflow-hidden border bg-slate-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic font-display">
                {item.name}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#0054A6]" />
                    HLV phụ trách chính
                  </span>
                  <strong className="text-slate-700 mt-1 block">{item.headCoach}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0054A6]" />
                    Lịch tập luyện
                  </span>
                  <strong className="text-slate-700 mt-1 block">{item.trainingDays}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Giờ tập luyện</span>
                  <strong className="text-slate-700 mt-1 block">{item.trainingHours}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Trạng thái điểm tập</span>
                  <div className="mt-1">{renderStatus(item.status)}</div>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Địa chỉ chính</span>
                  <strong className="text-slate-700 mt-1 block">{item.address}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 8. HIGHLIGHTS DETAIL VIEW */}
          {tab === 'highlights' && (
            <div className="space-y-4">
              {item.thumbnail && (
                <div className="h-48 sm:h-64 rounded-2xl overflow-hidden border bg-slate-900 relative">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    {item.mediaType === 'video' && (
                      <div className="w-14 h-14 bg-[#FFF200] text-slate-950 rounded-full flex items-center justify-center pl-1 shadow-lg">
                        <Play className="w-6 h-6 fill-current text-slate-950" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic font-display">
                {item.title}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Người thực hiện</span>
                  <strong className="text-slate-700 mt-1 block">{item.athleteName}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Loại truyền thông</span>
                  <strong className="text-[#0054A6] uppercase mt-1 block font-bold">{item.mediaType}</strong>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Trạng thái hiển thị</span>
                  <div>{renderStatus(item.status)}</div>
                </div>
              </div>

              {/* Media links list */}
              {item.mediaUrls && item.mediaUrls.length > 0 && (
                <div className="space-y-2.5">
                  <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 text-[#0054A6]" />
                    Các đường dẫn phương tiện ({item.mediaUrls.length})
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {item.mediaUrls.map((url: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border font-mono text-[11px] text-slate-600 truncate">
                        <span className="bg-[#0054A6] text-white w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                          {index + 1}
                        </span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-700 truncate block flex-1">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer bar with actions */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end border-t border-slate-100 rounded-b-[2rem]">
          <button 
            onClick={onClose}
            className="bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all hover:shadow-lg cursor-pointer"
          >
            Đóng thông tin
          </button>
        </div>

      </div>
    </div>
  );
}
