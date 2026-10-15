# DUDU V21 — Đối chiếu avatar trước khi đồng bộ (Sandbox)

**Ngày:** 16/10/2026  
**Nhánh:** `feat/identity-npc-editor-v2`, PR #1 Draft, base `fixapp`.  
**Triển khai:** Không merge, không deploy Cloudflare, không cập nhật Firebase hoặc R2 thật.

## Đã triển khai

- Tích hợp `js/player-avatar-sync-plan-v20.js` vào giao diện thử nghiệm thông qua `js/player-avatar-conflict-ui-v21.js` và `css/player-avatar-conflict-v21.css`.
- Trong **Cyber Phone → Cá Nhân → Đổi avatar & khung**, có phần **Đối chiếu avatar nhiều thiết bị (mô phỏng)** dưới các lựa chọn khung. Người chơi có thể thử:
  - **Thử xung đột:** so sánh avatar đang lưu trên thiết bị với một **snapshot máy chủ giả lập** có phiên bản #7; bấm các nút “Mô phỏng giữ trên thiết bị” hoặc “Mô phỏng dùng bản máy chủ” để xem kế hoạch hành động.
  - **Thử ảnh cục bộ:** cho thấy ảnh tự tải chỉ có trên thiết bị, ngăn chọn cả hai thao tác đồng bộ vì chưa có dịch vụ ảnh từ R2 đáng tin cậy.
- Bảng so sánh hiển thị hai phiên bản, khung, trạng thái, lý do chặn. Nút và nhãn ghi rõ **mô phỏng, chưa gửi, chưa lưu**. Không ngụ ý snapshot giả lập là dữ liệu máy chủ thật.
- Khi đóng hoặc mở lại trình chỉnh avatar, bản so sánh thử nghiệm cũ bị xóa; tránh nhầm dữ liệu ở những lần sử dụng sau.
- UI đáp ứng màn hình 320px và 375px, có trạng thái focus/disabled và chế độ giảm chuyển động.

## Giữ nguyên bảo mật và dữ liệu

- Không thực hiện `fetch`, không gọi Firebase JWT hoặc Cloudflare Worker, không ghi `localStorage`, `IndexedDB`, `userProfile` hoặc Firestore từ trình mô phỏng.
- Hệ thống save V16, ảnh tải lên cục bộ và tên/ID NPC cũ hoàn toàn giữ nguyên; không tự mở khung Huyền Thoại/Tri Kỷ hay cấp vật phẩm.
- `PLAYER_AVATAR_SYNC_ENABLED=false`, `AVATAR_AWARDS_ENABLED=false`, `AVATAR_AWARD_ISSUER_ENABLED=false`, `AVATAR_R2_ENABLED=false`. Không có tác động lên website độc giả.
- V20 signer chỉ là hợp đồng cho **nguồn xác minh thành tựu** chứ chưa có ledger gameplay đủ tin cậy. V20 photo normalizer cũng là hợp đồng, chưa có codec/kiểm duyệt và R2 staging thật.

## Nghiệm thu

- Node tests V21 kiểm tra mô phỏng không ghi dữ liệu/không gửi mạng, trạng thái bảo vệ ảnh riêng và reset khi đóng cửa sổ.
- Chromium chạy tương tác nút mô phỏng, xác minh hai lựa chọn bị vô hiệu hóa với ảnh cục bộ, so sánh profile/Firestore trước và sau, cửa sổ không tràn trên 320px.
- Bộ test cũ V20 được cập nhật: planner hiện được **đưa vào UI chỉ đọc**, nhưng API đồng bộ thật vẫn không bật.
- CI tiếp tục chạy Node/Cloudflare Worker và Chromium hiện có, không thay thế QA tài khoản/thiết bị thật.

## Release blockers (để V22 hoặc khi có hạ tầng thật)

1. Hoàn thiện và kiểm toán server-side story achievement/NPC bond ledger, không thể tạo sự kiện từ local UI.
2. Triển khai dịch vụ giải mã/truyền ảnh an toàn, xóa EXIF, kiểm duyệt, private finalized variants, quota/rate limits và cleanup; thống nhất chi phí bucket R2.
3. Chạy staging với hai tài khoản Firebase thật và kiểm thử xử lý `409 revision-conflict`. Khi bật đồng bộ thực tế, UI cần xác nhận rõ trước khi ghi và tuyệt đối không xóa ảnh cục bộ tự tải.
4. Xác nhận save cũ, bảo vệ quyền độc giả, thử nghiệm Android/iOS và quyền rollback trước khi cân nhắc merge `fixapp` hoặc deploy.

**V21 là giao diện duyệt trước phương án đồng bộ an toàn, không phải đồng bộ avatar thật.**
