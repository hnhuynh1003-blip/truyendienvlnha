# VẠN GIỚI — Quyền theo world và bản gửi duyệt Giai đoạn 1B

Ngày 26/10/2026. Nền đối chiếu: `4ad5d73f6c1ee8d0502ae893b9b6497c21dc8fba`.

Đợt này triển khai module backend độc lập `cloudflare/src/vangioi-authoring.mjs` và kiểm thử. Module **chưa được import bởi Worker đang chạy**, chưa có HTTP route, database, migration hoặc UI. Các hàm chuẩn bị tạo kế hoạch ghi dữ liệu; chưa có thao tác lưu hoặc khóa nháp thật.

## Ranh giới quyền

`createAuthoringService` nhận adapter chỉ do server cung cấp. Mặc định dùng `verifyFirebaseIdToken` hiện hữu, kiểm subject/issuer/audience/chữ ký. Không đọc role, ownerUid, membership, validation hay status từ request body làm bằng chứng. Không cấp Firebase admin cho tác giả độc lập; ngay cả JWT admin thật cũng không tự vượt quyền world trong module này.

| Vai từ dữ liệu server | Đọc nháp | Sửa nháp | Gửi duyệt | Đọc bản gửi | Xét duyệt |
|---|---|---|---|---|---|
| Khách / reader không được cấp quyền | Không | Không | Không | Không | Không |
| Owner của world | Toàn bộ | Các mục nội dung khi state=draft | Có | Toàn bộ | Không tự duyệt |
| Collaborator đang active | Các mục được giao | Chỉ các mục được giao, khi draft | Không | Các mục được giao | Không |
| Reviewer được cấp cho world | Không đọc nháp làm việc | Không | Không | Toàn bộ bản gửi | Khi không là owner/collaborator/người đã đóng góp |
| Publisher được cấp cho world | Không đọc nháp làm việc | Không | Không | Toàn bộ bản gửi | Không tự có vai reviewer |

Publisher hiện chỉ là quyền đọc bản gửi theo contract này. **Không có hành động publish/reward/grant trong module.** Quyền quản trị quyền, mời cộng tác, moderation và cấp publisher phải được triển khai riêng ở backend; không thể gửi một membership trong JSON để tự cấp.

Những vai được đề xuất trong bộ V0.1 được hiện thực ở mức policy thử nghiệm, chưa thay role/admin trong ứng dụng hiện tại. Không đổi lore, bậc F–S, luồng hộ chiếu, pool hệ thống hoặc quyền tác giả thật đang tồn tại. Chưa mở đăng ký AU ngoài cộng đồng.

## Bản ghi mà adapter tương lai phải cung cấp

Đây là hình dạng logic, chưa phải các bảng đang tồn tại:

```js
world = {
  worldId, ownerUid,
  draftRevision,       // số nguyên an toàn, >=1
  accessRevision,      // tăng mỗi khi đổi owner/membership/scope
  draftState,          // draft | submitted | inReview | approved
  contributorUids     // lịch sử người đóng góp, không xóa khi họ rời nhóm
};
membership = {
  worldId, uid, status: 'active',
  roles: ['collaborator'], // collaborator | reviewer | publisher
  editSections: ['scenes', 'views']
};
draft = {worldId, revision, state: 'draft', content};
```

- Không dùng alias hệ thống, tên hiển thị hoặc authorId tự khai thay Firebase UID.
- Adapter `readWorld`, `readMembership`, `readDraft`, `readSubmission` chỉ đọc dữ liệu server. Không lấy object từ client rồi truyền thẳng như kết quả repository.
- World/member thiếu, revoked, sai UID/world hoặc scope không hợp lệ phải bị từ chối. Không tìm thấy world và không có quyền đều trả `forbidden` ra ngoài để hạn chế dò danh mục riêng.
- Các mục được giao là các khóa cấp đầu của content, không phải path JSON tùy ý. Giao `story` cho cộng tác viên nghĩa là họ được đọc cả Story Bible, bao gồm secretTruth. Không giao mục ấy nếu họ không có quyền thấy bí mật.
- Content giữ riêng với metadata quyền/vòng đời. `worldRank` của V0.1 phải đi qua đối chiếu 1A; content mới dùng `requestedWorldRank`, chưa có officialWorldRank. Không tự chuyển toàn bộ V0.1 thành contract mới trong đợt này.

## Các hàm đã có

| Hàm | Kết quả |
|---|---|
| `authorize(request, {worldId, action, sections})` | Kiểm quyền; không thực thi hành động. Chỉ hỗ trợ read/edit/submit draft và read/review submission. |
| `viewDraft(request, {worldId})` | Đọc nháp qua repository, lọc đúng scope; kiểm lại quyền trước khi trả dữ liệu. |
| `prepareDraftEdit(request, {worldId, expectedRevision, patch})` | Lấy scope từ khóa patch thật; trả nextDraft revision+1 và preconditions cho transaction tương lai. Không dùng danh sách sections client tự khai để cho phép patch. |
| `prepareSubmission(request, {worldId, expectedRevision})` | Kiểm owner/state/revision, gọi validator bắt buộc, tạo snapshot bất biến và header submitted dự kiến. |
| `viewSubmission(request, {worldId, snapshotHash, forReview})` | Chỉ đọc snapshot từ repository có quyền; kiểm hash, scope và đúng revision hiện hành khi xét duyệt. |
| `verifySubmissionIntegrity(snapshot)` | Kiểm cấu trúc/hash nội bộ. Không xác minh danh tính, chữ ký, quyền sở hữu hoặc điều kiện publish. |

`prepareDraftEdit` thay nguyên một mục nội dung ở cấp đầu, không diễn giải JSON path, merge sâu hoặc chạy biểu thức. Các mục chưa sửa giữ nguyên. Lưu nháp được thiếu nội dung; chỉ bước gửi duyệt mới cần validator kết luận đủ điều kiện. Không ghi ownerUid, role, vòng đời, revision hoặc bậc chính thức từ patch.

Mọi kết quả đọc snapshot được clone và freeze, không giữ tham chiếu có thể bị người gọi sửa vào dữ liệu repository. JSON có getter, function, prototype key, NaN/Infinity, vòng tham chiếu, dữ liệu quá sâu/lớn bị từ chối. Giới hạn parser hiện là 2 MiB/64 tầng/100.000 nút, không gắn với bậc hoặc quota sáng tác. HTTP adapter tương lai phải giới hạn bytes **trước khi parse**, không chỉ dựa vào kiểm object đã ở trong bộ nhớ.

## Snapshot và việc khóa phiên bản

Snapshot chứa version contract, worldId, draftRevision, UID người gửi, thời điểm server, validatorVersion, bản sao content và SHA-256 toàn payload. Thứ tự khóa object không làm thay hash; thay nội dung/revision/world/người gửi làm mất kiểm tra toàn vẹn. Hash không phải secret hay chữ ký; tự tính lại hash không làm file người dùng trở thành snapshot đáng tin. Snapshot xét duyệt phải được tải từ repository được cấp quyền.

Kết quả chuẩn bị luôn có `requiresAtomicCommit:true`. **Chưa có writer nên không được báo “đã lưu” hoặc “đã gửi duyệt” cho người dùng.** Trước khi nối route, transaction adapter phải:

1. Xác minh lại quyền, ownerUid, membership/scope, accessRevision, draftRevision và draftState trong cùng phạm vi transaction/serialization với lần ghi.
2. Với sửa nháp: so khớp preconditions, ghi revision kế tiếp và bổ sung UID vào contributorUids cùng lúc. Không cho sửa nội dung một revision tại chỗ, không bỏ lịch sử đóng góp khi thu hồi membership.
3. Với gửi duyệt: so khớp preconditions, ghi snapshot bất biến và chuyển đúng revision sang submitted trong một transaction. Replay cùng bản gửi phải có quy tắc idempotency; adapter chưa có nên đợt này chưa bảo đảm lưu đúng một lần.
4. Nếu có cạnh tranh, chỉ một transaction được ghi; bên còn lại nhận conflict và đọc lại. Không áp kế hoạch cũ sau khi quyền bị thu hồi.
5. Bản gửi đã khóa không chỉnh trực tiếp. Chỉnh sửa sau đó cần revision mới và duyệt lại; đợt này chưa xây chức năng reopen hoặc tự chuyển approved thành published.

Module kiểm lại dữ liệu sau các thao tác await để bắt thay đổi/thu hồi trong lúc chuẩn bị. Điều này **không thay transaction** và không hứa giải quyết race condition ở thời điểm commit khi adapter chưa được xây.

## Validator và tri thức riêng

`validateContent` phải là callback backend đáng tin, kiểm schema, tham chiếu và các điều kiện submit của contract mới. Không có validator hoặc callback lỗi thì từ chối chuẩn bị gửi. Report offline G1A `validForOfflineDraft=true` không đủ để đặt `readyForReview=true`. Đợt này chưa nối Python intake vào Worker hoặc triển khai semantic validator cho draft contract mới.

Reviewer phải độc lập với người tạo/gửi/đóng góp. Không cấp quyền reviewer bằng việc gắn trường `reviewer:true` trong JSON. Mục tiêu này phụ thuộc việc writer tương lai giữ contributorUids chính xác; kiểm thử hiện dùng fixture, chưa có dữ liệu thành viên thật.

Không thêm public player projection ở đợt này. Đây là dữ liệu sáng tác riêng, không được phát cả Story Bible/secretTruth sang bundle frontend hoặc route người chơi. Một collaborator chỉ được giao cảnh sẽ không nhận `story` trong phản hồi nháp hoặc bản gửi.

## Kiểm thử và cách chạy

```sh
node --test cloudflare/tests/vangioi-authoring.test.mjs
node --test cloudflare/tests/*.test.mjs
```

Đã có 37 ca mới: ma trận quyền, chặn chéo UID/world, Firebase JWT ký thật với khóa test local, client tự khai quyền, scopes, bản nháp dở, lịch sử contributor, sửa khi submitted, sai revision, snapshot sửa tay, metadata bị chèn, dữ liệu không phải JSON, validator thiếu/lỗi, thu hồi quyền/đổi UID/nội dung giữa xử lý. Các callback storage dùng fixture trong bộ nhớ; không gọi Firebase/Cloudflare thật hoặc phát thưởng.

CI hiện dùng wildcard `cloudflare/tests/*.test.mjs`, tự bao gồm các ca mới. Không cần sửa workflow hoặc thêm dependency. Trước khi hoàn tất bàn giao phải đọc kết quả CI/Pages của commit đã cập nhật, không coi unit PASS là live backend PASS.

## Rủi ro còn lại và bước sau

- Chưa có store/transaction/idempotency, quyền mời/thu hồi thật, immutable release, đánh giá bậc hoặc gameplay engine production.
- Chưa có schema partial đầy đủ cho nội dung G1B. Allowlist hiện bảo vệ ranh giới metadata, không chứng minh mạch truyện hợp lý.
- Token verifier hiện hữu chưa bao gồm một hệ thống revoke membership riêng; module đọc membership server mỗi lần, writer tương lai phải giữ tính nhất quán khi ghi.
- Từ chối admin vượt quyền trong module mới là chính sách thử nghiệm theo world; không thay phân quyền admin legacy. Chưa có công cụ admin xử lý khiếu nại/quyền IP thật.
- Bước 1C: chọn adapter lưu trữ phù hợp kiến trúc hiện có, triển khai revision/transaction và fixture integration; chỉ sau khi kiểm thử mới nối route hoặc chạy migration đã được phép.

Rollback: revert phạm vi module/test/tài liệu đợt này. Vì chưa import vào Worker live và không có migration, không cần xóa hoặc sửa dữ liệu người dùng.
