# G2Y — Giữ khẩn cấp lặp lại và bàn giao G2 → G3 (chỉ Emulator)

Ngày 27/10/2026. Baseline `1a71f1a` (LIB1-UI2 sau G2X). Chủ dự án yêu cầu chốt phần kỹ thuật G2 để phát triển G3. **"Chốt G2" ở đây là chốt loạt nguyên mẫu/hợp đồng/kiểm thử, KHÔNG chứng nhận hệ thống Vạn Giới hay thư viện đã sẵn sàng phát hành.** Không triển khai Firestore thật, IAM, Rules, migration hoặc quyền publisher.

## Nút thắt được xử lý

G2V có `emergencyHide` để ẩn ngay sách `published`, và `recoveryReview` chỉ đổi hold sang `review-ready`, giữ sách ở `draft`. G2W đã chặn tất cả public writer đi qua facade khi bất kỳ hold document nào tồn tại. Tuy nhiên chưa có thao tác được kiểm soát để tạo vụ giữ khẩn cấp mới sau `review-ready`, hoặc khẩn cấp lại khi một writer Admin SDK ngoài facade tự đưa sách ra công khai.

`cloudflare/src/vangioi-v49-emergency-hold-g2v.mjs` nay thêm API **`reassertEmergencyHold`** chỉ trong Firestore Emulator `demo-vangioi-g2v`, sử dụng callback `verifyEmergency` do test host cung cấp (hai UID khác nhau, scoped story/case/reason). Trong một transaction:

1. Kiểm `operationId` UUID mới, `expectedHoldRevision` CAS, sách và hold cùng owner/story. Chỉ chấp nhận hold `held` hoặc `review-ready`, yêu cầu **mã vụ việc mới**. Từ chối operation/case replay, revision lỗi, lịch sử lệch hoặc hold mất/hỏng.
2. Tạo **biên bản case mới bất biến** trong `vg_fixture_v49_emergency_holds_g2v/{storyId}/cases/{caseId}`; với hold G2V cũ chưa có ledger, ghi **baseline hồi tố có nhãn `backfilledFromHold:true`**, không dựng lại bằng chứng hay giả mạo nguồn. Các lần sau phải có case gần nhất hợp lệ. `holdRevision` tăng đúng một cho reassert, không reset về 1.
3. Cập nhật hold thành `held` với case/reason/actor mới và `reheldAt`; đánh dấu mọi recovery clearance đang có thành `superseded`. Không sinh clearance hợp lệ mới.
4. Nếu sách đã bị writer có đặc quyền ngoài facade sửa thành `published`, đưa sách về `draft`, bỏ `publishedAt`; khi bản ghi epoch hợp lệ về **cấu trúc** thì tăng epoch, còn epoch hỏng/thiếu không được tự vá. Trên sách đã `draft`, không tự tăng epoch. Mọi đường giữ mới đều ghi `sourceEpochAttested:false` vì chưa đọc toàn bộ nội dung.
5. Ghi receipt operation mới. Không được coi review-ready/hold mới là cấp `canRepublish`, không gỡ tombstone/hold, không tự phát hành world hoặc cấp XP/Xu/Kho. G2W tiếp tục chặn mọi `publishDraft` và `restoreAfterHold` với hold đang tồn tại.

## Kiểm chứng và rủi ro được giữ nguyên

- Unit: `node cloudflare/tests/vangioi-g2y-repeat-hold.test.mjs` kiểm 8 nhóm, gồm book công khai bị rò, epoch hỏng, trùng case, stale revision, chuỗi nhiều generation, approval giả và chặn khôi phục.
- Emulator thực: tái dùng `cloudflare/tests/manual/vangioi-g2w-writer-fence-emulator.mjs` với G2S Rules fixture. Test diễn tập: raw Admin SDK **vẫn có thể** làm sách held xuất hiện công khai (negative case); G2Y reassert ẩn lại; guest không đọc được; hai lượt hold tiếp theo dùng case mới; clearance cũ bị vô hiệu; G2W tiếp tục từ chối publish/restore; stale case/revision bị từ chối.
- Cập nhật checksum duy nhất của module G2V trong `v49-writer-inventory-g2x.json`. G2X scanner tiếp tục đòi đúng 6 V49 writer, 1 source Admin SDK, 8 checksum. **Không thay scanner và không coi checksum mới là chứng nhận an toàn sản xuất.**
- `reassertEmergencyHold` là **biện pháp giảm thiệt hại sau khi phát hiện**, không ngăn Admin SDK bị cấu hình quá quyền ghi public ở lượt đầu. Firestore Rules không chặn được Admin SDK, nội dung đã cache/tải về không thể tự thu hồi. Lịch sử cases là chứng cứ thử nghiệm chứ không phải bằng chứng pháp lý hoặc ký nhận IAM thật.
- Firestore instance/edition/region thật chưa được chọn, nên không chạy lệnh list/get/create databases, không truy cập Firebase project `truyendienvl`, không đổi Rules thật. Không có release workflow độc lập, mã ký hai người thật, appeals, audit producer, atomic sync từ SQLite, service principal/publisher cutover hoặc staging thật.

## Quyết định đóng G2 (đúng phạm vi)

| Hạng mục | Trạng thái sau G2Y |
|---|---|
| Hợp đồng nguồn, permit/revoke, snapshot, schema world và test G1–G2 | Đã triển khai ở mức offline/test tương ứng, không phải luồng duyệt/phát hành thật |
| Firebase source đọc/đối soát, epoch, review/publish/ẩn/rehold | Đã có mô phỏng/Firestore Emulator tách biệt, chưa kết nối project thật |
| Ngăn client tự publish | G2S Rules **candidate** đã test emulator; **chưa deploy** |
| Ngăn Admin SDK ngoài writer facade | **CHƯA ĐẠT**; G2X mới giám sát source và G2Y giảm rủi ro sau khi rò |
| Luồng EPUB/trình viết Thư viện, popup LIB1 | Hai luồng legacy còn hai nơi lưu; popup đồng bộ lựa chọn, chưa hợp nhất backend |
| Nguồn Thư viện → world draft | Có hợp đồng, chưa có source picker/permit check end-to-end với Firebase/SQLite thật |
| Production/staging, IAM/Rules/DB edition, migration/cutover | **Không thực hiện, chưa được phê duyệt** |

**Kết luận kỹ thuật:** G2Y đóng chuỗi G2A–G2Y ở cấp độ *fixture/emulator & chính sách fail-closed*. Các bước G3 có thể tiếp tục **offline/editor/UX/adapter mock** trên nền hiện tại. Không được lấy nhãn “G2 xong” làm giấy phép mở publisher, gameplay thế giới thật hoặc tham chiếu truyện không có quyền.

## Phạm vi G3 được khuyến nghị

1. Thiết kế adapter nguồn Thư viện từ **cả hai schema legacy và EPUB V49**, phân biệt ID/phiên bản/hash, chapter manifest, quyền đọc và quyền chuyển thể. Dùng fixture/read-only; không copy lại truyện hoặc tự cấp quyền.
2. Source picker trong Vạn Giới theo từng arc, thử với truyện ngắn và truyện dài bằng mock, biểu thị rõ trạng thái quyền, thu hồi, cập nhật phiên bản và thay đổi canon.
3. Khi vận hành muốn staging: yêu cầu quyết định riêng của An Du về instance/edition/region, IAM, service identities, cutover V49 legacy, Rules, logging, content cache và kịch bản phục hồi/appeal. Đó là một **gate khác**, không phải hệ quả tự động của G2Y.

## Chạy lại và rollback

```sh
node cloudflare/tests/vangioi-g2y-repeat-hold.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2v.json \
  --only firestore --project demo-vangioi-g2v \
  'node cloudflare/tests/manual/vangioi-g2w-writer-fence-emulator.mjs'
node tools/vangioi/audit-v49-writers-g2x.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Rollback source theo commit G2Y: hoàn nguyên phần `reassertEmergencyHold`, bài test/hợp đồng mới và checksum G2V trong manifest. Không có dữ liệu Firebase thật để rollback. Với fixture/emulator của G2Y, xóa dữ liệu thử nghiệm bằng reset riêng **chỉ trong project `demo`**; không được chạy reset trên instance thực.

## Kết quả xác minh trước commit

- Unit G2Y: **8/8 đạt**; toàn bộ Cloudflare test suite **802/802 đạt**.
- Web/app **104/104** và Functions **2/2** đạt. `npm run build --prefix cloudflare` hoàn tất **`wrangler deploy --dry-run`**, không deploy.
- Firestore Emulator thực `demo-vangioi-g2v`, G2S candidate Rules nạp qua `initializeTestEnvironment`: **PASS**, gồm Admin SDK bypass (negative case), re-hide, case history, clearance superseded, G2W publish/restore denied, stale revision/case và **hai reassert cạnh tranh chỉ một thành công**.
- Static G2X inventory: **PASS** — 6 V49 writer, 1 Admin SDK, 8 pinned source; `productionEnforced:false`, `iamChanged:false`. Đây không phải kiểm thử IAM thật.
- Kiểm thử browser/live Firebase/staging: **không thực hiện**. GitHub Actions cần xác nhận riêng sau commit.
