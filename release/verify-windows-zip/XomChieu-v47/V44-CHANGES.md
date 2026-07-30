# V44 - Sửa Admin, tìm kiếm gọn, thanh cuộn đẹp và ẩn ID công khai

## Lỗi Admin đã xác định

`Map` từ thư viện icon đã trùng tên với `Map` dữ liệu JavaScript trong
`AdminPanel`. Khi mở `/#admin` hoặc nhấn logo 5 lần, Admin thực sự đã được mở
nhưng phần tải riêng của Admin bị lỗi runtime và cho ra trang trắng.

## Thay đổi

- Loại bỏ xung đột tên `Map` làm crash Admin.
- Tách bộ tạo danh sách tên giải đấu sang utility dùng chung để dễ kiểm thử,
  bảo trì và mở rộng.
- Thêm Error Boundary riêng cho Admin: nếu có lỗi tương lai, website hiển thị
  màn hình phục hồi thay vì trang trắng; dữ liệu không bị thay đổi.
- Thu nhỏ toàn bộ ô tìm kiếm và danh sách xổ xuống.
- Dùng thanh cuộn mảnh, bo tròn, đồng bộ sáng/tối cho danh sách tìm kiếm.
- Ẩn ID của HLV và thành viên khỏi ô tìm kiếm, danh sách xổ xuống và từ khóa
  hướng dẫn công khai. ID nội bộ vẫn được giữ nguyên để liên kết dữ liệu.
- Giữ hai cách vào Admin: `/#admin` và nhấn logo 5 lần.

## Kiểm tra bắt buộc

- Test route Admin trực tiếp.
- Test không còn xung đột tên `Map`.
- Test danh sách tên giải đấu duy nhất.
- TypeScript, build production và kiểm tra trình duyệt.
