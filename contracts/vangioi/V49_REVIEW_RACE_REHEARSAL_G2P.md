# G2P — Diễn tập cạnh tranh nguồn EPUB V49 và quyền reviewer

Ngày 27/10/2026. Tiếp nối G2N (`443c957`) và G2O (`41fee56`). Đây là một **rehearsal read-only trên fixture độc lập** cho khoảng thời gian nguồn truyện, pin SHA-256 và quyền reviewer có thể thay đổi trong quá trình kiểm tra. Không phải chuẩn phê duyệt world, bảo đảm nhất quán xuyên hệ thống hoặc chức năng được triển khai cho tác giả.

## Phạm vi mã nguồn

1. `cloudflare/src/vangioi-v49-reviewer-ledger-g2o.mjs` thêm `readAuthorityFence({storyId,reviewerUid})`: đọc pin, assignment gắn với revision hiện tại và `MAX(rowid)` lịch sử operation **của riêng story** trong **một transaction SQLite**. Trả metadata đã đóng băng; không cấp hoặc thu hồi quyền, không thay đổi schema. Giá trị `operationHighwater` cho phép phát hiện operation mới ngay cả khi trạng thái pin/quyền quay lại như cũ. Không bảo vệ khỏi DBA sửa trực tiếp cơ sở dữ liệu.
2. `cloudflare/src/vangioi-v49-review-race-rehearsal-g2p.mjs` thêm `createV49ReviewRaceRehearsal(...)`. Constructor chỉ chấp nhận `environment:'fixture'`, `projectId` bắt đầu `demo-` và callback do **trusted fixture host** cấp; không nhận callback, role, grant hoặc nguồn từ payload client.
3. `cloudflare/tests/vangioi-v49-review-race-rehearsal-g2p.test.mjs` kiểm trên `node:sqlite` thật với 13 ca độc lập. Không kết nối Firebase hay Cloudflare binding, không chạy migration.

## Thuật toán diễn tập

Yêu cầu đầu vào chỉ gồm `{storyId,mode:'prepublish'|'review'}`. Request identity phải được kiểm qua `verify()` của host. Quy trình có hai lượt kiểm toàn vẹn G2N:

1. `readAuthorityFence` lấy pin/reviewer và con trỏ lịch sử tại thời điểm bắt đầu. Chỉ tiếp tục với pin active và metadata hợp lệ.
2. G2N đọc snapshot EPUB nhất quán, băm đủ chương và so với pin. Chỉ nhận kết quả metadata không có prose, `inspectionOnly:true`, `canPublish:false`; reviewer phải có assignment hiện hành cùng revision/hash và chưa hết hạn.
3. Đọc lại fence sau lượt kiểm thứ nhất. Nếu pin, assignment, status, expiry hoặc operation high-water đã đổi thì **fail closed**.
4. Chạy `onInterleave()` **do fixture host khai báo ở constructor** để mô phỏng operator revoke, re-pin, grant mới hoặc chỉnh sửa nguồn; không có hook này trên route public.
5. Đọc fence trước lượt hai. Nếu thay đổi thì dừng trước khi đọc nội dung riêng tư lần nữa.
6. Lặp toàn bộ kiểm G2N, so hai kết quả, kiểm thời gian hiệu lực và đọc fence cuối. Chỉ khi mọi kiểm tra khớp mới trả metadata `{ok:true,raceRehearsalOnly:true,inspectionOnly:true,canPublish:false}`.

Nếu phát hiện xung đột, kết quả bị chặn với mã `source-conflict`, `authority-conflict` hoặc `forbidden`; lỗi callback/adapter thành `rehearsal-unavailable`. Không có API, token, bước ghi trạng thái, phê duyệt, publish, xuất văn bản riêng tư hay kết nối source picker.

## Ma trận kiểm chứng

| Kịch bản fixture | Kết quả mong đợi |
|---|---|
| Chủ nguồn pin đúng, hai lượt cùng một phiên bản | Chỉ metadata, không publish |
| Reviewer được gán, đồng thời payload tự nhận admin | Chỉ quyền từ assignment server; không được `prepublish` |
| Chưa pin, admin khác hoặc request không xác thực | Chặn trước khi lấy snapshot riêng tư |
| Sửa nội dung nguồn sau lượt một, chưa re-pin | `source-conflict` ở lượt hai |
| Sửa nội dung đồng thời re-pin revision mới | `authority-conflict` trước lượt hai |
| Thu hồi pin hoặc quyền reviewer ở giữa | `authority-conflict` |
| Assignment hết hạn khi đang kiểm | `forbidden` |
| Có thêm grant của reviewer khác trên cùng story | `authority-conflict` qua operation high-water |
| Ghi operation của story khác | Không làm hỏng lượt kiểm story hiện tại |
| Fence SQLite pin/assignment/cursor | Đọc trong một transaction, kết quả bất biến |
| Mode/ID sai hoặc tìm module trên live route | Chặn; không nhập vào live entrypoint |
| Nguồn đổi A→B→A trước lượt kiểm hai, không đổi version/history | **Không phát hiện được**; test xác nhận giới hạn |

## Blocker trước khi nối staging hoặc production

- **Không có transaction phân tán Firestore–SQLite.** Ba lần đọc fence không khóa Firestore và không bảo đảm snapshot không thay đổi ngay sau lần đọc cuối; `ok:true` chỉ là *kết quả diễn tập tại những thời điểm đã quan sát*, không phải giấy phép commit/publish.
- **Không phát hiện ABA nguồn** nếu dữ liệu thay đổi rồi hoàn nguyên giữa hai lần kiểm tra mà không có version hoặc lịch sử nguồn tăng đơn điệu. Cần một `sourceEpoch`/immutable revision được thực thi trên phía lưu nguồn cùng quy tắc commit CAS/fencing đáng tin trước bước gửi duyệt thật.
- `operationHighwater` là `MAX(rowid)` SQLite fixture, **không** là vector clock hay chứng thực xuyên hệ thống; một DBA có toàn quyền có thể xóa/sửa trực tiếp. Không có durable event bridge, IAM staging, mTLS, attestation, audit production hoặc recovery đa hệ thống.
- Chỉ kiểm được quyền inspection từ session và callback host giả lập, **không** xác minh permission thực với Auth/Firestore Rules hoặc copyright permit G1R/G1Q. Review ledger G2O không tự cấp quyền đọc Firestore từ client.
- Vấn đề public projection của metadata `published` và độ sâu index V49 từ G2L/G2M chưa giải quyết. Không đổi Rules, `firebase.json`, `.firebaserc`, dữ liệu EPUB, Worker entry, tài khoản, Canon, economy hoặc UI.

## QA, handoff và rollback

```sh
node cloudflare/tests/vangioi-v49-review-race-rehearsal-g2p.test.mjs
node cloudflare/tests/vangioi-v49-reviewer-ledger-g2o.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Kết quả local: **G2P 13/13**, hồi quy G2O **14/14**, Cloudflare **696/696**, ứng dụng **103/103 test files**, Functions **2/2 test files** đều PASS. Wrangler build **dry-run** thành công với cấu hình log tạm ghi được; không deploy. Trạng thái CI sau commit được ghi tại bàn giao; tuyệt đối không suy từ test pass ra trạng thái phát hành chính thức.

Rollback: bỏ wrapper G2P, test, tài liệu và phương thức đọc fence bổ sung G2O. Không có schema migration, dữ liệu sản xuất hoặc deployment cần đảo ngược.
