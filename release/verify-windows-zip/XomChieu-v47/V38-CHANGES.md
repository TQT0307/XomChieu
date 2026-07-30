# V38 - Luồng ảnh chất lượng cao

- Bỏ cách xuất cố định 800×450 px, JPEG 85% trong công cụ căn chỉnh.
- Ảnh 16:9 có thể giữ đến 1920×1080 px; ảnh 4:3 đến 1800×1350 px;
  ảnh vuông đến 1600×1600 px khi nguồn đủ lớn.
- Không phóng giả ảnh nhỏ lên kích thước lớn hơn số điểm ảnh thật.
- Xuất WebP thích ứng từ chất lượng 95%, chỉ giảm dần khi cần nằm dưới giới
  hạn 650 KB của kho ảnh hiện tại.
- Bật nội suy canvas chất lượng cao cho ảnh căn chỉnh và banner.
- Banner có thể giữ cạnh rộng đến 2200 px thay vì bị ép còn 1000 px/JPEG 62%.
- Hiển thị kích thước ảnh gốc và tự giới hạn mức zoom rõ nét được khuyến nghị.
- Tăng giới hạn ảnh nguồn của thư viện Highlights từ 5 MB lên 15 MB.

> Ảnh đã bị nén từ các phiên bản cũ không thể tự phục hồi chi tiết. Cần tải lại
> file ảnh gốc sau khi triển khai V38 để nhận chất lượng mới.

