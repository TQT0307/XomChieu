# XomChieu v26

Kế thừa đầy đủ các sửa đổi của v25.

Thay đổi mới:

- Đồng bộ mục đang hiển thị với đường dẫn `#section-...`.
- Khi cuộn trang, nút menu được tô vàng và đường dẫn luôn cùng một mục.
- Cuộn trang dùng `history.replaceState` để không tạo quá nhiều lịch sử.
- Bấm trực tiếp vào menu vẫn dùng `history.pushState`, giữ chức năng Quay lại/Tiến của trình duyệt.
- Cách nhận diện mục hiện tại hoạt động ổn định cả tại khoảng trống giữa hai phần nội dung.
