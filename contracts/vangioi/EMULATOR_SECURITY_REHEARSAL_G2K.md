# G2K — Diễn tập ranh giới host EPUB V49 trên Firestore Emulator riêng

27/10/2026. Kế thừa G2J `c7605bb`: thiết kế phân quyền staging và bản khai offline **chưa được duyệt để kết nối thật**. G2K bổ sung lớp kiểm đầu vào emulator + diễn tập G1T → G1S → G1Q với project `demo-vangioi-g2k`, host `127.0.0.1:18081`, và các callback danh tính/permit hoàn toàn tổng hợp.

**Không tạo project/database/edition thật, không lấy credentials, không thay Firestore Rules, IAM, `firebase.json`, frontend EPUB, registry SQL, Worker route, 48 seed, gameplay hay quyền tác giả.** Đây là bài diễn tập **host-side source preparation**, không phải Security Rules test của Firebase browser client.

## 1. Mục tiêu và ranh giới

`cloudflare/src/vangioi-g2k-emulator-boundary.mjs` xuất:

- `G2K_EMULATOR_PROJECT='demo-vangioi-g2k'`, `G2K_EMULATOR_PORT=18081`.
- `assertG2KLocalEmulator({emulatorHost,firestoreProjectId,credentialPath,activeProjectId})`: bắt buộc localhost/127.0.0.1 đúng port, đúng project demo, từ chối credentials path và project môi trường khác. Phải chạy **trước** bất cứ lệnh đọc/ghi Firestore Emulator.
- `createG2KEmulatorSourceRehearsal({firestore,emulatorHost,credentialPath,activeProjectId,verify,isOperator,readAdaptationPermit})`: xác nhận `firestore.projectId` và đầu vào tin cậy rồi ghép nguyên các module G1T, G1S, G1Q thành `prepare(request,{storyId,authorizedUid,requestId})`. Không gọi registry register, không cấp source grant, không tạo review/publish/session.

Các callback `verify`, `isOperator`, `readAdaptationPermit` do **test host tổng hợp** cấp, không được lấy từ JSON của browser. Dù test `verify` trả `admin:true`, `isOperator` độc lập vẫn từ chối tác giả không được phân công. Permit phải cùng `storyId`, `contentHash`, recipient, revision và active status; book `ownerUid/published/admin` không thể cấp permit. V49 source đổi hash sẽ bị G1S/G1Q từ chối nếu giấy phép còn ghim hash cũ.

**Quan trọng:** `assertG2KLocalEmulator` chỉ kiểm cấu hình mà host tin cậy cung cấp; nó **không attestation mạng hoặc Google IAM**. Không cho import module vào production Worker/HTTP. Firestore Admin/server SDK có thể bỏ qua Firestore Security Rules; vì vậy smoke này **không** chứng minh guest đọc draft bị Rules chặn. Emulator dùng cấu hình riêng này **chưa nạp Rules, nên mặc định cho phép đọc/ghi**: seed bằng server SDK chỉ có giá trị thử đường ống dữ liệu, tuyệt đối không được báo là bài test Rules thành công. Đây là một phép thử *quy trình chuẩn bị nguồn trên server*, không phải bài nghiệm thu Firestore Rules, Firebase Auth hoặc môi trường staging đã deploy.

## 2. Các thử nghiệm âm tính và dương tính

| Ca diễn tập | Kỳ vọng fail-closed |
| --- | --- |
| Host production, `0.0.0.0`, cổng khác, project sai, credential file không rỗng | Dừng **trước** thao tác Firestore |
| Tác giả unassigned nhưng có tự khai `admin:true` | Không gọi reader/permit callback |
| Không xác thực hoặc input chứa `permitStatus`, `checkpoint` | Từ chối ngay |
| G1T đọc book/chapter synthetic theo một read-only transaction | Đúng thứ tự và canonical hash; không lấy bìa/claim làm permit |
| Permit callback báo revoke/không có/quyền sai recipient | Không có `registryInput` hợp lệ cho nguồn đó |
| Chapter sửa giữa hai lượt đọc, hoặc giấy phép vẫn mang hash trước khi sửa | `source-conflict` hoặc nguồn unavailable; không tự lấy lại quyền |
| Cả operator, permit và source cùng hợp lệ trong fixture | Chỉ trả **gói chuẩn bị nội bộ**; không có grant, publish, worldId, session hay rewards |

Unit test `cloudflare/tests/vangioi-g2k-emulator-boundary.test.mjs` dùng G1T transaction fixture trong bộ nhớ; **không chứng minh đã chạy Emulator**.

Manual smoke `cloudflare/tests/manual/vangioi-g2k-emulator.mjs` dùng SDK Firestore thực nhưng **chỉ khi** Emulator xác nhận tại localhost. Test tự tạo sách/chương synthetic, diễn tập không có operator, revoke permit, hash cũ, sau đó xóa đúng fixture giả vừa tạo. Config mới `tools/vangioi/firebase-emulator-g2k.json` là tệp emulator riêng, không phải config triển khai.

Đã chạy local bằng Firebase CLI 13.35.1 / Firestore Emulator 1.19.8 / Java 17 / Node 24: `PASS G2K` cho luồng host synthetic. CLI cảnh báo không có Rules và server SDK phát cảnh báo thử dò metadata môi trường nhưng không xác thực hay kết nối Firebase project thật. Không đánh đồng bài chạy này với quyền IAM hoặc Rules của production.

Lệnh khởi chạy ở root repo sau khi cài tạm `@google-cloud/firestore` vào thư mục `cloudflare` và có `firebase-tools` tương thích Java hiện tại:

```bash
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2k.json \
  --only firestore --project demo-vangioi-g2k \
  'node cloudflare/tests/manual/vangioi-g2k-emulator.mjs'
```

`firebase-tools` và `@google-cloud/firestore` **không phải runtime dependencies** của Vạn Giới; chỉ cài tạm để QA offline. Nếu Emulator không chạy được, ghi rõ `NOT RUN/BLOCKED`, không báo smoke PASS vì unit tests PASS.

## 3. Điều kiện vẫn chưa thỏa sau G2K

1. Firestore staging database/edition/region thật và phân quyền IAM/Rules phải được Du chốt theo G2J, **không tự tạo**.
2. Emulator host không chứng minh Admin SDK bị Rules chặn hoặc IAM đúng; cần bài QA client Rules bằng bản Rules đã được chủ dự án duyệt, và IAM service identity staging thực.
3. Callback operator/permit ở đây là synthetic, chưa phải SQLite authority+Auth đang phục vụ user. Trước source picker thật phải chứng minh token issuer, assignment, revoke/notice, TOCTOU ở thời điểm ghi và đọc, audit G2I, rollback.
4. Không có transaction phân tán Firestore–SQLite; không chốt chính sách nguồn pin sau unpublish, chia arc source cho truyện dài hoặc migration legacy.
5. Kết quả chuẩn bị source G1Q **có thể chứa chương nguyên tác ở `registryInput` nội bộ**, tuyệt đối không xuất gói đó qua public API. Chỉ đường đọc/preview có quyền và đã qua review mới được nối sau.

Rollback G2K: bỏ module, hai test, config emulator và tài liệu. Không chạm dữ liệu production, migration, Firestore Rules/IAM, SQL authority hay quyền chơi.
