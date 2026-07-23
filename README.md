# Vovinam Xóm Chiếu

Ứng dụng dùng React/Vite, API serverless Vercel và Firebase Admin/Firestore để chia sẻ dữ liệu thật giữa mọi thiết bị.

## Chạy local

1. Cài dependency: `npm install`
2. Sao chép `.env.example` thành `.env.local` và cấu hình Firebase.
3. Chạy: `npm run dev`

## Cấu hình Firebase trên Vercel

1. Trong Firebase Console, tạo Firestore Database cho project.
2. Vào Project settings > Service accounts > Generate new private key.
3. Trong Vercel > Project > Settings > Environment Variables, tạo `FIREBASE_SERVICE_ACCOUNT` và dán toàn bộ JSON của service account. Chọn Production, Preview và Development.
4. Redeploy project. Không commit file service-account vào GitHub.
5. Mở `/api/db-status`; `persistentStorageReady` phải là `true` và `firebase.test` phải bắt đầu bằng `success`.

Có thể dùng ba biến rời `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` thay thế. Với private key, giữ chuỗi `\\n` nguyên vẹn.

## Deploy Vercel

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: 20 trở lên

Không đặt Root Directory thành `dist`; root phải là thư mục chứa `package.json`, `api` và `src`.

## Kho ảnh và giới hạn dữ liệu

- Firestore chỉ nên lưu dữ liệu có cấu trúc và URL ảnh. Mỗi tài liệu Firestore có giới hạn 1 MiB.
- Mã nguồn tự động tách ảnh base64 khỏi dữ liệu trước khi CRUD và chỉ lưu URL ngắn.
- Nếu website sẽ có nhiều ảnh HLV, thành viên, banner và bài viết, tạo Firebase Storage bucket rồi thêm biến Vercel `FIREBASE_STORAGE_BUCKET` bằng đúng tên bucket.
- Từ ngày 03/02/2026, Firebase Storage yêu cầu dự án ở gói Blaze. Hãy bật cảnh báo ngân sách trong Google Cloud trước khi sử dụng.
- Nếu chưa cấu hình bucket, ảnh vẫn được lưu ở các tài liệu media Firestore riêng để không làm hỏng dữ liệu hiện có, nhưng đây chỉ là phương án dự phòng có dung lượng hạn chế.

## Chống mất dữ liệu

- CRUD theo từng mục có kiểm tra phiên bản để tránh hai quản trị viên ghi đè lẫn nhau.
- Các lần lưu liên tiếp của cùng một mục được xếp hàng, không gửi chồng request.
- Hệ thống giữ 5 vòng sao lưu Firebase; bản tự động được giới hạn tần suất để tránh vượt quota.
- Xóa dữ liệu hoặc đồng bộ toàn bộ luôn yêu cầu tạo bản sao an toàn trước.
- Có thể kiểm tra `/api/backup-status`, `/api/recovery-status` và tải JSON sao lưu trong mục Đồng bộ Cloud của Admin.
