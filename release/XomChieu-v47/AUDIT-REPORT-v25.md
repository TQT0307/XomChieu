# Báo cáo rà soát XomChieu v25

Ngày kiểm tra: 28/07/2026  
Mã nguồn gốc: Git commit `855211c` (`article view counter`)

## Kết quả xác nhận

- TypeScript: đạt (`tsc --noEmit`).
- Kiểm thử tự động: 6/6 đạt.
- Build Vite production: đạt.
- Website Vercel tải được dữ liệu thật và không có lỗi JavaScript trong console tại thời điểm kiểm tra.
- Không có ảnh đã tải nào bị hỏng trong lần kiểm tra. Ảnh ngoài màn hình được trì hoãn tải (`lazy`) để giảm tải trang đầu.
- Giao diện desktop không bị tràn ngang trong lần kiểm tra.
- Trang đăng nhập Admin hiển thị đúng. Không thực hiện CRUD trực tiếp trên dữ liệu production vì thao tác đó có thể thay đổi dữ liệu thật.
- `.env*` được Git bỏ qua, ngoại trừ `.env.example`.
- Không tìm thấy Firebase private key, service-account JSON, mật khẩu hoặc token thật trong file đang được Git theo dõi hay trong lịch sử Git đã quét.
- API dữ liệu công khai không trả tài khoản Admin, mật khẩu hoặc hash mật khẩu.
- Mật khẩu Admin được băm bằng `scrypt` có salt; cookie phiên đăng nhập dùng `HttpOnly`, `SameSite=Lax` và `Secure` trên production.
- API ghi dữ liệu, sao lưu, khôi phục, chẩn đoán và quản lý tài khoản yêu cầu phiên Admin; API thay đổi dữ liệu chặn yêu cầu khác nguồn.
- Firestore là nguồn dữ liệu chính; Redis chỉ là bản phản chiếu đọc nhanh/khôi phục.
- Có version theo từng nhóm dữ liệu, kiểm tra xung đột, chặn thay thế/xóa hàng loạt đáng ngờ, giữ lại trường ảnh khi bản ghi gửi lên thiếu ảnh, và sao lưu Firestore xoay vòng trước thao tác quan trọng.

## Lỗi đã sửa trong v25

1. Sửa lỗi TypeScript và khôi phục thao tác bấm ảnh trong chi tiết thành tích để phóng to.
2. Xóa component ảnh bị trùng tên sai `DetIailHeroImage.tsx`.
3. Sửa số lượt xem bài viết trên cửa sổ chi tiết bị cộng dư thêm 1. API vẫn chỉ tăng đúng 1 lượt cho mỗi lần mở bài.

## Điểm còn cần xử lý trước khi gọi là hệ thống quy mô doanh nghiệp

1. Chưa cấu hình `FIREBASE_STORAGE_BUCKET`. Ảnh hiện lưu dưới dạng Firestore media documents; phù hợp dữ liệu hiện tại nhưng không tối ưu khi có rất nhiều ảnh lớn.
2. Các nhóm `articles`, `members`, `coaches`, `tournaments`, `clubs`, `highlights` vẫn lưu mỗi nhóm trong một Firestore document. Khi tăng tới hàng trăm/hàng nghìn bản ghi hoặc bài viết rất dài có thể chạm giới hạn 1 MiB/document.
3. Bộ chuyển tiếng Anh dựa vào Google Translate. Kiểm tra thực tế cho thấy phần đã có trên trang được dịch, nhưng nội dung banner thay đổi sau khi trang được dịch có thể quay lại tiếng Việt. Muốn ổn định tuyệt đối cần lưu trường tiếng Anh trong database hoặc dùng dịch phía ứng dụng, không phụ thuộc widget.
4. Năm ảnh banner mặc định trong source có tổng dung lượng khoảng 3,55 MiB. Trang chỉ hiển thị/tải banner đang dùng, nhưng nên nén các ảnh mặc định xuống WebP/AVIF để lần tải từng banner nhanh hơn.
5. Chưa xác minh được Vercel có biến `ADMIN_SESSION_SECRET` riêng hay chưa. Nên đặt một chuỗi ngẫu nhiên dài tối thiểu 32 byte trong Vercel cho Production/Preview và không ghi chuỗi này vào Git.
6. Header bảo mật hiện có HSTS, `nosniff`, chặn iframe, referrer policy và permissions policy; chưa có Content-Security-Policy. Thêm CSP cần thử kỹ vì website dùng Google Translate, Google Maps và ảnh ngoài.
7. Bộ kiểm thử hiện mới có 6 test tập trung vào đăng nhập/quyền/bảo mật. Nên bổ sung test CRUD, xung đột version, khôi phục backup và lượt xem đồng thời.

## Hướng dẫn áp dụng

Nếu dùng gói đầy đủ `XomChieu-v25-AUDIT-FIX-FULL.zip`:

1. Sao lưu JSON từ Admin.
2. Đóng VS Code/GitHub Desktop nếu chúng đang giữ thư mục dự án.
3. Giải nén gói vào thư mục mới, không chép đè lên thư mục cũ.
4. Chép file `.env` cục bộ của bạn vào thư mục mới nếu cần chạy local; tuyệt đối không commit `.env`.
5. Chạy `npm install`, `npm run lint`, `npm test`, `npm run build`.
6. Mở và kiểm tra local, sau đó commit/push toàn bộ thay đổi.
7. Chờ Vercel triển khai và kiểm tra `/api/db-status`, `/api/recovery-status`, trang User và đăng nhập Admin.

Lưu ý: không có hệ thống nào có thể được đảm bảo tuyệt đối “không bao giờ mất dữ liệu”. Các lớp bảo vệ hiện có giảm đáng kể nguy cơ, nhưng vẫn phải tải JSON sao lưu định kỳ và trước mỗi lần nâng cấp.
