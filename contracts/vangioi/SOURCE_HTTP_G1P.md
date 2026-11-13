# G1P — HTTP đọc nguồn truyện có xác thực

Ngày 26/10/2026; nền 5554912 (G1O). Mở rộng adapter createAuthoringHttpHandler G1K, gọi lại createSqlRegistryService G1F/G1O. Đã có code và kiểm thử Request/Response với SQLite thật cục bộ; chưa import vào Worker live, chưa có URL endpoint cấu hình cho Creator hoặc adapter đọc Firestore.

## Contract

Prefix `/api/vangioi/authoring/v1/worlds/:worldId`:

| Method/path | JSON body | Kết quả |
|---|---|---|
| POST `/sources/query` | `{after:""}` hoặc cursor G1O | sources/reference/revisions, tối đa 50, nextCursor |
| POST `/sources/manifest` | `{reference}` | title/chapterId/title/order; không text |
| POST `/sources/range` | `{reference,startChapterId,endChapterId}` | chương trong khoảng đóng theo thứ tự payload, có text |

POST dùng cho truy vấn chỉ đọc để reference/cursor/phạm vi không nằm trong URL hoặc query string. Không có mutation nghiệp vụ ở ba tuyến này. GET trả 405; query string bị từ chối. worldId chỉ lấy từ path, không chấp nhận worldId/snapshotHash/forReview trong body. Service kiểm đúng bộ khóa, mọi UID/admin/approved bổ sung bị từ chối. Không có register/grant/revoke route hoặc đường tùy ý tới phương thức registry.

Lỗi: 401 unauthenticated, 403 forbidden cho quyền/pin không được phép, 400 invalid-request, 422 invalid-chapter-range, 409 payload-integrity-conflict, 503 registry-unavailable. Adapter chỉ trả code công khai, không exception/SQL hoặc text nguồn. Registry init lỗi ngoài service được bọc thành authoring-unavailable 503 hiện hữu.

## Quyền và tính nhất quán

Bearer được kiểm trước đọc body; verifier Firebase và quyền server của G1O tiếp tục kiểm trong service. Không nhận auth cookie/X-Admin/UID từ client. Origin phải thuộc HTTPS allowlist hiện hữu nếu request có Origin. CORS không phải cơ chế xác thực. Response private/no-store, Vary: Origin, nosniff, application/json; nội dung chương là dữ liệu, không phải HTML thực thi.

Giữ giới hạn 2 MiB trước parse/strict UTF-8, content-type JSON, từ chối compression/content-length sai; OPTIONS chỉ cho POST và Authorization/Content-Type. Giới hạn source payload 1 MiB của G1F và phân trang G1O giữ nguyên. Không thêm cache nguồn hoặc log body/response. Manifest title/chapter title là thông tin riêng tư có thể chứa spoiler.

Quyền owner/recipient/grant active/hash vẫn do registry quyết định. Quyền bị thu hồi trong gap hash sẽ chặn manifest/range. Discovery không phải receipt cấp quyền, pin vào arc hay approval. Lần đầu gọi source route mới khởi tạo registry schema trong storage local theo initializer hiện hữu; request authoring cũ không khởi tạo thêm bảng registry. Constructor G1K vẫn dùng initializer authoring như trước. Chưa chạy init/migration ở production.

## QA và bàn giao

7 HTTP integration tests mới: discovery/manifest/range qua dữ liệu registry thật do service nhập, quyền owner và các vai bị từ chối, pin/envelope/path/method, thu hồi quyền trước và trong hash, CORS/media/byte/preflight, kín lỗi SQL và hash hỏng. Không dùng mock luôn cho phép; verifier test chỉ giả UID, mọi membership/grant/registry kiểm qua SQLite. Toàn bộ Worker/helper gồm 408 tests. CI chạy lại hồi quy app/browser hiện hữu; đợt này không đổi UI.

Tương thích: không sửa world-content-1, arc-plan-1, local nháp, snapshot hay pilot. Chưa kết nối backend production, Thư viện Firebase, source picker, AI hoặc gameplay mới. Không có write route cấp item/EXP/Xu/Kho hoặc thay Canon. Vạn Giới vẫn là nơi tác giả, Thiên Mệnh dành người chơi, Chủ Thần riêng chủ dự án/AI.

Tiếp: adapter Thư viện có xác minh quyền chuyển thể và manifest ổn định, rồi client/picker được bật chỉ khi endpoint thật và world server đã có. Nháp local chưa có server worldId không tự suy ra quyền từ localId. Host/topology/issuer/migration/staging vẫn theo cổng G1K; không gọi production để tạo dữ liệu chỉ vì HTTP unit test thành công.

Rollback: revert G1P; không có data migration production. Các bảng registry local là G1F hiện hữu, không thêm schema mới.
