# DUDU Studio — KẾ HOẠCH G5 VẠN GIỚI: review, staging, publish và rollback

**Ngày lập:** 28/10/2026. **Trạng thái:** **KẾ HOẠCH ĐỀ XUẤT — CHƯA TRIỂN KHAI G5, CHƯA PHÊ DUYỆT KẾT NỐI HỆ THỐNG THẬT.** Căn cứ [G4_OFFLINE_CLOSEOUT_2026-10-28.md](G4_OFFLINE_CLOSEOUT_2026-10-28.md), quy chuẩn V0.1 (mục IV, VII, IX), G1L/G1Y, G2J/G2X, G3C và G4A–I. Đây không phải mệnh lệnh đổi production hay chính thức hóa mọi đề xuất Canon của V0.1.

## 1. Đích đến đúng phạm vi

G5 phát triển **quy trình từ bản thế giới được tác giả soạn → kiểm tra → review → bản thử staging → quyết định publish/retire có thẩm quyền**. Mỗi world có câu chuyện, arc, NPC, vai nhập, thể loại và cơ chế chơi riêng; sáu thể loại không phải sáu world. World Creator tiếp tục nằm ở **VẠN GIỚI**; ứng dụng người chơi **THIÊN MỆNH** và khu vực riêng **CHỦ THẦN** không bị gộp.

Phân biệt chặt ba cấp độ:

1. **Release candidate offline:** một bản nội dung/version/hash đủ thông tin để kiểm tra, **chưa được duyệt**.
2. **Staging synthetic:** môi trường cách ly kiểm logic/quyền/revoke/rollback, **chưa có quyền phát hành hoặc cấp thưởng**.
3. **Production publish:** cần issuer/role/permit/license/asset/quyền truy cập/QA thực và **phê duyệt riêng**. Không suy ra từ CI, hash, bảng client, `approved` hay staging PASS.

Không dùng kết quả G4F `dryRunCommitted`, G4E `reviewCandidate` hoặc G4G `consistent` để tự đặt `published`, `missionCompleted`, `rewardAuthorized` hay chuyển vật phẩm vào Kho.

## 2. Lộ trình chia theo đợt nhỏ, có điều kiện dừng

| Đợt | Mục tiêu/đầu ra | Chứng cứ nghiệm thu tối thiểu | Quyền cần và giới hạn |
| --- | --- | --- | --- |
| **G5A — Release Candidate Contract** | Schema sidecar **offline** ghim `worldId`, snapshot/content/source/asset version+hash, arc, entry profiles, kiểm G1L/G1Y/G3C/G4; phân biệt lỗi chặn và cảnh báo | Unit: thiếu/sai pin, source held/revoked, profile không có đường, asset thiếu quyền, actor tự khai role/publisher, world nhiều arc; không viết DB/đổi Canon | **Được đề nghị làm đầu tiên**, không tạo `published` hoặc API |
| **G5B — Moderation & review rehearsal** | Diễn tập tách tác giả, cộng tác viên, reviewer, operator, publisher; kiểm bản quyền/notice, nhãn nội dung, phản hồi và quyết định bất biến; tái dùng G1L/G1X/G1Y | Người gửi không tự duyệt; AI chỉ đề xuất; stale review/source/license/ảnh bị chặn; mọi action có actor/receipt/audit | Chỉ fixture/test host, không cấp role Firebase hoặc mở Creator submit live |
| **G5C — Isolated staging assembly** | Đóng gói candidate cùng manifest scene/asset/arc theo nội dung đã có, mô phỏng build và G3A/G3B/G3C + G4 test | Không bắt truyện dài nhập mọi chương; thiếu arc/source pin/asset fallback, lỗi đường nhập vai, schema cũ, version conflict và negative permissions đều có test | Emulator/fixture synthetic; **chưa tạo Firebase staging thật** nếu chưa chốt G2J project/database/edition/location/IAM |
| **G5D — Versioning, save compatibility & recovery plan** | Thiết kế migration/rollback nhiều version/arc; phương án backup **G4I journal** (G4H v2 nếu được duyệt), provenance/antirollback, revoke-wins và gói khôi phục | Ma trận save cũ/mới, interrupted restore, tamper/rollback, stale license, re-admission và không cấp thưởng lặp | Chỉ plan/fixture; không migration production hay sửa save người chơi |
| **G5E — Publish/retire dry-run** | State machine đề xuất `draft → submitted → inReview → approved → staged → published → retired`, releaseId/signature policy và emergency hold/retire; kiểm lại G1Y tại thời điểm commit | Hai publisher request đồng thời, replay receipt, source revoke ngay trước quyết định, stale assets/hold, rollback, fail-closed; mọi `published` chỉ là **fixture label** | Chưa có route hoặc service thật, chưa chuyển world sang chơi được |
| **G5F — Security/release go–no-go** | Kiểm IAM/Rules/source reader/privileged writer, quota, log riêng tư, mobile/desktop QA và runbook rollback; lập biên bản quyết định | CI mới, browser & thiết bị thật, phép thử revoke/outbox/restore, review pháp lý/ảnh, người duyệt và phương án dừng khẩn | **Cổng phê duyệt riêng của An Du** trước mọi staging thật/production |

**Trình tự phụ thuộc:** G5A → G5B → G5C → G5D → G5E → G5F. Một đợt chỉ mở sau khi đợt trước có test/handoff; G5A không ngầm cho phép G5B–G5F hoặc đăng nhập backend thật. Có thể tách G5D thành nhiều batch khi đo rõ rủi ro, không xây hệ thống backup production trong một commit.

## 3. Release candidate tối thiểu (đề xuất sidecar; chưa khóa schema)

- **Identity/pins:** `worldId`, `contentVersion/contentHash`, authoring `snapshotHash/revision`, `sourceKind/storyId/storyVersion/sourceHash`, `arcId/arcVersion` khi dùng arc; không yêu cầu nhập 1.000 chương cùng lúc. Truyện đã có trong Thư viện được tham chiếu theo quyền, không đăng lại.
- **Rights/moderation:** tham chiếu quyết định G1L reviewer độc lập, permit G1R, notice G1X, kiểm G1Y hiện hành và asset grants; các flag `ownerVerified/publisherApproved` từ JSON tác giả **không phải** quyền.
- **Quality:** kết quả G3C, reachability theo từng `playerEntryProfile`, visual/mobile QA, lỗi/warning có evidence; ba kiểu `cast_possession/system_cover/native_extra` là hỗ trợ tùy world, không ép truyện nào phải có cả ba.
- **Runtime & reward:** ghi rõ G4A–I chỉ mô phỏng. Candidate không mang token cấp EXP/Xu/item, không tự bật NPC AI, không sử dụng văn bản kịch bản hoặc ảnh làm bằng chứng phát thưởng.
- **Operation:** nội dung immutable có định danh release **đề nghị**, danh sách version/compatibility, rollback/retire plan và lý do gắn audit. `releaseId` thật chỉ do issuer/publisher server cấp sau cổng duyệt.

Không thêm các trường trên trực tiếp vào `world-content-1` hoặc migration chỉ vì tài liệu kế hoạch nêu tên; phải thử sidecar và đối chiếu schema hiện hành trước khi quyết định.

## 3A. Bổ sung G5A: hợp đồng tiếp diễn nhiều phần và nhánh người chơi (đề xuất chờ duyệt)

**Lý do bổ sung trước khi khóa Release Candidate Contract:** G1N đã có `arcId` và source pin nhưng ghi rõ *chưa có phụ thuộc/continuity giữa arc*. G5A hiện chỉ pin arc/version. Nếu phát hành phần 2 trước khi định nghĩa quan hệ với kết quả phần 1, có nguy cơ phá save, ký ức NPC và hiệu ứng cánh bướm. Phần này chỉ bổ sung **điều kiện kiểm định ứng viên phát hành ở mức offline**, không bật gameplay, Phán Tử hay Tái Xuyên.

### A. Ba loại liên kết tác giả được khai theo từng phần/arc

- **`direct_continuation` — Tiếp diễn trực tiếp:** phần sau chỉ mở từ **một nhánh phần trước đã hoàn thành hợp lệ** với `endingId` được tác giả cho phép; thất bại nhiệm vụ chính ở phần trước **không mở được phần sau của nhánh đó**. Khi phần mới được công bố, nhánh đã hoàn thành trước đó không phải chơi lại hay mua vật phẩm chỉ để nối tiếp.
- **`canon_bounded_continuation` — Tiếp diễn có mốc nguyên tác:** vẫn yêu cầu phần trước đã hoàn thành hợp lệ; tác giả xác định những mốc không thể tự ý đổi và tập biến số được phép kế thừa (quan hệ, NPC, vật chứng, sự kiện). AI không được hồi sinh NPC hoặc xóa hậu quả chỉ để ép truyện về nguyên tác.
- **`standalone_same_universe` — Ngoại truyện độc lập:** nếu tác giả xác nhận độc lập, có thể khởi đầu theo lịch sử mặc định đã khai, không giả vờ NPC từng gặp người chơi. Không tự đánh dấu một phần tiếp nối bắt buộc là độc lập để né prerequisite.

Đối với hai loại tiếp diễn, **người chơi được chọn một nhánh hoàn thành hợp lệ** để tiếp tục; không tự động lấy nhánh đạt hạng cao nhất hoặc mới nhất. Nhánh được chọn phải được pin khi bắt đầu phần sau, không trộn sự kiện/quan hệ/ký ức từ các lượt xuyên khác.

### B. Các liên kết/kiểm tra dành cho sidecar G5A, không sửa `world-content-1` ngay

- **Định danh nội dung:** tái sử dụng `worldId`, `storyId`, `arcId`, `contentVersion/contentHash`, `arcVersion` và `endingId` bất biến theo snapshot; cho phép đề nghị `continuationMode`, `prerequisiteArcIds`, `acceptedEndingIds`, `carryForwardFactKeys`, `canonAnchors` và chính sách chọn nhánh dưới dạng **sidecar candidate**, chưa ấn định schema runtime.
- **Định danh lượt chơi:** sau này cần tham chiếu riêng `playerUid/KC-ID`, `worldInstanceId`, `playthroughId` và `lineageId` để không lẫn cùng một NPC qua nhiều thế giới, lượt xuyên hoặc dòng thời gian. Tên NPC/nhân vật không phải khóa; danh tính nhân vật ổn định xuyên arc chỉ khi tác giả liên kết rõ.
- **Trạng thái tiếp diễn:** kiểm `endingId` hợp lệ, tiền đề nhiệm vụ chính và những fact quan trọng thực sự đã được engine xác nhận; không suy ra hoàn thành từ văn bản/AI, rating cao hoặc client-provided `completed=true`.
- **Ký ức NPC:** chỉ chuyển sự kiện NPC có thể biết từ **nhánh đã chọn**. NPC chết/biến mất/không thể tham gia không được tự xuất hiện ở phần sau; nếu tiếp diễn yêu cầu NPC đó, tác giả phải cung cấp nhánh xử lý hoặc từ chối eligibility minh bạch.
- **Tính khả thi:** author khai rõ nhánh nào tiếp tục được và nhánh nào kết thúc vĩnh viễn; không bắt một tác giả viết vô hạn nhánh. Với một `acceptedEndingId` đã công bố là chơi tiếp được, thiếu đường tiến hợp lệ là **lỗi chặn release**; ending không hỗ trợ phải thể hiện quyền truy cập bị khóa, không âm thầm thay lịch sử.
- **Truyện phát hành sau:** snapshot phần trước không bị thay khi tác giả ra phần 2, tiền truyện hoặc sửa nguồn; kiểm migration/diff, version pins và quyền nguồn trước khi nối nhánh.

### C. Phân chia công việc và test cần bổ sung đúng giai đoạn

| Đợt | Bổ sung kiểm thử/đầu ra | Giới hạn |
| --- | --- | --- |
| **G5A** | Đặc tả + validator offline cho quan hệ arc/ending, `continuationMode`, parent pin và nhánh được chọn; case fail phần 1 không mở phần 2, B/S đều được chọn nếu eligible; từ chối dangling prerequisites, ID trùng/không ghim | Không chạy story engine hoặc công nhận save |
| **G5C** | Mô phỏng 3 loại liên kết; kiểm đường đi của từng `acceptedEndingId`, NPC vắng mặt/đã chết, không rò ký ức giữa nhánh, nguồn/asset thiếu và thay thế có phép | Synthetic staging, không nối NPC AI thật |
| **G5D** | Ma trận save/version và lineage khi phần mới phát hành muộn; pin lựa chọn của player, không trộn replay, không ghi đè lịch sử khi tác giả thêm tiền truyện hoặc đổi canon | Không migration production |
| **G5E–F** | Publish gate chặn ứng viên tuyên bố nối tiếp nhưng thiếu đường hợp lệ; kiểm QA và quyền phát hành/sửa/retire theo từng phiên bản | Không dùng PASS fixture làm quyền publish |

### D. Quyết định gameplay phải xử lý ở đề án runtime riêng, không lẫn G5 release

Yêu cầu hiện hành từ chủ dự án cần được ghi vào **Decision Log/đề án gameplay riêng** trước khi xây gameplay thật: thất bại chính thức tích lũy dẫn tới **Phán Tử/thu hồi Thiên Mệnh** khi vượt ngưỡng; sau thất bại thế giới kế tiếp do Thiên Mệnh điều phối, không mua vật phẩm để trở lại ngay; Tái Xuyên là đặc quyền hữu hạn để khám phá/cải thiện kết quả, không xóa mã thất bại; tác giả không tự cấp vật phẩm, Xu/EXP hoặc quyền đảo ngược thế giới; kết cục và các phát thưởng phải idempotent. **Chưa khóa** đơn giá Xu, giới hạn tái xuyên 3/9 tính thế nào, quyền tái nhập từng loại kết cục, ngoại lệ cổng tân thủ và issuer/server của các hành động đó. Không implement những trường/flag đó trong G5A hoặc coi lời kể là reward proof.

**Điểm cần đối chiếu Canon:** quy chuẩn V0.1 mục “Cổng tân thủ” hiện *đề xuất* ba F đầu thử lại hợp lý, chưa mất tài khoản vĩnh viễn. Luật Phán Tử mới của An Du cần được xác nhận cách áp dụng riêng cho ba F trước khi runtime ra mắt; không âm thầm xóa đoạn cũ hay suy ra đã có miễn trừ.

## 4. Quyết định An Du cần chốt theo đúng thời điểm

| Thời điểm | Quyết định | Mặc định khi chưa chốt |
| --- | --- | --- |
| Trước G5A | Chấp thuận phạm vi **contract/fixture offline** và thuật ngữ `releaseCandidate` | Chỉ lập/test đề xuất; không tạo publish action |
| Trước staging thật | Project Firebase tách biệt, database/edition/location, synthetic data, IAM/operator, retention/chi phí | **Không kết nối** Firebase staging/production; dùng Emulator/SQLite độc lập |
| Trước mở review/publish thật | Ai bổ nhiệm reviewer độc lập, publisher/operator, tiêu chí copyright/license/ảnh, xử lý source V49 bị sửa/gỡ | Không cấp role, không đổi trạng thái `published` |
| Trước gameplay/reward thật | Proof từng loại objective/ending theo world, chính sách Xu/EXP/item/Kho, issuer và sổ grant idempotent xuyên storage | Không phát thưởng, không ghi save game thật, không công nhận 3 nhiệm vụ F |
| Trước release | Quy trình kiểm thiết bị, xét duyệt nội dung, revoke/takedown, backup/restore, antirollback, emergency kill switch, migration/rollback | **NO-GO** dù CI và Pages xanh |

Không cần quyết định ngân sách thưởng/Firestore instance để **thiết kế G5A offline**. Các lựa chọn ấy phải hỏi lúc thực sự chuẩn bị mở quyền hoặc hạ tầng tương ứng, không tự bịa để làm mẫu pass.

## 5. Cổng NO-GO và quy tắc vận hành

- **NO-GO** nếu source/permit/license/asset có hold/revoke, reviewer có xung đột lợi ích, thiếu chứng cứ quyền nội dung, hoặc sự kiện AI/client tự nhận hoàn thành/duyệt/thưởng.
- **NO-GO** nếu chưa có trusted issuer, replay/idempotency thật cho save/reward, outbox/synchronization/revocation across stores, backup/rebind G4I được bảo toàn, hoặc deployment staging/production chưa được phân quyền.
- **NO-GO** nếu giao diện World Creator hiển thị một nút gửi duyệt/phát hành không hoạt động hoặc lối vào world chơi thật trước khi backend được nghiệm thu; ưu tiên ít nút, thao tác thiết yếu.
- **NO-GO** nếu chưa có kiểm thử mobile/desktop phù hợp, fallback ảnh an toàn, quyền riêng tư và runbook khôi phục/retire đã được phê duyệt.

Mỗi đợt phải kiểm HEAD, chạy unit/regression, dry-run và CI theo SHA, có rollback an toàn; phân biệt **đã viết code / CI đạt / Pages deploy / có backend staging thật / đã publish production**. Không thay đổi Firestore Security Rules, tài khoản, EPUB/Thư viện, Chủ Thần, Thiên Mệnh, NPC AI, 48 seed, Canon hay economy ngoài phạm vi đã duyệt.

**Điểm bắt đầu đề xuất:** G5A có thể là một đợt kỹ thuật offline nhỏ trong lần trao đổi tiếp theo, dựa trên ba tài liệu `QUY_CHUAN_TAC_GIA_THE_GIOI_V0_1.md`, `STAGING_TOPOLOGY_AND_ACCESS_G2J.md` và `G4_OFFLINE_CLOSEOUT_2026-10-28.md`. **G5 hiện vẫn là kế hoạch, không có quyền release.**
