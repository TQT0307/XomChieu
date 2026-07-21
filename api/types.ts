export interface Category {
  id: string;
  name: string;
  order: number;
  status: boolean;
  description: string;
}

export interface Article {
  id: number | string;
  image: string;
  title: string;
  categoryId: string;
  content: string;
  date: string;
  views: number;
  status: boolean;
  showInNews?: boolean;
}

export interface Member {
  id: string;
  photo: string;
  fullName: string;
  birthYear: number;
  rank: string;
  clubId: string;
  status: boolean;
}

export interface Coach {
  id: string;
  photo: string;
  fullName: string;
  birthYear: number;
  rank: string;
  clubId: string;
  experience: string;
  status: boolean;
}

export interface Achievement {
  id: string;
  image: string;
  title: string;
  unit: string;
  medalType: 'Vàng' | 'Bạc' | 'Đồng' | 'Khác';
  date: string;
  status: boolean;
  athleteName?: string;
  memberIds?: string[];
  tournamentId?: string;
  tournamentName?: string;
  year?: string;
}

export interface Tournament {
  id: string;
  image: string;
  name: string;
  date: string;
  location: string;
  status: 'đang diễn ra' | 'sắp diễn ra' | 'đã kết thúc';
  introduction?: string;
  schedule?: string;
  rules?: string;
}

export interface Club {
  id: string;
  image: string;
  name: string;
  headCoach: string;
  coachIds?: string[];
  address: string;
  trainingDays: string;
  trainingHours: string;
  status: boolean;
  googleMapUrl?: string;
}

export interface Highlight {
  id: string;
  thumbnail: string;
  title: string;
  athleteName: string;
  mediaType: 'video' | 'ảnh';
  status: boolean;
  mediaUrls: string[];
}

export interface BannerConfig {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  position: string;
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
  password?: string;
  role: 'super' | 'assistant';
  name: string;
  permissions: string[];
}

export interface EditHistory {
  id: number;
  timestamp: string;
  username: string;
  role: 'super' | 'assistant';
  action: string;
  tab: string;
  details: string;
}
