# VẠN GIỚI — G4F: xét duyệt và kết toán dry-run trong SQLite fixture

Ngày 27/10/2026. Nền `9e2fe1cdc4fe0dbdea7cdda89295ec1707c2a327` (G4E, smoke/browser/Pages SUCCESS). Đây là **mô phỏng offline độc lập**, không có dịch vụ cấp thưởng, nguồn quyền thật, world phát hành hoặc đường ghi production.

## Ba quyết định tách biệt, không suy diễn quyền

| Tầng | G4F thực sự dùng | Không được suy ra |
|---|---|---|
| G4E evidence | `reviewCandidate=true` từ replay event đã commit, đối chiếu receipt/ledger | Mission/ending đã hoàn thành hoặc đủ quyền thưởng |
| Adjudication mock | Callback `verifyAdjudicator` và `adjudicateMission` của **test host** chấp thuận đúng `missionId`, `contentHash`, `evidenceRevision`, `evidenceChainHash` | Firebase role, quyền reviewer/publisher hoặc chứng thực server |
| Policy mock | Test host gọi `seedPolicy` riêng cho `missionId + completionVersion`, ghim `contentVersion/contentHash`, `policyId`, revision và chỉ có `mode=dry-run-only` | Chính sách cấp EXP/Xu/vật phẩm, duyệt Canon hoặc phê duyệt kinh tế thật |

Tất cả ba tầng chỉ tạo **ứng viên mô phỏng**. `rewardAuthorized=false`, `rewardCommitted=false`, `missionCompleted=false`, `productionAuthorized=false` luôn giữ nguyên, kể cả khi `dryRunCommitted=true`.

## Cơ chế

`cloudflare/src/vangioi-engine-g4f-settlement-fixture.mjs` là module **Node-only**, không có HTTP route; factory `createG4FSettlementFixture({database,plan,world,verifyAdjudicator,adjudicateMission,...})` dùng chính G4E fixture để xác minh chứng cứ. Không thay schema `world-content-1`, G4A–G4E hay content snapshot.

- `seedPolicy(policy)` chỉ do driver thử độc lập gọi, chưa có issuer duyệt thật; từ chối numeric reward, item, author `rewardRequest`, trường dư, content hash sai hoặc policy không phải `dry-run-only`. Pin policy không thể bị sửa mà không qua trigger; policy chỉ có thể chuyển `active → revoked` cùng tăng epoch, không bật lại bằng thao tác ghi thông thường. Status/epoch là fence cục bộ cho thu hồi.
- `settle({adjudicatorRequest,worldInstanceId,missionId,completionVersion,requestId})` không chấp nhận session/proof/event, completion tự khai, role từ client hay số thưởng. Mock adjudicator kiểm riêng, G4E đọc **trực tiếp** sự kiện đã commit, sau đó callback xét duyệt phải chấp nhận đúng evidence revision/hash.
- Bên trong `BEGIN IMMEDIATE`, recheck trạng thái G4C, gate nguồn/giấy phép, fence G4D, policy status/epoch và **toàn bộ snapshot trước await**; khác biệt dẫn đến từ chối trước ghi. Receipt và ledger dry-run được chèn nguyên tử cùng transaction. Có lỗi sau một trong hai bước ghi thì `ROLLBACK` cả hai. Không `await` trong SQLite transaction.
- Khóa idempotency là `(worldInstanceId, missionId, completionVersion)` và `requestId` riêng trong world instance. Retry cùng yêu cầu sau mất phản hồi lấy receipt lịch sử giống hệt, không thêm ledger, kể cả khi người chơi đã tiếp tục chuyển cảnh. Đổi `requestId` với cùng completion key hoặc tái sử dụng request ID cho khóa khác → xung đột. Hai yêu cầu đồng thời chỉ một commit; lần còn lại không thể tạo thêm bản ghi.
- Ledger G4F chỉ có `kind=dry_run_only`, `reward_authorized=0`, `reward_committed=0`; không có cột EXP, Xu, vật phẩm, ví, stock hoặc Kho. Receipt bất biến, bám policy ID, decision ID và revision/hash của G4E. Không thực thi `rewardRequest` của tác giả.
- Nhiệm vụ `main`, `side`, `hidden` dùng khóa riêng; nhiệm vụ phụ/ẩn không bị gộp thành điều kiện thắng toàn world. Các verb G4E chưa hỗ trợ (`choose/talk/collect/inspect/purchase/survive/deliver` và reach đếm lặp) vẫn **không thể** đi qua G4F.

## Chưa đạt và không được tuyên bố

1. `verifyAdjudicator`/`adjudicateMission` và policy seeding là **mock**; không có issuer, policy thật, publisher signature, completion proof từ gameplay server, reward budget hoặc nền tảng kinh tế đã duyệt. Không tự tạo reviewer/publisher từ client.
2. G4F kiểm các bảng G4C/G4D và policy **trong cùng SQLite file**. Authority G1Y/G1Z, callback ngoài DB, Firebase, license/permit/source ngoài hệ này vẫn có race/revoke TOCTOU. Không thể suy đồng bộ liên storage từ kết quả local.
3. Dry-run receipt không phải reward receipt chính thức, không được dùng công nhận ba F khảo hạch, thẻ thông hành, nâng cấp hay mở world/arc. G4F **không thử phát thưởng thật** và không nối vào app Thiên Mệnh, Chủ Thần, UI Vạn Giới, Worker public, Firebase Functions hoặc Cloudflare/Firebase production.
4. Không giao dịch thật, migration, sửa Firestore Security Rules, cấp tồn kho, EXP/Xu, item, NPC AI hoặc 48 seed. Pages có thể build/deploy mã repo nhưng không có đường import/activate module này từ website.

## QA và rollback

`node cloudflare/tests/vangioi-g4f-settlement-fixture.test.mjs` bao phủ 14 test: G4E + quyết định mock độc lập; unsupported objective; main/hidden; từ chối claim thưởng, reviewer giả, policy sai/ABA; retry/lost response sau reopen; duplicate/key conflict/concurrent; rollback sau receipt/ledger; policy revoke/G4D access/epoch/source gate hoặc CAS stale ngay trước ghi; dữ liệu hỏng và không nối Worker/UI.

Chạy full `npm test --prefix cloudflare`, `node --test tests/*.test.cjs`, `node --test functions/tests/*.test.cjs`, Python contract/intake, Wrangler dry-run và CI/browser/Pages theo SHA đợt G4F. Kết quả staging không chứng minh gameplay release.

Rollback: hoàn nguyên riêng module/test/doc và index/handoff G4F; đây là fixture Node không migrate/ghi dữ liệu production. Các bảng G4F chỉ tạo trong database test.

**Hướng tiếp (chưa triển khai):** G4G đánh giá phục hồi sau sự cố, đối soát và kế hoạch cổng production/rollback. Chỉ thiết kế sau khi xác minh được trusted identity, mission proof đa dạng, approved reward policies và cross-system transaction/outbox thực sự; không mở G5 hoặc kinh tế thật từ riêng G4F.
