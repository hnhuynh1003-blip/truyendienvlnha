# G2G — Đối soát biên nhận phục hồi với snapshot fixture sau sự cố

27/10/2026. Kế thừa G2F `59925fc`: G2E/G2D xác minh backup trước khi guard G2F ghi nhận nonce đã tiêu thụ; sau đó khôi phục G2D vào fixture đích. Vì **ledger và target là hai kho SQLite độc lập**, một lỗi xảy ra sau khi ledger commit có thể để lại biên nhận `consumed` dù target chưa có dữ liệu. G2G bổ sung một **bộ đối soát operator-only, read-only** để phân biệt trạng thái dữ liệu quan sát được, không tự mở khóa nonce hoặc sửa quyền.

## API và quyền

- G2F thêm `guard.readAttempt(nonce)`: chỉ đọc đúng một biên nhận theo UUID, trả metadata `projectId`, `environment`, `nonce`, `issuerId`, `keyId`, `checkpoint`, `backupDigest`, `createdAt`. Không trả chữ ký MAC hoặc khóa HMAC, không liệt kê vô hạn, không thay trigger chống UPDATE/DELETE. G2F `reserveVerifiedSeal` và `readGuardSnapshot` không đổi.
- `cloudflare/src/vangioi-permit-fixture-reconciliation.mjs` xuất `createFixturePermitRestoreReconciliation({guard,readTargetBackup,authorizeOperator,projectId,environment:'fixture'})`. Host cấp:
  - `guard` là G2F fixture ledger độc lập;
  - `readTargetBackup` là callback tin cậy gọi **G2D `createBackup()` trên đúng fixture đích** (đọc tất cả entry/event/checkpoint trong một transaction);
  - `authorizeOperator(request, projectId)` kiểm tra danh tính và assignment operator **phía server**, phải trả chính xác `true`. Không lấy `admin`, `role`, `verified` do client tự khai.
- `reconcile(request,{nonce})` kiểm operator trước khi đọc ledger/target, sao chép snapshot và kiểm lại SHA-256, đọc ledger lần hai để phát hiện thay đổi trong thời gian chờ. Không INSERT, UPDATE, DELETE, xóa nonce, khôi phục lại target hoặc phát hành world.

## Kết quả đối soát, không phải quyền chơi

| `code` | Diễn giải và hành động |
| --- | --- |
| `target-matches-receipt` | Checkpoint lớn hơn 0 và **toàn bộ digest snapshot G2D** khớp biên nhận. Chỉ xác nhận target *được người vận hành lựa chọn* có metadata giống snapshot đã ký, **không chứng minh chính nonce ấy đã tạo target**. Vẫn chạy G2B/G1Y với authority hiện hành. |
| `target-behind` | Checkpoint đích thấp hơn biên nhận, có thể do lỗi/đứt giữa chừng. Biên nhận tiếp tục burned; đánh giá sự cố và tạo seal mới nếu cần. |
| `target-diverged` | Cùng checkpoint nhưng khác digest; không chứng nhận restore thành công, cần điều tra. |
| `target-advanced-unverified` | Target có checkpoint cao hơn (ví dụ G1V đã replay thêm). Không so kết quả với bản cũ như một lời cho phép; G2B phải kiểm đầy đủ theo authority. |
| `indeterminate-empty` | Backup/checkpoint đều 0. Fixture trước/sau phục hồi rỗng có thể giống nhau; **không đủ căn cứ kết luận đã restore**. |
| `forbidden`, `invalid-request`, `receipt-not-found`, `invalid-target`, `ledger-changed`, `reconciliation-unavailable` | Trả lỗi an toàn, không rò dữ liệu riêng tư của backup, không tạo quyền. |

Mọi trạng thái đều đặt `requiresAuthorityAudit:true` khi đã đọc và phân loại target. `ok:true` chỉ áp dụng `target-matches-receipt`; nó là **đúng về bản sao metadata tại thời điểm đối soát**, không phải giấy phép chuyển thể còn hiệu lực, xác nhận G1R, hay quyền start/resume/read thế giới.

## Ranh giới thận trọng

1. **Không chứng minh danh tính của target:** ledger G2F chưa gắn `targetFixtureId` đã xác thực, nên người vận hành phải chỉ định đúng SQLite đích; hai đích có nội dung giống nhau có thể cùng được phân loại `target-matches-receipt`. Đợt sau phải cân nhắc binding mục tiêu/receipt bền vững nếu xây phục hồi thật.
2. **Không kết luận crash outcome chính xác:** trong mô hình burn-on-attempt, checkpoint=0 có thể đã restore một backup rỗng hoặc chưa restore. Target có thể tiếp tục replay sau khi restore; G2G cố ý phân biệt `target-advanced-unverified` với matching.
3. **Không phá khóa G2F:** không thay `highwater`, không xóa receipt, không cho cùng `nonce` chạy lại, không tự phát hành seal mới, không sửa authority. Sau lỗi SQL target, việc tạo seal mới vẫn cần host tin cậy và sự đánh giá của operator.
4. **Không có backend production:** không nối Firebase Thư viện, Firestore Rules, migration, staging deploy, Worker route, authoring HTTP, gameplay, NPC AI, XP, Xu, Kho hay 48 seed V66. Không có permission UI cho tác giả/người chơi.

## Nghiệm thu fixture

- Biên nhận đã dùng và target khớp; lỗi target sau burn → `target-behind`; target có cùng checkpoint sai dữ liệu → `target-diverged`; replay sau restore → `target-advanced-unverified`.
- Snapshot rỗng mơ hồ → `indeterminate-empty`; operator không được phân công bị chặn **trước** callback target; nonce không tồn tại/sai định dạng fail closed.
- Digest sai và ledger thay đổi trong lúc đọc bị từ chối; reopen SQLite ledger vẫn đọc được biên nhận; không trả MAC, không nối public route.

Rollback G2G chỉ bỏ module đọc, phương thức `readAttempt`, test và docs. Không chạm dữ liệu thật hay đảo ngược bất kỳ quyền nào đã bị thu hồi.
