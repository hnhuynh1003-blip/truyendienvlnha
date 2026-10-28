# G5C — Synthetic staging assembly cho Vạn Giới

**Ngày:** 28/10/2026. **Baseline:** G5B `8cc63e327f89e298cccb93ed526eb78e3c45cef7`. **Trạng thái:** Node/test-host **offline-only**, chỉ ghép **chỉ mục gói staging giả lập**, không có bản chơi mới, upload asset, Firebase staging thật, quyền phát hành, engine runtime, thưởng hoặc save.

## 1. Module và điều kiện ghép

`cloudflare/src/vangioi-g5c-staging-assembly.mjs` xuất `assembleG5CStagingPackage({snapshot,candidate,arcPlan,engineManifest,assetObservations,parents,readReleaseGate})` và `G5C_ASSEMBLY_VERSION='g5c-synthetic-staging-1'`.

1. **G5A kiểm lại ngay:** snapshot G1L/G1B hash, sidecar G5A version/content/source/assets/entry/arc, reachability G3A qua G3C, metadata ảnh G3B, G4A engine manifest và G1Y **host fixture reader**. Kết quả `syntheticPreflightPassed` của lần cũ hoặc báo cáo G5B từ client **không được dùng** để bypass. G1Y hiện hành yêu cầu approved review độc lập; G5B đã kiểm chứng vòng đời G1L/G1X/G1Y trên fixture, nhưng không phát token publish cho G5C.
2. **Asset và đường đi:** tất cả ảnh **đang được dùng** ở cover, scene, view, appearance cần observation đúng pin/hash/format/kích thước và text fallback trong snapshot. Thiếu observation, sai hash hoặc thiếu mô tả dự phòng ở ảnh thiết yếu thì không tạo package. Metadata observation do host đưa chỉ là thông tin preview, **không** chứng minh bytes ảnh thật đã tải, quyền sử dụng, crop thực tế hoặc thiết bị QA. Không ép mọi world có shop, item, NPC AI, combat hay sinh tồn.
3. **Arc theo G1N/G5A:** có thể `arc=null` cho world một phần, không ép truyện hàng nghìn chương nhập một lần. Với continuation, `parents` là mảng snapshot + G5A candidate + arcPlan lịch sử đã pin trong fixture. G5C xác minh hash G1L mỗi parent, source/content/asset/profile pin, arc plan hash, `arcVersion/contentHash`, và **acceptedEndingIds phải tồn tại trong snapshot của chính parent**. Kiểm toàn đồ thị dependency để chặn thiếu parent, trùng node, phụ thuộc vòng, parent thừa và pin cũ. `releaseOrder` khác `storyTimeOrder` là hợp lệ cho tiền truyện ra mắt muộn.
4. **Đầu ra:** `packageIndex` chỉ chứa ID/pin/hash và các cạnh `scene → scene`, ảnh dùng kèm cờ có fallback và observation synthetic, entryId/mode/startSceneId, arc/prerequisite. `packageHash` là fingerprint của **index**, không phải chữ ký/`releaseId`/token và không chứa secretTruth, thoại, bản thảo, asset bytes, dữ liệu người chơi hoặc NPC private memory. Gói không có code hoặc data để chơi nhập vai thực sự.
5. **Chống thay đổi đầu vào khi await:** copy snapshot/candidate/arc/engine/observations/parents thành bản độc lập ngay đầu hàm; callback host không thể sửa source object giữa lần kiểm G5A và lúc đóng chỉ mục. Không có write DB, không import Worker, Creator, Thiên Mệnh, Chủ Thần, Thư viện hoặc live runtime.

## 2. Không được diễn giải sai thành gameplay hoặc quyền thật

Khi ghép thành công `assembled:true` chỉ khẳng định **hình dạng/pin/đồ thị tham chiếu đã qua kiểm thử offline**. Mọi trả lời — kể cả PASS — vẫn cố định:

`fixtureOnly:true`, `readyForStaging:false`, `packagePublished:false`, `productionAuthorized:false`, `publisherAuthorized:false`, `rightsVerified:false`, `deviceVerified:false`, `lineageVerified:false`, `parentEndingVerified:false`, `missionCompleted:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`.

- Ending của parent có thật theo **cấu trúc snapshot** không đồng nghĩa **người chơi nào đã tới ending ấy**. Không mở khóa arc sau từ `acceptedEndingIds`; không tự chuyển ký ức NPC, trạng thái chết/sống, item, thuộc tính, thưởng hoặc Canon. Những điều này cần bằng chứng theo player/instance ở G5D hoặc đợt gameplay được duyệt sau.
- G5C **không gọi G1Y trên snapshot lịch sử của parent**: G1Y hiện chỉ kiểm world revision đã approved hiện hành, không phải issuer lineage nhiều phiên bản. Nếu parent source/license bị thu hồi sau một bản cũ, không được coi index này là phép tái sử dụng nội dung. Phải có cổng đọc/permit và lineage riêng trước khi staging/play thực, đúng chính sách revoke-wins.
- Preview observations không là art QA. Visual identity, spoiler, tuổi/nghề nhân vật, fallback thực tế, mobile 320/375/390/430 px, desktop, thiết bị thật và quyền ảnh ngoài đời vẫn chưa có evidence; G5C không tự phát sinh giao diện, fallback ảnh mới hoặc world/play CTA.
- Không sửa `world-content-1` và G1N arc-plan-1, không kết nối Firebase/Worker hoặc kích hoạt 48 V66 seed, Quan Đạo thành world đã duyệt, AI NPC, EXP/Xu/Kho hay economy.

## 3. Kiểm thử, tiếp nối và rollback

`cloudflare/tests/vangioi-g5c-staging-assembly.test.mjs`: **15 ca** về single-world, nhiều arc/prequel, accepted ending parent kể cả nhánh thất bại, vòng lặp, orphan, hash/version/source/asset/entry bị sửa, G1Y hold/revoke/missing, ảnh không có observation/fallback, profile kẹt, forged reviewer/publisher/reward flag, hash determinism, race mutation, privacy và không import live code. Chạy cùng G1–G5B regressions, app/Functions/Python và Wrangler dry-run; kiểm CI Smoke/Browser và Pages theo commit SHA đợt này.

**Kế tiếp:** G5D version/save/recovery/lineage kế hoạch theo nguồn đã ghim, G4H–G4I, revoke-wins và thử parent ending theo người chơi/instance ở harness. Nếu Du muốn trải nghiệm **thế giới do tác giả tự tạo**, cần một đợt **demo gameplay offline** riêng sau khi kiểm engine có thể thực thi tương tác thật, với thế giới mẫu ngắn, nhánh và cảnh đủ; không lấy `packageIndex` làm runtime giả. Firebase staging thật vẫn bị chặn bởi G2J topology/IAM chưa chốt.

**Rollback:** revert module/test và đường dẫn tài liệu G5C; không có migration/schema mới, dữ liệu DB, người dùng, world published hoặc asset live cần xóa.
