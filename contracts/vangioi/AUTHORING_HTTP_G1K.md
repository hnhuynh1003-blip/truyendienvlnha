# VẠN GIỚI — HTTP adapter G1K

> Tiếp nối G1L: thêm review decision/reopen trong adapter độc lập, xem [REVIEW_LIFECYCLE_G1L.md](REVIEW_LIFECYCLE_G1L.md). Nội dung bên dưới mô tả mốc G1K, không phải danh sách endpoint mới nhất.

Ngày 26/10/2026. Nền `1177a5542dadf8895947e0863ab869546f821b5b` (G1J).

## Kết quả

`cloudflare/src/vangioi-authoring-http.mjs` cung cấp `createAuthoringHttpHandler({storage, projectId, allowedOrigins, verify?, now?})`. Đây là transport dùng Request/Response, ghép trực tiếp SQL authoring G1C/G1D và provisioning G1E. Không phải mock API trả thành công giả: integration tests dùng SQLite thật, validator semantic-2 thật, immutable snapshots/receipts/audit thật trên dữ liệu tổng hợp cục bộ.

Module chưa import vào Worker live, chưa export Durable Object, chưa sửa wrangler/binding/migration hoặc gắn URL vào Creator. Không thêm route production. Creator vẫn **Vạn Giới → Tạo / nhập thế giới**, lưu thiết bị, `backendConnected:false`, nút gửi duyệt khóa. Chủ Thần vẫn dành cho chủ dự án và AI điều phối.

## Hợp đồng transport

Prefix cố định: `/api/vangioi/authoring/v1`. Không nhận query, trailing slash hoặc alias/ID mã hóa. `worldId`, `snapshotHash` và `forReview` không được gửi trong body; identity lấy từ path. Các trường còn lại được service kiểm đúng allowlist và kiểu dữ liệu.

| Method / path sau prefix | Body JSON | Quyền server / kết quả |
|---|---|---|
| POST `/worlds` | requestId, content | UID có entitlement tạo world; ID/owner do server xác định |
| GET `/worlds/:worldId/draft` | Không | Owner đọc đủ; collaborator chỉ scope |
| PATCH `/worlds/:worldId/draft` | requestId, expectedRevision, patch | Owner/collaborator đúng scope; revision + transaction |
| PUT `/worlds/:worldId/collaborators` | requestId, expectedAccessRevision, memberUid, status, editSections | Owner đặt/thu hồi collaborator; không cấp reviewer/publisher |
| POST `/worlds/:worldId/submissions` | requestId, expectedRevision | Owner; validator + registry/grant; khóa snapshot |
| GET `/worlds/:worldId/submissions/:snapshotHash` | Không | Đọc bản gửi theo policy; collaborator vẫn lọc scope |
| GET `/worlds/:worldId/submissions/:snapshotHash/review` | Không | Reviewer được cấp riêng, độc lập owner/contributor; đọc bản hiện hành |

`requestId` là UUID v4 hiện hữu, được lưu receipt theo UID/world. Retry giữ nguyên UUID và payload; thay payload dưới cùng UUID trả 409. Mọi thành công trả 200 cùng service result; không giả tạo resource mới khi receipt là replay. Không có endpoint list toàn bộ world, cấp entitlement/role, intake registry/operator, approve/reject, official rank, publish, gameplay, AI hoặc reward.

## Danh tính và trình duyệt

- Mặc định dùng verifier Firebase hiện hữu, projectId do server cấu hình; không nhận project/JWKS/verifier từ request. `verify` thay thế chỉ là dependency server cho tests/host đáng tin.
- Yêu cầu Bearer, giới hạn header 8 KiB, xác minh UID trước đọc stream. Service xác minh lại token gốc và kiểm authority hiện tại tại thời điểm commit/đọc; không dùng claim admin hoặc X-UID/Cookie làm quyền world.
- `allowedOrigins` bắt buộc danh sách origin HTTPS chính xác, không wildcard/path/null. Request có Origin ngoài danh sách bị từ chối cả GET. CORS chỉ phản chiếu origin đã cho phép; không credentials/cookie. Client không gửi Origin (CLI/server) vẫn phải có Bearer hợp lệ và chịu policy như nhau; Origin không phải danh tính.
- OPTIONS chỉ cấp đúng method của route và headers Authorization/Content-Type, không đọc kho truyện hoặc tạo dữ liệu. Không bật endpoint nếu chưa có host/rate limits/bảo vệ vận hành được duyệt.

## Bytes, lỗi và riêng tư

Mutation chỉ nhận `application/json` (có thể charset=utf-8), không content-encoding. Đếm byte stream thật trước parse, dừng và cancel nếu >2 MiB kể cả Content-Length thiếu/giả nhỏ; độ dài khai báo sai bị từ chối. UTF-8 lỗi bị chặn bằng fatal decoder, envelope phải là object. Giới hạn này là kỹ thuật HTTP, không phải quota rank; body envelope cũng chiếm bytes. Service còn kiểm độ sâu/nút/schema/references/metadata và quyền sau parse.

JSON.parse giữ quy tắc duplicate key cuối cùng như Creator hiện tại; không xem dữ liệu JSON tự khai là authority. Chưa thêm streaming JSON parser hoặc thay contract hiện hữu. Không ghi request/body/token vào log hoặc trả stack/SQL diagnostics. Phản hồi có `private, no-store`, `nosniff`, `Vary: Origin`; không public-cache Story Bible.

Các mã: 400 request/JSON, 401 identity, 403 authority/origin, 404 route, 405 method + Allow, 409 revision/idempotency/dependency, 413 bytes, 415 media/encoding, 422 nội dung chưa hợp lệ/chưa đủ gửi, 503 lỗi adapter/validator. Service code không thuộc allowlist được che thành `authoring-unavailable`. World thiếu và world không được đọc đều trả forbidden để tránh dò danh mục riêng.

## Kiểm thử và giới hạn

13 ca mới trong `cloudflare/tests/vangioi-authoring-http.test.mjs`: tạo/save/replay/read, admin không có entitlement, collaborator scope/revoke, metadata/URL injection, submit qua validator và registry fixtures, reviewer độc lập + snapshot scope, thiếu grant, CORS/OPTIONS/cookie, routing, media/UTF-8/bytes, stream không Content-Length đáng tin, xác thực trước đọc, lỗi kín và rollback/revoke. Không gọi Firebase/Cloudflare live, không dùng UID hoặc ảnh/truyện thật.

```sh
node --test cloudflare/tests/vangioi-authoring-http.test.mjs
node --test cloudflare/tests/*.test.mjs
node --test tests/*.test.cjs
```

G1K không sửa frontend/schema/semantic version. 481 test ứng dụng + 367 test Worker/helper PASS cục bộ. CI/Pages cần kiểm theo commit GitHub đợt này; SQLite Request/Response tests không chứng minh Durable Object hoặc account live.

## Bước tiếp và cổng triển khai

Tiếp theo: lifecycle quyết định review/reopen có receipt/audit và snapshot pin, kiểm chống tự duyệt/contributor, thu hồi quyền và revision; vẫn không tự publish. Sau đó mới ghép host lưu trữ và client adapter với lỗi/conflict/account swap rõ ràng.

Trước khi xin duyệt backend production phải hoàn thiện phương án cụ thể: storage topology giữ registry/grants/revoke cùng phạm vi transaction (không ngầm tách world DO làm hỏng G1F); issuer entitlement/reviewer/operator do chủ dự án quản lý; cấu hình Firebase project/origin, rate limits, secrets không vào repo; DO class/bindings/migration, backup/rollback, staging smoke và giới hạn source/PNG/decode/scan. Không tự chạy các bước production từ tài liệu này. Thay đổi Firestore Rules, dữ liệu tài khoản thật hoặc mở author ngoài cộng đồng cần scope được duyệt riêng.

Rollback G1K: revert module/test/tài liệu. Vì chưa có import live/binding/migration, không cần chỉnh dữ liệu người dùng. Giữ Thiên Mệnh/auth/EPUB/NPC/save/kho/EXP/Canon/pool/AI, không phát WORLD_PLAY hoặc 48 seed.
