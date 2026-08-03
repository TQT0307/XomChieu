import React from 'react';
import { X, Calendar, MapPin, ShieldCheck, Info, BookOpen, Trophy, Sparkles } from 'lucide-react';
import { Tournament, getNormalizedTournamentStatus } from '../types';
import { buildGoogleMapsEmbedUrl } from '../utils/googleMaps';
import DetailHeroImage from './DetailHeroImage';
import GoogleMapEmbed from './GoogleMapEmbed';
import useModalScrollLock from '../hooks/useModalScrollLock';

interface TournamentDetailModalProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export default function TournamentDetailModal({ tournament, onClose }: TournamentDetailModalProps) {
  useModalScrollLock(Boolean(tournament), onClose);

  if (!tournament) return null;

  // Google Maps search query based on location
  const mapIframeUrl = buildGoogleMapsEmbedUrl(
    tournament.googleMapUrl,
    [tournament.googleMapPlaceName || tournament.name, tournament.location, 'Việt Nam']
      .filter(Boolean)
      .join(', ')
  );

  // Status-specific styles
  const statusStyles = {
    'đang diễn ra': { bg: 'bg-green-600 text-white', text: 'Đang Diễn Ra' },
    'sắp diễn ra': { bg: 'bg-yellow-500 text-slate-900', text: 'Sắp Diễn Ra' },
    'đã kết thúc': { bg: 'bg-red-600 text-white', text: 'Đã Kết Thúc' }
  };

  const normalizedStatus = getNormalizedTournamentStatus(tournament.status);
  const statusInfo = statusStyles[normalizedStatus];


  // Generate dynamic, realistic descriptions and rules based on the tournament name to make it look professional
  const getTournamentDetails = (name: string) => {
    const isNangDai = name.toLowerCase().includes('đai') || name.toLowerCase().includes('khảo hạch');
    if (isNangDai) {
      return {
        about: 'Kỳ thi khảo hạch nâng đai định kỳ nhằm đánh giá năng lực võ thuật, thể lực và phẩm chất đạo đức của các môn sinh Vovinam Việt Võ Đạo Xóm Chiếu. Đây là bước đệm quan trọng giúp môn sinh chính thức được công nhận cấp đai mới bởi Tổng đàn.',
        schedule: [
          '07:30 - 08:00: Tập trung võ sinh, kiểm tra tác phong võ phục.',
          '08:00 - 09:30: Khảo hạch phần Thể lực (Chạy bền, Hít đất, Bật cóc,...) và Lý thuyết Võ đạo.',
          '09:30 - 11:30: Sát hạch Kỹ thuật (Quyền pháp, Đòn cơ bản, Khóa gỡ, Tự vệ).',
          '11:30 - 12:00: Công bố kết quả sơ bộ và trao đai danh dự.'
        ],
        rules: [
          'Võ phục sạch sẽ, nghiêm chỉnh, mang đầy đủ đai hiện tại.',
          'Không đi muộn quá 10 phút so với giờ tập trung.',
          'Đóng lệ phí thi đầy đủ trước ngày thi.',
          'Tôn trọng giám khảo và giữ gìn trật tự chung.'
        ],
      };
    }
    
    return {
      about: 'Giải đấu võ thuật phong trào và chuyên nghiệp được tổ chức định kỳ nhằm đẩy mạnh tinh thần thượng võ, tạo cơ hội cho các vận động viên, môn sinh được giao lưu, cọ xát thực chiến và cống hiến những màn trình diễn võ thuật đỉnh cao.',
      schedule: [
        'Ngày 1 - Sáng: Khai mạc giải đấu và cân đo trọng lượng vận động viên.',
        'Ngày 1 - Chiều: Thi đấu vòng loại nội dung Đối kháng các hạng cân.',
        'Ngày 2 - Sáng: Thi đấu các nội dung Quyền pháp (Đơn luyện, Song luyện, Đa luyện).',
        'Ngày 2 - Chiều: Chung kết Đối kháng, bế mạc và trao huy chương.'
      ],
      rules: [
        'Áp dụng Luật thi đấu Vovinam hiện hành của Tổng cục Thể dục Thể thao.',
        'Vận động viên phải mang đầy đủ bảo hộ (giáp, mũ, bảo vệ răng, bảo vệ hạ bộ).',
        'Tuyệt đối tuân thủ quyết định của Tổ trọng tài.',
        'Nghiêm cấm các hành vi phi thể thao hoặc sử dụng chất kích thích.'
      ],
    };
  };

  const details = getTournamentDetails(tournament.name);
  const introductionContent = tournament.introduction?.trim() || details.about;
  const scheduleContent = tournament.schedule?.trim() || details.schedule.join('\n');
  const rulesContent = tournament.rules?.trim() || details.rules.join('\n');
  const achievedResults = String(tournament.achievements || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  const getAchievementMedalTheme = (achievement: string) => {
    if (/huy chương\s*vàng/i.test(achievement)) {
      return { label: 'Huy chương Vàng', emoji: '🥇', icon: 'text-yellow-500', box: 'border-yellow-300 bg-yellow-50 shadow-[0_5px_12px_rgba(234,179,8,0.22)]' };
    }
    if (/huy chương\s*bạc/i.test(achievement)) {
      return { label: 'Huy chương Bạc', emoji: '🥈', icon: 'text-slate-500', box: 'border-slate-300 bg-slate-50 shadow-[0_5px_12px_rgba(100,116,139,0.20)]' };
    }
    if (/huy chương\s*đồng/i.test(achievement)) {
      return { label: 'Huy chương Đồng', emoji: '🥉', icon: 'text-amber-700', box: 'border-orange-300 bg-orange-50 shadow-[0_5px_12px_rgba(180,83,9,0.20)]' };
    }
    const normalized = achievement.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
    if (/huy chuong vang|\bvang\b/.test(normalized)) {
      return { label: 'Huy chương Vàng', emoji: '🥇', icon: 'text-yellow-500', box: 'border-yellow-300 bg-yellow-50 shadow-[0_5px_12px_rgba(234,179,8,0.22)]' };
    }
    if (/huy chuong bac|\bbac\b/.test(normalized)) {
      return { label: 'Huy chương Bạc', emoji: '🥈', icon: 'text-slate-500', box: 'border-slate-300 bg-slate-50 shadow-[0_5px_12px_rgba(100,116,139,0.20)]' };
    }
    if (/huy chuong dong|\bdong\b/.test(normalized)) {
      return { label: 'Huy chương Đồng', emoji: '🥉', icon: 'text-amber-700', box: 'border-orange-300 bg-orange-50 shadow-[0_5px_12px_rgba(180,83,9,0.20)]' };
    }
    return { label: 'Thành tích', emoji: '🏆', icon: 'text-[#0054A6]', box: 'border-blue-200 bg-blue-50 shadow-[0_5px_12px_rgba(0,84,166,0.16)]' };
  };
  return (
    <div
      className="modal-scroll-lock fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Đóng cửa sổ chi tiết giải đấu"
      />
      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-slate-50 text-slate-800 shadow-[0_30px_90px_rgba(15,23,42,0.38)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Image */}
        <div className="relative h-[clamp(240px,38vw,380px)] w-full flex-shrink-0 overflow-hidden bg-slate-950">
          <DetailHeroImage
            src={tournament.image || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80'}
            alt={tournament.name}
            foregroundAspectRatio="16:9"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
          
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/40 bg-slate-950/55 p-2.5 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-slate-950/80 cursor-pointer"
            id="close-tournament-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-5 right-16 text-white sm:bottom-6 sm:left-7">
            <span className={`${statusInfo.bg} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2.5 inline-block shadow-md`}>
              {statusInfo.text}
            </span>
            <h3 className="text-xl font-black uppercase italic leading-tight tracking-tight text-[#FFF200] drop-shadow-md sm:text-2xl lg:text-3xl">
              {tournament.name}
            </h3>
          </div>
        </div>

        {/* Content Tabs/Details */}
        <div className="modal-scroll-region min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
          
          {/* Left Side: Information details (8 cols) */}
          <div className="detail-scrollbar md:col-span-7 space-y-4 md:min-h-0 md:overflow-y-auto md:pr-2 lg:pr-3">
            
            {/* Quick meta section */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-[#0054A6] ring-1 ring-blue-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Thời Gian Tổ Chức</p>
                  <p className="text-sm font-black leading-snug text-slate-900">{tournament.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-[#0054A6] ring-1 ring-blue-100">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Địa Điểm Thi Đấu</p>
                  <p className="text-sm font-black leading-snug text-slate-900 line-clamp-1" title={tournament.location}>{tournament.location}</p>
                </div>
              </div>
            </div>

            {/* About / Introduction */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5 text-sm font-black uppercase tracking-wide text-slate-700">
                <Info className="w-4 h-4 text-[#0054A6]" />
                Giới thiệu giải đấu
              </h4>
              <p className="text-sm font-medium leading-7 text-slate-700 sm:text-[15px]">
                {introductionContent}
              </p>
            </section>

            {/* Schedule & Activities */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5 text-sm font-black uppercase tracking-wide text-slate-700">
                <Calendar className="w-4 h-4 text-[#0054A6]" />
                Lịch trình thi đấu & Nội dung
              </h4>
              <p className="whitespace-pre-line text-sm font-semibold leading-7 text-slate-700 sm:text-[15px]">
                {scheduleContent}
              </p>
            </section>

            {/* Rules / Regulations */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5 text-sm font-black uppercase tracking-wide text-slate-700">
                <BookOpen className="w-4 h-4 text-[#0054A6]" />
                Điều lệ & Quy định thi đấu
              </h4>
              <p className="whitespace-pre-line text-sm font-semibold leading-7 text-slate-700 sm:text-[15px]">
                {rulesContent}
              </p>
            </section>



          </div>

          {/* Right Side: Interactive Google Map (5 cols) */}
          <div className="md:col-span-5 flex min-w-0 flex-col gap-4 self-start md:h-full md:min-h-0">
            {/* Fixed achieved results above the compact map: legacy tournaments stay unchanged when empty. */}
            {achievedResults.length > 0 && (
              <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-4 shadow-[0_16px_36px_rgba(217,119,6,0.16)] md:min-h-[205px] md:flex-[2]">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
                <h4 className="relative mb-3 flex items-center gap-2 border-b border-amber-200 pb-2 text-xs font-black uppercase tracking-wider text-amber-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-[0_7px_0_#b45309,0_11px_20px_rgba(180,83,9,0.22)]">
                    <Trophy className="h-4 w-4" />
                  </span>
                  Thành tích đạt được
                  <span className="ml-auto whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-black normal-case tracking-normal text-amber-900 shadow-sm">
                    {achievedResults.length} thành tích
                  </span>
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                </h4>
                <ul className="detail-scrollbar relative min-h-0 space-y-2.5 md:overflow-y-auto md:pr-1">
                  {achievedResults.map((achievement, index) => {
                    const medalTheme = getAchievementMedalTheme(achievement);
                    return (
                      <li key={`${achievement}-${index}`} className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-white/85 px-3 py-2.5 text-sm font-extrabold leading-relaxed text-slate-800 shadow-sm">
                        <span title={medalTheme.label} aria-label={medalTheme.label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${medalTheme.box} ${medalTheme.icon}`}>
                          <span className="text-2xl leading-none" aria-hidden="true">{medalTheme.emoji}</span>
                        </span>
                        <span className="pt-1.5">{achievement}</span>
                      </li>
                    );
                  })}
                </ul>
                {achievedResults.length > 1 && (
                  <p className="mt-2 flex shrink-0 items-center justify-center gap-1 text-[10px] font-bold text-amber-700">
                    <span aria-hidden="true">↕</span>
                    Cuộn để xem đủ {achievedResults.length} thành tích
                  </p>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5 text-sm font-black uppercase tracking-wide text-slate-700">
              <MapPin className="w-4 h-4 text-[#0054A6]" />
              Bản đồ địa điểm thi đấu
            </h4>
            
            <div className="relative h-[88px] w-full flex-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner sm:h-[98px] lg:h-[108px]">
              <GoogleMapEmbed src={mapIframeUrl} title={`Bản đồ giải đấu ${tournament.name}`} />
            </div>
            
            <p className="mt-2 text-center text-[11px] font-semibold italic text-slate-500">
              Bản đồ định vị tự động theo địa điểm thi đấu
            </p>
            </section>

          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-center border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 sm:px-6">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Thông tin Giải đấu được cung cấp chính thức bởi võ đường Vovinam Xóm Chiếu
          </span>
        </div>

      </div>
    </div>
  );
}
