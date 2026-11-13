# G2C — Sink SQLite fixture nguyên tử cho permit replay

27/10/2026. Nền G2B `4b97282` (550 Worker / 497 app / 10 Functions PASS cục bộ; Pages và job smoke chính SUCCESS, browser còn chạy khi bàn giao G2B). G2C bổ sung một **sink SQLite riêng trong fixture** để kiểm thử callback `commitBatch` của G1V và đối soát bản sao G2B. Không nối Firestore, backend staging thật, Worker, migration production hay quyền chơi.

## Giao diện và dữ liệu

`cloudflare/src/vangioi-permit-fixture-sink.mjs` cung cấp:

`createSqlPermitFixtureSink({storage,projectId,environment:'fixture'})`

Các phương thức:

| Phương thức | Trách nhiệm trong fixture |
| --- | --- |
| `commitBatch({after,checkpoint,projections})` | Ghi trạng thái permit hiện hành, event identity và checkpoint trong **một `transactionSync`**; chỉ G1V host tin cậy được gọi |
| `readReplicaSnapshot()` | Đọc checkpoint và danh sách `{storyId,contentHash,status,revision}` cùng một snapshot giao dịch để G2B kiểm toán |
| `readCheckpoint()` | Đọc checkpoint tối thiểu theo contract G2A; không sao chép nội dung nguồn |

Tạo ba bảng chỉ trong `storage` fixture do test host cấp: `vg_fixture_permit_checkpoint_v1`, `vg_fixture_permit_projection_v1`, `vg_fixture_permit_events_v1`. Chúng không thuộc schema authority G1R/G1U. Checkpoint không giảm; event IDs và thứ tự `seq` bất biến; projection không cho `revoked → active`. Không lưu proofRef, recipient, văn bản truyện, Canon, actor UID hoặc private chapters.

**Phân định quyền:** G1V `listPermitEvents/readAdaptationPermit` đã xác thực operator từ authority trước khi gọi callback. `commitBatch` **không có trường request/token và không tự làm bước xác thực riêng** vì là một callback nội bộ. Không được xuất hoặc cho gọi qua HTTP/client; nếu sau này nối vào hệ thống phải cấp quyền service-to-service có kiểm soát riêng. Constructor từ chối mode khác `fixture` và không cung cấp connection/binding production.

## Bất biến của giao dịch

1. `after` phải bằng checkpoint hiện tại khi ghi mới. Mỗi trang 1–50 event có `seq` tăng nghiêm ngặt, UUID duy nhất và checkpoint đúng `seq` cuối. Không bắt `seq` phải liên tiếp theo phép cộng một; SQLite outbox là authority về thứ tự.
2. Trong cùng giao dịch: kiểm CAS checkpoint, cập nhật từng projection theo `storyId + contentHash`, chèn event identity và nâng checkpoint. Lỗi ghi event, conflict hoặc exception **rollback cả ba**, lần chạy lại từ checkpoint cũ vẫn hợp lệ.
3. Nếu trang đã commit và event identity/khóa khớp, replay cũ chỉ được ACK, **không ghi lại projection và không lùi checkpoint**. G1V có thể đã đọc trạng thái permit mới hơn khi chạy lại issue cũ; identity lịch sử vẫn được dùng để chống nhân đôi, không dùng bản active cũ để làm giảm quyền revoked.
4. G1R revoke hiện hành có revision 2; issue hiện hành revision 1. Sink chỉ chấp nhận các projection tối thiểu này từ G1V, không cho revision giảm hoặc status `revoked` bị thay thành `active`, kể cả nếu request mang `seq` lớn hơn. Trigger SQL củng cố quy tắc đó.
5. Khi restart SQLite fixture, checkpoint và event tồn tại; callback đọc có thể tiếp tục dùng để chạy G1V và G2B, không tạo event lặp. Cảnh báo: *persistence test* không phải cam kết backup, durability hay topology cho production.

## Các phép thử tiêu biểu

- Issue → commit active; G2B đối soát từng permit và checkpoint thành công.
- Chỉ chạy replay sau khi G1R đã revoke: cả event issue cũ và revoke hiện tại chiếu thành revoked revision 2.
- Issue active rồi revoke: hai batch tiến triển, replay issue cũ không làm active trở lại.
- Inject lỗi ở lệnh ghi sự kiện giữa transaction: checkpoint, projection và log đều không tồn tại; retry thành công.
- Đóng/mở lại database fixture, retry batch không chèn event trùng; sai event ID/checkpoint bị từ chối.
- Không cho stale active ghi đè revoked, thử cả trigger SQL; phân trang 52 permit (50 + 2) không tự bỏ qua trang cuối.
- Chặn payload có trường proof, đầu vào sai, sai project/mode; không import vào Worker và HTTP.

## Giới hạn và điều kiện trước staging

Đây là **atomic sink trong một SQLite fixture**, không phải transaction giữa G1R authority, Firestore V49 và một kho replica thật. G1V đọc source/permit qua các lệnh async, nên revoke có thể xảy ra sau khi G1V đọc nhưng trước khi fixture ghi. G2A sẽ phát hiện checkpoint trễ, G2B kiểm nội dung projection; G1Y phải kiểm quyền authority ở **thời điểm sử dụng**, không lấy permit `active` ở replica làm quyền.

Trước khi xây consumer thật cần Du phê duyệt Firebase project/database/region/edition, topology, service account/roles, chính sách hash khi nguồn Thư viện được sửa/gỡ, baseline G1R cũ, backup/retention, replay idempotent, đối soát full-set hoặc phân trang ổn định và xử lý quyền thu hồi ngoài đời. G2C không tự xử lý các quyết định này, không bật source picker, review/publisher thật, 48 seed V66, gameplay, NPC AI, EXP/Xu/Kho hoặc phân hệ Thiên Mệnh/Chủ Thần.

Rollback offline: revert module, test và docs. Fixture test DB là dữ liệu thử riêng; **không được áp dụng việc xóa/rebuild checkpoint lên dữ liệu production** nếu sau này hệ thống đã kết nối thật.
