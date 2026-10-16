# DUDU V18 — Khung avatar theo thành tựu và chính sách ảnh R2

**Ngày:** 15/10/2026  
**Nhánh:** `feat/identity-npc-editor-v2` (PR Draft)  
**Phạm vi:** Chỉ mã và kiểm thử trên GitHub; **KHÔNG merge, KHÔNG deploy, KHÔNG bật Worker, KHÔNG tạo bucket R2**.

## I. Khung avatar: bảo vệ ở phía máy chủ

- Sáu khung phổ thông V16 vẫn có thể dùng trên Sandbox và không liên quan tới vật phẩm, thưởng xu hay kỷ vật.
- `author`: máy chủ kiểm tra **Firebase custom claim admin:true đã được xác minh chữ ký**. Không sử dụng vai trò hiển thị, cờ localStorage hay UID gửi từ trình duyệt. Giao diện V16 vẫn để khung này khóa cho tới khi đồng bộ và quyền được tích hợp an toàn.
- `legend` (Huyền Thoại): phải có bản ghi từ **sự kiện truyện xác minh tại máy chủ**, source `VERIFIED_STORY_MILESTONE`.
- `soulbond` (Tri Kỷ): phải có bản ghi từ **mốc quan hệ NPC được máy chủ xác minh**, source `VERIFIED_NPC_BOND`.
- Các bản ghi `frame_awards` ở Durable Object riêng theo Firebase UID gồm `frame_id`, `source`, `evidence_id` duy nhất và `granted_at`. Đường đọc `verifiedAwards()` có kiểm tra nguồn, ID bằng chứng và timestamp; người chơi không có đường cấp khung.
- **Chưa có nguồn sự kiện NPC/truyện có thể dùng làm chứng cứ an toàn.** Vì vậy V18 cố ý KHÔNG triển khai phương thức chèn khung và không đặt API `/grant`, kể cả cho admin. Không có người chơi nào tự nhiên nhận được `legend` hoặc `soulbond`. Đây là bước quan trọng để ngăn giao diện tự tuyên bố “đủ thiện cảm” rồi cấp khung.
- `AVATAR_AWARDS_ENABLED = "false"`. Ngay cả khi `PLAYER_AVATAR_SYNC_ENABLED` được bật riêng sau này, phần khung sự kiện vẫn đóng cho đến khi sổ thành tựu và cơ chế cấp chứng cứ đã được kiểm toán.
- Đã bổ sung lý do khóa cụ thể ngay trong cửa sổ chọn avatar người chơi; không tạo nút nhận thưởng.
- Dữ liệu avatar lưu trước đó và quy tắc cập nhật phiên bản `expectedRevision` V17 giữ nguyên.

## II. Chuẩn bị upload ảnh lên Cloudflare R2

- Đã tạo `cloudflare/src/avatar-image-policy.mjs` làm **preflight** cho PNG/JPEG/WebP, giới hạn 5 MB, kích thước cạnh 32–4096 px, tối đa 12 megapixel.
- Kiểm tra signature container và header kích thước, tránh chỉ tin đuôi file hoặc header `Content-Type`. Tên đối tượng dự kiến `drafts/players/<verifiedUID>/<UUIDv4>.bin`, không nhận đường dẫn do trình duyệt tự chỉ định.
- Kết quả kiểm tra **luôn ghi `publishable:false` và `mustDecodeAndTranscode:true`**. Kiểm tra header không bảo đảm giải mã ảnh an toàn, không khử EXIF, không ngăn ảnh độc hại, không phải bộ kiểm duyệt nội dung.
- **Chưa tạo R2 bucket, binding, upload URL, ticket, API nhận bytes, route public hoặc xóa ảnh.** `AVATAR_R2_ENABLED = "false"`. Không có mã tải ảnh người dùng lên mạng trong V18.
- Bước tiếp theo khi được phê duyệt hạ tầng: Cloudflare Worker phát yêu cầu upload scoped từ JWT, giới hạn quota per UID; dịch vụ xử lý decode & re-encode thành ảnh sạch, strip EXIF, kiểm duyệt, tạo ảnh thu nhỏ, finalize server-side và cấp asset ID. Sau đó mới thiết kế chọn ảnh đa thiết bị, versioning, xóa ảnh, bảo toàn bản cũ, và rollback.

## III. Kiểm thử và ranh giới phát hành

- Node/Cloudflare test: chứng cứ server hợp lệ/giả mạo, UID khác, yêu cầu cấp thưởng trái phép, frame locked, giới hạn ảnh, header PNG/JPEG/WebP, ObjectKey traversal, kill-switch, sự tương thích test V17.
- Browser smoke: chỉ xác nhận UI cũ hoạt động trên Sandbox; đây **không phải** bài kiểm thử Cloudflare/R2 thực tế hoặc bảo đảm bảo mật cho hạ tầng vừa được bật.
- Cần chạy thử với tài khoản Firebase thật trên Worker staging trước khi quyết định bật `PLAYER_AVATAR_SYNC_ENABLED`, và cần hệ thống thành tựu NPC server-authoritative hoàn chỉnh trước khi bật `AVATAR_AWARDS_ENABLED`.
- Nếu có lựa chọn avatar đã lưu cục bộ, không tự động di trú/ghi đè sang server. Không thay đổi userProfile, UID độc giả, tình trạng sở hữu kỷ vật, quan hệ NPC, hay schema save cũ.

**Kết luận:** V18 hoàn thiện rào bảo mật và chính sách chuẩn bị ảnh. Cấp khung hiếm tự động và đồng bộ ảnh upload là các tính năng tiếp theo, **chưa thể tuyên bố đã hoạt động**.
