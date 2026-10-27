# G2H — Ràng buộc biên nhận phục hồi với ID của target SQLite fixture

27/10/2026. Nền G2G `fa3f145` đã đối soát read-only biên nhận G2F và digest bản sao G2D đích. Tuy nhiên, **hai fixture khác nhau có thể chứa cùng metadata**; chỉ so hash và checkpoint không biết operator đã trỏ nhầm kho. G2H bổ sung định danh target do host tạo và sidecar gắn nonce với target ở chính transaction ghi receipt, chỉ trong fixture.

## API, nguồn gốc danh tính

`cloudflare/src/vangioi-permit-fixture-target-identity.mjs`:

`createSqlFixtureTargetIdentity({storage,projectId,environment:'fixture',provision:false})`

- `provision:true` được **host fixture tin cậy** dùng một lần để tạo `vg_fixture_restore_target_identity_v1` với UUID ngẫu nhiên. Row bất biến qua trigger, tạo lại với đúng DB giữ nguyên ID. Không lấy ID từ browser, seal hoặc author metadata.
- Mặc định `provision:false` **chỉ đọc**, không tự tạo bảng/ID khi kiểm toán. `readIdentity()` trả `{projectId,environment:'fixture',targetFixtureId}`; thiếu bảng/ID, sai project hoặc row bị hỏng sẽ fail closed.
- ID thuộc **dữ liệu SQLite fixture**, không phải vật chứng máy chủ thật. Sao chép nguyên file SQLite cũng sao chép ID. Không mô tả đây là chứng minh phần cứng, khóa mã hóa hoặc attestation production.

## Gắn receipt và đối soát

1. G2F giữ API cũ; tùy chọn mới `targetIdentity` là **reader tin cậy do host truyền** (không phải chuỗi ID từ client). Sau G2E ký và G2D xác thực, guard đọc ID đích, ghi tiếp vào sidecar `vg_fixture_restore_target_binding_v1(project_id,nonce,target_id)` trong **cùng transaction** với receipt và highwater. Sidecar không UPDATE/DELETE. Nếu chèn sidecar lỗi, nonce, floor và binding đều rollback.
2. Sidecar tách bảng để **biên nhận G2F cũ không bị migration âm thầm**. `guard.readAttempt(nonce)` thêm `targetFixtureId`, bằng `null` với receipt cũ. Không sửa row lịch sử hoặc tính lại SHA/HMAC của snapshot.
3. G2G nhận thêm tùy chọn `readTargetIdentity` phía host. Với receipt **đã bind**, buộc kiểm ID target trước khi đọc `readTargetBackup`; sai ID → `target-identity-mismatch`, thiếu reader/ID → `target-identity-unavailable`. Đọc lại ID sau khi kiểm snapshot để phát hiện host đổi target giữa chừng (`target-identity-changed`). Với receipt cũ `targetFixtureId:null`, G2G giữ hành vi so digest/checkpoint của G2G và vẫn chịu hạn chế về target chưa xác minh.
4. Không bao giờ coi ID match là đủ để start world. G2B/G1V/G1Y vẫn phải xét permit, outbox, hold, quyền nguồn và tình trạng world; G2H không sửa source Canon, EXP, Xu, Kho, thưởng hay phiên chơi.

## Nghiệm thu G2H

- Hai fixture độc lập có cùng backup digest nhưng ID khác: G2G chặn trước khi đọc dữ liệu target sai.
- Provision/restart giữ ID ổn định, trigger ngăn sửa/xóa; audit read-only không tự cấp ID mới.
- Binding ghi nguyên tử với receipt G2F, lỗi sidecar rollback toàn giao dịch; lỗi phục hồi sau khi reserve vẫn giữ binding, nonce vẫn burned.
- Legacy receipt chưa bind tiếp tục được kiểm theo G2G; envelope giả tự khai target ID bị G2E từ chối; ID đổi trong khoảng đọc target phải fail closed.
- Không có import vào Worker/HTTP, không backend production, staging deploy, Firestore Rules, migration dữ liệu thật hay kích hoạt 48 seed.

## Giới hạn bắt buộc giữ

G2H **không chống nhân bản SQLite có cùng ID**, cũng không khóa phiên bản target bằng attestation độc lập, không chứng minh một nonce chính nó đã ghi target và không cung cấp distributed transaction. Muốn kết nối môi trường thật phải có thiết kế riêng cho target registry, project/bucket identity, service authorization, custody, anti-clone, backup retention/KMS và tiêu chí G2B/G1Y bắt buộc. Tất cả vẫn cần Du phê duyệt; không tự nối staging/production.

Rollback G2H: bỏ module identity, sidecar/table fixture, optional reader/binding, tests/docs. Không xóa dữ liệu người dùng hoặc hạ highwater đã ghi trong hệ thống đang chạy.
