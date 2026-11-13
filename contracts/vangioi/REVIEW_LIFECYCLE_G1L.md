# VẠN GIỚI — Review, mở lại nháp và QA vật phẩm G1L

Ngày 26/10/2026. Nền `c575acbf988548eb76ad0192ce15dd7782876272` (G1K, CI/Pages SUCCESS). Đợt này làm tuần tự: lifecycle backend đang xây → thiết kế yêu cầu mới → sửa lỗi pilot Quan Đạo. Không viết lại kiến trúc hoặc bật production backend.

## Đã triển khai và kiểm thử cục bộ

Mở rộng `createSqlAuthoringService` và HTTP adapter G1K hiện có. Thêm bảng `vg_authoring_reviews_v1`, append-only, một quyết định cho mỗi world/revision; chưa chạy schema init/migration trên dữ liệu production. Dùng lại worlds/drafts/submissions/members/receipts/audit và transactionSync, không thay bảng/schema cũ hoặc snapshot đã gửi.

| Thao tác service | Input ngoài worldId/requestId | Điều kiện và kết quả |
|---|---|---|
| reviewSubmission | expectedRevision, expectedAccessRevision, snapshotHash, decision, note | Reviewer độc lập, đúng snapshot hiện hành; approve → approved, request_changes → inReview |
| reopenDraft | expectedRevision, expectedAccessRevision, snapshotHash | Chỉ owner, bản submitted/inReview/approved; copy snapshot thành revision+1 draft |
| viewReviewDecision | worldId, snapshotHash | Quyền đọc bản gửi; owner/reviewer/publisher nhận quyết định, collaborator không nhận ghi chú biên tập |

`decision` chỉ `approve` hoặc `request_changes`; note bắt buộc 1–4000 ký tự có nội dung. Không thêm action publish/reward/official rank. Chưa thêm quyết định reject vĩnh viễn hoặc công cụ cấp role/entitlement. Một bản đã có quyết định cần owner mở lại và gửi revision mới trước lần duyệt tiếp; không sửa quyết định cũ tại chỗ.

Reviewer không được là owner, collaborator đang active hoặc bất kỳ contributor lịch sử nào, kể cả đã rời nhóm. Backend đọc membership thật và kiểm lại tại commit; claim admin, request JSON hoặc AI không cấp quyền. Reviewer/publisher hiện vẫn được provision riêng ở dữ liệu server, không có UI cho tác giả tự cấp.

Approve xác minh hash snapshot, chạy validator semantic-2 hiện hành và kiểm lại quyền source/asset, pin các dependency rồi đọc lại trong transaction. Bản ghi review lưu validatorVersion riêng; snapshot cũ giữ version/hash ban đầu. **Approve là chấp thuận nội dung ở tầng review**, không duyệt art, license ngoài đời, staging hoặc mở world. Asset pending vẫn không thành approved; không trả canPublish/WORLD_PLAY. Publish tương lai phải kiểm lại toàn bộ cổng và quyền tại thời điểm thực hiện.

Request_changes khóa nháp cho đến owner reopen. Owner cũng có thể rút bản submitted hoặc mở lại approved để sửa: revision mới trở về draft, không kế thừa quyết định approve sang nội dung mới. Contributor history/IDs được giữ; bản gửi và quyết định cũ vẫn đọc được theo quyền. Snapshot cũ không còn là bản review hiện hành khi revision đã tăng.

Mutation ghi header, decision/new draft, operation receipt và audit trong cùng transaction; rollback toàn bộ khi lỗi. UUID+canonical request hash chặn ghi lặp và tái dùng UUID với payload khác. Retry đúng receipt chỉ xác nhận hành động lịch sử, không kéo trạng thái hiện tại về approved/draft cũ. Replay vẫn cần quyền hiện tại, không bypass membership bị thu hồi.

### HTTP thêm vào adapter độc lập

Sau prefix `/api/vangioi/authoring/v1`:

- POST `/worlds/:worldId/submissions/:snapshotHash/decisions`: decision body như bảng, identity lấy từ URL.
- GET cùng path: đọc quyết định hoặc review=null khi chưa có; không leak nội dung ngoài scope.
- POST `/worlds/:worldId/submissions/:snapshotHash/reopen`: reopen body như bảng.

Giữ nguyên giới hạn bytes, Origin/Bearer, lỗi kín/no-store của G1K; thêm review-conflict → 409. HTTP module vẫn chưa import Worker live/DO/binding hoặc cấu hình endpoint cho Creator. Nút gửi duyệt ở Vạn Giới vẫn khóa và local-only; Chủ Thần không thành khu biên tập truyện.

## Thiết kế mới, chưa triển khai

Đọc [EXPANSION_DESIGN_G1L.md](EXPANSION_DESIGN_G1L.md): quy chuẩn vật phẩm (sổ tay/world inventory/Kho, entity/cơ hội/receipt, ngoại lệ thời đại và sức mạnh); năm mô-đun gameplay tùy chọn; source pin và chuyển thể theo arc với hai chế độ thủ công/hỗ trợ. Tài liệu ghi xung đột với hướng dẫn tân thủ cũ, phương án versioned sidecar/contract mới và thứ tự triển khai. Không đổi world-content-1/additionalProperties, không tự migrate save, không cài catalog hoặc hệ kinh tế giả.

## Đã sửa lỗi Quan Đạo độc lập

Nguyên nhân: `check_coal_bin` luôn mở và dẫn tới đoạn “dưới lớp than…” dù evidence đã có. Engine V1 vốn deduplicate mảng evidence nên không nhân phần tử trong sổ tay, nhưng vẫn chấp nhận thao tác/event và kể như tìm túi lần đầu. Đây là lỗi trạng thái/trình bày; không có item thật từng được phát.

Sửa nhỏ ở adapter V2B và kịch bản hiện tại:

- Thêm rule tùy chọn `hiddenIfEvidence`, được validator kiểm và `decide` thực thi cả khi gọi trực tiếp action ẩn. V1 giữ nguyên.
- Nhặt túi chỉ khi chưa có `medicine_bundle`, thêm once để bảo vệ cùng choice. Các tuyến A Liên, nhà kho hoặc quay lại bếp đều dùng chung identity chứng cứ này.
- Khi đã nhận, bếp có “Kiểm tra lại túi thuốc đang giữ”, không gainEvidence hoặc acquisition lần nữa. Đoạn túi kể là đang giữ, giữ đường xem phiếu cấp cứu/nút dây kể cả sau khi đã ghi sổ tay. Lời nhắc không còn yêu cầu đi tìm túi khác.
- Không đổi missionId/scenarioId hoặc session key; scenarioVersion 9 → 10 và cache query của hai script được tăng trên index/standalone. V8 state cũ có evidence vẫn restore và chặn lặp ngay cả khi thiếu once marker mới. Không sửa history đã lưu, nhập save V7 hoặc di trú dữ liệu thật.

Đây chỉ là sửa pilot sử dụng evidence marker, không phải engine entity/acquisition/inventory tổng quát. Production chống double-spend/đa thiết bị cần transaction/ledger server theo thiết kế; không coi local sessionStorage là authority. Không thêm ảnh/cảnh, nhiệm vụ thật, thưởng, Kho, AI hoặc hệ kinh tế.

## QA và bàn giao

12 test G1L mới trong HTTP/SQLite suite: approve/changes/reopen/resubmit, snapshot/history/pins, owner/contributor/reviewer, concurrent decision/retry, revoke/access change, source/asset dependencies, rollback decision/reopen, lịch sử replay. Cộng với 13 G1K và toàn bộ hồi quy Worker/helper. 5 test pilot mới: ba cách tiếp cận, truy cập trực tiếp action bị ẩn, save/restore cũ và hai action chung identity.

Browser mới `tests/browser-quan-dao-items.cjs`: trang standalone thật, thao tác UI qua A Liên và nhà kho, nhặt một lần, quay bếp, reload cùng session, quay qua tuyến khác, kiểm tra phiếu/nút dây, cả hai lượt giải án; responsive 320/375/390/430/1280; external requests=0. Đã thêm vào bước browser acceptance CI. Hồi quy cũ `tests/dudu-core-v2b.cjs` giữ cả hai tuyến chứng minh sổ chìa/nút dây, chín kết cục, không thưởng.

Bộ phù hợp: 486 tests ứng dụng + 379 Worker/helper, legacy Quan Đạo, browser pilot và hồi quy main/auth/Creator; kết quả remote xem CI/Pages theo commit đợt này. Chưa smoke account Firebase/Worker live hoặc thiết bị Android/iOS thật. Không tuyên bố unit/browser test là production backend.

Tiếp: contract/policy vật phẩm chuẩn và đề xuất riêng, sau đó arc/source picker và UI sáng tác gọn; chỉ triển khai cơ chế cần cho truyện. Các cổng host/issuer/storage topology/limits/migration/staging/deploy của G1K chưa bị bỏ qua. Không mở phó bản playable mới trước khi QA pilot ổn định. Không tự triển khai toàn bộ gameplay modules.

Rollback: revert phạm vi G1L. Bảng review chỉ được khởi tạo trong tests/adapter local; không có dữ liệu production cần xóa. Pilot state V8 vẫn cùng cấu trúc; ID/evidence/đường phá án giữ nguyên. Không đụng auth, Thiên Mệnh, EPUB, NPC AI, Kho/EXP thật, Canon hoặc pool/48 seed.
