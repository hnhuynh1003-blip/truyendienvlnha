# VẠN GIỚI — G4I: diễn tập xác thực lại admission sau phục hồi offline

Ngày 28/10/2026. Nền `4c0bfe0fde4570e20fd312996dee5095dea1bfa1` (G4H, Smoke/Browser CI và Pages SUCCESS). G4H đã chứng minh dữ liệu SQLite fixture có thể phục hồi vào DB trống, **nhưng phiên G1Z trong RAM không tự sống lại**. G4I xử lý đúng khoảng trống này trong **test harness**: tái xác minh và ràng buộc một admission G1Z **mới**, không xem backup/cờ SQLite/ID của client là quyền.

## Phạm vi đã triển khai

`cloudflare/src/vangioi-engine-g4i-rebind-fixture.mjs` cung cấp `createG4IRebindFixture({database,plan,world,admission,operatorRequest,verifyPlayer,readTrustedAccess,readApprovedPin,...})`, trả `fixture.rebind({playerRequest,operatorRebind})`. **Toàn bộ** `admission`, operator request và ba callback đều được test host tiêm riêng; không lấy quyền từ form tác giả, claim trong event, AI hoặc người chơi. `operatorRebind` là lệnh test operator, chỉ có `worldInstanceId`, `admissionSessionId` và `requestId`, không phải player API.

1. Trước khi xem xét rebind, G4G phải đối soát G4B–G4F **nhất quán**. G4C session, gate G4C và fence G4D phải cùng player và content/source pin; trạng thái `held/revoked/stale/blocked` bị từ chối, không được khôi phục thành `allowed` chỉ nhờ backup.
2. `verifyPlayer` độc lập phải trả đúng `playerId` đã lưu. G1Z rehearsal **cũ** phải không còn hợp lệ trong host hiện tại. G1Z rehearsal **mới** phải vượt `simulateResume` và khớp world/snapshot. Các reader riêng trả entitlement (`allowed=true`, revision không lùi) và approved content/source pins giữ nguyên. Đây là **synthetic checks**, không phải issuer Firebase, quyền player đã xác minh hay permit live.
3. Sau bước bất đồng bộ, một transaction `BEGIN IMMEDIATE` kiểm lại gate/source/content/session/fence qua snapshot so sánh và CAS. Chỉ khi sạch mới tăng `fenceEpoch`, cập nhật `accessRevision` và `admissionSessionId` của hàng G4D; đồng thời ghi immutable receipt + audit `offline_rebind_only`, `production_authorized=0`. Nếu lỗi sau cập nhật fence hoặc receipt, rollback toàn bộ.
4. Khóa request `(worldInstanceId,requestId)` và hash gồm player/admission/revision: retry cùng yêu cầu sau mất phản hồi trả **receipt cũ** (không tăng epoch, không tạo thêm ledger); cùng requestId với payload khác hoặc tái dùng một admission đã gắn bị từ chối. Ledger/receipt có trigger immutable và hash để phát hiện sửa đổi trong fixture.
5. Khi rebind **thử nghiệm** thành công, G4D có thể sử dụng *G1Z mới* để diễn tập tiếp nhận một scene transition tiếp theo. Điều này chỉ xảy ra khi chạy qua đúng G4D callback đã nối mock; không có live session, quyền đăng nhập, grant thưởng, lưu tiến độ production hay tự mở world. Tất cả các cờ `saveCommitted/missionCompleted/rewardAuthorized/rewardCommitted/productionAuthorized` vẫn false.

## Tương thích với G4H và giới hạn chưa đóng

Gói G4H `g4h-offline-fixture-backup-1` chỉ sao lưu **tám bảng G4C–G4F**, chưa bao gồm hai bảng nhật ký rebind G4I. Để không tạo bản sao thiếu lịch sử một cách im lặng, G4H được bổ sung guard read-only: nếu hai bảng G4I có receipt/ledger của instance **hoặc** có dấu hiệu fence epoch đã tăng trong fixture có bảng G4I, `exportInstance` trả `rebind-history-not-backup-compatible`, kể cả khi nhật ký bị xóa sai. Không sửa format/version G4H cũ hoặc khôi phục tự động G4I ledger; **backup v2 có chống rollback/chứng thực nguồn gốc cần thiết kế riêng**, chưa được triển khai.

G4I không xác minh G1Z/G1Y/permit với server thật; callback và Map G1Z nằm ngoài SQLite nên **TOCTOU xuyên hệ thống vẫn có thể xảy ra**. Một operator có toàn quyền SQLite có thể sửa dữ liệu/trigger/hash, nên receipt offline không phải bằng chứng pháp lý hoặc token. G4G gốc không kiểm hai bảng G4I; riêng G4I kiểm lại receipt/ledger khi retry. Không có distributed CAS, nonce registry, encryption/KMS, OAuth/JWT issuer hay API player. Không cho resume world production sau restore bằng kết quả G4I.

Không bật G5, 48 seed, NPC AI, economy, Kho, EXP, Xu, vật phẩm, Canon editing, quyền reviewer/publisher, Firestore Rules, migration hoặc Worker/Functions/Pages route. Vạn Giới Creator, Thiên Mệnh, Chủ Thần, EPUB/Thư viện giữ nguyên.

## Kiểm thử / rollback

`node cloudflare/tests/vangioi-g4i-rebind-fixture.test.mjs` (18 test): G4H restored session mất admission; G1Z mới + reader riêng; G4D resume synthetic; retry đồng thời cùng receipt; conflict requestId; cấm rebind lúc G1Z cũ vẫn hợp lệ; license held/access denied, player sai, source/content đổi, log G4C/G4F bị sửa; revoke/fence epoch race, rollback lỗi giữa ghi; immutable receipt/ledger và phát hiện tamper/mồ côi; G4H v1 không xuất thiếu rebind history ngay cả khi log bị xóa; chặn claim client, không nối UI/Worker.

Chạy full Cloudflare/app/Functions/Python, Wrangler dry-run, Smoke/Browser CI và GitHub Pages theo SHA của G4I. Rollback: hoàn nguyên module/test/hợp đồng/index/handoff G4I và guard tương thích G4H, không chạy migration hoặc sửa dữ liệu production. Fixture test cần bỏ/đóng ở test host.

**Cổng còn thiếu:** trusted issuer và reader thực có revocation đồng bộ; ngăn privileged writer bypass; admission/rebind receipt end-to-end có provenance và backup/restore v2; CAS/outbox giữa authority–storage; policy nhiệm vụ/thưởng và đa loại objective; migration/staging live, QA bảo mật/thiết bị và duyệt release riêng từ An Du.
