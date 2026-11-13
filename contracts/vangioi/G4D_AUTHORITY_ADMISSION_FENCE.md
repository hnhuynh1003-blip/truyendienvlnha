# VẠN GIỚI — G4D: cổng quyền và phiên offline trước giao dịch G4C

Ngày 27/10/2026. Nền `055fc37df55ba039edbc6c034525572df9ebc41c` (G4C, smoke/browser/Pages SUCCESS). Phạm vi **G4D-A/B/C** duy nhất: hợp đồng tin cậy, adapter offline và regression. Không nối production, không phát hành world, không kích hoạt AI, economy hoặc reward.

## Không gộp ba loại quyền

| Cổng | Có thể xác nhận trong mô hình thử | Không thể tự xác nhận |
|---|---|---|
| G1Y | World đã approved vẫn có source/permit/notice/assets hợp lệ trong authority SQLite tại thời điểm kiểm tra | Người chơi được phép vào world, publisher release, JWT hoặc quyền thưởng |
| G1Z | Operator diễn tập release/start/resume/source-read và kiểm lại G1Y với snapshot hash pin | Session chơi thật; ID Map của G1Z **không phải** bearer/play token |
| G4D | Host thử độc lập đối chiếu player/instance/entry, source/content/snapshot pin và access revision; fence CAS trong **cùng SQLite fixture** với G4C | Firebase identity, sự thật bản quyền, player entitlement server, đồng bộ revoke xuyên hệ thống |

`cloudflare/src/vangioi-engine-g4d-authority-fixture.mjs` cung cấp `createG4DAuthorityFixture({database,plan,admission,operatorRequest,verifyPlayer,readTrustedAccess,readApprovedPin})`. `admission` là G1Z rehearsal object; không sử dụng `candidateId` hoặc `sessionId` từ sự kiện client. Ba callback là **nguồn giả lập đáng tin cậy do test host tiêm**, không được cung cấp từ client, AI hay JSON của tác giả.

- `provision({playerRequest,binding})`: chỉ dành cho host fixture. Xác minh người thử bằng callback riêng, gọi G1Z `simulateResume` bằng yêu cầu operator của host, đọc entitlement và pin **từ hai reader tin cậy riêng**; so version/hash đúng plan G4A. Tạo G4B session + G4C gate + hàng fence G4D trong **một transaction SQLite**. Không tự issue token, giấy phép hoặc quyền thật.
- `submit({playerRequest,event})`: callback xác thực lại player; lấy world/session/entry và G1Z handle từ hàng fixture đã pin, không từ payload. G1Z kiểm release lại, reader kiểm entitlement + revision và content/source pin lại. G4B tiếp tục từ chối event không đúng allowlist. G4C kiểm fence G4D **bên trong `BEGIN IMMEDIATE`** trước cả duplicate receipt; recheck access revision, monotonic fence epoch, snapshot/content/source và actor, rồi mới commit state/receipt/audit.
- Các hook đồng bộ `onSeedCommit` và `commitFence` mới của G4C chỉ là phần mở rộng tùy chọn, **không đổi hành vi G4C nếu không cấu hình**. Không await trong transaction; không đổi G4A/G4B schema, mã nguồn truyện hay manifest.

## Các pin phải tách riêng

1. `snapshotHash` từ G1Y/G1Z: hash snapshot authoring đã duyệt, **khác** hash nội dung world G4A.
2. `contentVersion/contentHash` từ G4A: nội dung/rule diễn tập, được host resolver đối chiếu với snapshot đã duyệt. G1Y **không tự trả G4A contentHash**.
3. `sourceVersion/sourceHash`: pin nguồn truyện của host; không suy ra license thực từ hash.
4. `playerId/worldInstanceId/entryId`: ràng buộc phiên test, do trusted test driver và callback xác minh; không lấy `admin`, `publisher`, `playerId` tự khai trong event làm quyền.
5. `accessRevision/fenceEpoch`: số đơn điệu trong SQLite fixture; đổi quyền hoặc pin phải chặn ứng viên cũ trước commit.

## Phạm vi race đã đóng và chưa đóng

- Đã kiểm: quyền/nguồn/snapshot giả lập thay đổi trước submit hoặc lúc chuẩn bị; fence cùng SQLite đổi ngay trước commit; hai yêu cầu cùng revision; duplicate receipt sau retry. Chúng không được tạo thêm state/receipt/audit trái phép.
- **Chưa kiểm chứng atomicity xuyên authority SQLite G1Y, Map của G1Z, callback host và SQLite G4C/G4D.** Nếu nguồn quyền bên ngoài thay đổi nhưng không cập nhật fixture fence trước commit, vẫn có cửa sổ TOCTOU. Không gọi đây là server-authenticated CAS hoặc cơ chế revoke live. Cần thiết kế topology/issuer, đồng bộ notice/permit, writer fence/transaction hoặc outbox-reconciliation được phê duyệt trước production.
- G1Y/G1Z không cấp quyền player. `verifyPlayer`, `readTrustedAccess`, `readApprovedPin` là mock hợp đồng chờ adapter thật có kiểm chứng issuer và nguồn. Nếu vắng/malformed/thất bại: deny. Không tạo quyền author/reviewer/publisher hoặc tự cấp thưởng.
- G4D không xác nhận hoàn thành nhiệm vụ, không phát hành world, không kết toán reward. Trạng thái trả về giữ `authority:'synthetic-host-only'`, `productionAuthorized:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`.

## QA / rollback

```sh
node cloudflare/tests/vangioi-g4d-authority-fixture.test.mjs
node cloudflare/tests/vangioi-g4c-atomic-fixture.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
```

Chín ca G4D: G1Z/operator + callback player/source/access độc lập; client self-claim; source/hold/revoke; snapshot/content/source rotation; entitlement revoke/epoch; race ngay trước transaction; CAS + retry; seed rollback; không import public Worker/UI. Phải giữ nguyên hồi quy G4A–G4C, Functions/Python và dry-run Cloudflare.

Rollback G4D: hoàn nguyên module/test/hợp đồng và hai hook **tùy chọn** G4C nếu chưa có người tiêu thụ khác. Không có migration, world phát hành, ghi tài khoản hoặc dữ liệu production để khôi phục.

Sau G4D chỉ đề xuất G4E kiểm chứng objective/ending dựa trên event do server nghiệm thu, tùy từng loại truyện; chưa triển khai G4E hoặc G5 bằng đợt này.
