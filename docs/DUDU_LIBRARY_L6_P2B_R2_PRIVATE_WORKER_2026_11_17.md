# DUDU Studio — L6-P2B: Worker R2 riêng tư (chưa kích hoạt)

**Ngày:** 17/11/2026.
**Trạng thái:** mã và kiểm thử offline trên main; không triển khai lên Cloudflare, không đưa EPUB lên R2, không sửa Firestore Rules, không xóa tài liệu.
**Bucket xác nhận:** dudu-library-epub-private, Standard, Public Access Disabled. Đây là binding DỰ KIẾN, chưa chứng minh đã cài trên Cloudflare.
**Quyền:** Firestore R1.2 do chủ dự án cung cấp: Web public, EPUB published chỉ approvedReader hoặc admin; approved_accounts_v1 enabled:false chặn quyền kể cả hồ sơ cũ, nếu không có allowlist thì profiles_v2 hiện hữu có thể được grandfather.

## Những file mới

- cloudflare/src/library-r2-firestore-acl-v1.mjs — xác minh approvedReader và catalog mới qua Firestore REST bằng Firebase ID token đã được Worker xác thực. Không dùng service-account OAuth bỏ qua Rules. Lỗi trả 403/404/5xx đều fail closed. New R2 catalog **chưa có Rules được deploy**, nên mặc định truy cập bị từ chối.
- cloudflare/src/library-r2-private-v1.mjs — các route đọc riêng tư và đưa bản thảo vào quarantine. SHA-256, byte-length và MIME so với catalog phía server, kiểm soát chapter ID, tránh truy cập key tùy ý. Không có hàm xóa hoặc publish.
- cloudflare/src/library-r2-preview-entry-v1.mjs — Worker entry riêng, dùng verifyFirebaseIdToken hiện có. Không import vào cloudflare/src/index.mjs của Game/NPC.
- cloudflare/wrangler.library-r2-preview.toml — name dudu-library-r2-preview, workers_dev=false, R2 binding DUDU_LIBRARY_EPUB_BUCKET trỏ tới dudu-library-epub-private, LIBRARY_R2_ENABLED="false". **Đây là file trong GitHub, chưa phải một deploy hoặc kết nối thật.**
- cloudflare/tests/library-r2-firestore-acl-v1.test.mjs, library-r2-private-v1.test.mjs, library-r2-isolation-v1.test.mjs — mô phỏng Rules R1.2, bucket R2 và việc tách Worker.
- .github/workflows/library-l6p2b-worker-qa.yml — job read-only chạy trên main, không có token, không kết nối Firebase/Cloudflare và không deploy.

## Contract API thử nghiệm

Mọi route yêu cầu biến LIBRARY_R2_ENABLED=true trong Worker, bucket private binding, Firebase JWT hợp lệ và metadata/catalog Firestore được truy cập bằng chính Firebase ID token qua Rules. Giai đoạn này các điều kiện chưa được bật cho production.

| HTTP | Route | Quyền và tác dụng |
|---|---|---|
| GET | /v1/library/r2/read/chapter/{bookId}/{chapterId} | Độc giả approved đọc published; admin owner đọc bản nháp của mình; verify object digest |
| GET | /v1/library/r2/read/asset/{bookId}/{assetId} | Ảnh trong catalog, kiểm tra MIME/chữ ký và SHA |
| GET | /v1/library/r2/read/original/{bookId} | Chỉ admin owner đọc EPUB gốc |
| POST | /v1/library/r2/stage/chapter/{bookId}/{chapterId} | Chỉ admin owner, draft/importing; UTF-8 tối đa 420.000 byte |
| POST | /v1/library/r2/stage/asset/{bookId}/{assetId} | Admin owner, ảnh được định nghĩa trong catalog, tối đa 10 MiB |
| POST | /v1/library/r2/stage/original/{bookId} | Admin owner, EPUB gốc tối đa 30 MiB |

POST chỉ ghi QUARANTINED dưới khóa nội bộ ngẫu nhiên; phản hồi uploadId, bytes, sha256 và publishable:false. Không có đường xóa/move/publish/cutover. GET chỉ nhận object ở key mà server suy ra từ catalog, không nhận object key trực tiếp từ người dùng. Trả Cache-Control private,no-store và X-Content-Type-Options nosniff.

## Những việc CHƯA được phép xem là hoàn thành

1. **Firestore Rules mới** cho epub_catalog_r2_v1 chưa được nghiệm thu hoặc triển khai. Để API có thể hoạt động, Rules mới phải cho user token đọc đúng metadata theo approvedReader và cho owner admin xem bản nháp, không cho client tự ý ghi metadata quyền/đường dẫn. Không được deploy file firestore.rules ứng viên cũ trên GitHub đè R1.2 thật.
2. **Không có catalog và file R2 thật.** Chưa có pipeline server-side tạo manifest trước khi upload, chưa có hoàn tất đối chiếu R2 đọc ngược, chưa có bước promote object quarantine thành published. Client tự khai sha256 không được phép xác nhận việc xóa dữ liệu cũ.
3. **An toàn tệp:** kiểm tra magic bytes ZIP và ảnh mới là lớp đầu; cần thêm parser EPUB/ZIP kỹ, giới hạn giải nén/zip-slip, nội dung XHTML/script, kích thước và quét ảnh trước publish.
4. **Chưa có upload từ UI và chưa dùng adapter L6-P1 trong website.** Độc giả tiếp tục đọc EPUB V49 trong Firestore, bookmark và tên nhân vật L5.x không đổi.
5. **Triển khai Worker preview thật, bật flag, sửa Rules, chuyển dữ liệu và xóa Firestore** đều là những bước riêng, cần test quyền và xác nhận sau. Không lưu khóa bí mật vào repo; Cloudflare R2 binding không cần S3 API key.

## Kế hoạch tiếp nối

L6-P2C: chuẩn bị Rules review, catalog tạo bởi backend đáng tin, thử một EPUB trên máy vào quarantine, đọc ngược đối chiếu SHA+size, rồi mới xây bước finalize/publish có rollback. Sau khi thử R2 đọc được mới chuyển frontend; chỉ ở giai đoạn dọn dữ liệu riêng mới được xóa chương Firestore cũ bằng dry run, backup, và danh sách đối soát từng sách.
