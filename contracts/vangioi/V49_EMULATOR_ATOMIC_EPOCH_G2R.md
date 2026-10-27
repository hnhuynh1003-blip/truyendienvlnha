# G2R — Diễn tập ghi nguyên tử sourceEpoch trên Firestore Emulator V49

Ngày 27/10/2026. Baseline `5875d62` (G2Q). Nối **chỉ ở mức diễn tập cục bộ** hai vấn đề còn thiếu trong G2Q: nguồn EPUB và epoch phải thay đổi trong cùng transaction, đồng thời phân biệt rõ quyền đọc/ghi client theo Rules với quyền tác nghiệp của server SDK.

**Quyết định kiến trúc còn mở:** Chưa xác định Firestore edition, database ID, region, IAM hoặc Rules đang deploy thực tế (G2J–G2M). Vì vậy G2R dùng *Firestore Emulator native API* tại `127.0.0.1:18084`, project giả `demo-vangioi-g2r`, không đưa ra thiết kế SDK/schema production cho một edition chưa chọn.

## Phần mã mới

- `cloudflare/src/vangioi-v49-emulator-epoch-g2r.mjs`: `assertG2REmulator` từ chối host khác localhost, project khác `demo-vangioi-g2r`, credential path và active project không khớp. `createV49EmulatorEpochWriter` yêu cầu server SDK transaction và callback operator/mutation đến từ trusted fixture host.
- `tools/vangioi/firebase-emulator-g2r.json`: config riêng đúng một Firestore Emulator, không trỏ project thật, không chứa Rules deploy hay IAM.
- `cloudflare/tests/vangioi-v49-emulator-epoch-g2r.test.mjs`: 8 unit tests có mô phỏng transaction, kiểm quyền callback, hashing, CAS/replay, identity, ABA, drift và giới hạn import.
- `cloudflare/tests/manual/vangioi-g2r-source-epoch-emulator.mjs`: chạy **Firestore Emulator thật**, dùng server SDK `@google-cloud/firestore` cùng với `@firebase/rules-unit-testing`, nạp **nguyên văn** candidate G2M vào Emulator. Không thay tệp Rules G2M.

### Lược đồ thử nghiệm

Thư viện EPUB V49 hiện hành vẫn là:

`epub_stories_v49/{storyId}` và `epub_stories_v49/{storyId}/chapters/{chapterId}`.

G2R thêm **hai collection chỉ dành cho dữ liệu thử nghiệm**:

- `vg_fixture_v49_epochs_g2r/{storyId}`: `storyId`, `ownerUid`, `sourceEpoch`, `sourceHash`, `chapterCount`.
- `vg_fixture_v49_epoch_ops_g2r/{operationId}`: `storyId`, `sourceEpoch`, `sourceHash`, `actorUid`.

Các tên collection có hậu tố `_g2r` **không phải schema mới đã được duyệt cho sản xuất**. Tách sidecar thay vì nhét `sourceEpoch` vào document V49 hiện hành để không làm hỏng schema/Rules/client nhập EPUB cũ.

## Giao dịch nguồn và thời điểm chặn

`applyVerifiedWrite(request,{storyId,expectedEpoch,operationId})`:

1. Chỉ nhận operator đã xác thực qua callback server, không tin `admin`, `uid`, `sourceHash` hoặc payload tự khai từ request.
2. Trong `firestore.runTransaction`: đọc sidecar, operation ID, parent book và mọi chapter có trong index. Băm đầy đủ snapshot bằng G2N, từ chối nguồn không phải draft, nội dung sai hoặc snapshot lệch hash đã ghi.
3. Lần đầu chỉ ghi baseline epoch 1 cho dữ liệu tổng hợp đã seed. Lần kế tiếp bắt buộc `expectedEpoch` đúng với epoch hiện tại. Callback `prepareMutation` **được host cấp tại constructor** chuẩn bị snapshot mới, không phải đầu vào client; phải thuần/idempotent vì transaction có thể retry.
4. Ghi parent book, chapter documents, sidecar epoch tăng đúng một đơn vị và operation ID trong **cùng Firestore transaction**. Trường hợp A→B→A được ghi thành epoch 1→2→3 dù hash quay về như cũ.
5. Không cấp approval/publish, source grant, quyền reviewer, XP/Xu hay bất kỳ token sử dụng thật nào. `readSourceEpoch` chỉ trả metadata theo shape G2Q, với `operationHighwater=sourceEpoch` trong fixture này.

G2Q có thể dùng callback `readSourceEpoch` của G2R để từ chối kết quả kiểm G2P cũ. **Kết quả đọc không khóa phiên bản sau lần đọc cuối**; không thể thay CAS tại commit thật bằng hai lượt đối chiếu trước đó.

## Kiểm thử trên Emulator thực tế

Bài manual kiểm:

| Tình huống | Kết quả |
|---|---|
| Ghi baseline synthetic | Epoch 1; chưa cấp quyền phát hành |
| Ghi B rồi hoàn nguyên A bằng Firestore transaction | Epoch 2→3, hash cuối trở về A |
| Replay operation ID hoặc ghi với epoch cũ | Bị từ chối |
| Hai writer đồng thời dùng cùng `expectedEpoch` | Đúng một writer thành công |
| G2Q đọc trước/sau A→B→A có ghi epoch | `source-epoch-conflict` |
| Admin/server SDK sửa source ngoài writer G2R | Hash drift bị chặn ở lần ghi qua writer tiếp theo |
| Guest/admin khác/claim reviewer tự khai đọc draft | Bị deny theo Rules candidate G2M |
| Owner đọc draft của mình | Được allow theo candidate G2M |
| Owner/guest truy cập sidecar epoch từ client | Bị deny theo candidate G2M |
| Owner sửa/xóa chapter sau import | Bị deny theo candidate G2M |
| Owner client chuyển bản thảo sang `published` mà không cập nhật epoch | **Vẫn được allow** — blocker chưa giải quyết |

Firebase CLI 13.35.1/Firestore Emulator, Node 24 và Java 17 chạy được; test có các log `PERMISSION_DENIED` **dự kiến** ở trường hợp phải chặn. Emulator lúc khởi động cảnh báo thiếu Rules config do file config chỉ chứa host/port; manual script nạp chính xác candidate G2M qua Rules Unit Testing và quan sát quyền allow/deny thực tế. Không suy warning mặc định open là trạng thái Rules sau khi test nạp candidate.

## Blocker trước staging/production

1. **Owner hiện có đường ghi V49 không gắn sourceEpoch.** Rules G2M cho owner chuyển `draft → published` mà không đụng sidecar. Server SDK cũng có thể bỏ qua Rules. Vì vậy G2R chưa phải cơ chế bắt buộc epoch với *mọi* writer; nguồn thật chưa thể dùng kết quả G2Q làm quyền approve/release.
2. Cần chốt Firestore database/edition và source-writer topology; thống nhất mọi tuyến nhập EPUB, sửa bản thảo, xuất bản, import/admin để epoch tăng **trong cùng miền giao dịch** hoặc chặn đường ghi cũ bằng lộ trình migration. Không tự khóa các tuyến V49 live hay làm ảnh hưởng truyện đã xuất bản.
3. Phải thiết kế authority quyết định tại thời điểm commit: recheck phiên bản, assignment/revoke G2O, permit G1R, snapshot và public/private projection. Không có transaction phân tán Firestore–SQLite hoặc live reviewer API trong G2R.
4. Quy tắc published metadata lộ `importFingerprint` (G2L/G2M), độ sâu 160 index và việc xác nhận số chương trước publish vẫn chưa xử lý.
5. `@google-cloud/firestore` là server SDK, không chịu Firestore Security Rules. Bài quyền client chạy riêng bằng Rules Unit Testing, không dùng kết quả SDK server để tuyên bố IAM đã được bảo vệ. Không cấp role tác giả/reviewer từ client.

## Chạy lại và rollback

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2r.json \
  --only firestore --project demo-vangioi-g2r \
  'node cloudflare/tests/manual/vangioi-g2r-source-epoch-emulator.mjs'
node cloudflare/tests/vangioi-v49-emulator-epoch-g2r.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Kết quả local: unit G2R **8/8 PASS** và manual Firestore Emulator **PASS** (thử thật giao dịch/Rules, phát hiện owner publish bypass). Hồi quy Cloudflare **719/719 PASS**, ứng dụng **103/103 test files PASS**, Functions **2/2 test files PASS**, Wrangler **dry-run PASS**. CI cần được đối chiếu riêng sau commit G2R. Không deploy Firestore Rules, không đổi `firebase.json`, không kết nối account/live Worker/Creator, không chạm dữ liệu thật.

Rollback: bỏ module G2R, hai bộ test, file config Emulator và liên kết README. Dữ liệu tổng hợp được dọn khi Emulator tắt, không có migration hoặc state production cần hoàn nguyên.
