# DUDU V20 — Kiểm toán V1–V19, hợp đồng nguồn thành tựu & đồng bộ avatar

**Ngày:** 16/10/2026  
**Nhánh:** `feat/identity-npc-editor-v2` (PR #1, Draft, base `fixapp`)  
**Ranh giới:** Không merge, không deploy, không ghi vào Firebase/R2 thật, không thay đổi quyền truyện hoặc save độc giả.

## 1. Những phần đã bổ sung ở V20

### Bằng chứng thành tựu từ nguồn độc lập

- `cloudflare/src/avatar-achievement-issuer-v20.mjs`: mã tạo sự kiện HMAC chỉ dành cho **dịch vụ nội bộ** sau khi một hàm `loadEvidence` đáng tin cậy trả về hồ sơ thành tựu đã hoàn thành, được duyệt và xác minh tại máy chủ.
- Bằng chứng bắt buộc khớp **Firebase UID, evidenceId, source, completed/approved/serverVerified** và mốc thời gian. Dữ liệu tự khai từ giao diện như điểm thân thiết, thời gian đọc, hội thoại, các trường localStorage **không đủ điều kiện**.
- HMAC được tạo đúng định dạng đầu vào của bộ xác minh V19; thêm kiểm thử end-to-end trên dữ liệu giả lập về sự kiện hợp lệ, sửa UID, giả mốc, bằng chứng chưa duyệt và nguồn dữ liệu bị lỗi.
- **Quan trọng:** Chưa có sổ hoàn thành truyện và mốc quan hệ NPC có thẩm quyền trên máy chủ, nên chưa có `loadEvidence` thật. Module phát sự kiện **không được import vào Worker công khai**; `AVATAR_AWARDS_ENABLED=false`, `AVATAR_AWARD_ISSUER_ENABLED=false`. Không có ai nhận khung mới ở V20.

### Ảnh avatar: bước chuẩn hóa và kiểm duyệt trước khi xuất bản

- `cloudflare/src/avatar-photo-normalizer-v20.mjs`: một hợp đồng thử nghiệm yêu cầu bộ giải mã/transcode đáng tin cậy tạo ảnh JPEG/WebP **vuông, tối đa 1024px, đã xóa metadata, không hoạt ảnh**; sau đó một bộ kiểm duyệt tin cậy phải trả về chấp thuận.
- Bắt đầu từ chính sách kiểm tra MIME/header/giới hạn V18. MIME không khớp chữ ký, ảnh lỗi/quá lớn, cờ không xóa metadata, chưa giải mã hoặc bị từ chối kiểm duyệt đều **fail closed**.
- Nếu thử nghiệm thành công, đầu ra vẫn có `publishable:false`, trạng thái `PRIVATE_VARIANT_READY` và **không tự lưu vào R2, không gắn avatar, không có URL công khai**. Callback test là giả lập, chưa có dịch vụ xử lý ảnh thật đã được kiểm toán. Kiểm tra header một mình không chứng minh ảnh giải mã an toàn.
- `AVATAR_R2_ENABLED=false`, chưa tạo bucket/binding R2 và chưa có luồng phát hành ảnh thật, dọn dữ liệu quá hạn, điều tiết abuse hay đồng bộ ảnh tự tải.

### Xử lý xung đột avatar nhiều thiết bị theo lựa chọn của người chơi

- `js/player-avatar-sync-plan-v20.js`: so sánh avatar hiện có trong save cục bộ V16 với snapshot V17 được máy chủ xác minh; phát hiện các tình trạng giống nhau, khác nhau, ảnh tự tải cục bộ và khung chưa được client hỗ trợ.
- Phải **chọn rõ** “giữ trên thiết bị” hoặc “dùng phiên bản máy chủ” mới tạo ra kế hoạch ghi. Ảnh tự tải cục bộ không thể tự đưa lên máy chủ và không bị bản remote ghi đè; khung đặc biệt từ server cũng không âm thầm hạ cấp thành khung thường.
- Kết quả chỉ là **kế hoạch dữ liệu**, không ghi localStorage/IndexedDB, không fetch mạng, không tự áp dụng vào giao diện. UI V16 hiện tại vẫn dùng save cục bộ, API V17 mặc định tắt.
- Tests kiểm tra bản lưu cũ, ảnh tải lên, hồ sơ sai, revision cũ, khung đặc biệt, lựa chọn rõ ràng và không thay đổi object cục bộ.

## 2. Nghiệm thu tự động V1–V20

CI chạy các test Node.js, test Cloudflare Worker và bộ kiểm thử Chromium/Sandbox hiện có từ V1–V19. V20 bổ sung các bộ kiểm thử mới để rà ranh giới phát sự kiện, kiểm duyệt và giải quyết xung đột. CI `wrangler deploy --dry-run` chỉ kiểm tra bundle, **không thực sự deploy**.

Đây là một lượt kiểm thử hồi quy tự động, **không phải** nghiệm thu đầy đủ trên tài khoản và thiết bị thật hoặc pentest hạ tầng chưa triển khai.

## 3. Danh sách bắt buộc trước khi mở server thật

1. Xây backend thật lưu chapter-completion và NPC-bond với server-only verification; audit quyền ghi, replay, idempotency và điều kiện mở khóa khung.
2. Triển khai server image decoder/transcoder đã được kiểm toán, strip EXIF, moderation, private clean variants và hạ tầng R2 staging có giới hạn chi phí/quota.
3. Hoàn thiện luồng quản lý ảnh chính thức (finalize, read kiểm quyền, delete, orphan cleanup, moderation appeal, ownership, retention).
4. Thêm UI so sánh và đồng bộ có xác nhận, xử lý 409 revision-conflict không mất ảnh cục bộ; kiểm tra đăng nhập/đăng xuất nhiều tài khoản.
5. Chạy thử 2 Firebase UID thật trên staging, kiểm thử Android/iOS thật, rà save cũ, quyền tác giả, công cụ Cloudflare, báo cáo an ninh; chỉ sau đó xin duyệt merge/deploy.

**Đến hết V20: không có khung hiếm nào được cấp mới, không có ảnh người dùng gửi lên R2, và website đang hoạt động vẫn không đổi.**
