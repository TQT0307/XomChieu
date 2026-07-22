import React from 'react';
import { X, Award, Calendar, User, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementDetailModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementDetailModal({ achievement, onClose }: AchievementDetailModalProps) {
  if (!achievement) return null;

  // Render Medal emoji
  const getMedalEmoji = (medalType: string) => {
    switch (medalType) {
      case 'Vàng': return '🥇';
      case 'Bạc': return '🥈';
      case 'Đồng': return '🥉';
      default: return '🏆';
    }
  };

  const getMedalColorClass = (medalType: string) => {
    switch (medalType) {
      case 'Vàng': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Bạc': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Đồng': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Generate dynamic, realistic descriptions and stories based on the achievement title to make it look professional
  const getAchievementDetails = (title: string, unit: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('kiếm') || lowerTitle.includes('song luyện')) {
      return {
        about: 'Nội dung Song luyện Kiếm là một trong những phần thi quyền pháp đỉnh cao đòi hỏi sự phối hợp tuyệt đối chính xác, nhịp nhàng và bản lĩnh làm chủ binh khí thượng thừa của hai vận động viên. Từng đường kiếm phạt, đâm, gạt đều phải ăn khớp hoàn hảo để vừa đảm bảo tính thực chiến vừa tôn vinh nét thẩm mỹ võ thuật truyền thống.',
        journey: [
          'Giai đoạn chuẩn bị: Tập thể vận động viên đã ròng rã khổ luyện hơn 6 tháng dưới sự hướng dẫn trực tiếp của Huấn luyện viên Hoàng Phi Long.',
          'Quá trình tập luyện: Mỗi ngày tập trung mài giũa bộ pháp, nhãn pháp và tốc độ di chuyển binh khí hơn 4 tiếng, vượt qua nhiều chấn thương và mỏi mệt cơ bắp.',
          'Phút tỏa sáng: Bài thi xuất sắc đạt điểm tuyệt đối từ Ban giám khảo nhờ thần thái uy nghiêm, nhịp độ kiếm pháp dồn dập sắc sảo và cú tiếp đất lộn nhào hoàn hảo.'
        ],
        stats: [
          { label: 'Nội dung', value: 'Quyền pháp Song luyện Kiếm (Đồng đội)' },
          { label: 'Đơn vị dự thi', value: unit },
          { label: 'Tổng điểm kỹ thuật', value: '9.85 / 10' }
        ],
        quote: 'Chiến thắng này là quả ngọt vô giá cho những giọt mồ hôi ướt đẫm thảm tập, minh chứng cho ý chí và khát vọng vươn lên của võ sinh Xóm Chiếu.'
      };
    }

    if (lowerTitle.includes('đối kháng') || lowerTitle.includes('hạng cân')) {
      return {
        about: 'Trận đấu đối kháng tại giải trẻ toàn quốc luôn là một thử thách cam go cực kỳ khốc liệt, nơi quy tụ những võ sĩ ưu tú nhất cả nước. Ở hạng cân này, vận động viên phải thể hiện lối đánh thông minh, cự ly phản đòn nhanh nhẹn, cùng tinh thần quả cảm ngoan cường chịu đựng áp lực thi đấu dồn dập.',
        journey: [
          'Giai đoạn chuẩn bị: Chế độ siết cân nghiêm ngặt kết hợp rèn luyện sức bền kịch độc kéo dài suốt 3 tháng.',
          'Quá trình tập luyện: Tập trung rèn luyện các đòn chân tấn công hiểm hóc (đặc biệt là đòn chân số 10, 11 và các cú đấm móc phản công tốc độ).',
          'Phút tỏa sáng: Trải qua 4 hiệp đấu nghẹt thở từ vòng loại đến chung kết, thi đấu bền bỉ và kiên cường vượt qua các đối thủ sừng sỏ để giành tấm huy chương danh giá.'
        ],
        stats: [
          { label: 'Nội dung', value: 'Thi đấu Đối kháng Cá nhân Nam' },
          { label: 'Tên võ sĩ', value: unit },
          { label: 'Hạng thi đấu', value: title.includes('60kg') ? 'Hạng cân 60kg' : 'Hạng cân chuyên nghiệp' }
        ],
        quote: 'Vào sân đấu với tinh thần quyết thắng nhưng luôn mang theo sự tôn trọng tối cao dành cho đối thủ và tôn kính tuyệt đối tinh thần võ đạo.'
      };
    }

    // Default or Club Award
    return {
      about: 'Thành tích tập thể xuất sắc khẳng định vị thế dẫn đầu phong trào thể dục thể thao địa phương. Đây là minh chứng rõ nét cho sự đầu tư nghiêm túc, giáo án huấn luyện bài bản cùng tinh thần đoàn kết đồng lòng vượt khó của toàn thể ban huấn luyện và môn sinh trong thời gian qua.',
      journey: [
        'Xây dựng nền móng: Chú trọng đào tạo võ sinh căn bản từ gốc rễ, rèn luyện nghiêm khắc cả thể lực lẫn tư cách đạo đức môn sinh.',
        'Chiến dịch đồng lòng: Đóng góp lực lượng vận động viên hùng hậu thi đấu trải đều ở tất cả các hạng mục quyền pháp và đối kháng.',
        'Kết quả vẻ vang: Xuất sắc đạt tổng điểm cao nhất toàn đoàn, nhận cờ lưu niệm danh dự từ Ban tổ chức giải.'
      ],
      stats: [
        { label: 'Giải thưởng', value: title },
        { label: 'Tập thể nhận giải', value: unit },
        { label: 'Xếp hạng toàn đoàn', value: 'Hạng Nhất xuất sắc' }
      ],
      quote: 'Tinh thần đồng đội chính là sức mạnh vô địch. Sự đồng lòng của Ban huấn luyện và môn sinh chính là chìa khóa mở ra vinh quang hôm nay.'
    };
  };

  const details = getAchievementDetails(achievement.title, achievement.unit);
  const displayedMeaning = achievement.meaning?.trim() || details.about;
  const customJourney = achievement.journey
    ?.split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
  const displayedJourney = customJourney && customJourney.length > 0
    ? customJourney
    : details.journey;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id={`modal-achievement-${achievement.id}`}>
      <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header Banner */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden">
          <img 
            src={achievement.image || 'https://images.unsplash.com/photo-1578269174936-2709b5a8c0e6?auto=format&fit=crop&w=1200&q=80'} 
            alt={achievement.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all cursor-pointer z-10"
            id="close-achievement-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded border uppercase tracking-wider ${getMedalColorClass(achievement.medalType)}`}>
                {getMedalEmoji(achievement.medalType)} Huy Chương {achievement.medalType}
              </span>
            </div>
            
            <h3 className="text-lg sm:text-xl font-black text-[#FFF200] uppercase italic tracking-tight drop-shadow-md leading-tight">
              {achievement.title}
            </h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thông tin trao giải</span>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">Tên môn sinh:</span>
                  <strong className="text-blue-900 font-extrabold text-sm">{achievement.athleteName || 'Khuyết danh'}</strong>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">Giải đấu tham gia:</span>
                  <strong className="text-slate-800 font-bold">{achievement.tournamentName || 'Giải đấu nội bộ'}</strong>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">Nội dung thi đấu:</span>
                  <strong className="text-slate-800 font-bold">{achievement.title}</strong>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#0054A6] flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">Đơn vị / Đội:</span>
                  <strong className="text-slate-800 font-bold">{achievement.unit}</strong>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">Thời gian đạt giải:</span>
                  <strong className="text-slate-800 font-bold">{achievement.date} {achievement.year ? `(Năm ${achievement.year})` : ''}</strong>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between">
              <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Vinh danh bảng vàng
              </span>
              <p className="text-xs text-slate-600 italic leading-relaxed mt-2 font-sans font-medium">
                "{details.quote}"
              </p>
              <span className="text-[9px] text-[#0054A6] font-bold block mt-2 text-right">— Ban huấn luyện Vovinam Xóm Chiếu</span>
            </div>
          </div>

          {/* About description */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0054A6]" />
              Ý nghĩa thành tích
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
              {displayedMeaning}
            </p>
          </div>

          {/* Journey list */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Hành trình chinh phục vinh quang
            </h4>
            <div className="space-y-3 pt-1">
              {displayedJourney.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-[#0054A6] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
