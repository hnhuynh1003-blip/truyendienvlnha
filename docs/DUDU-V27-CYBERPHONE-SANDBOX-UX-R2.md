# DUDU V27 R2 — Cyber Phone, NPC và Sandbox gọn hơn

**Ngày:** 16/10/2026. **Trạng thái:** chỉ trên nhánh thử nghiệm `feat/dudu-v27-phone-sandbox-ux-r2`, nối tiếp V27 R1. Chưa merge/deploy.

## Đã thay đổi
1. **Liên Lạc:** nút **Tặng quà** ở thanh trên; chuyển **Xóa cuộc trò chuyện** vào menu ba chấm để giảm bấm nhầm. Vẫn dùng `clearCurrentChat()` với hộp xác nhận có sẵn, xóa cả lịch sử và ký ức tương tác chỉ khi được xác nhận. Khi đổi NPC, menu phụ được đóng. Giữ nhấn ảnh để mở chân dung (R1).
2. **Liên Lạc – Quan hệ:** chỉ hiển thị **Tin tưởng / giai đoạn** trên thanh nhỏ; chạm để mở chỉ số chi tiết Thiện cảm, Tin tưởng và trần Thiện cảm; nút Hỏi thăm, dấu hỏi giữ nguyên. Vẫn đọc từ hàm NPC quan hệ cũ; không đổi cách tính và không tự cấp thành tựu.
3. **Nhân Vật:** giữ **Tặng quà** và **Trò chuyện** là các hành động chính; dồn **Sửa/Lưu trữ/Khôi phục** vào mục **Quản lý** chỉ dành cho tác giả. Không thay callback, quyền hoặc mã NPC. Ảnh nhân vật vẫn là nút xem chân dung.
4. **Hồ Sơ:** thay các ô thống kê nhiều dòng bằng 5 thẻ số liệu cá nhân dạng lưới; thống kê toàn thư viện ở mục mở rộng. Không thay các ID thống kê, nguồn số liệu, avatar hay nút quản lý tài khoản.
5. **Cài Đặt:** chia **Trải nghiệm đọc** thành hai nhóm **Cỡ chữ** và **Giao diện**, có trạng thái lựa chọn. Đưa trạng thái AI, nút kiểm tra máy chủ (chỉ admin), và công cụ nhập chat cũ vào mục **Công cụ & dữ liệu** có thể mở rộng. Không tự nhập/xóa chat.
6. **Sửa lỗi cũ:** `setTheme` trước đó gán `document.body.className=''`, xóa mất các lớp `dudu-phone-v11`, `dudu-phone-open`, trạng thái theme khác. V27 R2 chỉ xóa lớp `theme-warm`/`theme-oled`, giữ các lớp Sandbox và trạng thái tài khoản; các lựa chọn có `aria-pressed`.

## Bảo toàn và an toàn
- Tạo stylesheet độc lập `css/phone-ux-v27-r2.css` chỉ áp dụng dưới `body.dudu-phone-v11 #cyber-phone`. Không tự thêm style ảnh hưởng website chính.
- Giữ nguyên `userProfile`, `novels`, đối tượng NPC, tiến trình Sandbox, Firestore, Firebase, avatar IndexedDB và cờ máy chủ.
- Nút Xóa vẫn bắt buộc xác nhận. NPC bị khóa vẫn không thể mở chân dung. Nút quản lý không cấp quyền mới.
- Bảo toàn các ID `stat-*`, `npc-relationship-r4-values`, `npc-daily-checkin-btn`, `ai-current-model-info` để code cũ hoạt động.

## Kiểm thử và tiêu chí nghiệm thu
- Node: xác thực ID, callback, quyền tác giả, nút chọn chủ đề, lớp CSS Sandbox, các cảnh báo và chức năng không bị loại bỏ.
- Chromium 360px: bố cục Hồ Sơ hai cột không tràn; giao diện Cài Đặt hiển thị trạng thái font/theme; đổi chủ đề không mất lớp Cyber Phone; menu ba chấm có nút Xóa nhưng không kích hoạt khi chỉ mở menu.
- Kiểm thử hồi quy đầy đủ R1, V1–V26 và Worker dry-run trong CI.

## Chưa làm / đợt tiếp theo
- **Kho Đồ, Nhiệm Vụ, Bảo Tàng, Cửa Hàng:** tinh chỉnh thẻ, empty state và các công cụ trợ giúp riêng, tránh xóa nút khi chưa kiểm tra chức năng.
- **Rà soát thị giác:** kiểm tra thực tế nhiều ảnh dài/thiếu ảnh, màn 320px, nội dung 200% chữ, cuộn trên Android/iOS trước khi chọn giao diện chính.
- **Triển khai:** gộp các nhánh xếp chồng vẫn cần review riêng; việc các test mock đạt **không có nghĩa** V23–V26 backend đã kích hoạt. Không tự deploy.

**Mục tiêu sản phẩm:** người dùng nhìn thấy ảnh, thông tin quan trọng và nội dung chat trước; hành động nguy hiểm/ít dùng ở lớp thứ hai.
