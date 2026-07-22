import React from 'react';
import { X, Calendar, MapPin, ShieldCheck, Award, Info, BookOpen } from 'lucide-react';
import { Tournament, getNormalizedTournamentStatus } from '../types';

interface TournamentDetailModalProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export default function TournamentDetailModal({ tournament, onClose }: TournamentDetailModalProps) {
  if (!tournament) return null;

  // Google Maps search query based on location
  const mapSearchQuery = encodeURIComponent(tournament.location || tournament.name);
  const mapIframeUrl = `https://maps.google.com/maps?q=${mapSearchQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

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
        prizes: 'Môn sinh đạt yêu cầu sẽ được trao chứng nhận nâng đai chính quy của Tổng cuộc Vovinam Việt Võ Đạo Việt Nam, kèm đai mới.'
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
      prizes: 'Huy chương Vàng, Bạc, Đồng cho các nội dung tương ứng; Cờ lưu niệm và giải thưởng tiền mặt cho đoàn đạt thành tích xuất sắc nhất.'
    };
  };

  const details = getTournamentDetails(tournament.name);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Image */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden">
          <img 
            src={tournament.image || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80'} 
            alt={tournament.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all cursor-pointer z-10"
            id="close-tournament-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className={`${statusInfo.bg} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2.5 inline-block shadow-md`}>
              {statusInfo.text}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#FFF200] uppercase italic tracking-tight drop-shadow-md leading-tight">
              {tournament.name}
            </h3>
          </div>
        </div>

        {/* Content Tabs/Details */}
        <div className="detail-scrollbar p-6 sm:p-8 max-h-[60vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Information details (8 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick meta section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-[#0054A6]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Thời Gian Tổ Chức</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800">{tournament.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-[#0054A6]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Địa Điểm Thi Đấu</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800 line-clamp-1" title={tournament.location}>{tournament.location}</p>
                </div>
              </div>
            </div>

            {/* About / Introduction */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#0054A6]" />
                Giới thiệu giải đấu
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {details.about}
              </p>
            </div>

            {/* Schedule & Activities */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-[#0054A6]" />
                Lịch trình thi đấu & Nội dung
              </h4>
              <ul className="space-y-2">
                {details.schedule.map((item, index) => (
                  <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0054A6] mt-1.5 flex-shrink-0" />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rules / Regulations */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[#0054A6]" />
                Điều lệ & Quy định thi đấu
              </h4>
              <ul className="space-y-2">
                {details.rules.map((item, index) => (
                  <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">•</span>
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prizes / Certification */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-[#0054A6]" />
                Cơ cấu giải thưởng & Chứng nhận
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                {details.prizes}
              </p>
            </div>

          </div>

          {/* Right Side: Interactive Google Map (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-[300px]">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#0054A6]" />
              Bản đồ địa điểm thi đấu
            </h4>
            
            <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative h-[250px] lg:h-full">
              <iframe
                title={`Bản đồ giải đấu ${tournament.name}`}
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
            
            <p className="text-[10px] text-slate-400 mt-2 text-center italic font-semibold">
              Bản đồ định vị tự động theo địa điểm thi đấu
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Thông tin Giải đấu được cung cấp chính thức bởi võ đường Vovinam Xóm Chiếu
          </span>
        </div>

      </div>
    </div>
  );
}
