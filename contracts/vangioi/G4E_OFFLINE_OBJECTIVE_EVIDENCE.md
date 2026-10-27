# VẠN GIỚI — G4E: bằng chứng mục tiêu từ giao dịch đã commit (offline)

Ngày 27/10/2026. Nền `ff0b44e3207f71f6c16fc352e86129b0da3c0b03` (G4D, smoke/browser/Pages SUCCESS). Phạm vi **chỉ đọc** Node SQLite fixture: chưa công nhận hoàn thành nhiệm vụ, duyệt ending, cấp thưởng, lưu tiến độ người chơi hoặc kết nối production.

## Hợp đồng chứng cứ hẹp, không áp gameplay đồng loạt

`cloudflare/src/vangioi-engine-g4e-objective-fixture.mjs` xuất `createG4EObjectiveFixture({database,plan,world})`, là **factory bất đồng bộ dành riêng cho test host**. `plan` phải được tạo từ manifest G4A đã ghim nội dung, `world` là `world-content-1` cùng `contentVersion/contentHash`; thay đổi dữ liệu sẽ bị từ chối. Không import module vào public Worker, World Creator, Thiên Mệnh, Chủ Thần hay pilot Quan Đạo.

Mỗi lần `fixture.evaluate({worldInstanceId,actorId})`:

1. Chỉ nhận hai nhãn synthetic từ test driver, không nhận session, event, token, `missionCompleted`, reward, hay chứng cứ tự khai từ client. Đọc **snapshot nhất quán** trong transaction SQLite (`BEGIN`/`COMMIT`, không `await`) gồm phiên G4C, gate, hàng fence G4D, receipt và ledger đã commit.
2. Chặn actor/instance khác, gate access/license/source không hợp lệ, fence G4D bị khóa, content/source pin không khớp, `snapshotHash` trong fence sai định dạng, phiên hỏng hoặc bảng receipt/ledger thiếu/sai. **Không gọi lại G1Y/G1Z hoặc Firebase**: đây chỉ là snapshot của authority fixture, không phải xác thực quyền còn hiệu lực ở hệ thống khác.
3. Replay **toàn bộ** G4B bằng plan G4A; khớp từng `eventId`, `requestHash`, `revision`, `chainHash` với receipt bất biến G4C và ledger `scene_transition_only`, `reward_authorized=0`. Một G4B session tự tạo ngoài SQLite, flag cuối, văn bản nhiệm vụ hay hash đơn lẻ **không tạo bằng chứng**.
4. Mục tiêu `verb=reach`, `requiredCount=1`: ghi nhận **một lần đến `targetId=sceneId` bằng transition G4A đã được G4D/G4C tiếp nhận và commit**. `entry.startSceneId` không tự tạo một lượt đến, và retry cùng `eventId` không thêm lần. Chứng cứ dẫn về `eventId/revision/chainHash/ruleId` của bản ghi gốc.
5. `talk`, `collect`, `inspect`, `purchase`, `choose`, `survive`, `deliver` và `reach` có `requiredCount>1` → `unsupported`, không suy diễn từ việc vào cảnh hoặc một cờ. Chúng cần operator/hành động tin cậy riêng và semantics theo truyện. Không thêm hành động, vật phẩm, hội thoại, nhiệm vụ, ending mới hoặc bắt thế giới nào có cửa hàng/sinh tồn/phá án.

Kết quả `missions[]` tách `kind`/`requiredForCompletion` và từng objective `pending | observed | unsupported`. `reviewCandidate=true` **chỉ** khi tất cả objective của **nhiệm vụ đó** có arrival evidence. Nhiệm vụ phụ/ẩn không trở thành điều kiện bắt buộc; `reviewCandidate` không phải `missionCompleted`. Mọi kết quả giữ `missionCompleted:false`, `endingVerified:false`, `rewardAuthorized:false`, `rewardCommitted:false`, `saveCommitted:false`, `productionAuthorized:false`. Không dùng `rewardRequest` của tác giả để tính quyền thưởng.

## Những việc G4E tuyệt đối chưa giải quyết

- G4B chỉ có chuyển cảnh và cờ. Không có receipt tin cậy cho trò chuyện, lựa chọn `hotspotId`, nhặt/trao vật phẩm, mua hàng, sống sót hoặc bàn giao; một `ruleId` không đồng nghĩa chọn đúng `hotspotId` hay đối chất NPC thành công.
- Trạng thái `observed` là chứng cứ **trong fixture giả lập**, không phải một bằng chứng có chữ ký máy chủ. Hash G4A/G4B không phải quyền truy cập, quyền tác giả hoặc issuer. Nếu toàn bộ SQLite fixture/host bị sửa, bảo đảm này không chống được gian lận.
- G4D kiểm fence trong giao dịch khi `submit`; G4E chỉ đọc fence đang lưu và **chưa recheck realtime** G1Y/G1Z, player token, entitlement/license/permit ngoài SQLite. Vẫn còn TOCTOU xuyên hệ thống như hợp đồng G4D. Không đưa output G4E vào reward settlement khi chưa có trusted issuer, source pins và hậu kiểm server đầy đủ.
- Không chấm `completionConditions`, `failConditions`, ending, lựa chọn kể chuyện hay chính sách thưởng. Cả `reviewCandidate=true` cũng không được dùng cấp bất kỳ EXP/Xu/vật phẩm/Kho, công nhận ba F khảo hạch hoặc tự chuyển arc.
- Không sửa schema `world-content-1`, snapshot/Creator/G1–G4D, Firestore Rules, Worker bindings/routes, migrations, economy hoặc giao diện. Không phát hành gameplay, không mở 48 seed.

## Kiểm thử và rollback

`node cloudflare/tests/vangioi-g4e-objective-evidence.test.mjs` kiểm tra arrival từ giao dịch thật trong fixture, initial-scene/unsupported verbs/counts, nhiệm vụ phụ/ẩn, retry, bằng chứng G4B giả chưa commit, thiếu/corrupt receipt hoặc ledger, revoke/rotate actor/content/source/fence, rollback và không nối Writer/UI. Chạy cùng G4A–G4D, toàn Cloudflare, app, Functions, Python và Wrangler dry-run; đối chiếu CI/Pages theo **SHA mới**.

Rollback: hoàn nguyên riêng module/test/hợp đồng G4E và các dòng index/handoff. Không có migration, dữ liệu production hoặc thay đổi cơ chế cấp thưởng phải khôi phục.

**Hướng tiếp theo (chưa được triển khai):** thiết kế G4F settlement **dry-run** chỉ khi đã phân biệt rõ `reviewCandidate`, mission adjudication dựa vào trusted event, reward policy được duyệt, idempotency key, và chính sách cross-store; không lấy output G4E làm quyền cấp thưởng.
