# VẠN GIỚI G1E — Khởi tạo world nháp và cộng tác viên

Ngày 26/10/2026. Nền GitHub `29b3f9b` (G1D, CI/Pages SUCCESS). Module độc lập `cloudflare/src/vangioi-provisioning.mjs`; chưa import Worker live, chưa route/binding, không chạy migration production.

## Quyền và hợp đồng

`createSqlProvisioningService({storage,projectId,verify,now})` dùng cùng SQL/transactionSync với adapter authoring. Mặc định xác thực Firebase bằng verifier hiện có. UID lấy từ verifier, bỏ qua claim admin/canEditStories hoặc trường tự khai từ request. Không thay policy admin/EPUB/NPC cũ.

| Thao tác | Đầu vào chính xác | Điều kiện và kết quả |
|---|---|---|
| `createWorld(request,input)` | `requestId` UUIDv4 chữ thường, `content` draft partial | UID có entitlement active + can_create_world=1; server tạo world ID từ hash UID/requestId, owner=UID; revision/accessRevision=1, state=draft. |
| `setCollaborator(request,input)` | `worldId`, `requestId`, `expectedAccessRevision`, `memberUid`, `status`, `editSections` | Chỉ owner hiện tại; status active/revoked. Active phải có >=1 section hợp lệ, revoked phải có sections rỗng. Server chỉ ghi role collaborator; tăng accessRevision. |

Mọi đầu vào được clone/giới hạn trước await và từ chối khóa lạ. Content phải qua allowlist + schema draft G1D; metadata owner/official rank/quyền/workflow không nằm trong content. World mới chưa có nguồn/asset grant, chưa đủ điều kiện submit chỉ nhờ tạo thành công. ID không do client lựa chọn; cùng UUID của hai UID tạo hai world khác nhau. Hash này định danh, không phải chữ ký hoặc chứng nhận sở hữu.

`vg_authoring_entitlements_v1` là dữ liệu backend tin cậy, có status/can_create_world/entitlement_revision. **Chưa có API/adapter phát entitlement**, chưa đồng bộ profile Firestore và chưa tự chuyển canEditStories/isAdmin thành quyền mới. Fixtures test là bên duy nhất cấp entitlement trong đợt này. Việc chọn chính sách cấp AU thật thuộc bước kết nối backend sau.

Owner chỉ quản lý collaborator, không cấp reviewer/publisher/owner, không thay hàng đã có platform role. Không có chuyển chủ world hoặc tự duyệt. Contributor history không bị xóa khi giảm scope/thu hồi/tái cấp. Quyền đọc/sửa/gửi duyệt vẫn do policy G1B và projection hiện hành quyết định. Giao một section có thể cho đọc toàn bộ nội dung ẩn trong section đó; owner cần giao scope phù hợp, đây chưa phải phân quyền tới từng NPC/scene.

Không triển khai lời mời/đồng ý nhận cộng tác, thông báo hay danh bạ. Hàm đặt quyền trực tiếp theo verified UID là primitive backend; Creator tương lai cần cơ chế chọn tài khoản và UX phù hợp trước khi mở cho người dùng.

## Transaction và ghi lặp

Không có await trong transaction: đọc lại entitlement/owner/accessRevision, ghi world + draft hoặc membership + accessRevision, receipt và audit cùng commit. Lỗi giữa các bước rollback toàn bộ. Schema init được chia sẻ với adapter SQL, không sao chép định nghĩa bảng. Tất cả chỉ chạy trên storage được truyền vào; module không tự tìm hoặc mở database production.

Receipt dùng cùng bảng operations G1C, khóa world/actor/requestId, action + canonical request hash. Retry dữ liệu giống nhau trả receipt lịch sử, không đặt lại draft hay quyền hiện tại. Khác dữ liệu/action bị từ chối. Mảng editSections chuẩn hóa thứ tự trước hash. Retry vẫn kiểm entitlement hiện tại cho tạo world và owner hiện tại cho sửa quyền; mất quyền không được replay. Receipt là xác nhận thao tác trước đã ghi, không khẳng định scope/trạng thái vẫn giống lúc đó; client phải đọc quyền hiện tại khi refresh.

Audit chung giữ revision nội dung (không trộn với accessRevision). Bảng append-only `vg_authoring_access_events_v1` lưu target UID, scope/status và accessRevision trước/sau trong cùng transaction. Không lưu story prose vào audit/receipt. UID trong test đều giả; không đưa UID hay truyện riêng tư thật vào repo công khai.

## Kiểm thử và giới hạn

23 test mới và tổng 295 test Worker PASS cục bộ. Có SQLite thật: create/retry đồng thời, entitlement bị thu hồi, claims giả, chặn tự nâng quyền, scoped edit qua adapter G1C, đổi owner/accessRevision trước transaction, rollback, revocation/regrant giữ contributor, lịch sử bất biến, mở lại database trên disk, legacy EXP giữ nguyên. Đây là kiểm thử service cục bộ, không chứng minh Cloudflare DO/Firebase/live UX đã chạy.

Chưa có provisioning source/asset registry, Firestore reader, kiểm bytes ảnh/upload, cấp reviewer/publisher, Creator UI hay production binding. Không phát hành WORLD_PLAY hoặc tạo background chỉ từ metadata. Giữ yêu cầu worldCover + sceneBackground thật và quyền sử dụng trước phát hành theo phụ lục DUDU CORE V1.2; không đặt quota ảnh theo rank và không bật 48 seed.

Tiếp: adapter cấp nguồn/asset có xác minh quyền, version/hash và thu hồi, sau đó Creator UI. Cần duyệt riêng trước migration/deploy backend hoặc ghi tài khoản thật. Main/Pages chỉ cập nhật source trong phạm vi đã được chủ dự án cho phép.

Rollback: revert commit G1E. Chưa có migration hoặc dữ liệu backend production cần phục hồi. Nếu sau này nối live, phải thiết kế backup và migration riêng trước khi triển khai.
