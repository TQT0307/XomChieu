import { Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig } from './types';

export const initialCategories: Category[] = [
  {
    id: 'TIN_CLB',
    name: 'Tin tức Câu Lạc Bộ',
    order: 1,
    status: true,
    description: 'Các tin tức hoạt động, thông báo nội bộ của CLB Vovinam Xóm Chiếu'
  },
  {
    id: 'GIAI_DAU',
    name: 'Tin tức Giải đấu',
    order: 2,
    status: true,
    description: 'Thông tin, kết quả các giải đấu Vovinam trong nước và quốc tế'
  },
  {
    id: 'KIEU_MAU',
    name: 'Kỹ thuật - Đòn thế',
    order: 3,
    status: true,
    description: 'Hướng dẫn kỹ thuật, đòn chân tấn công, quyền pháp Vovinam'
  }
];

const todayStr = new Date().toISOString().split('T')[0];
const yesterdayStr = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();
const fiveDaysAgoStr = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().split('T')[0];
})();

export const initialArticles: Article[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80',
    title: 'Đại hội Vovinam Xóm Chiếu lần thứ V - Chặng đường phát triển mới',
    categoryId: 'TIN_CLB',
    content: 'Sáng ngày 12/07/2026, Câu lạc bộ Vovinam Xóm Chiếu đã long trọng tổ chức Đại hội tổng kết hoạt động và đề ra phương hướng phát triển giai đoạn 2026 - 2030. Tham dự đại hội có sự hiện diện của các võ sư lão thành, đại diện ban ngành địa phương cùng toàn thể ban huấn luyện và hơn 100 môn sinh xuất sắc.\n\nTrong những năm qua, Vovinam Xóm Chiếu đã không ngừng lớn mạnh, đào tạo hàng ngàn môn sinh, đóng góp nhiều vận động viên xuất sắc cho đội tuyển quận và thành phố. Đại hội đã thống nhất nâng cao chất lượng huấn luyện, đẩy mạnh phong trào tập luyện và nhân rộng các lớp tự vệ cho thanh thiếu niên địa phương.',
    date: todayStr,
    views: 342,
    status: true,
    showInNews: true
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
    title: 'Đội tuyển Vovinam Xóm Chiếu thắng lớn tại Giải Vô Địch Trẻ Toàn Quốc',
    categoryId: 'GIAI_DAU',
    content: 'Giải Vô độp trẻ Vovinam Toàn quốc 2026 vừa khép lại với những trận chung kết kịch tính. Đoàn Vovinam Xóm Chiếu tham gia thi đấu ở 5 nội dung đối kháng và 3 nội dung quyền pháp, xuất sắc mang về 3 Huy chương Vàng, 2 Huy chương Bạc và 1 Huy chương Đồng.\n\nĐây là thành tích xứng đáng cho những tháng ngày khổ luyện miệt mài dưới sự chỉ dẫn tận tình của các huấn luyện viên phụ trách. Các vận động viên trẻ đã thể hiện bản lĩnh thi đấu kiên cường và tinh thần võ đạo cao đẹp của môn phái Vovinam - Việt Võ Đạo.',
    date: yesterdayStr,
    views: 512,
    status: true,
    showInNews: true
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80',
    title: 'Hướng dẫn thực hiện chuẩn xác 12 Đòn chân tấn công căn bản',
    categoryId: 'KIEU_MAU',
    content: 'Đòn chân tấn công là đặc sản độc đáo và làm nên thương hiệu của Vovinam - Việt Võ Đạo trên trường quốc tế. Trong bài viết này, Ban Huấn luyện CLB Vovinam Xóm Chiếu sẽ hướng dẫn chi tiết các bước chuẩn bị, phát lực và tiếp đất an toàn khi thực hiện các đòn chân từ số 1 đến số 12.\n\nYêu cầu cốt lõi là môn sinh cần có bộ tấn vững vàng, lực bật nhảy tốt và sự phối hợp nhịp nhàng giữa hông và chân. Hãy cùng xem video hướng dẫn chi tiết và luyện tập hàng ngày dưới sự giám sát của HLV để tránh chấn thương đáng tiếc nhé!',
    date: fiveDaysAgoStr,
    views: 890,
    status: true,
    showInNews: false
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?auto=format&fit=crop&w=800&q=80',
    title: 'Khai mạc Khóa học Hè Tự Vệ Nữ miễn phí tại khu vực Quận 4',
    categoryId: 'TIN_CLB',
    content: 'Nhằm trang bị cho các bạn nữ kỹ năng phòng vệ bản thân trước các tình huống nguy hiểm thường gặp, CLB Vovinam Xóm Chiếu chính thức khai mạc khóa học kỹ năng tự vệ hè 2026 hoàn toàn miễn phí.\n\nKhóa học kéo dài trong 8 buổi vào các ngày Chủ nhật hàng tuần. Các học viên sẽ được trang bị các thế khóa gỡ, né tránh, phản đòn cơ bản cực kỳ thực chiến và dễ áp dụng.',
    date: fiveDaysAgoStr,
    views: 215,
    status: true,
    showInNews: true
  }
];

export const initialMembers: Member[] = [
  {
    id: 'TV001',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    fullName: 'Nguyễn Thảo Vy',
    birthYear: 2005,
    rank: 'Lam Đai Đệ Tam Cấp',
    clubId: 'CLB_XC',
    status: true
  },
  {
    id: 'TV002',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    fullName: 'Trần Minh Quân',
    birthYear: 2007,
    rank: 'Lam Đai Đệ Nhị Cấp',
    clubId: 'CLB_XC',
    status: true
  },
  {
    id: 'TV003',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    fullName: 'Lê Mỹ Huyền',
    birthYear: 2004,
    rank: 'Lam Đai Đệ Tam Cấp',
    clubId: 'CLB_KH',
    status: false
  }
];

export const initialCoaches: Coach[] = [
  {
    id: 'HLV_THIEN',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    fullName: 'Võ sư Trần Quốc Thiện',
    birthYear: 1988,
    rank: 'Chuẩn Hồng Đai',
    clubId: 'CLB_XC',
    experience: 'Hơn 15 năm giảng dạy Vovinam, Trọng tài quốc gia môn võ Vovinam, Cựu vô địch đối kháng thành phố.',
    status: true
  },
  {
    id: 'HLV_LONG',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    fullName: 'Huấn luyện viên Hoàng Phi Long',
    birthYear: 1992,
    rank: 'Hoàng Đai Đệ Nhị Cấp',
    clubId: 'CLB_XC',
    experience: '8 năm kinh nghiệm đào tạo trẻ, chuyên trách đội tuyển quyền pháp biểu diễn.',
    status: true
  },
  {
    id: 'HLV_HUONG',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    fullName: 'Huấn luyện viên Nguyễn Mai Hương',
    birthYear: 1995,
    rank: 'Hoàng Đai Đệ Nhất Cấp',
    clubId: 'CLB_KH',
    experience: 'Chuyên gia huấn luyện kỹ năng tự vệ nữ và Vovinam Kid cho thiếu nhi.',
    status: false
  }
];

export const initialAchievements: Achievement[] = [
  {
    id: 'TT001',
    image: 'https://images.unsplash.com/photo-1578269174936-2709b5a8c0e6?auto=format&fit=crop&w=600&q=80',
    title: 'Huy chương Vàng - Đồng đội Quyền Song luyện Kiếm',
    unit: 'Đoàn Vovinam Xóm Chiếu',
    medalType: 'Vàng',
    date: '2026-07-06',
    status: true,
    athleteName: 'Nguyễn Thảo Vy',
    tournamentName: 'Giải Vô Địch Trẻ Vovinam Toàn Quốc Lần thứ XXIV',
    year: '2026'
  },
  {
    id: 'TT002',
    image: 'https://images.unsplash.com/photo-1528243097678-73904f09d526?auto=format&fit=crop&w=600&q=80',
    title: 'Huy chương Bạc - Đối kháng Nam 60kg trẻ toàn quốc',
    unit: 'Đoàn Vovinam Xóm Chiếu',
    medalType: 'Bạc',
    date: '2026-07-07',
    status: true,
    athleteName: 'Trần Minh Quân',
    tournamentName: 'Giải Vô Địch Trẻ Vovinam Toàn Quốc Lần thứ XXIV',
    year: '2026'
  },
  {
    id: 'TT003',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
    title: 'Giải Nhất toàn đoàn Hội khỏe Phù Đổng Quận 4',
    unit: 'CLB Vovinam Xóm Chiếu',
    medalType: 'Vàng',
    date: '2026-04-12',
    status: true,
    athleteName: 'Lê Mỹ Huyền',
    tournamentName: 'Đại hội Thể dục Thể thao Quận 4 - Môn Vovinam',
    year: '2026'
  }
];

export const initialTournaments: Tournament[] = [
  {
    id: 'GD001',
    image: 'https://images.unsplash.com/photo-1508847154043-be12a327dc6f?auto=format&fit=crop&w=800&q=80',
    name: 'Giải Vô Địch Vovinam TP. Hồ Chí Minh 2026',
    date: '2026-08-15 đến 2026-08-22',
    location: 'Nhà thi đấu TDTT Phú Thọ, Quận 11',
    status: 'sắp diễn ra'
  },
  {
    id: 'GD002',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
    name: 'Giải Vô Địch Trẻ Vovinam Toàn Quốc Lần thứ XXIV',
    date: '2026-07-03 đến 2026-07-09',
    location: 'Cung Thể Thao Tuyên Sơn, TP. Đà Nẵng',
    status: 'đã kết thúc'
  },
  {
    id: 'GD003',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    name: 'Đại hội Thể dục Thể thao Quận 4 - Môn Vovinam',
    date: '2026-07-10 đến 2026-07-20',
    location: 'Trung tâm TDTT Quận 4, TP.HCM',
    status: 'đang diễn ra'
  }
];

export const initialClubs: Club[] = [
  {
    id: 'CLB_XC',
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80',
    name: 'Vovinam Xóm Chiếu (Trụ sở chính)',
    headCoach: 'Võ sư Trần Quốc Thiện',
    address: 'Số 122 Đường Xóm Chiếu, Phường 14, Quận 4, TP. Hồ Chí Minh',
    trainingDays: 'Thứ 2 - Thứ 4 - Thứ 6',
    trainingHours: '18:00 - 19:30 & 19:30 - 21:00',
    status: true
  },
  {
    id: 'CLB_KH',
    image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80',
    name: 'Vovinam Khánh Hội',
    headCoach: 'Huấn luyện viên Hoàng Phi Long',
    address: 'Công viên Khánh Hội, Đường 48, Phường 3, Quận 4, TP. Hồ Chí Minh',
    trainingDays: 'Thứ 3 - Thứ 5 - Thứ 7',
    trainingHours: '17:30 - 19:00',
    status: true
  },
  {
    id: 'CLB_VVT',
    image: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80',
    name: 'Vovinam Vĩnh Hội',
    headCoach: 'Huấn luyện viên Nguyễn Mai Hương',
    address: 'Nhà thiếu nhi Quận 4, Số 6 Hoàng Diệu, Phường 12, Quận 4, TP.HCM',
    trainingDays: 'Chủ Nhật hàng tuần',
    trainingHours: '08:00 - 10:30',
    status: false
  }
];

export const initialHighlights: Highlight[] = [
  {
    id: 'HL001',
    thumbnail: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80',
    title: 'Đòn chân tấn công số 11 điêu luyện tại lễ hội võ thuật',
    athleteName: 'Võ sinh Trần Minh Quân',
    mediaType: 'video',
    status: true,
    mediaUrls: [
      'https://www.w3schools.com/html/mov_bbb.mp4',
      'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'HL002',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
    title: 'Tuyển tập hình ảnh thi đấu đối kháng đẹp mắt tại giải trẻ',
    athleteName: 'Đội tuyển Vovinam Xóm Chiếu',
    mediaType: 'ảnh',
    status: true,
    mediaUrls: [
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'HL003',
    thumbnail: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80',
    title: 'Biểu diễn Tinh Hoa Lưỡng Nghi Kiếm Pháp',
    athleteName: 'Môn sinh Nguyễn Thảo Vy',
    mediaType: 'video',
    status: true,
    mediaUrls: [
      'https://www.w3schools.com/html/movie.mp4',
      'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80'
    ]
  }
];

export const initialWebConfig: WebConfig = {
  clbName: 'Vovinam Việt Võ Đạo Xóm Chiếu',
  logo: '/logo.jpg',
  address: 'Số 122 Đường Xóm Chiếu, Phường 14, Quận 4, TP. Hồ Chí Minh',
  phone: '0903.123.456 - 0989.987.789',
  email: 'vovinamxomchieu@gmail.com',
  facebook: 'https://facebook.com/vovinamxomchieu',
  instagram: 'https://instagram.com/vovinamxomchieu',
  threads: 'https://threads.net/@vovinamxomchieu',
  tiktok: 'https://tiktok.com/@vovinamxomchieu',
  footerText: '© 2026 Vovinam Việt Võ Đạo Xóm Chiếu - Sắt son một lòng Võ Đạo Việt Nam. Thiết kế tinh tế, tối ưu hiệu năng.',
  seoTitle: 'CLB Vovinam Xóm Chiếu - Việt Võ Đạo Quận 4',
  seoDescription: 'Chào mừng đến với Câu lạc bộ Vovinam Xóm Chiếu Quận 4 - Địa chỉ học võ uy tích, rèn luyện thể chất, tinh thần tự tôn dân tộc và võ đạo kiên cường.',
  banners: [
    {
      id: '1',
      image: '/src/assets/images/banner1.jpg',
      title: 'Đồng Hành Cùng Vovinam Xóm Chiếu',
      subtitle: 'Quy tụ tinh hoa võ thuật cổ truyền, rèn luyện thân thể vững vàng và ý chí tự cường kiên định.',
      position: 'object-[center_15%]'
    },
    {
      id: '2',
      image: '/src/assets/images/banner2.jpg',
      title: 'Vinh Quang Việt Võ Đạo',
      subtitle: 'Nhiều huy chương vàng và danh hiệu xuất sắc đạt được tại các giải trẻ toàn quốc.',
      position: 'object-[center_25%]'
    },
    {
      id: '3',
      image: '/src/assets/images/banner3.jpg',
      title: 'Hội Tụ Ban Huấn Luyện Tâm Huyết',
      subtitle: 'Võ sư và HLV dày dặn kinh nghiệm, đồng hành sát cánh hướng dẫn từng động tác cho môn sinh.',
      position: 'object-[center_20%]'
    },
    {
      id: '4',
      image: '/src/assets/images/banner4.jpg',
      title: 'Năng Động Trẻ Trung & Đam Mê',
      subtitle: 'Tinh thần đồng đội gắn kết keo sơn, đoàn kết học hỏi vì màu cờ sắc áo võ đường.',
      position: 'object-[center_70%]'
    },
    {
      id: '5',
      image: '/src/assets/images/banner5.jpg',
      title: 'Học Đường Thể Thao Học Sinh',
      subtitle: 'Tôn vinh rèn luyện đạo đức học sinh, lối sống nghĩa hiệp cao đẹp cùng phong trào thể dục thể thao.',
      position: 'object-[center_50%]'
    }
  ]
};
