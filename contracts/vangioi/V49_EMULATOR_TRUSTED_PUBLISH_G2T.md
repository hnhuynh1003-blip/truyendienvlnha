# G2T — Diễn tập xuất bản với authority fence tại thời điểm commit

Ngày 27/10/2026. Baseline `50f87d0` (G2S). G2S đóng được đường **client tự publish** trong ứng viên Rules, nhưng server SDK có thể ghi published mà không cần sourceEpoch. G2T tạo **một cổng giao dịch thử nghiệm server-only** để khảo sát yêu cầu thực sự của publish có quyền.

**Không phải dịch vụ xuất bản đã được cấp phép.** Firestore edition/database ID/region/IAM thực chưa chọn (G2J). Vì vậy chỉ dùng Firestore Emulator native API, project giả `demo-vangioi-g2t`, localhost `127.0.0.1:18086`; cấm credential path/project khác. Không nối Cloudflare production, Function, Firebase Rules thật, bảng SQLite thật hoặc giao diện tác giả.

## Thành phần mới

1. `cloudflare/src/vangioi-v49-emulator-publish-g2t.mjs`: `createG2TEmulatorPublisher` yêu cầu `verifyOperator` tin cậy tại host. Chỉ token server đã xác minh được ghi, không tin role/reviewer/permit hoặc `canPublish` từ client JSON.
2. Dữ liệu giả `vg_fixture_v49_publish_authority_g2t/{storyId}`: projection server-owned gồm revision, permit, hold, pin, reviewer assignment, release signoff và nguồn hash/epoch. Collection chỉ tồn tại trong Emulator và bị **default deny** ở ứng viên Rules G2S.
3. Vẫn dùng source `epub_stories_v49/{storyId}/chapters`, sidecar G2R `vg_fixture_v49_epochs_g2r` và operation ledger G2R `vg_fixture_v49_epoch_ops_g2r`, không sửa schema/Rules V49 cũ. G2T chỉ cập nhật trường status/publishedAt/updatedAt đúng client contract.
4. `cloudflare/tests/vangioi-g2t-emulator-publisher.test.mjs` kiểm trường quyền/role/epoch, cổng Emulator/credential; `cloudflare/tests/manual/vangioi-g2t-publish-emulator.mjs` diễn tập Firestore transaction thật, Rules Unit Testing và đồng thời tranh chấp ghi.
5. `tools/vangioi/firebase-emulator-g2t.json` chỉ cấu hình host/port; không hề thêm đường deploy Rules.

## Chính sách thử nghiệm trong **một Firestore transaction**

- Kiểm operator **trước** transaction qua host; không cấp publisher claim từ tài khoản/browser.
- Đọc book `draft`, epoch, operation ID, authority projection trong một transaction; tất cả phải tồn tại, owner/hash/epoch/revision chính xác, operation ID chưa dùng.
- Đọc **toàn bộ chapter subcollection trong cùng transaction**, kiểm đủ số lượng và đúng index, từ chối chương thiếu/thừa, băm lại toàn bộ bằng G2N SHA-256. Không dựa vào `importFingerprint` hay số chapter phía client tự khai.
- Xác minh projection cùng revision: permit active/chưa hết hạn, hold clear, source pin active, reviewer assignment approved đúng pin, release signoff khớp permit/pin/reviewer/sourceEpoch/sourceHash. Projection đã được **trusted fixture host** ghi; chưa phải kiểm giấy phép pháp lý thật.
- Ghi book `published`, tăng epoch, đánh dấu authority consumed và tạo operation receipt **trong cùng transaction**. CAS có kiểm lại khi Firestore tự retry. Kết quả luôn `productionAuthorized:false`.
- Để mô phỏng race, test host có thể chèn `fixtureBeforeTransaction` sau xác thực operator nhưng **trước khi transaction đọc authority/source**; thu hồi quyền hoặc sửa nguồn ở đây khiến bước đọc giao dịch từ chối. Không thể dùng `await` ghi cùng document giữa read/write của transaction Emulator: khóa bi quan sẽ chặn writer kia, gây deadlock. Hai transaction cạnh tranh phải được hiểu theo thứ tự tuần tự thực tế; revocation tới *sau* khi publish hoàn tất vẫn là blocker riêng.

## Điều G2T **chưa** giải quyết

1. **Không có atomicity giữa SQLite G1R/G2O và Firestore.** Authority projection trong cùng transaction Firestore là **bản giả lập**. Thu hồi quyền tại SQLite mà chưa được chuyển vào Firestore có thể chưa bị chặn — đây là blocker lớn trước staging. Cần consumer/replica freshness watermark, cutover/rollback và quyết định consistency model, hoặc nơi lưu authority duy nhất.
2. Server SDK vẫn bỏ qua Security Rules nếu có quyền IAM. Duy trì một đường ghi chuẩn chỉ là mục tiêu kiến trúc, chưa có tổ chức IAM/network/provenance live để chứng minh mọi server writer tuân thủ.
3. G2T chưa xử lý hậu quả **thu hồi giấy phép sau khi đã xuất bản**: bản published có thể tiếp tục được guest đọc theo V49. Cần suspension/public projection/notice workflow ở bước sau.
4. G2S candidate sẽ làm `publishDraft()` V49 cũ lỗi nếu bật vào production. Chưa có UI chuyển sang trusted publisher, server reviewer endpoint, quyền hợp lệ của nhà phát hành hay kiểm thử migration truyện cũ. Không deploy candidate cả project.
5. G2L/G2M vẫn còn public metadata `importFingerprint`, `sourceName`, `ownerUid`. G2T không tách public/private projection hay thay độc giả EPUB, không đồng nghĩa có quyền sử dụng truyện cho Vạn Giới.
6. Không bật world, 48 seed, XP/Xu/Kho, AI NPC, economy hay bất kỳ nguồn Thư viện/Firebase production nào.

## Chạy thử

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
node cloudflare/tests/vangioi-g2t-emulator-publisher.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2t.json \
  --only firestore --project demo-vangioi-g2t \
  'node cloudflare/tests/manual/vangioi-g2t-publish-emulator.mjs'
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Không coi `PERMISSION_DENIED` ở các attack case là lỗi môi trường. Manual Emulator nạp Rules G2S bằng Rules Unit Testing nên cảnh báo Firebase CLI không tìm thấy Rules trong `firebase.json` không phản ánh Rules đang chạy trong test.

**Kết quả local ngày 27/10/2026:** unit G2T **19/19 PASS**, Firestore Emulator manual **PASS** (ít nhất 2 giao dịch publish hợp lệ, 20 yêu cầu publish bất hợp lệ bị từ chối, ghi nhất quán qua tranh chấp publish/revoke, thêm/thừa chương bị deny). Client G2S vẫn không tự publish được. Cloudflare hồi quy **743/743 PASS**; app **103/103 test files PASS**; Functions **2/2 test files PASS**; Wrangler `--dry-run` PASS. Thử race trước transaction bị chặn; race publish/revoke đồng thời được serialize và đã thừa nhận hậu quả revocation sau publish. CI cần xác nhận riêng sau commit; không tuyên bố staging/production QA.

**Tiêu chí chưa đạt để nối staging:** (a) chọn edition/instance riêng, (b) source-of-truth và quyền reviewer/permit được đồng bộ có bảo đảm, (c) quy trình thu hồi sau publication, (d) IAM/service identity tối thiểu và server-only commit fence, (e) migration V49 client và public/private projection, (f) test migration/rollback và quan sát audit thực.

Rollback source: bỏ module/test/config G2T và dòng liên kết README. Không có migration, Firestore thực hay dữ liệu người dùng để hoàn nguyên.
