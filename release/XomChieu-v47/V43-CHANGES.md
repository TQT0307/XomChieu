# V43 - Tên giải đấu, menu không che nội dung và đường vào Admin trực tiếp

## Thay đổi

- Danh sách xổ xuống ở mục Highlights và Thành tích chỉ hiển thị **tên giải đấu**.
- Tên giải được lấy ưu tiên từ bản ghi Giải đấu đang liên kết; tên trùng chỉ hiện một lần và có số lượng bản ghi.
- Danh sách “Xem tất cả” ở Highlights, Huấn luyện viên, Thành viên và các ô tìm kiếm Admin nằm trong luồng bố cục, tự đẩy nội dung phía dưới xuống, không phủ lên thẻ dữ liệu.
- Có thể mở trang quản trị trực tiếp bằng đường dẫn `/#admin`, không cần nhấn logo 5 lần.
- Cách nhấn logo 5 lần vẫn được giữ lại.

## Kiểm tra

- `npm test`: 41/41 bài kiểm tra đạt.
- `npm run lint`: TypeScript không có lỗi.
- `npm run build`: tạo bản production thành công.
