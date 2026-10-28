# DUDU Studio — KẾ HOẠCH G5 VẠN GIỚI: review, staging, publish và rollback

**Ngày lập:** 28/10/2026. **Trạng thái:** **LỘ TRÌNH ĐỀ XUẤT — G5A/G5B/G5C ĐÃ CÓ FIXTURE OFFLINE, G5D–G5F CHƯA TRIỂN KHAI; CHƯA PHÊ DUYỆT KẾT NỐI HỆ THỐNG THẬT.** Xem [G5A](G5A_OFFLINE_RELEASE_CANDIDATE.md), [G5B](G5B_OFFLINE_MODERATION_REHEARSAL.md) và [G5C](G5C_SYNTHETIC_STAGING_ASSEMBLY.md). Căn cứ [G4_OFFLINE_CLOSEOUT_2026-10-28.md](G4_OFFLINE_CLOSEOUT_2026-10-28.md), quy chuẩn V0.1 (mục IV, VII, IX), G1L/G1Y, G2J/G2X, G3C và G4A–I. Đây không phải mệnh lệnh đổi production hay chính thức hóa mọi đề xuất Canon của V0.1.

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

**Tiến độ:** G5A `eb09fc90` hoàn thành candidate offline; G5B `8cc63e3` diễn tập moderation bằng G1L/G1X/G1Y fixture (14 test); G5C dựng **chỉ mục staging synthetic** từ candidate G5A, image/path G3C, G4A và parent arc/ending pin (15 test), **không playable, không staging thật**. Tiếp theo G5D version/save/recovery/lineage fixture; **G5 chưa có quyền release**.
