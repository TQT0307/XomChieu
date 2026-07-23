# Gói tối ưu tốc độ và an toàn dữ liệu

## File cần chép nếu không dùng toàn bộ ZIP dự án

1. `api/index.ts`
2. `src/App.tsx`
3. `src/mediaSync.ts`
4. `src/components/AdminPanel.tsx`
5. `src/components/UserView.tsx`
6. `src/components/Header.tsx`
7. `src/index.css`
8. `src/types.ts`
9. `.env.example`
10. `package.json`
11. `package-lock.json`
12. `bun.lock`
13. `README.md`

## Biến Vercel

Giữ nguyên `FIREBASE_SERVICE_ACCOUNT` và biến Redis hiện tại.

Khuyến nghị bổ sung:

- `FIREBASE_STORAGE_BUCKET`: đúng tên bucket trong Firebase Console > Storage.
- `ADMIN_SESSION_SECRET`: chuỗi ngẫu nhiên dài để ký phiên đăng nhập Admin.

`FIREBASE_STORAGE_BUCKET` chỉ dùng được khi dự án Firebase ở gói Blaze. Nếu chưa cấu hình, ảnh vẫn dùng kho Firestore dự phòng và dữ liệu cũ không bị xóa.

## Sau khi deploy

1. Mở `/api/db-status`.
2. Kiểm tra `firebase.test` là `success`.
3. Nếu đã cấu hình Storage, kiểm tra `mediaStorage.test` là `success`.
4. Đăng nhập lại Admin một lần để tạo cookie bảo mật mới.
5. Vào `Đồng bộ Cloud` và bấm `Sao lưu Cloud ngay`.
6. Sau khi đã kiểm tra bản sao lưu, có thể bấm `Sao lưu & tối ưu ảnh` để chuyển toàn bộ ảnh base64 cũ sang kho ảnh riêng.

Kể từ bản này, khi sửa một mục có ảnh base64 cũ, ảnh của mục đó cũng được tự động chuyển thành URL ảnh riêng trước khi lưu. Cả hai cách đều giữ nguyên nội dung, logo và banner.
