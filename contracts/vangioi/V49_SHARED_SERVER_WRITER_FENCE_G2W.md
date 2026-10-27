# G2W — Diễn tập rào chắn ghi xuất bản ở server (V49)

Ngày 27/10/2026. Baseline `e6abaaf3` (G2V). Firestore Security Rules G2S chỉ giới hạn client; Admin SDK có IAM vẫn ghi thẳng `published` cho truyện đang `held` hoặc `review-ready`. **G2W bổ sung một facade writer thử nghiệm dùng chung transaction hold/source/authority, không tự tuyên bố đã chặn mọi Admin SDK ngoài facade.**

## Thực hiện

- Module `cloudflare/src/vangioi-v49-guarded-publisher-g2w.mjs` xuất `createG2WGuardedPublisher` và `assertG2WNoEmergencyHold`. Hai entry point là `publishDraft` và `restoreAfterHold`, cùng chạy kiểm tra hold trong **một Firestore transaction** với ghi public. Không có HTTP route, không nối Worker/Functions/V49 client.
- Chỉ sử dụng Firestore Emulator **`demo-vangioi-g2v` tại `127.0.0.1:18088`** và Rules fixture G2S. Dùng lại config `tools/vangioi/firebase-emulator-g2v.json` để kiểm chứng tương thích với G2V; không tạo database và không chạy lệnh production. Edition/database ID/region và IAM thật chưa được lựa chọn.
- `publishDraft` yêu cầu một publisher identity **do callback test host xác minh**, khớp story và intent. Sau callback, đọc book, sourceEpoch, authority, emergency hold, operation receipt và toàn bộ chương trong Firestore transaction. Nếu **bất kỳ hold document nào tồn tại** — `held`, `review-ready`, đã `released` hoặc record lạ/hỏng — từ chối. Khi không có hold, chỉ cho phép book `draft` có đầy đủ chương, G2N SHA-256, epoch CAS, permit/pin/reviewer/release projection G2T còn hợp lệ, operation ID mới. Cập nhật published + epoch + consumed authority + receipt cùng transaction; mặc định `productionAuthorized:false`.
- `restoreAfterHold` **luôn từ chối**: nếu hold tồn tại thì chặn ngay từ rào chắn chung; nếu không tồn tại thì vẫn yêu cầu **quy trình phê duyệt tái phát hành độc lập**, hiện chưa xây. G2V `review-ready` chỉ là kết quả xét chứng cứ, **không phải** quyền khôi phục công khai. Không sửa G2V hold/recovery hay xóa hold để mở khóa ngầm.
- `fixtureBeforeTransaction` chỉ để test host tạo hold hoặc thu hồi permit **trước** snapshot transaction. Xung đột concurrent publish được Firestore serialize. Không ghi trực tiếp Firestore từ callback browser.

## Điều bảo đảm trong phạm vi hẹp

1. Mọi thao tác đổi sang `published` **đi qua facade G2W** đọc hold trong cùng transaction; tạo hold trước snapshot thì không thể xuất bản, kể cả authority đã hồi phục. Hold hỏng không trở thành “không có hold”.
2. Quyền operator giả, operation replay, sai epoch/hash/authority, chương thiếu/thừa, permit bị thu hồi và hai lần publish cạnh tranh đều phải từ chối hoặc serialize. Client có `admin` claim giả cũng không thể sửa `published` hay hold khi áp dụng G2S candidate.
3. Khi publication hoàn tất *trước* lúc có emergency notice, việc ẩn phải là G2V/G2U transaction riêng. G2W không dự đoán được revoke tương lai và không cam kết xóa cache, offline EPUB hoặc nội dung đã tải.

## Blocker — không được hiểu nhầm thành production guard

1. **Admin SDK viết ngoài facade vẫn vượt Firestore Rules và hold.** Emulator test chứng minh đường bypass cũ còn hoạt động. G2W không hook vào `js/epub-production-v49.js`, Functions, Worker hay SDK sản xuất; không có quyền sửa IAM. Phải **kiểm kê mọi đường ghi privileged**, phân tách service accounts, giảm IAM, ép tất cả publisher/restorer dùng chung server service, log actor/receipt và viết test chống đường ghi mới, trước khi có thể gọi là rào chắn toàn hệ thống.
2. Chưa có phát hành lại hợp lệ sau khẩn cấp: thiết kế quyết định độc lập đa bên, hold generation/history (gỡ lại được nếu tái phát hành), khiếu nại, thời hạn hold, giám sát và rollback. Không xóa hold hay chuyển status thành `released` bằng yêu cầu client.
3. `verifyPublisher` và projection permit/reviewer của G2T là callback + dữ liệu **giả**; không có user claims, legal attestation, nguồn quyền SQLite/Firebase đồng bộ nguyên tử, watermark theo nguồn, HMAC, key rotation hoặc service IAM production.
4. V49 client hiện vẫn có `publishDraft()` legacy; Rules G2S chưa deploy và nếu dùng live sẽ làm nó không hoạt động. Không có migration nguồn, bản public/private projection, Firestore edition/instance chính thức, staging verification hoặc cache invalidation.
5. Không phát hành world, 48 seed, EXP/Xu/Kho, NPC AI, economy, Chủ Thần/Thiên Mệnh và không đụng dữ liệu Firebase thật.

## Chạy lại

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
node cloudflare/tests/vangioi-g2w-writer-fence.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2v.json \
  --only firestore --project demo-vangioi-g2v \
  'node cloudflare/tests/manual/vangioi-g2w-writer-fence-emulator.mjs'
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

### Kết quả bước đầu

- Unit G2W **12/12 đạt**.
- Firestore Emulator **đạt**: 2 publication hợp lệ, 1 emergency hide, **11** server requests bị chặn, recovery `review-ready` vẫn private, hold hỏng bị chặn, hold/revoke trước snapshot chặn publish, 2 publisher cạnh tranh chỉ 1 thành công. Test kiểm chứng **raw Admin SDK bypass vẫn mở**; kết quả này chỉ là bằng chứng chưa được xử lý, không phải thành công bảo mật end-to-end.
- Cloudflare toàn bộ **780/780 đạt**, ứng dụng **103/103 đạt**, Functions **2/2 đạt** và Wrangler **`--dry-run` thành công**. Kết quả CI GitHub cần xác minh riêng sau commit.
- Rules fixture có các `PERMISSION_DENIED` cố ý. Không deploy, không đổi Rules production, không migration và không có Firestore thật cần rollback. Rollback code: bỏ module/unit/manual/doc G2W và dòng README.
