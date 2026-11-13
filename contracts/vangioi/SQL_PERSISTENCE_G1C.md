# VẠN GIỚI — Lưu nháp và gửi duyệt bằng SQLite Giai đoạn 1C

Ngày 26/10/2026. Nền đối chiếu: `6a99b52083c5e536481fee48a0a749cbff69fc4e`.

Đợt này thêm `cloudflare/src/vangioi-authoring-sql.mjs`, dùng `storage.sql.exec` và `storage.transactionSync` cùng kiểu adapter mà registry V71 đang dùng. Đã kiểm thử với SQLite thật qua `node:sqlite`, bao gồm lưu file, đóng rồi mở lại. **Chưa tạo Durable Object class/binding, chưa import vào Worker live, chưa có HTTP route, chưa chạy migration Cloudflare hoặc ghi dữ liệu tài khoản thật.**

## Phần đã triển khai

`createSqlAuthoringService({storage, projectId, verify, validateContent, now})` trả bốn phương thức:

| Phương thức | Kết quả khi thành công |
|---|---|
| `saveDraft(request, {worldId, expectedRevision, requestId, patch})` | Ghi revision tiếp theo, cập nhật header và contributor cùng biên nhận/audit trong một transaction |
| `submitDraft(request, {worldId, expectedRevision, requestId})` | Ghi snapshot bất biến và khóa đúng revision ở submitted cùng biên nhận/audit trong một transaction |
| `viewDraft(request, {worldId})` | Đọc revision hiện tại theo scope G1B |
| `viewSubmission(request, {worldId, snapshotHash, forReview})` | Đọc snapshot đã lưu, kiểm hash và quyền G1B |

Chỉ từ adapter SQL này mới có kết quả **đã commit**; các hàm `prepare*` của G1B vẫn chỉ chuẩn bị kế hoạch. Adapter SQL không nhận plan do client gửi. Nó tự xác thực Firebase, tạo kế hoạch G1B, rồi kiểm lại quyền/metadata trong transaction trước khi ghi.

Đợt này chưa có API tạo world, cấp/thu hồi membership, duyệt/publish hoặc chuyển owner. Bản ghi world/membership ban đầu phải được provision bởi backend đáng tin khi chức năng đó được triển khai. Tests tự tạo các bản ghi giả định trong database test; không phải luồng cấp quyền thật.

## Các bảng riêng

| Bảng | Nội dung |
|---|---|
| `vg_authoring_worlds_v1` | Owner, draftRevision, accessRevision, draftState, lịch sử contributor |
| `vg_authoring_members_v1` | UID, vai và phạm vi được giao theo world |
| `vg_authoring_drafts_v1` | Nội dung bất biến theo world + revision |
| `vg_authoring_submissions_v1` | Snapshot JSON và hash; duy nhất một snapshot cho world + revision |
| `vg_authoring_operations_v1` | Biên nhận theo world + UID + requestId và hash request |
| `vg_authoring_audit_v1` | Actor, request, hành động, revision trước/sau, hash snapshot và thời điểm server |

Chỉ khi khởi tạo factory trên storage được truyền vào mới chạy `CREATE TABLE/TRIGGER IF NOT EXISTS`, bên trong transaction. Chưa có cơ chế tự gọi factory trên registry live. Các bảng mới không thay bảng hệ thống, thẻ, khế ước, profile, chat, ví, kho hoặc EPUB hiện có.

Revision nội dung, submission, operation receipt và audit có trigger chặn UPDATE/DELETE. Không dùng INSERT OR REPLACE để ghi đè lịch sử. Trigger bảo vệ các thao tác SQL thông thường, không phải bằng chứng chống được người quản trị có quyền sửa schema/database. Chưa có chính sách retention/backup/restore production.

## Giao dịch và cạnh tranh

Các bước xác minh token, chuẩn bị nội dung và tính SHA-256 có thể await **ngoài** transaction. Trong phần transaction đồng bộ, adapter:

1. Kiểm world/UID/quyền và tìm biên nhận request cũ.
2. Đối chiếu ownerUid, revision, accessRevision, trạng thái draft và scope với kế hoạch đã chuẩn bị.
3. INSERT revision hoặc snapshot; UPDATE header với điều kiện so khớp và kiểm `RETURNING` có đúng một hàng.
4. INSERT operation receipt và audit.
5. Commit tất cả; bất kỳ exception nào làm rollback toàn bộ.

Không có await trong transaction. Hai yêu cầu lưu khác nhau từ cùng revision chỉ có một yêu cầu được commit; yêu cầu còn lại nhận conflict. Lưu và gửi duyệt tranh cùng revision cũng không thể cùng ghi thành công. Trường hợp đã thu hồi scope/đổi owner hoặc accessRevision ở khoảng trống sau prepare, transaction sẽ kiểm lại trước ghi.

Chức năng quản lý quyền tương lai phải tăng accessRevision cùng lúc với thay membership/owner, và không xóa contributor khi họ rời nhóm. Nội dung revision đã lưu không được sửa tại chỗ. Bản gửi submitted vẫn giữ revision nội dung, nhưng header không còn draft nên không nhận sửa tiếp; mở lại bản nháp cần luồng revision mới ở đợt sau.

Khi nối Durable Objects, phải định tuyến mọi ghi của cùng world vào cùng authority/storage đã xác định. Kiểm thử hiện không chứng minh atomicity giữa nhiều DO/Firestore hoặc nhiều nguồn dữ liệu độc lập.

## Chống ghi lặp

- Client tạo UUID v4 `requestId` cho mỗi hành động có chủ ý; khi retry do timeout/mất phản hồi phải giữ nguyên ID, expectedRevision và payload.
- Khóa deduplication gồm world + UID đã xác thực + requestId; không dùng ID tự khai để chuyển hành động sang UID khác.
- Request hash gồm action và toàn bộ input hợp lệ, chuẩn hóa thứ tự khóa JSON. Cùng requestId nhưng khác nội dung hoặc loại hành động bị từ chối `idempotency-conflict`.
- Retry đúng request sau khi gửi duyệt đã khóa bản nháp vẫn nhận biên nhận thành công cũ; không chạy validator hoặc tạo snapshot/audit lần nữa.
- Retry sau khi bị thu hồi quyền sẽ bị chặn. Bỏ qua trạng thái khóa chỉ áp dụng để xác nhận một hành động **đã commit**, không cho phép ghi mới vào bản khóa.
- `replayed:true` là biên nhận lịch sử, không phải trạng thái world hiện tại. UI tương lai phải đọc lại nháp/header khi cần đồng bộ giao diện, không ghi đè màn hình hiện tại bằng state cũ trong receipt.
- Request thất bại trước commit không được lưu biên nhận thành công; có thể retry cùng ID sau khi khắc phục lỗi nếu revision/quyền vẫn hợp lệ.

Receipt chỉ trả world/revision/state/hash snapshot, không chứa toàn bộ Story Bible. Audit không lưu prose hay JWT/API key. Hash không phải chữ ký, không chứng minh quyền tác giả hoặc đạt điều kiện phát hành.

## Validator và dữ liệu đầu vào

Factory mặc định tái sử dụng verifier Firebase hiện có. Tiêm verifier/storage/clock/validator chỉ dành cho code backend và kiểm thử, không lấy từ JSON hoặc query của người dùng. `validateContent` vẫn là callback backend bắt buộc khi submit; thiếu/lỗi/từ chối thì không ghi snapshot hoặc khóa nháp. Chưa có semantic validator submit của contract mới nên không cấu hình một hàm luôn trả ready trong production. Validator luôn-pass trong tests là fixture để cô lập kiểm thử transaction.

Sửa nháp cho phép nội dung dở; cùng allowlist mục nội dung G1B, patch không chứa owner/status/revision/rank chính thức hoặc plan giả. Input được copy trước await để tránh bị thay đổi sau kiểm. SQL dùng tham số bind cho toàn bộ giá trị, không thực thi các chuỗi trigger/nội dung tác giả.

HTTP handler tương lai vẫn cần giới hạn bytes trước parse, đọc/kiểm JSON nghiêm ngặt và thông báo lỗi phù hợp. Chưa thêm endpoint mạng hoặc UI ở đợt này.

## Kiểm thử

```sh
node --test cloudflare/tests/vangioi-authoring-sql.test.mjs
node --test cloudflare/tests/*.test.mjs
```

26 ca SQL mới kiểm lưu/đọc, history, snapshot khóa đúng revision, gửi lặp/concurrent retry, cạnh tranh ghi, lỗi sau UPDATE/receipt/audit phải rollback, thu hồi quyền ở khoảng trống trước transaction, chặn chéo UID/scope, request ID dùng lại sai nội dung, validator lỗi, SQL injection qua prose, trigger bất biến, scope bản gửi, contributor và giữ dữ liệu sau đóng/mở file SQLite.

Đây là kiểm thử transaction SQLite cục bộ, không phải nghiệm thu Cloudflare DO live, Firebase Rules, load nhiều người thật hoặc giao diện. Chưa dùng migration/billing/secrets và chưa cấp world access, nhiệm vụ, EXP hoặc vật phẩm.

## Tiếp nối và rollback

Bước tiếp: chuẩn hóa draft contract/validator submit, nguồn truyện có version và asset registry; thiết kế provisioning world/membership trước khi nối Creator/HTTP. Migration và binding backend thật cần được xét riêng với backup, quyền triển khai và nghiệm thu staging phù hợp.

Rollback source: revert module SQL, test, helper exports và tài liệu đợt 1C. Chưa có migration live nên không xóa database/profile người dùng để rollback. Các file SQLite test chỉ nằm trong thư mục tạm và được xóa sau test.
