# VẠN GIỚI — G4H: diễn tập backup/restore SQLite fixture cách ly

Ngày 28/10/2026. Nền `33e31b925844b7d40e4ec91a922f4a540e516999` (G4G, smoke/browser/Pages SUCCESS). G4H tiếp bước kiểm toán **chỉ đọc** G4G bằng một kịch bản sao lưu–khôi phục **dữ liệu giả lập** có thể chạy lặp trong test. Không khôi phục hay thay thế bất kỳ save thật nào.

## Phạm vi triển khai

`cloudflare/src/vangioi-engine-g4h-fixture-recovery.mjs` chỉ chạy trong Node có `node:sqlite`, được **test host tin cậy** nắm giữ. Nó không có endpoint/route, Firebase SDK, quyền player/reviewer/publisher, đường ghi Worker/Pages, biểu mẫu hoặc nút mới.

1. `createG4HFixtureBackup({database,plan,world})` / `fixture.exportInstance({worldInstanceId})` chỉ đọc một snapshot nhất quán gồm **tám bảng G4C/G4D/G4F** sau khi G4G trả `integrity=consistent`. Đối chiếu fingerprint một lần nữa sau đọc để phát hiện fixture thay đổi giữa kiểm toán và xuất dữ liệu; nếu khác thì từ chối, không xuất một bản vá tùy tiện.
2. Gói `g4h-offline-fixture-backup-1` pin `worldInstanceId`, `playerId`, `contentVersion/contentHash`, `checkpointFingerprint` và toàn bộ snapshot kèm checksum. **Backup có thể chứa dữ liệu phiên/nhân vật giả lập nhạy cảm**: chỉ giữ nội bộ test host, không trả cho client/AI/author, không đưa vào logging, Git hay dịch vụ thật.
3. `createG4HFixtureRestore({database,plan,world})` / `fixture.restore(backup)` xác minh shape, pin và checksum, sau đó dựng **một SQLite tạm mới chỉ trong RAM** và chạy lại G4G trên bản sao để phát hiện replay/receipt/ledger sai, kể cả khi kẻ thử tự tính lại checksum. Đây là kiểm chứng nhất quán nội bộ, **không xác thực nguồn gốc backup**.
4. Khôi phục chỉ vào một SQLite **đã được test host khởi tạo schema chính xác và hoàn toàn trống** ở cả tám bảng; cần các trigger immutable G4C/G4F. Transaction `BEGIN IMMEDIATE` → kiểm rỗng/schema/triggers → INSERT theo allowlist → đối chiếu fingerprint đích → COMMIT. Lỗi/ngoại lệ giữa các bảng hoặc hook bất đồng bộ trong transaction đều `ROLLBACK`; không UPDATE/DELETE/ghi đè dữ liệu cũ. Bản G4G hậu kiểm sau commit phải còn `consistent`.
5. Các bản ghi G4C/G4F và quyền synthetic được **bảo tồn như lịch sử**, không tự chuyển `held/revoked` sang `active`, không phát thưởng, không suy mission/ending hoàn thành. `fixtureRestoreCommitted=true` chỉ có nghĩa ghi thành công vào DB thử; các cờ `saveCommitted/missionCompleted/rewardAuthorized/rewardCommitted/productionAuthorized` vẫn false.

## Ranh giới bảo mật & phục hồi

- Checksum/fingerprint **không phải chữ ký/HMAC**. Host độc hại có thể tạo backup khác và tính lại hash; mô phỏng không chứng thực nguồn gốc, tính mới nhất hoặc cấp quyền server. Không có nonce registry/antirollback/checkpoint floor, không có bản sao đa vùng, encryption/KMS, retention, hợp đồng GDPR hay migration production.
- Cùng G4G, kết quả `consistent` không chứng minh có thể tiếp tục chơi. **G1Z rehearsal session nằm trong RAM**: sau restart, ID cũ không tự tồn tại; G4D sẽ chặn resume nếu không có admission mới. G4H tuyệt đối không tự tái cấp hoặc suy entitlement từ hàng `active` được chép trong SQLite. Các nhà phát triển tương lai phải thiết kế rebind/quarantine/issuer thật trước khi cho chơi tiếp.
- G4C và G4F vẫn là module test-host mock: thao tác trực tiếp lên chúng từ code đặc quyền giả không thể coi là permission production. G4H không giải quyết nguồn Firestore/Thư viện, revoke/hold/notice hay atomicity/outbox xuyên SQLite–Firestore/Map; không thay G1Y/G1Z, G4D và quyền operator.
- Không nhận claim hoàn thành nhiệm vụ/thưởng từ client, không cấp EXP/Xu/vật phẩm/Kho, không phát hành world/48 seed, không mở NPC AI hoặc G5, không thay Canon/Rules/EPUB/Thư viện/Thiên Mệnh/Chủ Thần và không nối Cloudflare/Firebase production.

## Kiểm thử và rollback

`node cloudflare/tests/vangioi-g4h-fixture-recovery.test.mjs`: roundtrip đủ G4C/G4F, fingerprint G4G, restart file SQLite, admission G1Z mất hiệu lực, revision 0, revoke hợp lệ, dữ liệu nguồn hỏng, backup/checksum bị sửa, giả mạo cả checksum nhưng replay sai, target không rỗng, thiếu trigger, lỗi giữa transaction, callback async, claim client giả và không import vào live Worker/UI.

Chạy thêm toàn bộ Cloudflare, app, Functions, Python, Wrangler dry-run và CI Smoke/Browser + GitHub Pages theo commit G4H. Rollback code: hoàn nguyên module/test/contract/index/handoff G4H; không có migration hay dữ liệu thật cần khôi phục. Mọi bản sao SQLite test bị bỏ/đóng trong test host, không tự phục hồi production từ gói G4H.

**Cổng chưa đạt:** issuer đáng tin cậy, xác minh quyền hiện tại và re-admission sau phục hồi; policy reward thật; chứng cứ đa objective/ending; security review; backup provenance/antirollback và outbox/atomicity đa storage; migration, staging/rollout/rollback có phê duyệt, browser/device QA gameplay thật. G4H **không** cho phép tuyên bố G4 hay hệ thống Vạn Giới sẵn sàng phát hành.

**Bổ sung guard tương thích từ G4I (28/10/2026):** G4H v1 không có hai bảng nhật ký rebind G4I. Nếu fixture có receipt/ledger G4I của world instance, hoặc có bảng G4I và fence epoch đã tăng cho instance đó, export từ chối `rebind-history-not-backup-compatible`, không tự âm thầm tạo backup thiếu bằng chứng dù log bị xóa sai. Format, 8 bảng và restore G4H v1 vẫn giữ nguyên; backup v2 cho nhật ký rebind phải thiết kế riêng.
