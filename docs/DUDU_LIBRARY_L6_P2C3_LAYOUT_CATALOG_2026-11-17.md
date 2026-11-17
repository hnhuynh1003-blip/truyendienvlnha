# DUDU Studio — L6-P2C3: EPUB chapter text–image layout on private R2
Ngày: 17/11/2026. Baseline: main 322fbb26d1dc443102563f146a41932fe9e3e7c7.

**Trạng thái:** OFFLINE PROTOTYPE trên main. Chưa sửa live reader/index.html, không deploy Cloudflare Worker, không bật LIBRARY_R2_ENABLED, không đổi Firestore Rules, không upload hoặc xóa EPUB thật.

## 1. Thiết kế lưu trữ

| Loại | Nguồn lưu mới | Nội dung |
|---|---|---|
| EPUB gốc | R2 private originals/{bookId}/{revisionId}/source.epub | ZIP byte nguyên gốc, SHA-256 |
| Text chương | R2 private chapters/{bookId}/{revisionId}/{chapterId}.txt | UTF-8, không chứa HTML |
| Ảnh | R2 private assets/{bookId}/{revisionId}/{assetId}.{ext} | JPEG, PNG, GIF, WebP, hash |
| Layout | R2 private layouts/{bookId}/{revisionId}/{chapterId}.json | Canonical JSON, SHA-256, giới hạn 1 MiB |
| Catalog | Firestore epub_catalog_r2_v1/{bookId} (đề xuất) | ownerUid, status, revision, metadata, chapterIndex, asset metadata, layout.bytes/layout.sha256 |
| Quyền/tiến độ/Game | Firebase hiện có | Giữ nguyên, không đổi ID hoặc reset |

Layout JSON v1 chỉ có schema, bookId, revisionId, chapterId và segments theo thứ tự xuất hiện. Segment text chứa chuỗi nguyên văn; segment image chỉ có assetId thuộc catalog và alt văn bản. Không có HTML động, URL ảnh công khai hay R2 object key trong document. Các layout phải đối chiếu text của chương bằng cách chuẩn hóa khoảng trắng để tránh thiếu chữ/sai thứ tự.

## 2. Mã và đường kiểm thử

- js/library-epub-layout-l6p2c3.js: encode/decode layout chuẩn, kiểm SHA-256, bytes, ID và assetId, so sánh chapterText. Hàm preview dựng DOM qua textContent và Blob objectURL đã kiểm tra, không dựng raw HTML. Chưa nạp vào website.
- cloudflare/src/library-r2-layout-v1.mjs: trình xác nhận payload layout phía máy chủ; không chạy JavaScript có trong text.
- cloudflare/src/library-r2-private-v1.mjs: trên Worker PREVIEW, thêm GET read/layout và POST stage/layout. GET chỉ hoạt động nếu JWT hợp lệ, catalog cho phép, layout SHA đúng VÀ chapter text đọc từ R2 có SHA đúng, sau đó hai nội dung text phải khớp. POST chỉ đưa vào quarantine, không publish.
- cloudflare/src/library-r2-firestore-acl-v1.mjs: chapter metadata có thể chứa layout {bytes,sha256}. Catalog cũ không có layout không tự động bổ sung.
- cloudflare/src/library-r2-quarantine-audit-v1.mjs và library-r2-promotion-v1.mjs: kiểm tra layout trong bản nháp, immutable conditional PUT, đọc ngược xác minh và retry idempotent. Không có DELETE.
- cloudflare/src/library-r2-catalog-draft-v1.mjs: chỉ xây Firestore REST field metadata ở trạng thái importing; cần verified UID admin từ bên gọi. KHÔNG có lệnh ghi network, catalogWritten=false, authorizedToPublish=false và eligibleForDeletion=false.

Các mô-đun Worker ở trên chưa được deploy hoặc bật. Worker Game và cấu hình Wrangler chính không thay đổi.

## 3. Kiểm thử, giới hạn

- Layout unit: Unicode NFD, deterministic JSON, hash, text/image order, ID, ảnh không thuộc danh mục, script chỉ như plain text, dữ liệu lạ và lỗi checksum.
- Chromium 1280/320/390/430px: chữ không thực thi HTML/script; ảnh dùng Blob URL, thu hồi khi bỏ; lỗi ảnh không làm mất dữ liệu đọc.
- Worker mock: quyền read/stage, hai checksum, so chữ layout với chapter, metadata layout có/không, prepared draft không được viết hoặc publish.
- Mock audit/promotion: EPUB nguyên gốc + chương + layout + ảnh, kiểm byte, UID, revision, checksum, retry và từ chối fake asset.
- EPUB có ảnh SVG, CSS background, XHTML chưa hỗ trợ vẫn bị chặn theo L6-P2C2; không tự động bỏ ảnh. Bộ render an toàn trong P2C3 hiện chỉ là PREVIEW, chưa kết nối UI đọc thật.

## 4. Cổng bảo vệ trước triển khai cloud

1. Rules R1.2 chủ dự án cung cấp vẫn là căn cứ thiết kế; EPUB published chỉ approvedReader hoặc owner admin. Trước khi thay Rules live phải export, đối chiếu và chạy Firebase Emulator.
2. Bucket dudu-library-epub-private vẫn private; preview Worker OFF, workers_dev=false. Không cấu hình public bucket, key hoặc token API trong HTML.
3. Catalog Firestore mới chỉ là bản chuẩn bị: phải có trusted writer và bảo đảm không tự cấp quyền từ user input.
4. Chưa có pipeline upload/finalize/publish end-to-end, chưa nghiệm thu EPUB thật hoặc Android; không được xóa các chapter Firestore cũ.
5. Sau L6-P2C3, bước kế là L6-P2C4: trusted catalog writer + Rules emulator + UI upload theo lô + xuất bản có đối soát, staging thực tế sau khi chủ dự án duyệt. Sau cutover và backup riêng mới lên kế hoạch dọn Firestore cũ.
