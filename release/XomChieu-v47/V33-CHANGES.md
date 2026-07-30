# V33 - Tự hợp nhất xung đột khi Admin lưu dữ liệu

- Giữ nguyên cơ chế kiểm tra phiên bản của API để ngăn ghi đè dữ liệu mới.
- Khi gặp mã `409`, trình quản trị tự tải đúng mục dữ liệu mới nhất, hợp nhất
  thay đổi và thử lưu lại tối đa 2 lần.
- Giữ các bản ghi mới do quản trị viên khác vừa thêm.
- Hợp nhất các trường khác nhau được sửa đồng thời trên cùng một bản ghi.
- Bảo vệ bản ghi đã được người khác sửa khỏi thao tác xóa dựa trên dữ liệu cũ.
- Nếu có thêm thao tác trong lúc yêu cầu đang lưu, thao tác mới được đặt lại
  trên bản dữ liệu vừa hợp nhất để không làm mất dữ liệu.
- Bổ sung kiểm thử tự động cho thêm, sửa, xóa và cấu hình website.

