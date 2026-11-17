# DUDU STUDIO — L6-P2C2: EPUB image extraction & private R2 promotion

**Ngày:** 17/11/2026. Baseline P2C1: c6515b531a0bc3a7cb7748c28b73c524ec6a92b4.
**Trạng thái:** chỉ module độc lập và kiểm thử offline trên main. Chưa deploy Worker Library, chưa bật R2, chưa upload, chưa chỉnh live Firestore Rules, chưa chuyển hoặc xóa EPUB cũ.

## A. Bộ trích xuất ảnh EPUB

File js/library-epub-assets-l6p2c2.js không được nạp trong index.html, không sửa bộ nhập EPUB V48/V57 đang chạy. Từ EPUB gốc do tác giả chọn và danh sách chương đã parse:
- Giới hạn EPUB <=30 MiB, <=3000 ZIP entries, <=80 MiB unpacked, <=160 chương, <=420.000 byte văn bản/chương, <=10 MiB/ảnh; bắt buộc kiểm CRC và magic ZIP, signature ảnh.
- Trích tất cả ảnh raster khai trong OPF manifest (JPEG/PNG/WebP/GIF), kể cả ảnh không hiện inline; ảnh bìa lưu nguyên gốc. Không tải từ URL khác hay xử lý raw HTML trong browser reader.
- Tạo manifest tương thích hợp đồng L6-P2A, byte ảnh, SHA-256, ID asset ổn định theo path, và layout preview theo thứ tự các segment text/image trong XHTML. Alt chỉ là plain text đã lọc; không chèn XHTML.
- **Không bỏ sót trong im lặng**: ảnh SVG, CSS background/@import, picture/srcset, data/remote URL, image không khai trong OPF, đường dẫn ZIP nguy hiểm hoặc MIME sai sẽ báo lỗi và chặn cutover.
- Layout hiện chỉ là dữ liệu chuẩn bị; chưa có layout object riêng trên R2 hoặc API đọc/render ảnh. Kết quả luôn có cutoverReady:false.

## B. Quarantine -> immutable staging (internal only)

File cloudflare/src/library-r2-promotion-v1.mjs tạo hàm promoteQuarantineBatch tối đa 8 object/lô. Chỉ dùng với identity admin đã kiểm tra ở phía server và catalog draft/importing từ nguồn đáng tin cậy; module này không trực tiếp xác minh JWT hay gọi Firestore.

Mỗi object được đọc lại từ vùng quarantine bằng key nội bộ theo UID/bookId/revision/upload UUID; kiểm metadata, số byte, MIME/signature và SHA-256. Chỉ sau đó mới PUT vào key bất biến:
- originals/{bookId}/{revision}/source.epub
- chapters/{bookId}/{revision}/{chapterId}.txt
- assets/{bookId}/{revision}/{assetId}.{ext}

R2 PUT có onlyIf etagDoesNotMatch='*'; object đã tồn tại không bị ghi đè, chỉ được reuse khi đọc ngược và chứng minh bytes/hash/metadata giống nhau. Mọi PUT được GET lại để đối chiếu SHA. Lỗi mạng tạo trạng thái partial an toàn và có thể retry. Không DELETE, không chuyển trạng thái Firestore, không công khai object.

Kể cả allVerified=true, kết quả vẫn **authorizedToPublish=false, eligibleForDeletion=false, cutoverReady=false**. Một batch hoàn tất chưa thể chứng minh toàn bộ EPUB đủ điều kiện publish.

## C. Kiểm thử và phạm vi

- Node tests: local path security, image MIME; R2 mock với 10 tình huống về quyền owner/admin, metadata, hash, conditional put, idempotent retry, xung đột, lỗi mạng và mismatch khi đọc ngược.
- Chromium mock ZIP+OPF: ảnh cover, ảnh inline theo thứ tự, ảnh không hiện inline, Unicode, path traversal, data/external URL, SVG, srcset, CSS background và image signature lỗi.
- Giữ nguyên Firestore source V49, website, reader/bookmark, từ điển L5.x, Game, xu/EXP, live Rules, Worker dudu-ai-staging, bucket private và existing deployment.
- Worker preview dudu-library-r2-preview tiếp tục OFF, không có auto deploy. Chưa có UI upload và tuyệt đối không tự xóa chương Firestore.

## D. L6-P2C3 cần làm trước khi dùng R2 thật

1. Quy định schema immutable layout/chapter trong R2 và bổ sung Worker GET layout, viewer chỉ hiển thị text/ảnh đã kiểm, có checksum. Không làm mất ảnh xen giữa văn bản.
2. Trusted server catalog creator, Rules R1.2 + catalog mới kiểm thử Emulator; upload/resume/finalize toàn bộ object và layout; publish sau tất cả verify.
3. Nghiệm thu ít nhất 1 EPUB có ảnh và EPUB text-only từ máy, mobile PC/Android, bookmark, quyền approved/grandfather/revoked, và rollback.
4. Chỉ sau khi R2 đọc được sách, đối soát backup và dry-run rõ đối tượng mới có kế hoạch dọn chapter Firestore cũ.

R2 Workers API hỗ trợ conditional PUT: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
