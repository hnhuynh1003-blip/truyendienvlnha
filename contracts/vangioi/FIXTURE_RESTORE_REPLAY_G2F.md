# G2F — Guard phục hồi backup một lần và checkpoint high-water (fixture)

27/10/2026. Nền G2E `27cf4e9`: bản sao G2D đã được HMAC ký trong host thử nghiệm, nhưng `nonce` chưa có sổ ghi nhận và backup cũ vẫn có chữ ký hợp lệ. G2F bổ sung **sổ biên nhận SQLite riêng cho môi trường fixture**, diễn tập chống sử dụng lại một phong bì ký và chống phục hồi lùi checkpoint đã được guard chấp nhận.

## Thành phần và luồng tin cậy

- `cloudflare/src/vangioi-permit-fixture-restore-guard.mjs`: `createSqlFixturePermitRestoreGuard({storage,projectId,environment:'fixture',maxAttempts:1000})`. `storage` là **SQLite fixture ledger độc lập** với cả authority G1R và SQLite G2C mục tiêu; đợt này không dùng một DB production hay tự provision namespace.
- `guard.reserveVerifiedSeal(claims)`: callback nội bộ, **chỉ host tin cậy được nối sau** bước G2E xác minh HMAC và G2D kiểm toàn vẹn/cấu trúc backup. Không coi raw client claims là giấy phép. `readGuardSnapshot()` trả highwater checkpoint, digest và số biên nhận để QA; không chứa khóa bí mật.
- G2D có thêm `verifyBackup(backup)` **read-only**, dùng chính kiểm tra cấu trúc/checksum trước khi ký nhận nonce; `restoreBackup` gốc và hợp đồng backup G2D vẫn giữ nguyên.
- G2E thêm tùy chọn `onVerifiedSeal` do host cấu hình, mặc định `null` để **giữ hành vi G2E cũ**. Trình tự G2F: G2E xác thực HMAC → G2D `verifyBackup` → guard reserve → G2D `restoreBackup` vào **fixture trống**. Callback không có đường HTTP/Worker; signer key không nằm trong ledger hoặc client.

## Quy tắc chặn

1. Sổ `vg_fixture_restore_attempt_v1` có khóa `(project_id,nonce)` độc nhất; không UPDATE/DELETE. Một seal đã ghi nhận không thể dùng thêm lần nữa dù phục hồi sang database mục tiêu hoàn toàn mới.
2. Sổ `vg_fixture_restore_floor_v1` giữ checkpoint cao nhất đã được guard **chấp nhận thử phục hồi** và digest gắn với checkpoint đó. Từ chối checkpoint thấp hơn (`checkpoint-rollback`); cùng checkpoint nhưng digest khác (`checkpoint-fork`). Hai seal khác nonce nhưng cùng checkpoint/digest được phép diễn tập phục hồi sang hai fixture trống độc lập.
3. Ghi biên nhận và nâng floor trong một `transactionSync`; nếu lỗi trước commit, cả hai rollback và seal cũ có thể thử lại. Có trigger ngăn xóa biên nhận hoặc hạ floor. Giới hạn mặc định 1.000 attempts, tối đa 10.000; hết dung lượng thì dừng để review, không tự dọn ledger.
4. **Burn-on-attempt:** nếu guard commit thành công nhưng SQLite đích lỗi trong bước restore, biên nhận vẫn bị tiêu thụ, checkpoint floor có thể đã nâng. Không tự xóa/lùi sổ; cần một seal mới từ host tin cậy, với cùng checkpoint/digest hoặc bản sao cập nhật. Đây là cố ý fail-closed, không phải khôi phục đa kho nguyên tử.
5. G2B/G1V/G1Y vẫn là điều kiện độc lập: highwater của guard không phải outbox head của G1R, không chứng minh permit chưa revoke hay bản sao đủ mới với authority. Chữ ký hợp lệ, nonce chưa dùng và checkpoint không lùi **không tự cấp quyền chơi**.

## Các giới hạn kỹ thuật phải công khai

- Không có transaction phân tán giữa ledger độc lập và target G2C. Nếu host bị ngắt sau khi ghi ledger, seal phải xem như đã dùng; hệ thống phải có phương án vận hành tạo bản ký mới / xác minh thủ công trước production. G2F **không** cung cấp exactly-once end-to-end, không tự phục hồi sau crash, không xóa thử dữ liệu thật.
- Không có nonce registry liên project hay xuyên các ledger vật lý. Guard chỉ có ý nghĩa khi **mọi phục hồi liên quan đều dùng cùng ledger bền vững**; tạo ledger mới hoặc gọi trực tiếp G2D/G2E không có callback sẽ không bị G2F chặn. Việc bắt buộc một cổng phục hồi duy nhất, phân quyền dịch vụ và lưu ledger thật chưa được triển khai.
- Không chống attacker kiểm soát host/khóa ký/SQL store. `reserveVerifiedSeal` là callback nội bộ, tự nó không xác thực JWT, HMAC hay người dùng. Chỉ được nối sau G2E/G2D đúng thứ tự.
- Không có Firebase project/bucket, retention/KMS, migration production, Firestore Rules, staging deploy, world release hay economy; không mở 48 seed, NPC AI, EXP, Xu, Kho.

## Kiểm thử

- Restore seal ký hợp lệ, ghi ledger và G2B audit; cùng nonce vào target khác bị từ chối.
- Seal checkpoint thấp hơn bị chặn dù chưa sử dụng; cùng checkpoint khác digest bị chặn, cùng digest khác nonce vẫn hợp lệ.
- Sai MAC hoặc chỉnh body (kể cả checkpoint giả cao) không làm cháy nonce; rollback khi SQL ledger lỗi, nhưng lỗi target sau reserve phải tạo seal mới.
- Ledger tồn tại qua SQLite restart; hai yêu cầu đồng thời cùng nonce chỉ có một thành công; trigger, giới hạn số attempts, constructor/route fixture-only.

Rollback G2F: bỏ module guard, test, docs và optional callback/verifyBackup; không có ghi Firebase hay ảnh hưởng cơ chế cũ. Không đưa ledger fixture thử nghiệm vào quy trình live.
