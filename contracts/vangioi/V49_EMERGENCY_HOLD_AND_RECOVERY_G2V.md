# G2V — Diễn tập ẩn khẩn cấp và xét khôi phục nguồn EPUB V49

Ngày 27/10/2026. Baseline `2fc1be87` (G2U). G2U từ chối ẩn khi sidecar `sourceEpoch`/authority/notice bị thiếu hoặc hỏng; trong tình huống khẩn cấp này, truyện có thể vẫn public. **G2V thử một đường ẩn riêng chỉ trên Firestore Emulator**, kiểm soát qua quyết định hai người tin cậy và biên nhận bất biến, đồng thời tách việc khôi phục khỏi việc tái xuất bản.

## Phạm vi

- Project **giả** `demo-vangioi-g2v`, Firestore Emulator `127.0.0.1:18088`. Không lấy credential thật, không truy cập database/staging/production; edition/database ID/IAM thực vẫn chưa được chủ dự án chốt.
- `cloudflare/src/vangioi-v49-emergency-hold-g2v.mjs`: `createG2VEmergencyRehearsal` có `emergencyHide` và `recoveryReview`, cả hai chỉ được gọi bởi **trusted fixture host callbacks**, không phải HTTP endpoint hay quyền `admin` client.
- Dùng nguyên Firestore G2S Rules candidate: public chỉ đọc book/chapter có `status='published'`, owner đọc private draft, default deny hold/clearance/receipts.
- Hai collection **chỉ có trong Emulator**: `vg_fixture_v49_emergency_holds_g2v` lưu trạng thái/case/epoch-trust và `vg_fixture_v49_recovery_clearances_g2v` lưu quyết định phục hồi server-only. Receipts trong `vg_fixture_v49_emergency_ops_g2v`.
- `cloudflare/tests/vangioi-g2v-emergency-hold.test.mjs`, `cloudflare/tests/manual/vangioi-g2v-emergency-emulator.mjs` và config `tools/vangioi/firebase-emulator-g2v.json`.
- Không sửa `firebase.json`, Firestore Rules đang hoạt động, `js/epub-production-v49.js`, Worker, Functions, Auth Claims, EPUB client, thế giới, gameplay hoặc dữ liệu người dùng.

## Hai bước xử lý

### A. Gỡ khẩn cấp — fail-closed đối với quyền công khai

1. Host chỉ chấp nhận quyết định khẩn cấp được xác minh server-side có **operator** và **rights officer** là hai UID khác nhau, case ID và phạm vi story đúng, reason thuộc danh sách thử nghiệm. Dữ liệu người dùng tự khai không tạo được quyết định này.
2. Trong Firestore transaction: kiểm book thật đang public, operation ID chưa dùng và hold chưa có; đọc sidecar epoch nếu hiện hữu.
3. Đổi parent EPUB `published → draft`, bỏ `publishedAt`, ghi hold `status='held'` và operation receipt **nguyên tử**. Chương vẫn giữ nguyên. Guest đọc parent/chapter bị từ chối, collection query public loại truyện đó.
4. Nếu epoch **có và hợp lệ về cấu trúc/owner**, tăng đúng một đơn vị trong transaction. Đây **chưa phải bằng chứng hash nguồn khớp** vì đường khẩn cấp không đọc toàn bộ chương: `sourceEpochRecordUsable:true` nhưng `sourceEpochAttested:false`. Nếu epoch **không có hoặc hỏng**, vẫn ẩn truyện nhưng **không tự tạo hoặc làm sạch epoch**; hold/receipt ghi `sourceEpochRecordUsable:false`, `sourceEpochAfter:null`. Người vận hành phải xử lý chứng cứ thiếu trước khi xét phục hồi.

### B. Xét phục hồi — không tự tái xuất bản

1. Yêu cầu ba UID khác nhau trong mô phỏng: operator, rights officer và reviewer. Clearance đã xác minh độc lập phải khớp case ID, authority revision, source epoch và SHA-256.
2. Firestore transaction kiểm hold còn `held`, book vẫn private, epoch đã được sửa/khôi phục đáng tin cậy, authority G2T `ready` với permit/pin/reviewer/release **đang hợp lệ**.
3. Đọc **toàn bộ subcollection chương**, kiểm không thiếu/thừa; tính lại hash G2N trước khi đánh dấu hold `review-ready` và clearance `consumed`, ghi operation receipt nguyên tử.
4. Kết quả **không** sửa `book.status` thành published, **không** cấp quyền publish: `canRepublish:false`, `productionAuthorized:false`. Truyện vẫn riêng tư; việc phát hành lại phải đi qua một quy trình phê duyệt riêng.

## Những giới hạn quan trọng

1. **Hai người xác minh chỉ là callbacks của test host**, không phải chữ ký pháp lý hay hệ thống cấp quyền đã xác thực. Không có issuance/rotation/audit producer/IAM thực.
2. Vì khẩn cấp là luồng có quyền cao, phải có rate limit, chống lạm dụng, kháng nghị, phân quyền độc lập và nhật ký kiểm toán bền vững trước khi cân nhắc nối thật. G2V không tạo quyền gỡ truyện trên trang đang hoạt động.
3. Khi `sourceEpochRecordUsable:false`, sách ẩn an toàn theo Rules candidate nhưng **không có epoch đơn điệu bảo đảm** cho những writer khác. Ngay cả khi record dùng được, `sourceEpochAttested:false` nhắc rằng tính toàn vẹn chưa được kiểm ở bước khẩn. Khôi phục cần sửa dữ liệu bằng một workflow đáng tin cậy, không tự vá bằng đầu vào client.
4. **Một Admin/server SDK khác vẫn có thể bỏ qua Rules và ghi `published`** dù hold tồn tại. G2V test **cố tình chứng minh** lỗ hổng này. Bắt buộc có writer fence chung kiểm hold cho **mọi** đường publish/restore trước production; G2T/G2R cũ chưa được đấu nối thực tế.
5. Firestore Rules không thu hồi byte đã được độc giả tải/cached, cũng không tự invalidate service worker/offline EPUB. Trạng thái `draft` là cách tương thích V49 thử nghiệm, chưa phải `suspended` state-machine được duyệt.
6. SQLite G1R/G2O/G1X vẫn là nguồn quyền ngoài hệ thử; không có đồng bộ xuyên database, transaction phân tán, instance edition chính thức hoặc release thực. Không kích hoạt 48 seed, world, XP/Xu/Kho, NPC AI, economy.

## Lệnh kiểm thử

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
node cloudflare/tests/vangioi-g2v-emergency-hold.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2v.json \
  --only firestore --project demo-vangioi-g2v \
  'node cloudflare/tests/manual/vangioi-g2v-emergency-emulator.mjs'
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Manual Emulator tạo sách published tổng hợp; kiểm quyền guest trước/sau, thiếu/méo epoch, replay, hai yêu cầu cạnh tranh, clearance giả, source/permit được phục hồi, giữ private sau `review-ready` và Admin SDK bypass. `PERMISSION_DENIED` trong các bài tấn công là kết quả mong đợi. Rollback chỉ bỏ code/test/config/tài liệu G2V; không có dữ liệu Firebase thật cần hoàn nguyên.

## Kết quả xác minh trước commit

- Unit G2V: **14/14** đạt.
- Firestore Emulator thực (project giả, Rules G2S candidate): **5** EPUB tổng hợp được ẩn; **1** hồ sơ chuyển `review-ready` nhưng vẫn private; **8** yêu cầu server không hợp lệ bị chặn; thử đồng thời chỉ một thao tác ẩn thành công.
- Kiểm tra đối nghịch chứng minh writer Admin SDK cũ **vẫn có thể bỏ qua Rules để tái xuất bản**; lỗ hổng này được ghi nhận, **chưa khắc phục**, chặn việc kích hoạt production.
- Cloudflare hồi quy **768/768**, ứng dụng **103/103**, Functions **2/2**; Wrangler `--dry-run` thành công, không deploy.
