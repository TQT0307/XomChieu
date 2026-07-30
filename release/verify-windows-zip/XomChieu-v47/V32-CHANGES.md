# V32 - Sắp xếp Giải đấu theo trạng thái

Thứ tự hiển thị ngoài trang người dùng:

1. Đang diễn ra
2. Sắp diễn ra
3. Đã kết thúc

Các giải đấu cùng trạng thái giữ nguyên thứ tự hiện có từ Admin. Bộ lọc trạng thái vẫn hoạt động như trước.

Không thay đổi hoặc ghi lại dữ liệu giải đấu trong Firebase/Redis; việc sắp xếp chỉ diễn ra khi hiển thị.
