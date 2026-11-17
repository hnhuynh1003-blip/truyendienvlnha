# DUDU STUDIO — L6-P2C1: Kiểm chứng EPUB trong R2 quarantine (17/11/2026)

**Baseline:** L6-P2B main 80494ebf23a840233d89c48d3e6a7052cc75dfac.
**Trạng thái:** Kiểm chứng thuần offline và mẫu Rules để duyệt. Không deploy Worker, không ghi bucket R2 thật, không sửa live Firestore Rules, không upload/xóa EPUB và không đổi đường đọc website.
**Bucket mục tiêu:** dudu-library-epub-private (Standard, Public Access Disabled).

## Bổ sung

- cloudflare/src/library-r2-quarantine-audit-v1.mjs kiểm tra vùng cách ly qua bucket GET giả lập: lấy khóa theo UID đã xác thực, bookId, immutable revision và UUID upload. Mỗi bản ghi phải có đúng metadata QUARANTINED, owner, book, revision, loại, item và SHA-256.
- Mô-đun đọc lại **byte thực** cho EPUB nguồn, mỗi chương UTF-8 và từng ảnh; kiểm tra size, magic bytes / UTF-8 hợp lệ và SHA-256 độc lập. Lỗi mạng, sai MIME, SHA, thiếu tệp, UID khác, tham chiếu trùng hoặc truyện đã published sẽ không có kết quả complete.
- Đây là **công cụ nội bộ**, không có HTTP route, không dùng token/secret, không gọi PUT/DELETE/COPY. Ngay cả kết quả complete=true cũng luôn trả authorizedToPublish=false và eligibleForDeletion=false. Bên tạo catalog/duyệt xuất bản an toàn chưa được viết.
- security/epub-catalog-r2-v1.rules.review là FRAGMENT dành cho Rules R1.2 đã có trên Firebase: approvedReader đọc catalog published; admin chủ sở hữu được GET draft; tất cả client list/create/update/delete vẫn khóa. **Không deploy fragment riêng**; nó phải được nối vào bản Rules live sau khi chạy Emulator và có phê duyệt.
- GitHub QA chạy Node 22 với R2 mock, không dùng Cloudflare/Firebase credentials.

## Các điều kiện còn thiếu trước upload/publish thật

1. Firestore R1.2 đang chạy cần export để so sánh; triển khai Rules catalog mới chỉ sau khi thử Emulator với account đã duyệt, grandfather, revoked, owner admin, guest và tài khoản khác.
2. Cần writer tạo catalog draft từ metadata EPUB ở backend đáng tin, với logic chống trùng bookId và kiểm chứng nguyên trạng tài khoản. Firestore REST bằng Firebase ID token tôn trọng Rules; service account IAM có thể bypass Rules nên cần bảo vệ riêng.
3. Bộ parser js/epub-import-v48.js hiện lấy text và thumbnail cover, **chưa trích toàn bộ ảnh minh họa** từ EPUB. Chưa cho publish lại EPUB có minh họa khi chưa triển khai extraction và render an toàn.
4. Cần bước finalize riêng: server xác minh quarantine, promote các object bằng key bất biến, đọc lại từ vùng đích, đảm bảo metadata và trạng thái publish sau cùng; có rollback và kiểm thử đứt mạng. Không triển khai thao tác xóa Firestore ở L6-P2C1.
5. Kết quả kiểm chứng upload từ browser là dữ liệu không tin cậy; không thể tự cho phép publish hoặc xóa. Sau cutover thành công mới lập danh mục dọn chapter cũ từng sách và xin xác nhận riêng.

**Không động tới:** index.html, Game/NPC Worker, cloudflare/wrangler.toml, Firebase Rules live, dữ liệu EPUB source, account và EXP/Xu.
