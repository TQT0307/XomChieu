export interface Category {
  id: string; // ID tự chọn
  name: string;
  order: number;
  status: boolean; // Trạng thái hoạt động
  description: string;
}

export interface Article {
  id: number | string; // ID tự chọn hoặc tự tăng
  image: string;
  title: string;
  categoryId: string; // FK to Category
  content: string;
  date: string;
  views: number;
  status: boolean; // true = hiển thị, false = ẩn
  showInNews?: boolean; // Hiển thị ở Tin tức mới nhất
  featuredAt?: string; // Thời điểm bắt đầu đếm thời gian nổi bật
  featuredDays?: number; // Số ngày nổi bật do Admin chọn riêng cho từng bài
}

export interface Member {
  id: string; // ID tự chọn
  displayOrder?: number; // Thứ tự hiển thị do admin tự chọn
  photo: string;
  fullName: string;
  birthYear: number;
  rank: string; // Đẳng cấp
  clubId: string; // FK to Club/CLB
  status: boolean; // Trạng thái hoạt động
}

export interface Coach {
  id: string; // ID tự chọn
  photo: string;
  fullName: string;
  birthYear: number;
  rank: string; // Đẳng cấp
  clubId: string; // FK to Club
  experience: string; // Kinh nghiệm
  status: boolean; // Trạng thái hoạt động
}

export interface Achievement {
  id: string; // ID tự chọn
  image: string;
  title: string;
  unit: string; // Đơn vị
  medalType: 'Vàng' | 'Bạc' | 'Đồng' | 'Khác';
  date: string;
  status: boolean; // Trạng thái hiển thị
  athleteName?: string; // Họ và tên môn sinh đạt giải
  memberIds?: string[]; // IDs of members achieving this (môn sinh đạt thành tích)
  tournamentId?: string; // FK to Tournament (Giải đấu)
  tournamentName?: string; // Tên giải đấu
  year?: string; // Năm đạt thành tích
  meaning?: string; // Ý nghĩa thành tích do admin nhập (để trống sẽ dùng mặc định)
  journey?: string; // Các chặng hành trình, mỗi dòng là một mục (để trống sẽ dùng mặc định)
  honorTitle?: string; // Tiêu đề khung vinh danh (để trống sẽ dùng mặc định)
  honorQuote?: string; // Nội dung vinh danh (để trống sẽ dùng mặc định)
  honorAttribution?: string; // Người/đơn vị ghi nhận (để trống sẽ dùng mặc định)
}

export interface LegacyAchievementHonorContent {
  title: string;
  quote: string;
  attribution: string;
  remainingJourney: string;
}

/**
 * Older records stored the honor box as three numbered journey lines. Detect
 * that legacy block so it can be displayed and edited in the correct fields
 * without forcing the administrator to re-enter existing content.
 */
export function extractLegacyAchievementHonor(journey?: string): LegacyAchievementHonorContent {
  const lines = (journey || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const normalizedLines = lines.map(line =>
    line
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  );
  const honorIndex = normalizedLines.findIndex(line => line.includes('vinh danh bang vang'));

  if (honorIndex < 0) {
    return {
      title: '',
      quote: '',
      attribution: '',
      remainingJourney: lines.join('\n')
    };
  }

  const cleanTitle = (lines[honorIndex] || '')
    .replace(/^[\s💬🏆⭐✨"'“”‘’—–\-:;,.!?]+/u, '')
    .trim();
  const cleanQuote = (lines[honorIndex + 1] || '')
    .replace(/^[\s"'“”‘’]+/u, '')
    .replace(/[\s"'“”‘’]+$/u, '')
    .trim();
  const cleanAttribution = (lines[honorIndex + 2] || '')
    .replace(/^[\s—–\-]+/u, '')
    .trim();
  const remainingJourney = lines
    .filter((_, index) => index < honorIndex || index > honorIndex + 2)
    .join('\n');

  return {
    title: cleanTitle,
    quote: cleanQuote,
    attribution: cleanAttribution,
    remainingJourney
  };
}

export interface Tournament {
  id: string; // ID tự chọn
  image: string;
  name: string;
  date: string;
  location: string;
  googleMapPlaceName?: string; // Tên địa điểm đúng như trên Google Maps
  googleMapUrl?: string; // HTML/URL nhúng chính xác từ Google Maps
  status: 'đang diễn ra' | 'sắp diễn ra' | 'đã kết thúc';
  introduction?: string; // Giới thiệu giải đấu
  schedule?: string; // Lịch trình giải đấu
  rules?: string; // Điều lệ giải đấu
  achievements?: string; // Các thành tích đạt được, mỗi dòng một nội dung
}

export interface Club {
  id: string; // ID tự chọn
  image: string;
  name: string;
  headCoach: string; // HLV phụ trách (người chính)
  coachIds?: string[]; // Danh sách ID huấn luyện viên phụ trách
  address: string; // Địa chỉ
  trainingDays: string; // Ngày tập
  trainingHours: string; // Giờ tập
  status: boolean; // Trạng thái hoạt động
  googleMapPlaceName?: string; // Tên địa điểm đúng như trên Google Maps
  googleMapUrl?: string; // Bản đồ vệ tinh / nhúng Google Maps
}

export interface Highlight {
  id: string; // ID tự chọn
  thumbnail: string;
  title: string;
  athleteName: string; // Tên VĐV
  athleteIds?: string[]; // Danh sách HLV/thành viên cùng biểu diễn
  mediaType: 'video' | 'ảnh'; // Loại video/ảnh
  status: boolean; // Trạng thái hiển thị
  mediaUrls: string[]; // Cho phép thêm nhiều ảnh và nhiều video trong 1 bài viết
  mediaNotes?: string[]; // Ghi chú tương ứng theo thứ tự của từng ảnh/video
  tournamentId?: string; // Giải đấu liên kết
  tournamentName?: string; // Lưu tên giải để lọc và vẫn hiển thị nếu giải đổi ID
}

export interface BannerConfig {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  position: string; // e.g. "object-[center_70%]"
  zoom?: number; // 100-180, legacy banners default to 100
}

export interface WebConfig {
  clbName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  threads: string;
  tiktok: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  banners?: BannerConfig[];
  bannerHeight?: 'short' | 'medium' | 'large';
}

export interface AdminAccount {
  id: string;
  username: string;
  // Only used transiently when creating or resetting an account. The server
  // never returns either the plaintext password or its hash.
  password?: string;
  hasPassword?: boolean;
  role: 'super' | 'assistant';
  name: string;
  permissions: string[]; // tabs they can access, e.g. ['articles', 'members']
}

export interface EditHistory {
  id: number;
  timestamp: string;
  username: string;
  role: 'super' | 'assistant';
  action: string; // 'Thêm', 'Sửa', 'Xóa', 'Thay đổi cấu hình', 'Cấp tài khoản', etc.
  tab: string; // 'articles', 'categories', etc.
  details: string;
}

export function getBeltStyle(rank: string): { bgClass: string; textClass: string; borderClass: string } {
  const r = (rank || '').toLowerCase().trim();
  // Vovinam: Blue (Lam), Yellow (Hoàng), Red (Hồng), White (Bạch)
  if (r.includes('lam') || r.includes('tự vệ') || r.includes('nhập môn') || r.includes('tu ve')) {
    return {
      bgClass: 'bg-[#0054A6]',
      textClass: 'text-white font-extrabold',
      borderClass: 'border-[#003B75]',
    };
  }
  if (r.includes('hoàng') || r.includes('hoang')) {
    return {
      bgClass: 'bg-[#FFF200]',
      textClass: 'text-[#0054A6] font-extrabold',
      borderClass: 'border-amber-400',
    };
  }
  if (r.includes('hồng') || r.includes('hong') || r.includes('đỏ')) {
    return {
      bgClass: 'bg-[#EE1C24]',
      textClass: 'text-white font-extrabold',
      borderClass: 'border-[#C11017]',
    };
  }
  if (r.includes('bạch') || r.includes('bach') || r.includes('trắng')) {
    return {
      bgClass: 'bg-white',
      textClass: 'text-slate-900 font-black',
      borderClass: 'border-slate-300 shadow-sm',
    };
  }
  // Default fallback
  return {
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700 font-bold',
    borderClass: 'border-emerald-100',
  };
}

export function getNormalizedTournamentStatus(status: any): 'đang diễn ra' | 'sắp diễn ra' | 'đã kết thúc' {
  if (status === 'đang diễn ra' || status === 'sắp diễn ra' || status === 'đã kết thúc') {
    return status;
  }
  if (status === true || status === 'true') {
    return 'đang diễn ra';
  }
  if (status === false || status === 'false') {
    return 'đã kết thúc';
  }
  return 'sắp diễn ra'; // Default fallback
}

const TOURNAMENT_STATUS_PRIORITY: Record<ReturnType<typeof getNormalizedTournamentStatus>, number> = {
  'đang diễn ra': 0,
  'sắp diễn ra': 1,
  'đã kết thúc': 2
};

export function getTournamentStartTimestamp(dateValue?: string): number {
  const value = String(dateValue || '').trim();
  if (!value) return 0;

  const isoDate = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) {
    return Date.UTC(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3])
    );
  }

  const dateParts = [
    ...value.matchAll(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/g)
  ];
  if (dateParts.length > 0) {
    const first = dateParts[0];
    const explicitYear = first[3]
      || [...dateParts].reverse().find(part => part[3])?.[3]
      || value.match(/\b(20\d{2})\b/)?.[1];
    if (explicitYear) {
      return Date.UTC(
        Number(explicitYear),
        Number(first[2]) - 1,
        Number(first[1])
      );
    }
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Shared Admin/public order: ongoing first, upcoming second, completed last.
 * Inside each status group, the newest tournament date comes first.
 */
export function compareTournamentsByStatus(
  first: Pick<Tournament, 'status' | 'date'>,
  second: Pick<Tournament, 'status' | 'date'>
) {
  const statusDifference =
    TOURNAMENT_STATUS_PRIORITY[getNormalizedTournamentStatus(first.status)] -
    TOURNAMENT_STATUS_PRIORITY[getNormalizedTournamentStatus(second.status)];
  if (statusDifference !== 0) return statusDifference;

  return getTournamentStartTimestamp(second.date) -
    getTournamentStartTimestamp(first.date);
}

export interface BeltRankDetails {
  beltColor: 'blue' | 'yellow' | 'red' | 'white' | 'default';
  beltName: string;
  stripesCount: number; // 0, 1, 2, 3
  stripeColor: string; // Hex code
  bgClass: string;
  textClass: string;
  borderClass: string;
  stripeBgClass: string;
}

export function parseBeltRank(rank: string): BeltRankDetails {
  const r = (rank || '').toLowerCase().trim();
  let beltColor: 'blue' | 'yellow' | 'red' | 'white' | 'default' = 'default';
  let stripesCount = 0;
  let stripeColor = '';
  let bgClass = 'bg-slate-800/80';
  let textClass = 'text-white';
  let borderClass = 'border-slate-700';
  let stripeBgClass = '';

  // Determine stripes count based on Vietnamese numerals or numbers
  if (r.includes('nhất') || r.includes('nhat') || r.includes(' 1') || r.includes(' i ') || r.includes('đệ nhất') || r.includes('de nhat') || r.endsWith(' i')) {
    stripesCount = 1;
  } else if (r.includes('nhị') || r.includes('nhi') || r.includes(' 2') || r.includes(' ii') || r.includes('đệ nhị') || r.includes('de nhi')) {
    stripesCount = 2;
  } else if (r.includes('tam') || r.includes(' 3') || r.includes(' iii') || r.includes('đệ tam') || r.includes('de tam')) {
    stripesCount = 3;
  } else if (r.includes('tứ') || r.includes('tu ') || r.includes(' 4') || r.includes(' iv') || r.includes('đệ tứ') || r.includes('de tu')) {
    stripesCount = 4;
  }

  if (r.includes('lam') || r.includes('tự vệ') || r.includes('nhập môn') || r.includes('tu ve')) {
    beltColor = 'blue';
    stripeColor = '#FFF200'; // Yellow stripes
    stripeBgClass = 'bg-[#FFF200]';
    bgClass = 'bg-[#0054A6]/20';
    textClass = 'text-[#FFF200]';
    borderClass = 'border-[#0054A6]';
  } else if (r.includes('hoàng') || r.includes('hoang')) {
    beltColor = 'yellow';
    stripeColor = '#EE1C24'; // Red stripes
    stripeBgClass = 'bg-[#EE1C24]';
    bgClass = 'bg-[#FFF200]/10';
    textClass = 'text-[#FFF200]';
    borderClass = 'border-[#FFF200]';
  } else if (r.includes('hồng') || r.includes('hong') || r.includes('đỏ') || r.includes('do')) {
    beltColor = 'red';
    stripeColor = '#FFFFFF'; // White stripes
    stripeBgClass = 'bg-white';
    bgClass = 'bg-[#EE1C24]/10';
    textClass = 'text-[#EE1C24]';
    borderClass = 'border-[#EE1C24]';
  } else if (r.includes('bạch') || r.includes('bach') || r.includes('trắng') || r.includes('trang')) {
    beltColor = 'white';
    stripeColor = '#0054A6'; // Blue stripes
    stripeBgClass = 'bg-[#0054A6]';
    bgClass = 'bg-white/15';
    textClass = 'text-white';
    borderClass = 'border-white';
  }

  return {
    beltColor,
    beltName: rank,
    stripesCount,
    stripeColor,
    bgClass,
    textClass,
    borderClass,
    stripeBgClass
  };
}

