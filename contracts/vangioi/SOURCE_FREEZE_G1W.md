# G1W — Bản nguồn đóng băng có hash và quy trình thu hồi trước staging

26/10/2026. Nền `1e62ea0` (G1V; GitHub Actions Smoke/Pages SUCCESS). G1W là **module SQL operator-only chưa được nối production/staging**, kết hợp dữ liệu V49 mô phỏng với G1Q–G1V và registry SQLite G1R/G1U. Không khởi tạo Firebase SDK/credential, không đọc Firestore thật, không thay Rules, DO binding, migration production, route HTTP hoặc source picker.

## 1. Chính sách bản nguồn cố định

`cloudflare/src/vangioi-source-freeze.mjs` xuất `createSqlFrozenSourceService({storage,projectId,verify,registerSource,now})`.

- Cần **cùng một SQLite authority** đã có G1R/G1U (permit, operator assignment, registry, outbox và audit). Chỉ khi trusted host tự tạo service mới tạo bảng phụ `vg_authoring_source_freezes_v1`; module không được import bởi Worker live.
- `freezePrepared(request,plan)` chỉ nhận plan **server-side của G1Q**, đã được G1V recheck khi host yêu cầu nguồn hiện hành. Hàm kiểm định canonical hash, `storyVersion=sha256-{hash}`, recipient, license/proof/note, permit revision 1 đang `active` và operator gán bằng SQL, trong transaction trước khi lưu. Không tin `admin:true`, client UID, `published` hoặc metadata V49 làm giấy phép.
- Bảng lưu **một bản JSON payload riêng tư** gắn `(storyId,contentHash,authorizedUid)` và thời điểm. Trigger cấm UPDATE/DELETE; cùng transaction ghi operation receipt và audit event `scope=source-freeze`. Retry cùng requestId hợp lệ trả receipt, không tạo bản thứ hai. Lỗi ghi audit rollback cả payload và receipt. Bảng không lưu lại `proofRef` hoặc `sourceNote`, không mở cho chủ world thông thường.
- `registerFrozen(request,{requestId,storyId,contentHash})` đọc payload và current permit từ cùng SQL transaction, tự hash kiểm integrity, lập lại input từ **metadata G1R đáng tin**, sau đó chuyển tới G1F `registerSource`. G1R/G1F tiếp tục kiểm permit ngay khi ghi registry. Nếu revoke xảy ra giữa read frozen và register, bước G1F phải từ chối.
- Dữ liệu đã đóng băng **không tự cập nhật** khi Firestore V49 đổi, thêm/xóa chương hoặc unpublished. Truyện mới cần một `contentHash`/permit mới; bản cũ chỉ được sử dụng nếu quyền hợp lệ cho chính phiên bản đã pin theo quyết định của operator. Không tự nâng bản, không chuyển grant cũ sang bản khác.

**Đây là content freeze, không phải chứng minh bản quyền hoặc khóa nguồn Firestore.** G1Q/G1V cố gắng đọc nhất quán và phát hiện thay đổi đã nhìn thấy, nhưng Firestore read-only có thể cũ và có thể bị sửa ngay sau lượt đọc. G1W đảm bảo **bản sao đã lưu ở SQLite không bị hệ thống tự đổi byte**, không đảm bảo bản sao đó là bản mới nhất ở Firestore hay giấy phép bên ngoài không bị thu hồi. Sau `revokeAdaptationPermit`, bản sao vẫn nằm trong archive theo chính sách G1R, nhưng mọi đăng ký/grant/đọc registry sử dụng quyền đã thu hồi đều bị chặn trong SQL.

## 2. Ma trận sự kiện cần xử lý trước live

| Biến cố | Quy trình operator / kết quả G1W | Việc còn thiếu |
| --- | --- | --- |
| Sửa văn bản/chương V49 | Hash nguồn thay đổi; không ghi đè archive cũ; G1V recheck chặn nếu thấy sửa trước freeze | Quyết định có cho dùng bản cũ theo permit hay bắt buộc issue version mới |
| Xóa/unpublish nguồn V49 | Không tự xóa bản đóng băng; không suy đoán là revoked về mặt pháp lý | Nguồn thông báo đáng tin, quy tắc legal takedown, kiểm soát source owner |
| Chủ quyền yêu cầu rút phép cho hash | Operator đối chiếu story/hash, bằng chứng và phạm vi, gọi **G1R `revokeAdaptationPermit`** với expectedRevision/requestId. G1R cascade revoke + outbox G1U nguyên tử | Kênh tiếp nhận notice, xác thực người yêu cầu, SLA và dữ liệu bảo vệ pháp lý |
| Thu hồi áp dụng cho mọi bản của một truyện | Liệt kê tất cả permit hash thuộc story trong authority server, revoke từng bản theo revision; khóa nhập mới trong quy trình kiểm duyệt | Giao dịch toàn truyện/queue và gate không cho issue hash mới đang bị tranh chấp |
| Replay event issue cũ | G1V đọc current permit, diễn tập revoked-wins; không tự cấp quyền từ event lịch sử | Sink staging atomic, kiểm quyền ở điểm sử dụng, retry và backlog monitoring |
| Yêu cầu xóa dữ liệu bản quyền/đời tư | G1W **không có** đường purge; immutable retention chỉ phù hợp môi trường thử | Chính sách bảo quản, legal hold, quyền xóa hợp lệ và thao tác privileged có audit cần phê duyệt trước live |

Không chấp nhận quyền từ author UI, Firestore `ownerUid`, claim `admin`, dữ liệu client hoặc AI. Nếu thông báo ngoài hệ thống chưa được operator xác minh, cần trạng thái *hold* thủ công (chưa triển khai) để ngừng import trong khi điều tra; không tự hiểu là có giấy phép.

## 3. Hợp đồng topology staging đề xuất — CHƯA CẤU HÌNH

| Thành phần | Nguồn quyền/đường dữ liệu | Ràng buộc trước khi tạo |
| --- | --- | --- |
| Reader V49 | Firestore instance staging read-only transaction G1T | Du chọn rõ project, database ID, **edition Standard/Enterprise**, region, service identity tối thiểu, quota và hạn chế truy cập |
| Operator host | Service riêng server-side nối G1Q/G1V/G1W | Không lấy operator/reviewer role từ client; chỉ định identity, rate limit, thời hạn request và audit |
| SQLite authority | Một Durable Object/storage chứa G1R/G1U, G1F, world/grant, receipts và frozen snapshots | Tránh chia world và permit ra hai DO không atomic; có sơ đồ định tuyến, backup/encryption/quota và logic rollback |
| Outbox consumer | G1U events → G1V rehearsal → sink staging đề xuất | Checkpoint/state cùng một transaction, idempotence, revoked-wins, gap/backlog recovery, không phát grant từ shadow projection |
| External rights notice | Nguồn operator xác minh → G1R revoke → outbox | Xác nhận danh tính, phạm vi hash, quy trình khẩn cấp, xử lý xóa hoặc đóng băng tranh chấp |

### Cổng vận hành phải được duyệt

1. **Định danh và môi trường:** chỉ định project/DB staging, edition, region, quyền service, origin, secret/quota; không dùng production account để làm test. Chưa có quyết định này thì dừng trước lệnh Firebase CLI/deploy/migration.
2. **Khởi tạo dữ liệu:** xác minh không có permit G1R cũ thiếu outbox (G1U `baseline-required`), không dùng cách tự động backfill `active` giả; backup snapshot đầu kỳ, kiểm integrity và test rollback.
3. **Kiểm thử lỗi:** mất mạng lúc frozen write, audit rollback, giả contentHash, nguồn đổi trước/sau prepare, revoke giữa freeze/register, replay/restart, phân trang outbox, đổi operator, legal hold và cleanup. Đo latency/chi phí với tải thử nhỏ trước khi đề xuất quota thật.
4. **Quan sát:** lag outbox, checkpoint cuối, lỗi baseline, mẫu denial, số snapshot/bytes, lịch sử revoke, thời gian khôi phục; không log nội dung chương/proof/token.
5. **Rollback:** dừng importer và consumer trước, giữ chặn các quyền `revoked`, backup/đối soát checkpoint + archive + grants, chỉ sau đó revert code/binding staging được duyệt. Không xóa dữ liệu thật bằng `git revert` hay xóa bảng trống theo suy đoán.
6. **Điểm duyệt nghiệp vụ:** Du quyết định liệu giấy phép là quyền theo **bản hash cố định** hay quyền chỉ hợp lệ khi bản V49 còn xuất bản/không đổi. Đây là khác biệt có thể thay đổi kết quả khi nguồn sửa/xóa; không được tự đoán.

## 4. QA, giới hạn và phụ lục hình ảnh

Kiểm thử G1W gồm: lưu bản nguồn rồi thử UPDATE/DELETE, idempotency/audit rollback, content hash sai, cấp quyền operator, import bản đã đóng băng khi Firestore thay đổi, revoke sau freeze, revoke ngay giữa read/register, hỏng bytes lưu trữ, khởi động lại SQLite và phối hợp recheck G1V. Không có SDK thật, listener, endpoint, publisher hay nguồn bản quyền thực.

Phụ lục `DUDU_CORE_V1_2_PHU_LUC_BACKGROUND_SCENE_IDENTITY_CHO_DUYET.md` xác nhận định hướng tối thiểu về `worldCover`, `sceneBackground`, `placeId/sceneId` nhưng nhiều chi tiết kỹ thuật vẫn chờ duyệt. Đợt này không sửa cảnh, asset, game, six genres, 48 seed, NPC AI, phần thưởng hay quy trình tác giả.

Rollback riêng G1W chưa live: revert module + test + contract. Nếu dữ liệu staging thật đã được tạo, bảng nguồn chứa nội dung có thể nhạy cảm phải được xử lý theo chính sách bảo quản/quyền xóa đã duyệt; không tự động xóa archive khi revoke hoặc rollback.
