# G2I — Kiểm toán tổng hợp trước khi thiết kế kết nối staging

27/10/2026. Nền `main` là G2H `d99ac3f`. Đây là **đánh giá readiness trên mã nguồn hiện hành và công cụ ghép kiểm chứng fixture**, không phải một lần triển khai/staging smoke Firebase. Không thay master Canon, schema dữ liệu, registry, SQLite đang dùng, đường HTTP, Cloudflare Worker, Firestore Rules hoặc tài nguyên/dữ liệu thật.

## 1. Kết luận kiểm toán: chưa đủ điều kiện kết nối staging thật

| Lớp | Bằng chứng đã có trong repository | Chưa được chứng minh / không được suy ra |
| --- | --- | --- |
| G1R | Permit issue/revoke, revision và quyền operator lưu SQLite | Quyền V49 cập nhật tự động theo Thư viện thực, danh tính người cấp giấy phép |
| G1S–G1T | Contract đọc V49 và Firestore reader server-only dùng transaction qua host fixture | Client Firebase thật, project/database/region staging, service account và Rules được audit |
| G1U–G1V | Append-only outbox, replay có checkpoint và revoked-wins trong diễn tập | Consumer vận hành bền vững, giám sát và exactly-once giữa authority/replica |
| G1W–G1X | Source pin cục bộ theo hash và hold notice operator-only | Chính sách pháp lý bản hash khi chủ truyện sửa/gỡ/unpublish, listener thật |
| G1Y–G1Z | G1Y kiểm quyền hiện hành cho approved snapshot; diễn tập nhiều điểm tiếp cận | Boundary release/start/resume/read thật, token chơi, phát hành hoặc quyền xem live |
| G2A–G2B | So checkpoint và toàn bộ key/status/revision permit với fixture, có limit | Snapshot/quét tập lớn ổn định ở staging, lỗ hổng giữa hai thời điểm đọc |
| G2C | SQLite fixture ghi projection+event+checkpoint trong một transaction | Sink production, retry durable, transaction xuyên SQL/Firestore |
| G2D–G2E | Backup/checksum metadata thử nghiệm và HMAC host fixture | Backup service/KMS, retention, custody, rotation/recovery keys thật |
| G2F–G2G | Sổ nonce/highwater SQLite riêng; operator đối soát receipt–target sau lỗi | Distributed transaction, chỉ một recovery path, crash resolution vận hành thật |
| G2H | Ràng buộc receipt với UUID của target SQLite fixture | Chống clone toàn bộ SQLite, attestation danh tính target thật |
| **G2I** | Ghép G2B → G2A → G2B → G1Y dưới operator gate, so checkpoint và pinned snapshot | **Không** biến các checks rời thành transaction, không duyệt kết nối staging |

Không có cơ sở để gọi VẠN GIỚI là production-ready, thậm chí **chưa có bằng chứng rằng một staging Firebase thật đã được vận hành trong chuỗi này**. GitHub Actions PASS là kiểm thử mã nguồn/fixtures và build, không phải nghiệm thu tích hợp Firestore từ đầu đến cuối.

## 2. API G2I — xác nhận nhất quán quan sát được, không phê duyệt triển khai

`cloudflare/src/vangioi-fixture-staging-integration-audit.mjs`:

`createFixtureStagingIntegrationAudit({projectId,environment:'fixture',authorizeOperator,projectionAudit,stagingReadiness,releaseGate}).audit(request,{worldId})`

- `authorizeOperator(request,projectId)` là **host server-side tin cậy**, phải xác minh danh tính và **assignment operator active** trong authority; trả đúng `true`. Không coi claim `admin` do client khai là đủ. Kiểm này chạy **trước** tất cả callback fixture. Các module G2A/G2B/G1Y cũng xác thực độc lập.
- Host cấp đúng các instance G2B `auditProjection`, G2A `checkWorld` và G1Y `evaluateApprovedWorld` dùng **cùng authority/project ID**. Fixture G2C có thể cấp các reader checkpoint/projection; G2I không tự tạo connection, tự ghi, copy permit hay gọi Firestore.
- Input chỉ có `worldId` hợp lệ. Không nhận project/checkpoint/snapshot/permit/hash/override của client. Chỉ `environment:'fixture'`; `staging`/`production` bị từ chối ở constructor.
- Kiểm toàn tập G2B lần đầu → G2A checkpoint + G1Y hiện hành → G2B lại để bắt permit thay đổi giữa các bước → G1Y lần cuối để kiểm source hold, approved snapshot và grant tại cuối chuỗi. Không nhận response giả mạo có field thừa, sai project/version/môi trường; checkpoint phải giống nhau, snapshot hash phải trùng.
- Failure trả **code giai đoạn an toàn** (`projection-before-blocked`, `staging-readiness-blocked`, `checkpoint-changed`, `projection-after-blocked`, `projection-changed`, `world-gate-blocked`, `snapshot-changed`, v.v.), không trả nội dung truyện, proof, UID hay stack trace.
- Khi thành công trả `code:'fixture-evidence-consistent'`, `fixtureEvidenceConsistent:true`, project/world/snapshotHash/checkpoint/permitCount và **luôn có** `stagingDeploymentAuthorized:false`, `releaseAuthorized:false`, `unresolvedPrerequisiteIds`. Không có API chuyển hai trường này thành `true`.
- G2I không tự gọi G2D–G2H. Các bằng chứng phục hồi, anti-replay và ràng buộc target là **bộ kiểm riêng theo từng lần restore**, không thể suy ra từ một world check thông thường. Với restore thật, bắt buộc quy trình riêng kiểm receipt G2G/G2H, replay và đối soát G2B/G1Y.

**Lưu ý TOCTOU:** Kể cả ghép 4 lượt kiểm, một revoke/notice vẫn có thể commit ngay sau lượt cuối. G2I không giữ khóa phân tán, không sinh grant, không thay G1Y kiểm tại từng boundary sử dụng thật. `ok:true` chỉ là **kết quả đo tại thời điểm fixture**, không phải tín hiệu cho author picker, publisher, token, runtime hoặc CI deploy.

## 3. Bảy điều kiện còn chặn staging

Các ID dưới đây là mã cố định trong `FIXTURE_STAGING_BLOCKER_IDS`; không thể xóa bằng request hoặc kết quả tự khai từ fixture.

| ID blocker | Yêu cầu quyết định/nghiệm thu trước khi triển khai staging thật |
| --- | --- |
| `isolated-firebase-staging-topology` | Du chốt project staging riêng, database, vùng/edition, ranh giới dữ liệu với production, authority SQL duy nhất |
| `server-service-identity-and-access-review` | Chốt operator/reviewer quyền backend, service identities server-only, kiểm Rules và IAM, chặn privilege escalation từ client |
| `v49-source-change-and-license-revocation-policy` | Chính sách bản pin khi source V49 thay đổi/gỡ/unpublish, notice, scope giấy phép, quy trình quyền sở hữu và thu hồi |
| `legacy-permit-baseline-and-migration-plan` | Baseline những permit có trước G1U, migration rehearsal có rollback, không tự ghi production |
| `durable-consumer-and-consistent-pagination` | Consumer/outbox→projection bền vững, idempotency, revoked-wins, snapshot watermark, giới hạn kiểm toán và giám sát lag |
| `recovery-key-custody-target-attestation-and-rollback` | Backup retention/KMS, sổ nonce tập trung, xác thực target chống clone, diễn tập crash và thủ tục rollback |
| `real-boundary-rechecks-observability-and-owner-approval` | Kế hoạch QA staging, kiểm G1Y ở mọi điểm đọc/chơi/thay phiên, observability, phê duyệt triển khai **riêng** của Du |

**Quy trình đề nghị sau G2I:** (1) Đóng băng hợp đồng hiện hành và duyệt topology/policy giấy phép trên giấy. (2) Chỉ sau phê duyệt, tạo host staging tách biệt với dữ liệu synthetic, danh tính service thật và kiểm quyền/Rules; không nhập thư viện thật. (3) Kiểm reader/consumer/backup trên staging, threat model, crash/revoke/unpublish, giám sát và rollback. (4) Trình chủ dự án nghiệm thu lần nữa **trước** mọi source picker, submit/review/publisher và gameplay thật.

## 4. Phạm vi kiểm thử và rollback

- Kiểm ca fixture hợp lệ nhưng **không có quyền staging/release**; kiểm operator trước callback và payload client không tự khai quyền.
- Chặn projection checkpoint khớp nhưng status stale, notice hold, permit revoke giữa G2A/G2B, notice chen trước G1Y cuối, checkpoint/snapshot biến động, response giả và exception.
- Kiểm module không được import vào Worker public/authoring HTTP; từ chối constructor staging/production. Chạy hồi quy Worker/app/Functions, dry-run build và CI. Đây **không** phải browser/Firestore staging smoke.
- Rollback chỉ revert module, test và contract G2I. Không phát sinh migration, bảng SQL mới, phiên người chơi, event mới hay dữ liệu sản xuất phải phục hồi.
