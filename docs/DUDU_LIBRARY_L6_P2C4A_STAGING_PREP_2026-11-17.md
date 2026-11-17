# DUDU Studio — L6-P2C4A: chuẩn bị catalog và tải EPUB theo lô (OFFLINE)
Ngày: 17/11/2026. Baseline: main 5c57cd294974305dcdebe45ae3a58d576d17d020.

**Trạng thái:** mã P2C4A và QA offline. Chưa deploy/bật Worker, chưa gắn vào index.html, chưa tạo Firestore document, chưa tải EPUB thật lên R2, chưa sửa Rules live, chưa promote/publish/delete hoặc thay Game.

## I. API Worker khi nào cần cấu hình?

- **Bây giờ:** CHƯA CẦN API token hoặc URL Worker. Worker Library preview dudu-library-r2-preview vẫn workers_dev=false, LIBRARY_R2_ENABLED=false; bucket private dudu-library-epub-private đã có, chỉ có binding được mô tả trong wrangler.library-r2-preview.toml.
- **Sau khi Catalog creator + Rules Emulator + import preview an toàn đạt:** chủ dự án đăng nhập tài khoản Cloudflare bằng Wrangler hoặc cấp thông tin triển khai qua hệ thống bảo mật do chính chủ dự án kiểm soát; triển khai **Worker riêng** có binding DUDU_LIBRARY_EPUB_BUCKET tới dudu-library-epub-private. R2 Workers binding KHÔNG yêu cầu S3 access key trong JS hoặc browser.
- **Khi thử trên staging:** cấu hình route/hostname HTTPS riêng cho Worker Library (hoặc preview URL ở môi trường kiểm thử), CORS origin chính xác, Firebase projectId và JWT verifier. Website lấy Firebase ID Token của người dùng tự động. **Không chép ID token, Cloudflare token, R2 secret vào chat, GitHub hoặc source code.**
- **Chỉ sau stage + server verification + publish pilot:** mới cấu hình website trỏ tới endpoint Worker riêng; vẫn giữ EPUB Firestore cũ để rollback. Chưa dọn dữ liệu cũ trước khi đọc R2 thành công và backup.
- Phải kiểm tra hạn mức Workers và R2 Standard (10 GB-month free tier không phải hard cap), không mặc định sẽ luôn miễn phí.

## II. Những gì P2C4A thực hiện

### 1. Catalog creator — chỉ sinh dữ liệu

cloudflare/src/library-r2-draft-identity-v1.mjs:
- issueDraftIds() yêu cầu verified Firebase admin identity truyền từ **runtime server đáng tin**, dùng crypto.randomUUID() để sinh bookId và revisionId.
- prepareCreateOnlyDraft() bắt buộc manifest khớp UID và IDs đã phát; sử dụng parser catalog P2C3, yêu cầu status='importing', backend='r2' và create-only precondition exists=false.
- Kết quả là descriptor; **không có lệnh ghi Firestore**. Bản mô phỏng issued IDs do client gửi chưa đủ để cấp quyền tạo catalog thật; ở bước sau cần ràng buộc ID với session/bản thảo do server lưu, chống replay và chống cross-account.

### 2. Bộ điều phối tải lên theo lô — không có network mặc định

js/library-epub-stage-l6p2c4.js:
- buildPlan() kiểm tra từng byte và SHA-256 của file EPUB gốc, text chương, layout JSON và ảnh trước khi gửi; yêu cầu đủ các thành phần trong manifest, không có part thừa/thiếu.
- stageBatch() dùng đường stage Worker riêng, gửi tuần tự tối đa 8 file/lần qua **transport được chèn từ phía ứng dụng**; lấy Firebase token mới từ tokenProvider(), không lưu token.
- Biên nhận Worker bắt buộc HTTP 201, uploadId UUID, SHA và bytes đúng, publishable:false. Nếu lỗi 403, sai hash hoặc mất mạng thì dừng và không tự publish, không xóa. Cursor in-memory chỉ hỗ trợ tiếp tục theo điều khiển của người dùng; sau khi reload cần xác minh lại với backend.
- Đây **chưa phải giao diện thực sự trên website**. Để tránh upload lỗi thiếu catalog, chưa nối module vào index.html hoặc Firebase hiện hành.

### 3. Chuẩn bị Rules R1.2 cho Firebase Emulator, KHÔNG deploy

scripts/l6p2c4-prepare-rules.cjs đọc **bản Rules R1.2 do chủ dự án xuất từ Firebase Console** và fragment security/epub-catalog-r2-v1.rules.review. Nó chỉ cho phép sinh file thử nghiệm **chưa tồn tại**, từ chối ghi đè firestore.rules hoặc input, kiểm dấu hiệu signedIn/admin/approvedReader/approvedPlayer và grandfather profiles_v2; cấm nếu catalog mới đã tồn tại.

Cách chuẩn bị file trong môi trường cá nhân (ví dụ đường dẫn phải thay theo máy):

    node scripts/l6p2c4-prepare-rules.cjs "./private/live-r12-export.rules" "./security/epub-catalog-r2-v1.rules.review" "./private/r12-catalog-EMULATOR-ONLY.rules"

Sau đó tạo cấu hình Emulator tách biệt chỉ rõ file Rules đầu ra, chạy bộ test với Firebase Local Emulator Suite, không dùng firebase.json production hiện tại. Chưa đưa tệp Rules R1.2 của chủ dự án vào GitHub vì không có bằng chứng file đó đúng bằng **Published Rules** lúc này. Chưa chạy Emulator trong phiên này: hiện chỉ kiểm thử việc tạo file và chính sách deny bằng Node.

### 4. Những điều kiện vẫn BLOCKED

1. Chưa có server-side trusted Firestore writer được xác thực bằng Firebase Admin SDK/IAM; Admin SDK bypass Rules nên IAM + code validation phải chặt chẽ và có audit. Không tạo endpoint public cấp catalog từ JSON/UID tùy ý.
2. Chưa có session chống replay cho IDs và writer create-if-absent thực tế; module hiện chỉ sinh descriptor.
3. Chưa có verified upload session/complete-book audit kết hợp tất cả objects/quarantine + promotion và publish transaction.
4. Chưa có giao diện upload trên trang Library, lỗi mạng thực/Android, thử EPUB có ảnh, thử account approved/grandfather/revoked.
5. Chưa đối chiếu live Published Rules với R1.2 xuất từ Console hoặc chạy Emulator integration; chỉ static Node tests.
6. Không đổi cloudflare/src/index.mjs, cloudflare/wrangler.toml, index.html, firestore.rules, Firebase collection và R2 real; dữ liệu Web/EPUB cũ và game giữ nguyên.

**Kế tiếp:** L6-P2C4B kiểm chứng Rules Emulator trên chính bản live export và chuẩn bị trusted writer/session; tiếp theo mới cho phép preview deploy Worker staging, kết nối endpoint HTTPS và thử upload đúng một EPUB với quyền admin.
