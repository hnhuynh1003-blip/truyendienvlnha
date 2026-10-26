# VẠN GIỚI G1G — World Creator soạn nháp trong Chủ Thần AU

Ngày 26/10/2026. Nền `5e01681` (G1F, CI/Pages SUCCESS). Giữ ứng dụng HTML/JS hiện có, không tạo Site, nhánh hoặc ZIP riêng.

## Trải nghiệm hiện có

Đăng nhập tài khoản AU đủ điều kiện hiện hành → Chủ Thần AU → MỞ BẢN SOẠN WORLD. Launcher và mount dùng đúng gate `DuduSystemAppsV69.isAuthor()` (Firebase ready + admin + canEditStories); không biến profile role hoặc client claim thành quyền backend Vạn Giới. Chức năng AI/Core cũ vẫn ở màn Chủ Thần AU và không được Creator gọi.

| Mục | Đã triển khai |
|---|---|
| Thông tin | Tên world, sáu genre chuẩn, bậc đề nghị tùy chọn, contentVersion; Story Bible, mở đầu, vai người chơi, secretTruth, nhịp truyện và luật. |
| Địa điểm & cảnh | Thêm địa điểm/map ban đầu, scene ID ổn định, chọn nơi, lời dẫn, tham chiếu nền và điều kiện/đích chuyển cảnh. Cập nhật quan hệ place-scene/map-place khi chỉnh qua form; xóa địa điểm đang có cảnh bị chặn. |
| Nguồn & ảnh | Soạn tham chiếu nguồn và asset ID/version/hash/kind, altText và cover. Không tải URL, upload, phát grant hoặc giả trạng thái approved. |
| Nhiệm vụ | Thêm/sửa nhiệm vụ chính, tên, tóm tắt, scene bắt đầu; mục tiêu/phần thưởng/vai nhập/NPC/items/endings còn soạn trong JSON nâng cao. |
| Dữ liệu nâng cao | Sửa toàn bộ world-content-1; cần áp dụng JSON hợp lệ trước khi save/export/check. JSON lỗi giữ nguyên model form trước, không âm thầm lưu bản cũ. |
| Xem trước | Chọn scene để xem nhãn địa điểm và summary an toàn bằng textContent; chưa tải art, không chạy engine/trigger hoặc hiển thị secretTruth trong preview. |
| Bản nháp | Lưu rõ trên thiết bị, mở theo UID, tạo bản mới, nhập/xuất JSON; không nhận worldId/owner/status/review tự khai và không tự chuyển V0.1. |

Bậc S đề nghị không thành bậc chính thức. Không thêm quota scene/NPC/ảnh/nhiệm vụ theo rank; không phát khảo hạch, WORLD_PLAY, 48 seed, EXP hoặc vật phẩm. Preview nền trống có lời giải thích, không dùng placeholder làm ảnh đạt chuẩn V1.2-A.

## Lưu thiết bị và đổi tài khoản

`js/vangioi-creator.js` dùng IndexedDB riêng `dudu-vangioi-creator-local-1`, store drafts với khóa `[uid,localId]` và index owner. Wrapper `creator-local-1` có uid/localId/updatedAt/content, không chứa token. localId không phải server worldId. Không ghi Firestore, Worker hoặc khóa localStorage/sessionStorage cũ.

Dữ liệu local là nháp chưa tin cậy, không phải sở hữu world đã được server xác thực. UI gate và UID scope bảo vệ luồng sử dụng thông thường, không thay thế quyền backend hoặc mã hóa ổ đĩa; chưa có đồng bộ/backup cloud. Xóa dữ liệu trình duyệt có thể mất nháp, xuất JSON là thao tác giữ bản sao của tác giả. Tệp export có cả bí mật Story Bible và giao diện nhắc rõ tại lúc xuất.

Đổi UID, mất ready/admin hoặc đăng xuất: `syncAccess` xóa ngay model/DOM/JSON tạm của tài khoản trước, không xóa các bản đã lưu của UID đó. Mở lại app cùng UID giữ nháp trong phiên. Đọc/mở/save async kiểm lại UID và epoch trước khi cập nhật UI. Save chụp model tại lúc bấm; thay đổi trong lúc lưu vẫn được báo chưa lưu. Mở nháp không thay model nếu đã sửa trong gap đọc. Nếu IDB lỗi/quota, vẫn giữ bản trong phiên và báo thất bại, không fallback ghi lên mạng. Dữ liệu đã lưu luôn được parse/schema lại trước khi mở; không tin wrapper từ file import.

## Validator dùng chung

`js/vangioi-creator-validation-entry.mjs` chỉ xuất copy/parse, partial validation và `inspectContent` G1D. `cloudflare/scripts/build-vangioi-creator.mjs` + esbuild devDependency pin 0.28.2 tạo bundle IIFE `js/vangioi-creator-validation.js`. Không bundle SQL/auth/registry writer, mạng hoặc runtime codegen; không đổi CSP/unsafe-eval. Browser không gọi createContentValidator có backend registries vì chưa có service live.

Report required-field của validator chung nay có tên trường thiếu trong path, không trả giá trị/prose. UI dịch nhóm lỗi và giới hạn số mục hiển thị. Cấu trúc PASS chỉ là chuẩn bị hồ sơ; chưa xác minh source/asset/license hoặc gameplay. Nút Gửi duyệt bị khóa và có giải thích backend chưa kết nối; không tạo spinner/success giả hoặc POST đến endpoint giả.

Import giới hạn 2 MiB; dùng clone JSON giới hạn/allowlist và schema draft thật. Chưa hỗ trợ chuyển V0.1 trong UI, batch import, đối chiếu merge đa người, sửa visual/NPC bằng form riêng hoặc delete local draft. Chưa kiểm khóa JSON trùng trước JSON.parse; parser theo chuẩn JSON.parse lấy giá trị khóa cuối rồi kiểm nội dung, không được coi parser local là cổng nhập backend authoritative.

## QA

- 481 test ứng dụng hiện có PASS cục bộ; 339 test Worker/helper PASS, gồm 5 test G1G về parser/metadata/required paths/preserve content/build reproducibility.
- `tests/browser-vangioi-creator.cjs` chạy HTML/JS main thật trong Chromium Playwright 1.56.1 với Firebase giả, IndexedDB thật và chặn mạng ngoài. Bao gồm guest/Reader gate, AU forms, save/reopen, source secret, map-place-scene identity, JSON valid/invalid import, export, raw JSON apply/undo, quota failure, đổi hai UID, logout, XSS bằng văn bản và layout 320/375/390/430/1280 px.
- Có ảnh QA scratch ở mobile/desktop và sửa xung đột header CSS chung. Các snapshot này chỉ dùng dữ liệu giả, không phải ảnh background sản xuất.
- Browser main System V71/auth regression kiểm riêng; CI bổ sung Creator vào bước main acceptance bắt buộc. Chỉ ghi PASS sau khi xem kết quả; CI/Pages theo commit GitHub của đợt này.

Chưa QA thiết bị Android/iOS thật, production Firebase AU session hoặc persistence ở chế độ riêng tư. Các test không chứng minh backend G1B–G1F đã triển khai; backend vẫn không route/binding/migration live.

Tiếp: form cấu trúc cho vai nhập/mục tiêu/NPC/vật phẩm/kết cục và quản lý tham chiếu rõ hơn. Kết nối Firestore/object storage/endpoint cấp quyền thật cần kế hoạch và duyệt deployment riêng. Không mở gửi duyệt chỉ vì UI hoặc bundle PASS.

Rollback source: revert commit G1G và version URL script. Chưa có migration backend; giữ DB local của người dùng, không tự xóa nháp khi rollback. Giữ auth/EPUB/NPC/Thiên Mệnh/save/kho/EXP/pool/AI/Canon hiện hành.
