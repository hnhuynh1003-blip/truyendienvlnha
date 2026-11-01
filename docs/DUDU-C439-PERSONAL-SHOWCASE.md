# C4.39 — Tủ Trưng Bày cá nhân

## Phạm vi

- Khu **Tủ riêng** được đặt trong Bảo Tàng Lưu Quang, cạnh các gian Chiến tích, Quà mùa, Kỷ vật thật và Kỷ niệm. Không viết lại Điện Chiến Tích, Thủy Cung hay sổ sở hữu máy chủ.
- Có 4 bệ cá nhân. Chọn món từ **Sổ Báu Vật**; đổi món bằng cách gỡ rồi đặt món mới. Nhấn vào các bệ nhỏ để xem một hiện vật nổi bật trong đại sảnh có hình gốc và bảng tên.
- Chỉ cho đặt những khám phá đang được **C4.38 xác nhận qua bản lưu Arcade hiện có** (`status === 'owned'`, `season === 'evergreen'`). Mùa 1 và Di sản ở trạng thái `preview` bị từ chối vô điều kiện.
- Trình bày dưới dạng *kỷ niệm khám phá*: phát hiện một mẫu ngọc trong album không đồng nghĩa đang giữ viên ngọc vật lý trong Kho Ngọc. **Tất cả cá** thuộc Sổ Cá/Thủy Cung (bể chỉ dành cho cá Quý trở lên thực bắt được), không xuất hiện trên bệ Tủ riêng.

## C4.39R2 — Đồng bộ hiện vật và bệ

- **Chiến tích:** giữ riêng bốn tượng thành tựu dài hạn; căn hình tượng lên chính bệ đá đã có trong nền Đại sảnh, không đồng nhất chúng với báu vật mùa.
- **Tủ riêng:** loại bệ CSS giả chồng lên bệ đá có sẵn trong ảnh `hall-night.webp`; đặt hiện vật vào đúng bệ gốc, tối ưu cửa sổ hẹp.
- **Quà mùa:** dùng đúng bốn hình trong atlas Hộ Chiếu Mùa 01 (Vi Mạch Bình Minh, Tinh Thạch Sương Lam, Giọt Sương Nguyệt, Ngọc Ấn Khai Mùa) và Ấn Khai Nguyên riêng. Cả năm đều **xem trước**, không có phát thưởng.
- **Hộ Chiếu:** ở trạng thái mùa `preview`, dù bản lưu máy cũ có cờ mùa cũng không hiện là đã sở hữu; không sửa/xóa bản lưu.
- Các tùy chọn bệ cá từng lưu vẫn nguyên trong localStorage, nhưng được lọc khỏi phần hiển thị; không ghi hay di chuyển dữ liệu người chơi khi đọc.

## C4.39R3 — Nền đơn bệ cho một hiện vật

- Sau phản hồi trên điện thoại, thay các nền chứa 3–4 bục rời bằng **hai ảnh đại sảnh mới, mỗi ảnh chỉ có một bệ chính ở giữa**: `assets/museum-c439r3/solo-rotunda.webp` cho Chiến Tích; `assets/museum-c439r3/solo-hall.webp` dùng chung cho Quà mùa và Tủ riêng.
- Ảnh được tạo mới theo phong cách DUDU, tối ưu WebP và không sửa/xóa asset gốc. Bốn lựa chọn bên dưới là nút điều khiển, không phải bốn bục thật trong bối cảnh.
- Định vị chân của tượng, kỷ vật và ngọc lên mặt bệ thật (khoảng 60% chiều cao cảnh), căn giữa khi cắt nền trên màn hình hẹp. Không động tới logic sở hữu, mùa hay Xu.

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
