# G2A — Đối soát checkpoint trước khi thử nghiệm cổng world trên fixture

26/10/2026. Nền G1Z `a04f8a0` (530 Worker / 497 app / 10 Functions PASS cục bộ; Pages SUCCESS; job Smoke chính SUCCESS nhưng workflow Smoke tổng còn chờ browser tại lúc mở G2A). **Chỉ thêm probe read-only nhận callback fixture**, chưa triển khai Firebase/Firestore thật, sink, consumer, host staging public, quyền người chơi hoặc adapter production.

## Vì sao cần thêm cổng này?

G1Y kiểm current permit/grant/notice của **SQLite authority**, G1Z đã diễn tập chặn ở release/start/resume/read. Tuy nhiên một hệ thống staging dùng bản sao quyền có thể có checkpoint lỗi thời hoặc bị gán nhầm Firebase project. Bản sao như vậy không được sử dụng để quyết định phát hành. G2A kiểm metadata đồng bộ tối thiểu **trước khi** trả kết quả diễn tập; không dùng metadata ấy thay quyền hiện hành ở G1Y.

## Hợp đồng lập trình

`cloudflare/src/vangioi-staging-readiness.mjs` cung cấp:

`createSqlStagingReadinessService({storage,projectId,verify,releaseGate,readCheckpoint,environment:'fixture'}).checkWorld(request,{worldId})`

- `storage` là cùng SQL authority đã được host test khởi tạo từ G1R/G1U/G1X/G1Y; `releaseGate` là G1Y thật. Chỉ registry **operator active** theo SQL được gọi; kiểm role **trước** khi gọi callback bản sao. Project ID do server cố định, không đọc từ request.
- `readCheckpoint({projectId,environment:'fixture'})` phải là adapter **read-only do test host cung cấp**, trả đúng `{projectId,environment:'fixture',checkpoint}` với checkpoint nguyên không âm. Không truyền sink credentials hay callback từ client. Constructor cố ý từ chối `environment:'staging'` hoặc `'production'`; module không tự mở kết nối.
- Probe kiểm baseline G1R cũ có đủ event issue và revoke bắt buộc của G1U; nếu thiếu trả `baseline-required`. So sánh checkpoint bản sao với `MAX(seq)` từ outbox SQLite: cũ → `checkpoint-lag`, đi trước → `checkpoint-ahead`. Không tự ghi baseline, ép checkpoint, hoặc phát lại sự kiện.
- Nếu hai con số khớp, gọi `G1Y.evaluateApprovedWorld` để kiểm world approved hiện hành, pinned snapshot, grant, permit, notices, catalog và assets. Sau lệnh async, đọc lại head/baseline để phát hiện revoke vừa được ghi. Nếu quyền/đồng bộ thay đổi thì fail closed.
- Thành công trả `{ok:true,fixtureChecksPassed:true,worldId,snapshotHash,checkpoint,readinessVersion:'staging-readiness-1',environment:'fixture'}`. **Không trả `readyForProduction`, quyền phát hành, session/token, byte truyện, evidence, dữ liệu người chơi hay quyết định publisher.**

## Giới hạn quan trọng của khẳng định PASS

**Checkpoint bằng head không chứng minh bản sao thực sự đã ghi đúng tất cả trạng thái permit** — sink lỗi hoặc nói dối checkpoint vẫn có thể bị bỏ sót ở G2A. Chưa có so khớp từng khóa `storyId/contentHash`, revoked-wins, atomic sink+checkpoint, hay bằng chứng cryptographic về projection. Vì vậy `fixtureChecksPassed` chỉ là kết quả bộ fixture **không đủ để cho live**.

Tương tự, notice G1X không tăng permit outbox `seq`; phải đọc notice hiện hành qua G1Y ở từng điểm dùng thật. G2A không khóa được race sau khi trả kết quả, không có giao dịch liên Firestore–SQLite, không phát hiện nguồn V49 gỡ/sửa tự động. Policy sử dụng hash cũ khi V49 thay đổi vẫn cần Du duyệt.

## Kiểm thử và thay đổi ngoài phạm vi

10 ca G2A kiểm checkpoint khớp, trễ, vượt, revoke vừa phát sinh, thiếu baseline, hold không phát event, callback lỗi, project cross-tenant, payload giả, role trước callback, và không có route/binding thật. Chạy lại toàn bộ Worker/app/Functions tests, dry-run build và GitHub CI để kiểm hồi quy.

Không tạo/chỉnh Firestore Rules, credential, migration, publisher/creator source picker, registry schema, snapshot, review, seed V66, gameplay, NPC AI, EXP/Xu/Kho, Thiên Mệnh hoặc Chủ Thần. Rollback trước live: revert module/test/contract G2A; không có checkpoint/sink/data production nào được tạo để xóa.

## Bước cần duyệt trước kết nối staging thật

1. Chọn Firebase project, database/edition, region và topology một authority SQL; ký hợp đồng service identity server-only.
2. Chốt chính sách pin hash cũ khi truyện bị sửa/xóa/unpublish; quy trình xử lý notice bên ngoài/thu hồi giấy phép.
3. Thiết kế và kiểm thử consumer với checkpoint atomic cùng projection, baseline/backfill/backup, đối soát status từng key và giám sát lag; luôn ưu tiên revoked.
4. Sau khi kiểm thử và được Du duyệt riêng mới nối source picker, luồng review và cổng phát hành/truy cập thật.
