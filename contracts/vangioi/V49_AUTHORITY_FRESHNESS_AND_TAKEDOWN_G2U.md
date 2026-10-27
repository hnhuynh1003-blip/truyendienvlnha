# G2U — Diễn tập độ mới của quyền và ẩn truyện sau thu hồi (Emulator)

Ngày 27/10/2026. Baseline `aa874fea` (G2T). G2T giả lập phát hành có permit/reviewer trong Firestore transaction nhưng (1) bản quyền từ SQLite chưa đồng bộ và (2) revoke **sau** publish chưa làm truyện ẩn khỏi danh sách public V49. G2U làm một **kiểm toán độ mới chỉ đọc** và một **giao dịch ẩn sách thử nghiệm**, không dùng dữ liệu hay quyền thật.

## Mã nguồn

- `cloudflare/src/vangioi-v49-authority-visibility-g2u.mjs`: 
  - `createG2UAuthorityFreshnessAudit`: đọc high-water/digest nguồn SQLite *qua callback fixture tin cậy*, đọc một snapshot projection nguyên vẹn, rồi đọc lại high-water. So checkpoint/digest, giới hạn tuổi snapshot. Trả `fixtureAuditOnly:true`, `canPublish:false`, `preventsUnobservedRace:false`. Không thể khóa SQLite giữa hai DB hoặc xác minh chứng cứ pháp lý.
  - `createG2UEmulatorSuspender`: yêu cầu operator từ callback host, transactional read các bản ghi book published, sourceEpoch, authority, notice và operation; chỉ ẩn nếu đã có notice server-owned đang active, đúng revision/hash/epoch và `permit-revoked` hoặc `legal-hold` khớp. Ghi book sang trạng thái `draft` (loại `publishedAt`), tăng epoch, chuyển authority sang `suspended`, đánh dấu notice consumed và tạo receipt **trong một transaction**. `productionAuthorized:false` cố định.
- `cloudflare/tests/vangioi-g2u-authority-visibility.test.mjs`: kiểm quyền, checkpoint lag/ahead, checksum mismatch, tuổi dữ liệu, thay đổi nguồn giữa hai lần đọc, host/project và cấm credential.
- `cloudflare/tests/manual/vangioi-g2u-takedown-emulator.mjs`: thật sự chạy G2S Rules candidate cùng Firebase client và server SDK trong Firestore Emulator, thử trước/sau khi gỡ, guest vs owner, notice giả, thiếu notice, replay và tranh chấp.
- `tools/vangioi/firebase-emulator-g2u.json`: project demo riêng `demo-vangioi-g2u`, `127.0.0.1:18087`. Không dùng `firebase.json` của ứng dụng, không thêm deploy Rules.

## Gỡ truyện công khai (chỉ trong dữ liệu giả)

Trước khi gỡ: `epub_stories_v49/{storyId}` có `status='published'`, guest có thể đọc parent/chapter hoặc `where(status==published).limit(60)`.

Sau transaction: parent về `draft`, `publishedAt` bị bỏ đi, nên cùng G2S Rules candidate sẽ không cho guest xem parent/chapter, và query published không còn trả truyện đó. **Truyện khác không bị ảnh hưởng**; chủ bản thảo vẫn đọc được để lưu vết/giải quyết tranh chấp nhưng không được tự publish lại. Source chapter documents giữ nguyên, epoch được tăng và có receipt. Chỉ xử lý trạng thái public của bản thử; **không xóa nội dung hoặc dữ liệu người dùng**.

**Quan trọng:** V49 chưa có status `suspended` trong schema, nên chọn `draft` chỉ là phép thử tương thích. Authority bên cạnh mới lưu `status='suspended'`. Không áp dụng cách này vào sách thật nếu chưa thiết kế migration/state-machine, cache invalidation, truy cập offline, bản lưu cũ và cơ chế khiếu nại/phục hồi. Không thể thu hồi chương đã được độc giả tải/xem trước đó.

## Lỗ hổng vẫn còn trước staging

1. **Không có source-of-truth chung.** Kiểm toán hai lần đọc SQL chỉ phát hiện thay đổi *đã quan sát*; một revoke tại SQLite sau lượt đọc cuối có thể chưa được đẩy sang Firestore. Một `PASS` không cấp grant và không chứng minh freshness tại publish commit thật. Phải thiết kế đồng bộ outbox/offset hoặc quyết định authority trung tâm, SLA/lag và khóa quyền server.
2. Notice trong `vg_fixture_v49_takedown_notices_g2u` do **host giả lập** gieo, không phải G1X legal notice thật, chưa có signature, checkpoint attestation, actor legal authority, consumer và idempotency cross-DB.
3. G2U giả định có sourceEpoch, authority projection và notice phù hợp; khi thiếu/hỏng các bản ghi này, giao dịch từ chối. Với sự cố khẩn, sản phẩm thật cần **đường emergency hide độc lập** có quyền cao hơn và audit đặc biệt — chưa xây.
4. Không có public/private projection riêng; metadata parent published vẫn lộ `ownerUid`, `importFingerprint` như G2L/G2M. Việc đổi status không làm dữ liệu đã công bố trước đó biến mất khỏi cache/screenshot.
5. G2S Rules vẫn chỉ là candidate không thể deploy nguyên khối; V49 `publishDraft` cũ chưa chuyển sang server, Firestore edition/database/region/IAM thật chưa được duyệt.
6. Không nối Vạn Giới, Thiên Mệnh/Chủ Thần, 48 seed, kho, EXP/Xu, NPC AI, economy, world thật hoặc bất kỳ Firebase/Firestore account.

## Chạy lại

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
node cloudflare/tests/vangioi-g2u-authority-visibility.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2u.json \
  --only firestore --project demo-vangioi-g2u \
  'node cloudflare/tests/manual/vangioi-g2u-takedown-emulator.mjs'
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Sự kiện `PERMISSION_DENIED` ở client không có quyền là **đúng kỳ vọng**. Tất cả đều chạy trên dữ liệu tổng hợp của Emulator. Không gắn G2U vào Firebase Rules production, `js/epub-production-v49.js`, Worker route, Function hay migration.

**Kết quả local 27/10/2026:** unit G2U **11/11 PASS**; Firestore Emulator manual **PASS** — 3 truyện giả được ẩn, 12 lệnh server không hợp lệ bị từ chối, guest không còn lấy chương đã ẩn, một sách published khác không ảnh hưởng, client không tự khôi phục published. Authority freshness test phát hiện checkpoint lag/digest mismatch; không cấp publish. Cloudflare **754/754 PASS**, ứng dụng **103/103 test files PASS**, Functions **2/2 test files PASS**, Wrangler `--dry-run` PASS. GitHub CI/Pages phải xác minh riêng sau commit; kết quả này **không** xác nhận tác động trên Firebase production.

Rollback source: bỏ module/test/config G2U và dòng README; dữ liệu chỉ tồn tại trong Emulator và biến mất khi tắt.
