# G2O — Sổ pin nguồn và quyền reviewer EPUB V49 trong SQLite fixture

Ngày 27/10/2026. Nền G2N `443c957`. G2N đã có callback `readSourcePin`/`readReviewerAssignment` nhưng trước đây chỉ được giả lập bằng các object tạm trong RAM. **G2O thêm bảng SQLite thật, chỉ ở fixture cô lập**, để diễn tập quyền reviewer, thu hồi và đổi phiên bản nguồn trước khi bàn tới API/backend thật.

## Phạm vi thực hiện

Module `cloudflare/src/vangioi-v49-reviewer-ledger-g2o.mjs` trả về sáu thao tác:

- `pinDraft`: operator xác thực một snapshot V49 `draft` qua callback **trusted server** `readVerifiedDraftProof` (tính mã SHA-256 G2N) rồi ghi pin nguồn; tạo lần đầu là revision 1, thay đổi nội dung đòi `expectedRevision` chính xác và tăng revision.
- `revokePin`: operator khóa pin nguồn vĩnh viễn trong fixture, tăng revision. Không có reactivation hoặc tự động duyệt/publish.
- `grantReview`: operator gắn reviewer cụ thể vào **phiên bản pin hiện hành**, giới hạn `v49-draft-inspect`, thời hạn tối đa bảy ngày; không thể phân công chính tác giả hoặc operator đang thực hiện thao tác làm reviewer cho sách đó.
- `revokeReview`: operator thu hồi một phân công; trạng thái revoked không thể quay lại active dưới cùng phiên bản nguồn. Có thể đánh dấu thu hồi lịch sử sau khi source đã tăng revision.
- `readSourcePin` và `readReviewerAssignment`: đọc metadata hạn chế, đúng hình dạng callback của G2N. Khi pin revocation/rotation, assignment cũ lập tức không khớp. Không trả văn bản chương, token, bằng chứng quyền chuyển thể hoặc quyền phát hành.

Tất cả lệnh ghi đều cần `verifyOperator(request)` **do máy chủ cung cấp**, không nhận `admin`, `operator`, `ownerUid`, `sourceHash` hoặc `scope` từ request body để tự cấp quyền. Ghi có `operationId` UUID một lần, transaction SQLite và sổ hoạt động append-only. SQLite có trigger chống xóa pin, xóa/thay lịch sử operation và đảo ngược trạng thái assignment đã thu hồi. Từ chối cả thao tác trùng ID/revision hoặc cố cấp quyền lại trên phiên bản nguồn cũ.

## Cách nối G2N trong fixture

Hai callback đọc do G2O cung cấp có thể truyền trực tiếp vào `createV49DraftIntegrityInspection` của G2N, cùng callback session verification, source header và snapshot tổng hợp độc lập. Diễn tập kiểm:

1. Chưa pin → cả tác giả lẫn reviewer không đạt tiền kiểm.
2. Pin đúng hash hiện hành → tác giả tiền kiểm read-only được. Reviewer vẫn bị từ chối.
3. Operator ghi assignment hợp lệ → reviewer kiểm được metadata, **không** lấy prose hay quyền publish.
4. Thu hồi → reviewer bị chặn ngay; đổi một chữ trong nội dung → `source-conflict` cho đến khi operator pin lại phiên bản mới.
5. Sau rotation, assignment revision cũ không có hiệu lực, chỉ được xem sau một phân công mới do operator lập.

`sourceHash` này **không thay** permit chuyển thể G1R/G1Q hay version G1T, không xác nhận quyền bản quyền. Các đoạn Firestore Rules ứng viên G2M vẫn khóa bản thảo theo chủ sở hữu. Reviewer không đọc trực tiếp Firestore qua client.

## Cấu hình an toàn và các giới hạn chưa giải quyết

- Constructor chỉ cho `environment:'fixture'` và `projectId` bắt đầu `demo-`; cần adapter `storage.sql.exec` và `storage.transactionSync`. **Đây là kiểm tra danh nghĩa, không phải bằng chứng lưu trữ cách ly thật**. Dùng một SQLite tổng hợp trong test, không có binding hoặc migration database thực.
- Callback `readVerifiedDraftProof` phải lấy và băm snapshot nhất quán từ trusted server theo G2N. **G2O chưa xây được nguồn pin có chủ sở hữu được xác minh ngoài đời**. Chưa được nhận hash do client nộp làm pin.
- Không có giao dịch phân tán giữa Firestore, SQLite pin và reviewer. Nếu sách đổi sau khi pin hoặc ngay sau recheck cuối, chỉ tầng commit authority sau này mới có thể khóa phiên bản/chống TOCTOU. G2O không tự cập nhật sách trong Firestore hay phát hành truyện.
- Trạng thái trực tiếp của pin/assignment được bảo vệ bởi lệnh fixture và SQLite constraints/triggers, **không** phải sổ chống operator hoặc DBA độc hại có quyền ghi SQL trực tiếp. Chưa có IAM, encryption, audit logging production, server API, reviewer UI hay phân quyền tài khoản thật.
- Metadata `published` lộ `importFingerprint` của V49 (G2L/G2M) vẫn chưa giải quyết; cần phân tách public/private projection riêng.

Không sửa `firebase.json`, `.firebaserc`, `security/*.review`, V49 client, Worker entry, Firestore, EPUB thực, Cloudflare binding hay quy trình Vạn Giới. Không cấp EXP/Xu, đăng world, sửa Canon, NPC AI hoặc kích hoạt seed.

## Chạy QA và rollback

```sh
node cloudflare/tests/vangioi-v49-reviewer-ledger-g2o.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Các bài thử dùng `node:sqlite` thật với `BEGIN IMMEDIATE`, trigger thật và kiểm rollback dữ liệu sau lỗi giữa chừng; có mô phỏng restart cùng storage, dùng lại `operationId`, tự khai role, hết hạn assignment, khóa vĩnh viễn, nguồn đổi revision, cách ly `projectId` và tích hợp read-only với G2N. Không có truy cập Firebase hoặc dữ liệu người dùng.

Kết quả chạy local: **G2O 14/14 PASS**, Cloudflare **683/683 PASS**, ứng dụng **103/103 test files PASS**, Functions **2/2 test files PASS**, Wrangler dry-run thành công. Chưa deploy Worker hoặc Firestore.

Rollback G2O: bỏ module SQLite fixture, unit/integration test, tài liệu và liên kết README. Không có dữ liệu live cần khôi phục hay migration phải đảo ngược.
