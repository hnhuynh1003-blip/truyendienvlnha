# G1V — Diễn tập phát lại quyền và kiểm tra lại nguồn V49 trước khi nhập

26/10/2026. Nền `34b95b4` (G1U; GitHub Actions Smoke/Pages SUCCESS). **Hai module server-only, chưa nối Worker live, staging hay Firestore thật**. G1V không viết Firestore, không đăng ký nguồn tự động, không cấp grant, không mở HTTP route hoặc UI tác giả; chỉ có callback giả trong QA và tích hợp với SQLite/Firestore *fixture* hiện hữu.

## 1. Outbox replay rehearsal

`cloudflare/src/vangioi-permit-replay.mjs` xuất `createPermitReplayRehearsal({listPermitEvents,readAdaptationPermit,commitBatch})`.

- `listPermitEvents` và `readAdaptationPermit` phải là callback authority SQL G1U/G1R dưới **operator identity đã xác minh**. Không nhận chúng từ client, không tự gắn claim admin hoặc tự tìm credential.
- `rehearse(request,{after})` đọc tối đa một trang 50 event, kiểm `seq` tăng chặt, UUID, khóa hash, trạng thái/revision, checkpoint và cursor. Lỗi trang hoặc authority => fail closed, không gọi sink.
- Đối với **mỗi** event lịch sử, gọi `readAdaptationPermit` để lấy trạng thái permit **hiện tại**. Event issue cũ mà permit đã revoked chỉ gửi projection `revoked, revision=2`. Không sao chép bản chứng minh, giấy phép, recipient, văn bản nguồn hay audit actor vào projection.
- `commitBatch({after,checkpoint,projections})` là callback **sink giả dành cho diễn tập**. Host phải đảm bảo việc áp dụng projection và cập nhật checkpoint là **một thao tác nguyên tử**, compare-and-swap `after`, idempotent theo `seq/eventId`, và không bao giờ hạ revision hoặc biến `revoked` thành `active`. Nếu sink lỗi, hàm trả `sink-unavailable`, không xác nhận checkpoint mới. Trang rỗng không gọi sink.
- `checkpoint` không được lấy từ đồng hồ. Trang cuối có `nextCursor=null` nhưng vẫn tiếp tục polling bằng `checkpoint`. Nếu G1U trả `baseline-required` do thiếu lịch sử G1R, G1V giữ lỗi này, không bỏ qua.

**Ranh giới cực kỳ quan trọng:** Projection chỉ để diễn tập đối soát quyền, **không phải bằng chứng cấp quyền cho người dùng**. Sau bước `readAdaptationPermit` nhưng trước khi sink commit, một revoke mới vẫn có thể xảy ra. Không thể tự gọi `active` trong bản sao là quyền hiện hành. Producer/consumer live sẽ cần một thiết kế guard theo authority tại điểm sử dụng, đối soát trạng thái sau restart và nguồn thu hồi từ bên ngoài. Module này không kết nối, ghi hoặc ACK dữ liệu thật.

## 2. V49 precommit recheck

`cloudflare/src/vangioi-library-precommit.mjs` xuất `createV49PrecommitRecheck({prepare,registerSource})`.

- `prepare` là G1Q trusted preparer đã nối G1S/G1T Firestore reader và G1R permit reader; `registerSource` là G1F registry service operator-only. Prepared plan phải là kết quả nội bộ G1Q, tuyệt đối không nhận từ form/HTTP của tác giả.
- Kiểm hình dạng plan, canonical payload hash và `sha256-{contentHash}`. Sau khi `prepare` lần đầu tạo gói, G1V **gọi lại prepare** ngay trước khi đăng ký, tương ứng hai lượt đọc G1Q mới. So khớp hash của **toàn bộ plan** (source, recipient/license/proof, permit revision, version và payload). Khác => `source-conflict`; mất quyền/không đọc được => từ chối. Không fallback bỏ kiểm tra.
- Nếu trùng khớp, chuyển **gói gốc** tới G1F. G1R vẫn kiểm permit đang active trong SQLite transaction khi ghi; G1V không ghi trực tiếp, không sửa hợp đồng registry, source grant hay snapshot G1N.
- Chỉ phát hiện thay đổi **đã thấy ở lần đọc lại**. Firestore transaction read-only có thể đọc snapshot cũ và Firestore có thể thay đổi ngay sau lần đọc; do đó đây là *best-effort recheck*, **không phải immutable source fence**, không bảo đảm tuyệt đối theo thời gian. Bản nguồn pin bằng hash không đồng nghĩa quyền ngoài đời được duy trì mãi.

## 3. Kiểm thử G1V

- Replay: crash trước commit => checkpoint cũ, retry/restart không bỏ qua; issue cũ không kích hoạt lại revoke; phân trang sai, event giả, request trái quyền, trạng thái authority không đồng nhất bị chặn; không lộ proof/recipient. Thử cả outbox SQLite G1U thật (Node SQLite) qua callback.
- Recheck: V49 không đổi thì nhập thành công và giữ reference/hash cũ; chỉnh chapter sau prepare thì chặn trước registry write; revoke permit sau prepare thì không nhập; plan giả/chỉnh payload/đổi revision/đứt reader đều fail closed. Fixture Firestore dùng đọc transactional trong bộ nhớ, không đăng nhập Firebase.
- Regression G1A–G1U và Worker dry-run phải PASS. GitHub Actions sau commit kiểm riêng; không đồng nhất Pages CI với môi trường staging đã bật.

## 4. Điều kiện trước kết nối staging / G1W

1. Duyệt instance/edition Firebase, identity service tối thiểu và boundary SQL; chưa được tự tạo/đọc project thật khi chưa có lựa chọn của chủ dự án.
2. Quyết định một **immutable source snapshot/version fence** đáng tin tại ranh giới ghi, hoặc chính sách permit hợp pháp cho bản nguồn đã pin dù thư viện cập nhật. Cần xử lý xóa nguồn, thu hồi đồng ý ngoài đời và source reader có thể trễ. G1V chưa khóa được race xuyên hệ thống.
3. Thiết kế sink staging có checkpoint atomic, backup, gap recovery, replay/dedup, revoke-wins và kiểm current authority tại điểm sử dụng, không dùng shadow projection để tự cấp quyền.
4. Chưa nối source picker, review/publish live, 48 seed thế giới, quyền reviewer/operator từ client, NPC AI, economy, kho/EXP/Xu, EPUB UI hoặc Firestore Rules.

**Phụ lục V1.2-A của DUDU CORE:** ảnh `worldCover`, `sceneBackground`, `sceneVariant` và định danh `placeId/sceneId` thuộc hồ sơ thiết kế riêng, nhiều chi tiết còn chờ duyệt. G1V không sửa asset, scene, 6 genre, 48 seed hoặc gameplay.

Rollback G1V khi chưa có dữ liệu thật: revert hai module, test và tài liệu. Nếu sau này có sink/permit/registry staging thực thì rollback phải đối soát checkpoint và revoked state, không chỉ revert code.
