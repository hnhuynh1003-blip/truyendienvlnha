# G5A — Offline release candidate sidecar và kiểm tra pin/arc

**Ngày:** 28/10/2026. **Trạng thái:** chỉ module Node/test-host offline; **không phải release/publish, staging thật, gameplay hay cấp quyền**. Nền `main` trước đợt: `916cf0843cb12b4e40c25d1b1574c2adda83b6e3` (G4 closeout). PR #22 đang Draft chỉ bổ sung **đề xuất** continuity nhiều arc, không phải Canon hay bản triển khai gameplay.

## 1. Hợp đồng và phân biệt hai kết quả

`cloudflare/src/vangioi-g5a-release-candidate.mjs` xuất `inspectG5AReleaseCandidate({snapshot,candidate,arcPlan,engineManifest,assetObservations,readReleaseGate})` và `G5A_CANDIDATE_VERSION='g5a-release-candidate-1'`.

`candidate` là **sidecar JSON độc lập** với `world-content-1` và G1N `arc-plan-1`. Các trường bắt buộc, không cho field lạ:

- `version`, `worldId`, `contentVersion`, `contentHash`, `snapshotRevision`, `snapshotHash`.
- `source` pin nguyên `kind/storyId/storyVersion/contentHash` như snapshot `storySource`; `assets` là đủ toàn bộ pin `assetId/assetVersion/kind/contentHash` của snapshot, không nhận danh sách ảnh thiếu/quyền tự khai.
- `entryIds`: đủ toàn bộ `playerEntryProfiles` của snapshot, không cho bỏ profile lỗi để báo QA đẹp.
- `engine`: `null` hoặc `{version:'g4a-rules-1',manifestHash}`. Mặc dù có thể khai `null`, phần preflight sẽ bị chặn do thiếu engine plan.
- `arc`: `null` khi chưa chia arc, hoặc `{arcId,arcVersion,planHash,source,releaseOrder,storyTimeOrder}`. `planHash` phải khớp `arc-plan-1` hiện hành; source pin arc phải có và khớp G1N. `releaseOrder` và `storyTimeOrder` **khác nhau**, hỗ trợ tiền truyện được viết/phát hành muộn. `arcVersion` vẫn là đề xuất tác giả, chưa được issuer ghim.
- `continuation`: `null` khi không có arc; khi có arc phải có `mode`, `prerequisites`, `carryForwardFactKeys`, `canonAnchors`. Ba mode: `direct_continuation`, `canon_bounded_continuation`, `standalone_same_universe`. Mỗi prerequisite pin `arcId/arcVersion/contentHash/acceptedEndingIds` từ **arc cha**; một `acceptedEndingId` của phần trước **không được đối chiếu sai sang endings của phần hiện tại**.

G5A kiểm hình dạng strict, hash canonical của **G1L snapshot thật về mặt cấu trúc** bằng `verifySubmissionIntegrity` của G1B, nội dung/thẻ nguồn/ảnh/vai đúng snapshot, G1N plan hash, self/dangling parent trong plan và G3C (G1D/G3A/G3B). G4A được compile theo manifest pin, không thực thi gameplay. G1Y phải đi qua callback **host thử nghiệm** `readReleaseGate({worldId})`; chỉ nhận `{ok:true,eligible:true,worldId,snapshotHash,gateVersion:'world-release-1'}` đúng snapshot; hold/revoke/missing approval/asset hoặc callback hỏng đều bị chặn.

`contractValid` và `syntheticPreflightPassed` **chỉ** có nghĩa là hợp đồng/fixture qua các bước có sẵn, không phải quyền runtime. Mọi báo cáo **luôn** có `candidateOnly:true` và `published/productionAuthorized/rightsVerified/engineVerified/deviceVerified/lineageVerified/parentEndingVerified/missionCompleted/saveCommitted/rewardAuthorized/rewardCommitted:false` kể cả khi preflight PASS. Hash/QA/host callback giả lập không mang chữ ký, không phải cổng quyền server. Không có result nào chứa `secretTruth`, script, quyền người dùng, asset bytes hay snapshot private.

## 2. Trạng thái tiếp diễn G5A và điều chưa được phép suy ra

G5A mới kiểm **khai báo pin** `prerequisites/acceptedEndingIds`, một parent có mặt trong G1N plan, không tự tạo arc mới, không cho tự phụ thuộc hay duplicate; `standalone_same_universe` không được ngầm kế thừa ký ức. `canonAnchors` chỉ cho mode canon-bounded. Các key carry-forward là nhãn đề xuất, **không được giải mã thành quyền, Xu/EXP, inventory/Kho, quyền AI hoặc memory của NPC**.

G1N chưa có mapping `endingId` theo arc, lineage, version lưu server hoặc đồ thị dependency nhiều cấp. Vì thế G5A **không xác minh** ending của parent thực sự đã hoàn thành, actor là player nào, có được mở arc sau hay không, hoặc cycle nhiều bước. Cần G5C mô phỏng parent snapshot/arc dependency graph, G5D version + playthrough/lineage + lựa chọn nhánh, rồi host thật độc lập trước quyền mở phần sau. Không ép mọi world thành thắng/thua nhiệm vụ chính: eligibility phải do luật/kết cục của world được duyệt, không suy completion từ văn bản hay nút client.

Đề án Phán Tử/Tái Xuyên, giới hạn số lần, ngoại lệ ba F, luật Xu/EXP và AI giữ **đề xuất chờ chủ dự án phê duyệt riêng**; module G5A không chứa những quy tắc đó.

## 3. Kiểm thử và ranh giới

`cloudflare/tests/vangioi-g5a-release-candidate.test.mjs` kiểm:

1. Snapshot G1L hash hợp lệ; source/asset/profile/content/revision pin; source held, permit revoked, asset revoked, thiếu G1Y hoặc G1Y stale.
2. Các flag giả `publisherApproved`, `admin`, `ownerVerified`, `missionCompleted`, reward và getter độc hại; không rò nội dung private.
3. G4A manifest thiếu, đổi hash hoặc chứa action không được phép; G3A đường tới objective chính bị khóa; QA mobile chưa đo không tự thành device verified.
4. Arc prequel có thứ tự thời gian khác release; direct/canon-bounded/standalone; self/duplicate/dangling parent, plan hash stale; ending của parent không bị so sai với snapshot phần sau.
5. Không import module G5A từ Worker public/Creator, không có SQLite write/Firestore/production route.

Chạy `node --test cloudflare/tests/vangioi-g5a-release-candidate.test.mjs`, sau đó toàn suite Cloudflare/app/Functions/Python và Wrangler dry-run; CI Smoke/Browser và Pages phải xác minh trên commit SHA mới trước khi báo PASS. **Không có world nào được đăng, không có URL để chơi G5A và chưa có backend staging.** Quan Đạo pilot là đường chơi riêng hiện hành, không tự được biến thành release candidate được duyệt.

## 4. Handoff G5B và rollback

G5B cần diễn tập reviewer **độc lập** với owner/contributor, kiểm G1L/G1X/G1Y tại lúc duyệt, quyền source/asset phiên bản hiện tại, audit receipt và hold/revoke; tất cả fixture. Không cấp role client. Khi có publisher thật, phải recheck tại commit chứ không dùng G5A synthetic PASS làm bằng chứng. G5C phải tiếp nối thêm kiểm tra parent ending, đường đi **từng** accepted ending và NPC đã chết/không biết/carry-forward, không sửa lịch sử phần trước.

Rollback G5A: chỉ revert module offline, bài test và các tài liệu liên kết; không có migration, route, data, IAM, Rules, Worker production, Creator UI, Thiên Mệnh, Chủ Thần, Thư viện hay economy nào bị tác động.
