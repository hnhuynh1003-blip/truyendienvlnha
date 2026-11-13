# G2X — Kiểm kê writer đặc quyền và cổng phát hiện thay đổi V49

Ngày 27/10/2026. Baseline `788ab8f3` (G2W). VẠN GIỚI vẫn là authoring offline/Emulator; G2V/G2W đã chứng minh một Admin SDK có quyền có thể ghi `published` dù truyện đang bị giữ khẩn cấp. **G2X kiểm kê repository và thêm cảnh báo CI khi mã writer nhạy cảm thay đổi; chưa thể thay Firestore IAM hoặc chặn những service triển khai ngoài kho mã này.**

## Kết quả kiểm kê nguồn (không đồng nghĩa runtime/deployment)

| Tệp | Phân loại | Tình trạng và rủi ro |
|---|---|---|
| `js/epub-production-v49.js` | Firebase client, **không phải Admin SDK** | `importDraft` ghi bản nháp và `publishDraft` legacy cập nhật `published`; G2S candidate **chưa** deploy, khi áp dụng sẽ từ chối publish client. Không được gỡ đường cũ trước migration. |
| `js/epub-import-v48.js` | Browser caller | Gọi `production.publishDraft`; ghim checksum để các thay đổi gọi phát hành không bị bỏ qua. |
| `cloudflare/src/vangioi-v49-emulator-epoch-g2r.mjs` | Emulator source/epoch writer | Cập nhật draft/chapter/epoch, không trực tiếp phát hành public. Chưa nối thật. |
| `cloudflare/src/vangioi-v49-emulator-publish-g2t.mjs` | Emulator legacy publisher | Có đường `published` riêng, không đọc hold G2V; **chỉ demo project G2T**. Không được gọi như writer chuẩn ở staging/production. |
| `cloudflare/src/vangioi-v49-authority-visibility-g2u.mjs` | Emulator suspension writer | Gỡ sau thu hồi với notice + epoch hợp lệ; không xử lý hết trạng thái khẩn. |
| `cloudflare/src/vangioi-v49-emergency-hold-g2v.mjs` | Emulator emergency writer | Ẩn khẩn ngay cả khi sidecar hỏng; không tạo quyền khôi phục công khai. |
| `cloudflare/src/vangioi-v49-guarded-publisher-g2w.mjs` | Emulator guarded publisher | Kiểm hold, nguồn và quyền trong cùng transaction; **chỉ bảo vệ lời gọi qua facade**. Restore vẫn từ chối. |
| `cloudflare/src/vangioi-v49-firestore-reader.mjs` | Server read-only | G1T transaction reader `readOnly:true`, không phải writer; trả snapshot nguồn cho G1S. |
| `functions/index.js` | Firebase Admin SDK có trong repo | `getFirestore()` ghi `ai_usage_v2`, `ai_global_usage_v2`, `economy_accounts_v52` và receipt tương ứng; **không thấy literal/đường ghi `epub_stories_v49` trong source hiện tại**. Không chứng minh về deployed functions hay IAM đang có. |
| `cloudflare/src/index.mjs` và `cloudflare/src/collectibles.mjs` | Không thuộc EPUB V49 | `bucket.publishDraft()` là tuyến collectibles Durable Object khác, **không phải** EPUB publisher. |

## Tripwire mới

- `contracts/vangioi/v49-writer-inventory-g2x.json` lưu **6 file có tham chiếu trực tiếp EPUB V49 và thao tác ghi**, cùng checksum SHA-256; ghim thêm caller EPUB và Function Admin SDK (tổng **8** file).
- `tools/vangioi/audit-v49-writers-g2x.mjs` chỉ đọc `.js/.cjs/.mjs` dưới `js/`, `cloudflare/src/`, `functions/`. So checksum đã ghim, phát hiện file mới có literal `epub_stories_v49` và cú pháp ghi, phát hiện import Firebase Admin SDK hoặc Firestore Admin client mới, từ chối xóa/đổi danh mục nhưng chưa cập nhật kiểm kê.
- `cloudflare/tests/vangioi-g2x-writer-inventory.test.mjs` chạy cùng `npm test --prefix cloudflare`. Kiểm tra các trường hợp xuất hiện writer V49 mới, admin import mới, chỉnh `functions/index.js`, sửa `publishDraft` cũ, mất writer, manifest hỏng và trường hợp `publishDraft` không liên quan.
- Khi nguồn writer thay đổi có chủ đích: **xem diff và tác động IAM/canonical source trước**, quyết định đường ghi có tuân G2W và hold generation không, rồi mới cập nhật manifest và checksum. Không coi việc thay checksum là duyệt bảo mật. Đề xuất review bảo vệ nhánh/CODEOWNERS do chủ dự án cấu hình sau, **không tự sửa GitHub permissions**.

## Giới hạn của tripwire

1. Đây là **quét từ khóa và checksum**, không phải AST/dataflow analysis. Có thể không phát hiện target ghép chuỗi, alias, dynamic collection, thư viện bên ngoài, code sinh tự động, artifact/deploy cũ, worker khác repo hay Admin SDK của công cụ ngoài. `G2X PASS` **không** chứng minh không tồn tại bypass thực tế.
2. `functions/index.js` có Admin SDK phục vụ chức năng khác, nên phải kiểm kê service identity và quyền Firestore thật. Không được gỡ IAM của nó tùy tiện vì có thể làm hỏng quota/kinh tế hoặc các đường chạy khác. Không thể lấy Firestore client Rules làm bằng chứng giới hạn Admin SDK.
3. Cấu hình `firebase.json`, deployed Rules, service accounts, IAM bindings, database edition/ID/region, Cloudflare production routes và nguồn SQL G1R **không được truy cập hoặc thay đổi** trong G2X. Firestore edition thực chưa được chọn; hướng dẫn Firestore yêu cầu chốt instance trước khi cấu hình thật, nên phần IAM chỉ là đề xuất.
4. Không mở production, publishing thật, reviewer role, seed thế giới, EXP/Xu/Kho, NPC AI, economy hoặc V49 client migration.

## Thiết kế IAM/cutover cần phê duyệt sau

1. **Chốt cơ sở dữ liệu mục tiêu và vùng** (Standard/Enterprise, database ID, staging riêng), rồi kiểm kê các server/Functions/Workers đang deploy và danh sách principal thực có khả năng ghi. Chưa tự gọi Firebase CLI vào project đang sử dụng.
2. **Tách trách nhiệm:** độc giả/client chỉ qua Rules; nguồn Thư viện read-only; người duyệt chỉ phát hành quyết định server; một publisher service identity duy nhất thực thi transactional hold fence; operator gỡ khẩn có đường hai người phê chuẩn và biên nhận. Không dùng `admin:true` client làm publisher authorization.
3. **Chặn đường vòng ở hạ tầng:** xác minh giới hạn IAM mà edition/instance cho phép; nếu quyền viết chỉ được cấp ở phạm vi rộng hơn collection EPUB, cần cô lập database/identity hoặc proxy có kiểm soát để service khác không thể ghi trực tiếp V49. Không giả định một quy tắc Firestore có thể chặn Admin SDK. Không tự thu hồi role đang hoạt động.
4. **Chuyển đổi staging theo từng bước:** chọn đường writer chính, vô hiệu hóa/loại bỏ các entrypoint legacy theo migration được duyệt, thử direct-Admin denied bằng principal staging thực, thử G2V hold/revoke vs publish/review-ready, thu thập audit receipt và đo độ trễ đồng bộ quyền SQLite → Firebase.
5. **Rollback và nghiệm thu:** rollback có thể đưa server về read-only/không publish, nhưng không tự bật lại writer cũ có bypass. Thử giám sát failure/caches, kháng nghị và gỡ lần hai trước production; cần quyết định riêng của An Du.

## Lệnh và kết quả tại baseline

```sh
node tools/vangioi/audit-v49-writers-g2x.mjs
node cloudflare/tests/vangioi-g2x-writer-inventory.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

- Static audit baseline: **6 V49 writers được liệt kê, 1 Admin SDK source được nhận dạng, 8 checksum được ghim; không có writer mới lạ trong phạm vi quét**.
- Unit G2X: **14/14 đạt**, gồm các mẫu cố tình thêm Admin writer/tamper checksum để xác nhận CI từ chối.
- Hồi quy trước commit: Cloudflare **794/794 đạt**, ứng dụng **103/103 đạt**, Functions **2/2 đạt**; Wrangler `--dry-run` hoàn tất, không deploy. CI GitHub cần xác minh riêng sau commit.
- Đây là kiểm kê code và CI, không cần Firestore Emulator mới, credentials, database/migration/Rules deploy. Rollback: bỏ scanner, manifest, unit, tài liệu G2X và dòng README.
