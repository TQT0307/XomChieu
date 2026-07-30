import {
  Award,
  FileText,
  Film,
  FolderOpen,
  MapPinned,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';

/**
 * Keep the Admin navigation definitions outside AdminPanel so icon names cannot
 * accidentally shadow JavaScript globals such as Map, Set, Date or History.
 */
export const ADMIN_CONTENT_TABS = [
  { id: 'categories', label: 'Quản lý Danh mục', icon: FolderOpen, color: 'text-sky-600' },
  { id: 'articles', label: 'Quản lý Bài viết', icon: FileText, color: 'text-[#0054A6]' },
  { id: 'coaches', label: 'Huấn luyện viên', icon: Users, color: 'text-indigo-600' },
  { id: 'members', label: 'Thành viên CLB', icon: Users, color: 'text-emerald-600' },
  { id: 'achievements', label: 'Thành tích đạt được', icon: Award, color: 'text-amber-500' },
  { id: 'tournaments', label: 'Giải đấu tham gia', icon: Trophy, color: 'text-orange-500' },
  { id: 'clubs', label: 'Câu lạc bộ', icon: MapPinned, color: 'text-teal-600' },
  { id: 'highlights', label: 'Video Highlights', icon: Film, color: 'text-purple-600' },
  { id: 'webConfig', label: 'Cấu hình Website', icon: Settings, color: 'text-rose-500' },
] as const;

