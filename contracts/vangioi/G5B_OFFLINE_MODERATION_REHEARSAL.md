# G5B — Diễn tập review/moderation G1L–G1X–G1Y trong SQLite cách ly

**Ngày:** 28/10/2026. **Trạng thái:** **fixture Node/SQLite, không phải dịch vụ kiểm duyệt hoặc quyền phát hành thật**. Baseline: G5A `eb09fc90bb9e1d83d82ec322e64fce9c650c8c41`. Không chỉnh sửa G1L/G1R/G1X/G1Y, schema, role, HTTP/Worker, UI, Firebase hay Canon. PR #22 tiếp diễn arc vẫn là đề xuất riêng, không bị merge hoặc áp làm luật bởi G5B.

## 1. Kết quả và ranh giới

`cloudflare/src/vangioi-g5b-moderation-rehearsal.mjs` xuất `createG5BModerationRehearsal(...)` và `G5B_REHEARSAL_VERSION='g5b-moderation-rehearsal-1'`. Host fixture phải cung cấp **cùng** vùng SQL cách ly, `verify` danh tính thử, service G1L `reviewSubmission`, G1Y `evaluateApprovedWorld` và `operatorRequest` **cấu hình ở host**. Không có endpoint, bearer quyền phát hành, migration hay kết nối backend thật. Chỉ `environment:'fixture'` được nhận.

Input `review(request,{worldId,requestId,expectedRevision,expectedAccessRevision,snapshotHash,decision,note})` có **chính xác bảy** trường, trong đó quyết định chỉ là `approve` hoặc `request_changes`; `note` là phản hồi biên tập (bắt buộc, 1–4000 ký tự). Tác giả, cộng tác viên, AI, client, nhãn `admin/publisherApproved` không được thêm role, proof, EXP, Xu hoặc quyền. Không nhận `operatorRequest` từ input. `request` phải được fixture host xác thực; quyền reviewer và lịch sử người đóng góp do G1L kiểm ngay tại commit.

1. G1L xác nhận `snapshotHash/revision/accessRevision`, tính toàn vẹn và các dependency nguồn/ảnh, tách người duyệt với owner/collaborator/contributor từng tham gia; ghi bản review **append-only**, operation receipt và audit trong **một giao dịch**. `request_changes` giữ phản hồi trong G1L để owner `reopenDraft` và gửi revision mới; review cũ không được sửa lại.
2. G5B đọc lại từ SQL các hàng operation, audit, review, header và xác minh đúng actor/decision/request digest/snapshot hash; không lấy JSON trả về từ client hoặc lời AI làm bằng chứng review đã ghi. Sai attestation thì fail-closed.
3. Chỉ với `approve` **và** review vẫn là revision hiện hành, G5B gọi G1Y bằng request operator **riêng của fixture** sau khi G1L commit. G1Y phải trả đúng `worldId`, `snapshotHash`, `gateVersion='world-release-1'`. Source held (G1X), permit bị revoke/missing (G1R), asset mất quyền hoặc snapshot cũ đều khiến `fixtureGateEligible=false`, **kể cả khi G1L đã duyệt từ trước**. G5B không xóa review lịch sử, không phục hồi giấy phép khi notice được giải tỏa.
4. Với `request_changes`, G5B không gọi G1Y; với replay G1L, G5B kiểm quyền hiện tại và ghi nhận historical receipt, **không lặp audit**. Một bản duyệt cũ sau khi owner mở revision mới không còn là review hiện hành.

Kết quả thử có `moderationRecorded` (hàng review/receipt/audit được kiểm chứng trong fixture), `fixtureGateEligible` (G1Y trả đủ điều kiện **tại thời điểm đọc**), `currentReview` và mã kết quả. **Mọi kết quả** luôn giữ:

`fixtureOnly:true`, `readyForStaging:false`, `productionAuthorized:false`, `published:false`, `publisherAuthorized:false`, `legalRightsVerified:false`, `contentLabelsVerified:false`, `deviceVerified:false`, `missionCompleted:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`.

`review note` và các đoạn truyện riêng tư nằm trong SQL G1L, không đưa vào báo cáo G5B. G5B luôn nhắc `human-content-label-review-required`, `legal-and-asset-license-review-required`: **contentTags/dangerLevel trong JSON là nhãn đề nghị**, giấy phép/ảnh trong fixture không chứng minh quyền sở hữu ngoài đời. G1L `approve` cũng không phải một phê duyệt độc lập cho pháp lý hoặc mức tuổi. Chưa có bộ phân loại tuổi/nội dung được Du chốt; G5B không tự sinh policy hoặc cho AI xác nhận.

## 2. Bất biến, race và những giới hạn không được che giấu

- Không được gọi G1Y trước G1L rồi giữ kết quả cũ: G1Y yêu cầu `approved` hiện hành. G5B cố ý gọi G1Y **sau** khi quyết định review bền vững. Giấy phép hoặc notice có thể đổi **sau** lần G1Y đọc; kết quả này không phải khóa/certificate giao dịch xuyên G1L/G1Y/Firestore. Host publish/staging thật phải có quyền reviewer/operator/publisher do issuer tin cậy và kiểm quyền lại tại điểm ghi tương ứng.
- `moderationRecorded:true` có thể đi kèm `fixtureGateEligible:false`, ví dụ notice được mở sau approval, permit G1R bị thu hồi, asset bị revoke hoặc approval trở thành lịch sử. Không cố xóa audit hoặc rollback review hợp lệ chỉ để làm đẹp báo cáo.
- Cùng `requestId`/payload trả receipt cũ; cùng requestId với payload/decision khác bị G1L từ chối. Hai reviewer tranh nhau một revision chỉ một quyết định được ghi; lỗi chèn audit rollback header/review/receipt cùng transaction. Không tự tạo “publisher decision” mới, không nâng `approved` thành `published`.
- G5B không xác minh review thật của người ngoài fixture, ownership V49/Firestore, license pháp lý ngoài đời, artwork mobile/device QA, kết quả chơi/ending, arc lineage, rewards hoặc khả năng phát hành. Không chấp nhận G5A `syntheticPreflightPassed` làm quyền. Không mở 48 seed, Quan Đạo production, NPC AI, Kho/EXP/Xu, Thiên Mệnh, Chủ Thần, Thư viện hay EPUB.

## 3. Kiểm thử và tiếp nối

`cloudflare/tests/vangioi-g5b-moderation-rehearsal.test.mjs`: **14 ca tích hợp SQL thật trong RAM**, bao gồm reviewer độc lập/đã từng đóng góp, owner/admin/AI giả, feedback & reopen, replay/idempotency, hai quyết định cùng revision, revoke quyền reviewer trong cửa sổ commit, notice trước/sau review, revoke G1R không được gỡ bằng notice, legacy không permit, revoke ảnh, reader G1Y lỗi/forged/stale, audit rollback và cách ly khỏi Worker/Creator/HTTP. Giữ tất cả test G1L/G1X/G1Y/G4/G5A cùng hồi quy toàn dự án.

**Bàn giao G5C:** lắp candidate + manifest scene/asset/arc với dependency graph phiên bản nguồn và thử tuyến nhập vai/ảnh mobile trong fixture; tạo pilot tác giả **chơi thử offline** chỉ sau khi đã thống nhất scope gameplay, không coi G5A/G5B là quyền phát hành. Phần nối arc/parent ending/NPC memory phải có chứng cứ riêng, không suy từ lời tác giả. Chưa kết nối Firebase staging thật cho đến khi Du duyệt G2J topology/IAM.

**Rollback:** revert module fixture G5B, 14 test và liên kết tài liệu. Không có bảng mới, migration, endpoint, dữ liệu live hoặc quyền được cấp. Nếu về sau có tích hợp live, phải thiết kế deny-all khi thiếu G1Y, không rollback xóa cổng kiểm quyền.
