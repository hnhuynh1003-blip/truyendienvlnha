# DUDU V71.7 — Thiên Mệnh, UI thật trên main

## Trạng thái và nguồn chân lý

Giao diện được triển khai trong `js/dudu-system-app-v69.js`, CSS tại `css/dudu-system-app-v69.css`, không xây bản Sandbox. Các dữ liệu cấp bậc, hệ thống, ký chủ, tám chỉ số, tiến trình và khế ước chỉ đến từ `GET /v1/system/me` hoặc các phản hồi tác vụ đã xác thực của Worker V71 (`authoritative:true`). Không ghi hồ sơ trong browser. Không nâng quyền, phát thưởng hay tạo nội dung nhiệm vụ.

## Bố cục đã chốt

1. **Liên kết hệ thống:** ấn ký, tên/mã hệ thống, cấp / LV / EXP và khế ước; chỉ có thanh EXP nền, không tính phần trăm EXP khi backend thiếu ngưỡng lên cấp.
2. **Trạng thái ký chủ:** bốn ô Ký chủ (tên và ID máy chủ), Đồng bộ (hiện “— / Chưa có dữ liệu” vì schema V71 chưa có tỉ lệ), Trạng thái (đã liên kết / chờ ký) và Thế giới (theo `worldAccess`). Không hardcode “12%”, “Ổn định” hay phần trăm không tồn tại.
3. **Thông báo Hệ Thống:** ba dòng thông báo tĩnh có điều kiện, **được suy ra từ snapshot máy chủ** — trạng thái khế ước, số nhiệm vụ đã ghi nhận và quyền mở thế giới. Không timestamp giả, không giả làm lời thoại AI.
4. **Bốn hành động độc lập:** Chỉ số → bảng tám chỉ số; Nhiệm vụ → trạng thái/tổng số nhiệm vụ; Nhật ký → **tổng quan** và ghi rõ server chưa trả lịch sử sự kiện; Kho → tổng số vật phẩm/thành tựu/quà. Không có dropdown trùng “Thành tựu và kho”. Đây là các cửa sổ *chỉ đọc*, không tạo phần thưởng hay lịch sử.
5. **Trạng thái thế giới:** theo `worldAccess`, mặc định khóa vì Worker V71 hiện trả false.

## Quy ước bảo mật và điều kiện nghiệm thu

- Giữ cổng thẻ thật, xác thực UID, kiểm tra consent khế ước, AU pilot, hết phiên và xóa DOM khi đổi tài khoản.
- Không hiển thị nguồn gốc chính quy/phi chính quy hay private temperament. UI chỉ dùng trường công khai trả về.
- Chưa kết nối AI. Hệ thống con có thể vận hành lời thoại sau khi xác định API riêng, ngân sách và quyền; khối thông báo hiện chỉ có dữ liệu/trạng thái quy tắc, không mạo nhận là AI.
- CSS ưu tiên điện thoại Cyber Phone 260–430px; có hai cột nhỏ và điều chỉnh ở <=360px.
- CI tự động trên nhánh main kiểm luồng browser authenticated và phân tách tác vụ, còn backend thật đã được deploy riêng trước đó; bản này chỉ thay frontend.


## V71.8 — Điều chỉnh UI và mô hình nhiệm vụ

- Sửa bug co chiều cao: trong Cyber Phone, `.dudu-v69-screen` là cột flex cuộn. Identity và Notifications từng kế thừa `flex-shrink:1` rồi cắt nội dung bằng `overflow:hidden`. Đặt `flex:0 0 auto` cho các module dashboard, để chiều cao tự nhiên và cuộn màn chính, không làm méo thẻ.
- Nhiệm vụ không phải danh sách toàn cục: 6 genre V66 là *thể loại*, mỗi thể loại có nhiều tiểu thế giới riêng, mỗi kịch bản có `smallWorldId`, `missionId` và phiên bản kịch bản. 48 seed F/E vẫn chưa phát hành. Nhiệm vụ mở đầu để nhận Thẻ thông hành khác với 3 nhiệm vụ F khảo hạch sau khế ước.
- Tab Nhiệm vụ đọc từ `worldContext.activeWorld.smallWorldId` và `worldContext.activeMission.missionId` **nếu Worker đã trả `worldAccess:true` và phân công xác thực**. Worker V71 hiện chưa trả context này, nên hiện "Chưa được phân công". Số lượng đã hoàn thành thuộc Nhật ký, không phải nhiệm vụ đang làm.
- Đây mới là UI read-only và hợp đồng trường dự kiến, chưa có hệ thống phân công nhiệm vụ thật. Khi phát hành thế giới, backend phải kiểm khế ước, cấp/rank, availability, trạng thái published, replay/cooldown và ghi nhận nhiệm vụ theo UID + smallWorldId + missionId + version. Game Engine quyết định trạng thái/thành bại/thưởng, AI chỉ diễn giải. Không bật AI hoặc thưởng bằng việc đổi UI.


## V71.9 — Gộp hệ thống và ký chủ vào một thẻ

- Bỏ bốn HUD tĩnh (Ký chủ, Đồng bộ, Trạng thái, Thế giới): chúng không mở tính năng và trùng thông tin khế ước/cổng thế giới. Bỏ riêng số đồng bộ khi backend chưa có dữ liệu.
- Trong thẻ Liên kết hệ thống, hiển thị tên hệ thống duy nhất một lần. Mã system.id chỉ xuất hiện khi thực sự khác với tên (đã chuẩn hóa dấu phân cách), chẳng hạn hệ thống dùng biệt danh riêng. Ví dụ không lặp Hệ thống DUDU-82 / DUDU-82 hay DUDU 02 / DUDU-02.
- Thêm tên ký chủ và mã host.id KC-... ngay dưới tên hệ thống, dùng dữ liệu xác thực từ Worker; không hiển thị Firebase UID.
- Giữ Cấp/LV/EXP và khế ước trong cùng thẻ; giữ bốn nút tương tác Chỉ số, Nhiệm vụ, Nhật ký, Kho. Rút gọn khối thông báo còn hai dòng thay vì lặp khế ước và cổng thế giới.
- QA main-mode kiểm việc không lặp ID, hai danh tính nằm trong một thẻ, không còn HUD và hành vi bốn nút không thay đổi. Không thay đổi Cloudflare/registry hay kích hoạt AI/phần thưởng.
