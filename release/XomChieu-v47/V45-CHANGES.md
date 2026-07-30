# V45 - Chống lỗi cache Admin cũ

- Xác nhận `/#admin` hoạt động trên trình duyệt sạch và hiển thị màn hình đăng nhập.
- Chuẩn hóa phiên Admin cũ trong `localStorage`/`sessionStorage`; tài khoản phụ
  thiếu `permissions` không thể làm sập giao diện.
- Bỏ qua lịch sử chỉnh sửa cũ nếu sai cấu trúc thay vì gọi `.map()` trên dữ
  liệu không phải mảng.
- Không gọi API trạng thái sao lưu trước khi Super Admin đăng nhập, tránh lỗi
  401 không cần thiết.
- Mật khẩu và hash trong cache phiên bản cũ bị loại bỏ trong lúc chuẩn hóa.
- Giữ nguyên các cải tiến v44: Admin trực tiếp, tìm kiếm gọn, thanh cuộn đẹp,
  ẩn ID HLV/thành viên và Error Boundary.
