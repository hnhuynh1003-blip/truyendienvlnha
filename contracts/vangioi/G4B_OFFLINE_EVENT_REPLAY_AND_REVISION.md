# VẠN GIỚI — G4B: nhật ký sự kiện và kiểm tra phiên bản trạng thái offline

Ngày 27/10/2026. Nền `8082396995f6ba261ead84c354d6894fb4b08b55` (G4A + vá browser G3C đã có CI xanh). Bám mục IX quy chuẩn V0.1: sau parser điều kiện/hành động G4A là lớp sự kiện, chống phát lại và cơ sở cho save/reward idempotent. **G4B vẫn chỉ là harness không có quyền lưu hoặc cấp thưởng.**

## Thiết kế

`cloudflare/src/vangioi-engine-g4b.mjs` cung cấp ba hàm độc lập:

1. `createG4BSession(plan, {playerId, worldInstanceId, entryId})`: từ plan G4A đã ghim `contentVersion`/`contentHash`, tạo snapshot ban đầu gồm cảnh/cờ, `revision=0`, nhật ký rỗng và `chainHash` khởi nguyên. Ba ID trong môi trường offline là **nhãn giả định**, không có xác minh Firebase/token hay quyền người chơi.
2. `applyG4BEvent(plan, session, event)`: kiểm tra toàn bộ snapshot bằng replay rồi kiểm `eventId`, đúng `playerId`/`worldInstanceId`, `expectedRevision`. Chỉ dùng rule đã được G4A compile. Cùng `eventId` + payload giống hệt trả receipt cũ và không tăng revision; cùng ID nhưng nội dung khác thì báo xung đột; sự kiện mới với revision cũ bị từ chối.
3. `inspectG4BSession(plan, session)`: tái diễn từng sự kiện từ trạng thái đầu, kiểm SHA-256 của từng request, chuỗi hash và trạng thái cuối; phát hiện cắt bản ghi, sửa thứ tự, thay rule, sửa cờ/cảnh hoặc đổi hash. **Hash không phải chữ ký số**: người dùng có thể tính lại nếu kiểm soát toàn bộ dữ liệu đầu vào. Chưa có server trust anchor.

Event khai báo (`g4b-transition-1`):

```json
{
  "version": "g4b-transition-1",
  "eventId": "synthetic-event-0001",
  "playerId": "synthetic-player",
  "worldInstanceId": "synthetic-instance",
  "expectedRevision": 0,
  "ruleId": "open-door"
}
```

Sau khi áp dụng thành công, kết quả chỉ là **ứng viên** `{session, receipt}` và các cờ `saveCommitted=false`, `rewardCommitted=false`, `productionAuthorized=false`. Không có lệnh duyệt kết cục, thưởng, item, EXP/Xu, tương tác NPC AI hoặc chuyển thế giới. Replay không tự động thực thi `events[].trigger` văn bản tự do trong JSON của tác giả.

## Nguyên tắc an toàn

- `eventId` là khóa idempotency **trong cùng phiên**. Receipt ràng buộc toàn bộ `{eventId, playerId, worldInstanceId, expectedRevision, ruleId}`; không cho sửa action rồi sử dụng lại ID.
- `expectedRevision` là điều kiện chuẩn bị cho CAS (compare-and-swap). **G4B không có transaction thật**: hai người xử lý cùng một bản snapshot revision cũ tại hai nơi vẫn có thể tạo hai ứng viên độc lập. Chống double-grant chỉ có giá trị khi server kiểm revision/unique event ID và ghi receipt + state + ledger trong **cùng giao dịch đáng tin cậy**, cần thiết kế/duyệt riêng ở giai đoạn tiếp theo.
- Nhật ký được giữ tối đa 1.024 event trong một phiên thử; khi đầy phải dừng và thiết kế checkpoint có thẩm quyền về sau, không xóa entry cũ để cho phép replay. Đây là ngân sách an toàn kiểm thử, **không giới hạn số chương/arc/truyện**.
- Không cho người dùng tự gửi session gắn `approved`, `publisher`, `rewardGranted` hoặc quyền server. G4B từ chối khóa dư. Không tuyên bố idempotent reward đã hoàn thành chỉ vì test duplicate qua.
- Không nhập G4B vào Cloudflare Worker live, Firebase, UI VẠN GIỚI, Thiên Mệnh, Chủ Thần, pilot Quan Đạo, EPUB/Thư viện. Không migration, Rules, deployment hoặc thay đổi trạng thái thật.
- Giữ nguyên G1/G2/G3 schema, draft và snapshot; không đổi `world-content-1`, không thêm nút trên giao diện.

## Kiểm thử và bước kế tiếp

```sh
node cloudflare/tests/vangioi-g4b-event-replay.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
```

Các ca kiểm thử gồm: duplicate yêu cầu hợp lệ, ID trùng với payload khác, revision cũ, player/instance không khớp, replay hai sự kiện, các dạng sửa log/cờ/hash, dữ liệu có getter/khóa thừa, bản world đổi phiên bản, vượt ngân sách và phủ định khả năng ghi save/reward thật.

**Đề xuất G4C:** thiết kế adapter transaction/CAS giả lập với hai yêu cầu đồng thời, trùng retry sau mất kết nối, receipt + ledger như một đơn vị nguyên tử; chỉ kiểm sandbox/emulator, giữ server authorization và reward policy tách biệt. Chưa bật production trước khi chủ dự án duyệt các cổng dữ liệu thật.

Rollback: bỏ module/test/tài liệu G4B. Không ảnh hưởng dữ liệu đã lưu vì module không có writer hoặc endpoint.
