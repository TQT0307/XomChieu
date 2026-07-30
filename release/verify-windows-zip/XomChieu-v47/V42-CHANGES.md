# V42 - Danh sách tìm kiếm và sửa lối vào Admin

- Mỗi ô tìm kiếm thông minh phía User có nút mũi tên.
- Bấm mũi tên hiển thị toàn bộ dữ liệu của đúng mục; chọn một dòng để lọc nhanh theo ID.
- Áp dụng cho Highlights, Thành tích, HLV và Thành viên.
- Bảng dữ liệu Admin, tài khoản Admin phụ và lịch sử hệ thống đều có danh sách mở bằng mũi tên.
- Danh sách có thanh cuộn riêng, đóng khi bấm ra ngoài hoặc nhấn Escape và dùng tốt trên điện thoại.
- Cơ chế bấm logo 5 lần được chuyển sang bộ đếm đồng bộ bằng `ref`, tránh mất lượt bấm khi React cập nhật nhanh.
- Mỗi lần bấm liên tiếp có tối đa 1,4 giây; đủ 5 lần sẽ mở Admin và hủy thao tác tải lại trang.
- Không thay đổi API, Firebase hoặc dữ liệu hiện có.
