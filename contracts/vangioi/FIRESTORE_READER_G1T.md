# G1T — Reader EPUB V49 bằng giao dịch Firestore chỉ đọc

26/10/2026. Nền `517bfe6` (G1S; CI/Pages SUCCESS). G1T triển khai **adapter đọc server-only và bộ kiểm thử staging cô lập**. Không nối tới tài khoản Firebase thật, không cấp role, không thêm HTTP route, DO binding, migration, Firestore Rules hoặc Creator source picker.

## 1. Quyền và topology chưa đổi

- Thư viện V49 lưu `epub_stories_v49/{bookId}` cùng `/chapters/{chapterId}`. `studio_data/main_library` là dạng legacy khác, không được adapter G1T nhận thay.
- Permit chuyển thể vẫn lấy từ `vg_authoring_adaptation_permits_v1` SQLite G1R qua callback operator đáng tin, **không** suy ra từ `ownerUid`, `published`, `admin:true`, ảnh bìa hoặc `importFingerprint` của EPUB V57.
- G1Q kiểm danh tính operator trước khi đọc và đọc snapshot hai lượt; G1S ghim hash chuẩn; G1R kiểm permit tại bước register. G1T không thêm quyền mới hoặc tự ghi registry.
- Nếu nối staging sau này, bảng world/permit/registry/grant/receipt/audit cần cùng một SQL authority để giữ atomicity G1R. Firestore tiếp tục là một authority riêng, chưa có distributed transaction.

## 2. Hợp đồng mới

`cloudflare/src/vangioi-v49-firestore-reader.mjs` export `createV49FirestoreTransactionReader({firestore})`.

`firestore` là instance server-side đã cấu hình bởi trusted host, tương thích API Admin Firestore (`collection().doc()`, `runTransaction`, `transaction.get`). Module không import Firebase SDK, khởi tạo credential, gọi mạng hoặc ghi Firestore khi được import. Thiếu dependency/instance phù hợp phải dừng; không có fallback đọc tuần tự không transaction.

Với `readV49Snapshot({storyId})`, adapter:

1. Giới hạn `storyId` theo dạng ID hiện có của V49 trước khi lập đường dẫn.
2. Dùng `firestore.runTransaction(callback,{readOnly:true})`, đọc book và toàn bộ chapter document theo `chapterIndex` **trong một giao dịch chỉ đọc**.
3. Kiểm `status` draft/published, ownerUid, số chương 1–160, thứ tự/ID chapter, không nhận `importing` hoặc thiếu/trùng/sai chương. Chặn ID chapter chứa dấu `/`, đường dẫn hoặc định danh trái dạng V49. Đọc theo nhóm tối đa 8 chương; từ chối nội dung vượt hạn mức V49 220.000 ký tự/420.000 byte mỗi chương hoặc tổng text vượt mức intake 1 MiB trước khi trả kết quả.
4. Chỉ trả projection `book {id,title,ownerUid,status,chapterCount,chapterIndex}` và `chapters [{id,title,order,content}]`. Không đưa bìa, fingerprint, timestamp hay metadata tự xác nhận quyền vào kết quả.
5. Che mọi lỗi thành `v49-firestore-unavailable`. Không trả chi tiết Firebase, đường dẫn riêng, ID tài khoản hoặc văn bản nguyên tác qua lỗi.

G1S nhận callback này rồi làm canonical `story-source-1`/hash, tra permit từ G1R, và G1Q kiểm snapshot lần nữa. Không được truyền callback, Firebase instance hoặc request quyền từ JSON/HTTP của tác giả.

## 3. Tính nhất quán và hạn chế quan trọng

Read-only Firestore transaction cho dữ liệu book/chapters thuộc **một snapshot nhất quán**; bản snapshot đó có thể không phải trạng thái mới nhất tại thời điểm đọc (theo [tài liệu Node Firestore](https://googleapis.dev/nodejs/firestore/latest/Firestore.html), snapshot read-only có thể cũ tới 60 giây). Hai lần đọc G1Q phát hiện một số thay đổi diễn ra giữa các lần đọc, nhưng không bảo đảm phát hiện mọi chỉnh sửa hoặc thu hồi xảy ra sau đó.

Đặc biệt:

- Bản V49 bị sửa sau `prepare` nhưng trước `register` vẫn có thể khiến một source version cũ được nhập nếu permit tương ứng còn active. Chỉ check lại SQL không giải quyết quyền sửa nguồn bên Firestore.
- Thu hồi permit G1R có thể chặn đăng ký/đọc registry trong cùng SQLite transaction, nhưng không thu hồi một quyền nguồn đang được quản lý ở authority bên ngoài nếu không có đồng bộ.
- Read-only Firestore transaction **không** biến Firestore+SQLite thành giao dịch phân tán và không bảo vệ mọi gap thời gian.
- Payload G1F còn giới hạn 1 MiB, trong khi V49 cho tối đa 160 chapter và mỗi chapter có hạn mức riêng. G1S chặn tổng canonical payload vượt 1 MiB; không tự chia hay cắt truyện.

Do đó chưa được bật tự động import/grant hay source picker thật. Đợt sau phải chốt source immutability/version fence hoặc quy trình thu hồi/outbox, kiểm tại ranh giới ghi, backup và rollback staging trước khi nối HTTP.

## 4. Kiểm thử

- `cloudflare/tests/vangioi-v49-firestore-reader.test.mjs`: 19 ca kiểm giao dịch read-only, thứ tự chapter, snapshot không trộn các thời điểm, thay đổi giữa hai lượt đọc G1Q, từ chối ID/metadata sai hoặc nội dung quá hạn mức, permit không đến từ client và lỗi kín.
- `cloudflare/tests/vangioi-registry.test.mjs`: 2 ca G1T bổ sung trên SQLite thật của Node với Firestore transaction fixture: đường V49 → G1Q → G1R/G1F → G1O và thu hồi trước register.
- `cloudflare/tests/fixtures/vangioi-firestore-v49.mjs`: giả lập `runTransaction` đọc một copy snapshot, hoàn toàn trong bộ nhớ, không có mạng hoặc credentials.
- `cloudflare/tests/manual/vangioi-v49-firestore-emulator.mjs`: smoke dành riêng Firestore Emulator local, dùng project `demo-vangioi-g1t`, chỉ chấp nhận `FIRESTORE_EMULATOR_HOST=127.0.0.1:18080` (hoặc localhost). Test tạo dữ liệu giả trong Emulator, đọc snapshot qua SDK thực, đổi nội dung một chương và đọc lại để kiểm version. Không bao giờ dùng với host/project production.
- `tools/vangioi/firebase-emulator-g1t.json`: cấu hình Emulator riêng trên loopback; không sửa `firebase.json` của dự án.

Manual emulator smoke cần `firebase-tools` và `@google-cloud/firestore` cài tạm trong môi trường kiểm thử; không đưa SDK vào dependency runtime hoặc CI chính. **Kết quả G1T local:** PASS với Firebase CLI `13.35.1`, Firestore Emulator `1.19.8`, Java 17, Node 24, chỉ trên `127.0.0.1:18080`. CLI Firebase mới yêu cầu Java 21 nên không chạy trong máy kiểm thử hiện tại; bản Emulator cũ đã đủ để kiểm tra lời gọi giao dịch và vòng đọc/đổi nội dung nhưng không đại diện toàn bộ hành vi bản mới nhất. Đây là kiểm tra bổ sung, không thay thế kiểm tra quyền/Rules khi staging được phê duyệt.

## 5. Cổng trước G1U và rollback

1. Chủ dự án chọn Firebase instance/edition và môi trường staging riêng trước khi cấp credentials; không dùng token cá nhân hoặc Rules production để thử.
2. Chốt chính sách nguồn bất biến, version fence, sửa/thu hồi và thời điểm commit; thiết kế đối phó read-only snapshot có thể cũ.
3. Xác định service identity tối thiểu, operator assignment, giới hạn chi phí/truy cập, routing một SQL authority, backup, cleanup và rollback staging.
4. Khi được duyệt mới cấu hình host/emulator/endpoint; source picker/submit thật vẫn phải chờ quyền server, worldId và review gate.

Rollback G1T: revert module, fixture/test, config emulator và tài liệu. Không có migration hoặc dữ liệu Firebase/Cloudflare thật để khôi phục. Nếu dữ liệu staging thật phát sinh ở đợt sau, cần kế hoạch khôi phục riêng, không chỉ revert code.
