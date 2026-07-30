# V28 - Cuộn cửa sổ chi tiết ổn định

## Đã sửa

- Khóa cuộn trang nền trong khi một cửa sổ xem chi tiết đang mở.
- Khi con trỏ nằm trong nội dung chi tiết, con lăn chỉ cuộn nội dung của cửa sổ đó.
- Khi nội dung đã chạm đầu hoặc cuối, thao tác cuộn không truyền sang trang phía sau.
- Giữ nguyên đúng vị trí trang nền khi đóng cửa sổ chi tiết.
- Bù chiều rộng thanh cuộn để giao diện không bị giật ngang lúc mở/đóng cửa sổ.
- Hỗ trợ thao tác vuốt dọc ổn định trên điện thoại và máy tính bảng.
- Dùng bộ đếm khóa dùng chung để các cửa sổ lồng nhau (ví dụ xem ảnh từ chi tiết thành tích) không mở khóa trang nền sai thời điểm.

## Phạm vi áp dụng

- Bài viết
- Thành tích
- Huấn luyện viên
- Thành viên
- Giải đấu
- Highlights
- Điểm tập
- Cửa sổ xem chi tiết trong Admin

## Kiểm tra

- TypeScript: đạt
- Automated tests: 9/9 đạt
- Production build: đạt
