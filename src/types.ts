export interface Category {
  id: string; // ID tự chọn
  name: string;
  order: number;
  status: boolean; // Trạng thái hoạt động
  description: string;
}

export interface Article {
  id: number; // ID tự tăng
  image: string;
  title: string;
  categoryId: string; // FK to Category
  content: string;
  date: string;
  views: number;
  status: boolean; // true = hiển thị, false = ẩn
  showInNews?: boolean; // Hiển thị ở Tin tức mới nhất (Tối đa 2 ngày)
}

export interface Member {
  id: string; // ID tự chọn
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
}

export interface Tournament {
  id: string; // ID tự chọn
  image: string;
  name: string;
  date: string;
  location: string;
  status: 'đang diễn ra' | 'sắp diễn ra' | 'đã kết thúc';
}

export interface Club {
  id: string; // ID tự chọn
  image: string;
  name: string;
  headCoach: string; // HLV phụ trách
  address: string; // Địa chỉ
  trainingDays: string; // Ngày tập
  trainingHours: string; // Giờ tập
  status: boolean; // Trạng thái hoạt động
}

export interface Highlight {
  id: string; // ID tự chọn
  thumbnail: string;
  title: string;
  athleteName: string; // Tên VĐV
  mediaType: 'video' | 'ảnh'; // Loại video/ảnh
  status: boolean; // Trạng thái hiển thị
  mediaUrls: string[]; // Cho phép thêm nhiều ảnh và nhiều video trong 1 bài viết
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
}

export interface AdminAccount {
  id: string;
  username: string;
  password?: string;
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
