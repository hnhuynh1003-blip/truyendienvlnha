# VẠN GIỚI — G4G: đối soát lịch sử, phục hồi fixture và cổng readiness offline

Ngày 28/10/2026. Nền `077dc60b8a6bd4757ab0fd1983223dc8fee55fcc` (G4F, smoke/browser/Pages SUCCESS). G4G **chỉ kiểm toán** môi trường thử Node SQLite của G4C–G4F, không sửa hoặc tự phục hồi record, không ra quyết định nhiệm vụ/thưởng và không chạm production.

## Kết quả kỹ thuật

`cloudflare/src/vangioi-engine-g4g-recovery-audit.mjs` xuất `createG4GRecoveryAuditor({database,plan,world})`. Factory kiểm world-content-1 cùng plan G4A ghim hash qua G4E; `auditor.inspect({worldInstanceId})` chỉ được gọi từ **test host** có handle SQLite. Không có endpoint HTTP, Firebase/JWT, client route, UI hoặc quyền mới.

1. Đọc **một snapshot nhất quán** trong SQLite `BEGIN`/`COMMIT`, không `await` bên trong và **không ghi**. Đối chiếu G4B replay với G4C session/revision/chain, từng receipt/requestHash/eventId và audit `scene_transition_only`; phát hiện thiếu, sai hoặc sửa log.
2. Đối soát G4F receipt ↔ ledger dry-run theo `(worldInstanceId,missionId,completionVersion)`, kiểm `requestId/requestHash`, hash và nội dung receipt, `reward_authorized=0`, `reward_committed=0`. So với policy ghim từ host, flag chính sách sai phiên bản hoặc không toàn vẹn.
3. Kiểm ngược `evidenceRevision/evidenceChainHash` của receipt G4F về chuỗi event G4B, và xác minh tại revision đó các mục tiêu chỉ thuộc loại `reach` đơn-lần thực sự đã có scene transition tương ứng. Các verb khác không được coi là bằng chứng. Không suy diễn policy thật, quyền reviewer, kết cục hay Canon từ ID/hash.
4. Phân biệt **lịch sử không nhất quán** (`integrity=anomalies`) với **quyền hiện tại đã bị hold/revoke/đổi nguồn** (`currentAccess=synthetic-blocked-or-stale`): quyền bị thu hồi hợp lệ không đồng nghĩa xóa hoặc sửa sự kiện quá khứ. Không tự hợp thức hóa giao dịch mới khi quyền đã hết.
5. `checkpointFingerprint` là SHA-256 của snapshot fixture tại lúc đọc; test lưu bên ngoài có thể so sánh trước/sau đóng–mở lại SQLite. Nó **không phải checkpoint có chữ ký**, không có bảo đảm về nguồn gốc, và không tạo cơ chế replay từ một bản sao ngoài server.

Trả về `fixtureReplayConsistent`, `revision`, số sự kiện/kết toán/policy, mã anomalies không lộ Story Bible, `repairPerformed:false`; mọi cờ thưởng/save/mission/production luôn false. Không ghi lại/khôi phục dữ liệu, reset save, xóa bản ghi hoặc ngầm sửa lỗi. Nếu thiếu bảng/hồ sơ hoặc vượt ngân sách kiểm toán, từ chối hoặc báo không nhất quán (fail closed).

## Readiness: không tự cho production PASS

`productionReadiness.ready=false` **bất kể SQLite có nhất quán hay không**. G4G liệt kê sáu cổng chưa hoàn thành:

- Trusted player/adjudicator issuer và quyền server thật chưa nối.
- Chính sách thưởng được duyệt và ledger cấp thưởng thực chưa có.
- Bằng chứng các objective không phải `reach` và ending chưa được Engine nghiệm thu.
- Atomic revocation/permit/source và outbox giữa authority, G1Y/G1Z, Firestore và storage chưa chứng minh.
- Migration, rollout, rollback production chưa được duyệt.
- Kiểm tra bảo mật + trình duyệt/thiết bị **trên gameplay live** chưa được chứng nhận.

Các dòng trên là **blocking readiness declaration**, không phải code tự cấp quyền hoặc xác nhận đã kiểm thật ngoài SQLite. G4C/G4D/G4F vẫn là các fixture synthetic; hash và kết quả CI offline không phải chứng thực server. Không mở G5, 48 seed, NPC AI, quest/ending/economy, EXP, Xu, vật phẩm/Kho, thế giới playable hoặc Cloudflare/Firestore production.

## Kiểm thử / giới hạn phục hồi

`node cloudflare/tests/vangioi-g4g-recovery-audit.test.mjs` (16 test): fixture rỗng/hợp lệ; sự kiện và dry-run; SQLite restart với fingerprint giống nhau; policy và license revoke hợp lệ; mất/cắt sửa G4C receipt/ledger; replay hỏng và event bất thường; receipt/ledger G4F mồ côi/sai hash, policy sai; forged settlement khi objective unsupported; rollback thất bại giữa hai bước ghi; fingerprint đổi khi trạng thái tiến lên; chặn client claims và không import vào live Worker/UI. G4G **không test restore dữ liệu người chơi production hoặc cross-region storage**.

Chạy cùng toàn bộ G4A–G4F, Cloudflare/app/Functions/Python, Wrangler dry-run và xác minh smoke/browser CI cùng Pages theo commit G4G. Rollback: hoàn nguyên module/test/doc/handoff G4G; không có schema migration, writer hoặc dữ liệu production G4G phải xóa.

**Hướng phát triển tiếp (chưa triển khai):** trước khi xem xét G5 cần kế hoạch tin cậy, compatibility/migration/save recovery thật, trusted completion đa kiểu truyện, issuer và policy thưởng, staged deployment, outbox/reconciliation xuyên storage và quyền duyệt riêng từ An Du. Một báo cáo `consistent` của G4G không thể thay thế các cổng đó.
