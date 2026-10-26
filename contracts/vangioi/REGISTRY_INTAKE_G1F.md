# VẠN GIỚI G1F — Nhập nguồn/ảnh và quyền dùng theo world

Ngày 26/10/2026. Nền `4c63061` (G1E, CI/Pages SUCCESS). `cloudflare/src/vangioi-registry.mjs` là service độc lập dùng storage SQL/transactionSync hiện có. Không import Worker live, thêm route/binding hoặc deploy/migrate production.

## Luồng đã có trong source

1. Operator được gán riêng trong registry nhập bản truyện hoặc PNG và khai nhận định quyền sử dụng đã kiểm tra. Server tính SHA-256 từ bytes thực, không nhận contentHash do client chỉ định.
2. Lưu version/payload bất biến, recipient UID được phép dùng và metadata license. Mỗi version chỉ cấp cho một UID; public_domain cũng không tự mở cho mọi tài khoản. Chưa hỗ trợ license dùng chung/catalog công cộng.
3. Chủ world đúng UID được gắn/thu hồi grant theo world và version/hash. Quyền owner world không tự cho phép dùng nguồn/ảnh của người khác. Operator không có quyền gắn vào world của tác giả thay cho owner.
4. Bộ gửi duyệt mặc định G1D đọc các version/grant vừa được service tạo; không dùng stub hoặc SQL seed cho luồng tích hợp. Asset grant mới luôn pending, không phải art approval/publish.
5. Chủ world có thể đọc riêng tư nguồn/ảnh đã gắn. Server kiểm hash payload và kiểm lại quyền/revision sau await trước khi trả dữ liệu. Người chỉ có claim admin, operator hoặc collaborator không được đọc bằng các hàm này. Quyền đọc draft/section cũ vẫn do policy G1B quyết định; đây không phải thay đổi quyền của các section đã giao.
6. Operator có thể thu hồi version trong registry: chặn grant mới và thu hồi mọi grant hiện có của version **trong cùng storage**. Không có hàm khôi phục version bị thu hồi; muốn thay nội dung/quyền cần version mới. Bản snapshot gửi duyệt trước đó vẫn bất biến, không bị xóa; bước duyệt/publish/gameplay tương lai phải kiểm lại quyền hiện tại.

## API service, chưa phải HTTP endpoint

`createSqlRegistryService({storage,projectId,verify,now})` mặc định verifier Firebase hiện có. Không tin uid/admin/owner từ body. Đầu vào clone JSON có giới hạn, từ chối khóa lạ/accessor/prototype; câu truyện và ghi chú không được eval hoặc dùng làm SQL.

| Hàm | Đầu vào |
|---|---|
| `registerSource` | requestId UUIDv4, kind original/library/manuscript, storyId, storyVersion, authorizedUid, license, sourceNote, proofRef, payload |
| `registerAsset` | requestId, assetId, assetVersion, kind theo schema content, authorizedUid, license, sourceNote, proofRef, pngBase64 |
| `setSourceGrant` / `setAssetGrant` | worldId, requestId, expectedAccessRevision, expectedGrantRevision (0 khi mới), reference đầy đủ, status active/revoked |
| `revokeSourceVersion` / `revokeAssetVersion` | requestId, expectedAuthorityRevision, reference đầy đủ |
| `readSource` / `readAsset` | worldId, reference đầy đủ; chỉ trả dữ liệu khi owner/grant/recipient/version hiện tại cùng hợp lệ |

Source payload là `{format:'story-source-1',title,chapters:[{chapterId,title,text}]}`. Nội dung chương là văn bản trơ; thứ tự chương được bảo toàn, chapterId không trùng. Server hash UTF-8 của JSON canonical từ `copyAuthoringJson`, gồm cả title/chapter IDs/text. Đây là định dạng trung gian có version, không phải đổi hash của EPUB hay Firestore cũ. Original/library/manuscript không tự chứng minh bản quyền.

Asset hash tính trên PNG gốc đã decode base64; không hash lại sau resize vì service không đổi ảnh. Kiểm signature, IHDR/dimensions/bit depth, CRC mọi chunk, thứ tự IDAT/IEND, palette căn bản; từ chối APNG/critical chunk không hỗ trợ. **Không giải nén hoặc decode pixel**, không chứng minh ảnh hiển thị được/không có metadata xấu, không scan nội dung, không kiểm spoiler, bố cục, chất lượng hoặc crop. Vì vậy dữ liệu chỉ ở khu nhập riêng tư chờ pipeline kiểm tra, không được phục vụ như ảnh public. Một PNG 1px trong test chỉ là fixture, không được coi là background đạt yêu cầu V1.2-A.

Giới hạn kỹ thuật intake hiện tại: source payload UTF-8 <=1 MiB, tối đa 5000 chương; PNG <=1 MiB, chiều <=10000 và <=40 triệu pixel; JSON chung vẫn chịu giới hạn parser 2 MiB/100000 nút/64 tầng. Đây là giới hạn bộ nhập cục bộ ban đầu, không phải quota thế giới theo F/E/S. Truyện/ảnh lớn cần adapter lưu theo chunk/object storage và đo thực tế; không âm thầm cắt nội dung. JPEG/WebP/AVIF chưa được nhập qua service này, không đổi hoặc cấm format ở ứng dụng cũ.

License enum original/licensed/public_domain; sourceNote bắt buộc, licensed bắt buộc proofRef. proofRef là tham chiếu hồ sơ riêng tư, không có fetch URL hoặc kiểm pháp lý tự động. Operator là bên kiểm nhận định; các chuỗi này không chứng minh quyền ngoài đời. Metadata license/recipient không được đổi dưới cùng version. Không có UI hoặc API cấp operator; bảng assignment chỉ do trusted provisioning tương lai quản lý. Tests dùng UID giả và fixture assignment, không cấp quyền người dùng thật.

## Lưu trữ và transaction

Tái sử dụng source_versions/asset_versions và grants của G1D. Thêm registry_operators (assignment), registry_objects (metadata quyền), registry_payloads (BLOB riêng tư), registry_operations (receipt), registry_events (audit). Payload/version/receipt/event append-only. SQL trigger khóa metadata recipient/license/reference và chỉ cho status active→revoked với authorityRevision+1; không xóa/reactivate catalog object.

Ghi version+catalog+payload+receipt+event cùng transaction; grant và global revocation cũng có receipt/event cùng transaction. Kiểm operator hoặc owner/accessRevision/recipient/catalog state ngay trong transaction. Grant dùng expectedGrantRevision; thu hồi cấp registry dùng expectedAuthorityRevision. Chống ghi lặp scope+verified UID+UUID/action/canonical request hash. Registry có receipt namespace riêng; một UUID chỉ đại diện một thao tác trong cùng scope/UID. Retry receipt là xác nhận thao tác lịch sử, không kích hoạt lại grant đã thu hồi. Operator bị thu hồi hoặc owner đổi không được replay đặc quyền cũ. Nhập lại version đã revoked bị chặn kể cả có receipt trước đó.

SQLite BLOB dùng ArrayBuffer khi bind/read theo hợp đồng Cloudflare SQL; test adapter chuyển sang view theo yêu cầu Node SQLite rồi trả lại ArrayBuffer. Tham khảo [Cloudflare SQL storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/). BLOB được copy khi đọc; hash kiểm toàn vẹn, không phải chữ ký hay chứng nhận quyền. Audit/receipt không chứa truyện, PNG/base64 hoặc proof text; chúng có ID/reference/hash/revision và UID backend nên phải giữ riêng tư khi nối live.

Tất cả world/grant cần nằm trong cùng storage để transaction và thu hồi cùng registry có hiệu lực như test. Chưa thiết kế routing/sharding liên DO hoặc đồng bộ thu hồi đa storage. Không được giả định bảng registry là mirror đang đồng bộ Firebase hay CDN.

## QA và phần còn lại

39 test G1F, tổng 334 test Worker PASS cục bộ. Có nhập bytes/hash, schema asset kind khớp, PNG CRC/cấu trúc sai, license proof thiếu, chặn claims giả, chống thay version/recipient, grant theo world, full submit mặc định, đọc riêng tư/thu hồi trong gap hash, version bị thu hồi, rollback từng phần, đồng thời/retry, payload corruption ngoài service và đóng/mở SQLite trên disk. Fixture content G1D được tách sang `tests/fixtures` để test tích hợp dùng cùng mẫu, không đổi dữ liệu runtime.

Bundle browser-target ESM của service đã tạo ở scratch, không có node:* hoặc runtime codegen do module mới thêm. Đây chưa phải kiểm thử Cloudflare DO live hoặc browser UX. CI/Pages phải kiểm theo SHA GitHub đợt này.

Chưa có Firestore reader/exporter, legacy EPUB migration, issuer entitlement/operator, upload endpoint, CDN, pixel decoding/scan, asset review workflow, Creator UI, permission invitation hoặc backend live. Không gọi AI/token, sửa Rules, auth cũ, Thiên Mệnh/EPUB/NPC/save/kho/EXP/pool/Canon hay mở WORLD_PLAY/48 seed. World playable vẫn cần worldCover + sceneBackground thật có quyền sử dụng và QA theo phụ lục V1.2-A; registry PASS chỉ chuẩn bị gửi duyệt.

Tiếp theo: Creator soạn draft bằng các contract đã có, có preview/validation và trạng thái thiếu backend rõ ràng; chọn adapter Firestore/object storage và migration/backend deployment cần kế hoạch/duyệt riêng trước khi ghi dữ liệu thật. Không giả endpoint đang chạy.

Rollback source: revert commit G1F. Chưa có migration/dữ liệu production để rollback.
