# G2B — Đối soát từng giấy phép trong bản sao quyền (fixture)

27/10/2026. Nền G2A `5595d4b` (540 Worker / 497 app / 10 Functions PASS; Smoke/Pages SUCCESS). G2A chỉ xác nhận checkpoint bản sao khớp đầu outbox authority, chưa xác nhận **nội dung** bản sao. G2B bổ sung bộ kiểm toán so sánh toàn bộ khóa, trạng thái và revision của permit G1R với projection fixture. Chưa kết nối staging/production, Firestore, sink, job, publisher hoặc gameplay.

## 1. Hợp đồng offline

`cloudflare/src/vangioi-permit-projection-audit.mjs` xuất:

`createSqlPermitProjectionAudit({storage,projectId,verify,readReplicaSnapshot,environment:'fixture',maxRows:1000}).auditProjection(request)`

- Chỉ active **registry operator** do server lưu trong SQLite gọi được. Role owner, reviewer, publisher hoặc claim `admin` của client không đủ quyền. Kiểm actor **trước** khi chạm callback bản sao.
- `storage` là cùng SQL authority với G1R/G1U. `readReplicaSnapshot({projectId,environment:'fixture'})` là callback read-only do test host cung cấp; nó phải trả trong **một snapshot nhất quán** `{projectId,environment:'fixture',checkpoint,entries}`. `entries` chỉ có `{storyId,contentHash,status,revision}`. Không cho callback, checkpoint, permit, status hoặc identity tự khai từ request của tác giả/người chơi.
- Constructor chỉ cho `environment='fixture'`; nếu dùng `staging` hay `production` sẽ lỗi. Không mở Firebase client, network, Worker route, giao diện nguồn hoặc nhập credentials.
- Bộ kiểm tra lấy trạng thái **hiện tại** của từng permit trong SQL, cùng outbox head, kiểm lại lịch sử issue/revoke bắt buộc G1U (`baseline-required` khi thiếu). Bản sao có cùng checkpoint nhưng thiếu/thừa key, duplicate, khác `active/revoked`, sai revision/hash, hoặc chứa trường private/proof thì fail closed.
- Nếu permit thay đổi giữa lượt đọc authority đầu tiên và cuối cùng (chẳng hạn revoke commit trong lúc chờ snapshot bản sao), trả `authority-changed`. Không cố ghép snapshot từ hai thời điểm thành một kết luận PASS.
- Thành công chỉ trả `{ok:true,fixtureAuditPassed:true,projectId,environment:'fixture',checkpoint,permitCount,auditVersion:'permit-projection-1'}`; **không trả danh sách giấy phép, chapter, ownerUid, bản chứng minh, nội dung Canon hoặc private metadata**.

G2B cố ý kiểm **toàn bộ tập khóa** trong một lần đọc fixture để phát hiện cả hàng thừa, nhưng bị giới hạn `maxRows` mặc định 1.000, host test có thể đặt tối đa 10.000. Nếu vượt giới hạn: `audit-limit`, tuyệt đối không coi phần đã đọc là hoàn tất. Đây là giới hạn an toàn của bộ QA offline, **không phải quota truyện/tác giả hoặc chính sách số lượng giấy phép**. Triển khai thật với khối lượng lớn cần snapshot watermark và phân trang ổn định trước khi được phép thay thế kiểm toán toàn tập.

## 2. Hai kiểm tra riêng biệt — không biến bản sao thành authority

| Tình huống | G2B kết luận | Quyền dùng world |
| --- | --- | --- |
| Checkpoint mới nhất, nhưng một permit revoked ở G1R vẫn là active trong bản sao | `projection-mismatch` | Tuyệt đối không cấp quyền |
| Consumer fixture cập nhật đúng permit revoked/revision sau replay | `fixtureAuditPassed` | **Vẫn bị G1Y từ chối** vì giấy phép gốc đã revoked |
| Có hold G1X nhưng không có event G1U mới | Projection có thể khớp | G1Y/G1Z vẫn phải chặn từng thao tác sử dụng nguồn |
| Bản sao đã khớp và G1Y hiện đồng ý | Hai điều kiện riêng cùng PASS tại lúc kiểm | **Chưa phải token, phê duyệt publisher hay quyền live** |

G2B là kiểm toán dữ liệu, G2A là kiểm checkpoint + quyết định world hiện hành. Module mới **không tự nối** hai hàm vào runtime; host staging tương lai chỉ được tiếp tục sau khi phối hợp cả hai dưới một giao thức nhất quán đã duyệt. Dù kiểm đủ hai bước, còn race sau khi trả kết quả, không có transaction xuyên SQL/Firestore, chưa chứng minh sink thật áp dụng atomic projection+checkpoint, và chưa có chính sách quyền bản hash cũ khi V49 gỡ/sửa. `fixtureAuditPassed` không mang nghĩa `releaseAllowed`.

## 3. QA, giới hạn và rollback

10 ca G2B: khớp hoàn chỉnh; thiếu/thừa/sai key; checkpoint bằng nhau nhưng status stale; sai revision; revoke trong lúc đọc; cursor trễ/đi trước; thiếu baseline; duplicate, sai môi trường và trường proof; actor không thuộc operator; giới hạn kiểm toán; lỗi callback và không import vào Worker public. Toàn bộ hồi quy G1A–G2A, app, Functions, Worker dry-run sẽ được kiểm sau khi thay đổi.

Không tạo DB, không cập nhật Firestore Rules, không bật 48 seed V66, source picker, review thật, publisher, NPC AI, economy, EXP/Xu/Kho, Thiên Mệnh hay Chủ Thần. Rollback trước live chỉ revert module, tests và tài liệu; không có phép, quyền, dữ liệu hay checkpoint production nào được ghi trong G2B.

Trước khi kết nối staging thật vẫn phải có quyết định từ Du về project/database/edition/region, quyền dùng bản nguồn pin khi Thư viện thay đổi, topology authority và trách nhiệm operator; đồng thời cần sink bền vững, snapshot/pagination nhất quán, đối soát current permit theo key, revoke-wins, audit/backup/retention, kiểm toàn bộ ca failure và approval riêng.
