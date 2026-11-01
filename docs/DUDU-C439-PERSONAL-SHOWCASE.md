# C4.39 — Tủ Trưng Bày cá nhân

## Phạm vi

- Khu **Tủ riêng** được đặt trong Bảo Tàng Lưu Quang, cạnh các gian Chiến tích, Quà mùa, Kỷ vật thật và Kỷ niệm. Không viết lại Điện Chiến Tích, Thủy Cung hay sổ sở hữu máy chủ.
- Có 4 bệ cá nhân. Chọn món từ **Sổ Báu Vật**; đổi món bằng cách gỡ rồi đặt món mới. Nhấn vào các bệ nhỏ để xem một hiện vật nổi bật trong đại sảnh có hình gốc và bảng tên.
- Chỉ cho đặt những khám phá đang được **C4.38 xác nhận qua bản lưu Arcade hiện có** (`status === 'owned'`, `season === 'evergreen'`). Mùa 1 và Di sản ở trạng thái `preview` bị từ chối vô điều kiện.
- Trình bày dưới dạng *kỷ niệm khám phá*: phát hiện một mẫu ngọc trong album không đồng nghĩa đang giữ viên ngọc vật lý trong Kho Ngọc. Cá thường tiếp tục chỉ xuất hiện ở Sổ Cá.

## Dữ liệu

- Chỉ ghi khóa tùy chọn trình bày trên thiết bị: `dudu-arcade-showcase:v1:<encodeURIComponent(identity)>`.
- `identity` lấy cùng quy tắc như Sổ Báu Vật C4.38: UID Firebase sẵn sàng hoặc tài khoản Sandbox được cách ly.
- Giá trị chỉ có `{ "version": 1, "selected": ["ore-gold", ...] }`. Các ID được kiểm tra cú pháp, loại trùng và giới hạn tối đa 4; mỗi lần đọc bảng trưng bày lại giao với snapshot sở hữu hiện tại.
- Không có thay đổi schema bản lưu game Arcade, không cập nhật Firestore/Rules/Cloudflare, không có luồng nhận thưởng thật, không cộng Xu/EXP hoặc xóa dữ liệu cũ.
- Nếu tiến trình không tồn tại trên thiết bị mới, bệ sẽ trống cho đến khi phát hiện cũ xuất hiện trở lại; việc đọc **không xóa tự động** tùy chọn đã lưu.

## Kiểm tra

- `node --test tests/*.test.cjs`
- `node tests/browser-arcade-mobile-c410.cjs` (Playwright Chromium): chọn 4 món, từ chối món thứ 5, gỡ/đặt món, vào Tủ riêng, đổi bệ, quay Sổ, kiểm tra 320/390/430px, không có Firebase write.
- CI GitHub Actions tự chạy smoke, browser và deploy Pages trên `main`.

## Dành cho người chơi

1. Điện thoại → Arcade → **◈ Sổ Báu Vật**.
2. Chọn **Đã tìm thấy**, nhấn **◇ Đặt lên bệ** dưới món yêu thích.
3. Chạm **✦ Xem Tủ Trưng Bày** hoặc vào **Bảo Tàng → Tủ riêng**.
4. Chọn một trong bốn bệ nhỏ để ngắm hiện vật lớn; dùng **Gỡ khỏi bệ** nếu muốn đổi món.
