# G2Q — Source Epoch & Fencing Contract cho EPUB V49

Ngày 27/10/2026. Baseline GitHub `dc80f4a` (G2P). Mục đích G2Q: xác định cách ngăn một biên nhận kiểm nguồn cũ được sử dụng khi nội dung đã thay đổi rồi hoàn nguyên về đúng bytes ban đầu (**A→B→A**, hay ABA). Đợt này tạo **bài thử/contract trong SQLite fixture**, không tích hợp Firebase production/staging.

## Chức năng đã triển khai

### Sổ `sourceEpoch` đơn điệu G2Q

`cloudflare/src/vangioi-v49-source-epoch-g2q.mjs` xuất `createV49FixtureSourceEpochLedger`. Host fixture phải cung cấp `storage.sql`, `storage.transactionSync`, `verifyOperator(request)`, `readVerifiedDraftProof({storyId})` và thời gian; namespace bắt buộc `projectId='demo-*'`, `environment='fixture'`.

- `recordObservedEpoch(request,{operationId,storyId,expectedEpoch})` ghi **một observation của bản thảo đã được thay đổi qua host thử nghiệm**. Chỉ operator do host xác thực được thao tác; hash, owner và số chương lấy từ snapshot server được G2N băm, không nhận từ request. Lần đầu `expectedEpoch:null` tạo `sourceEpoch=1`. Lần sau phải so sánh và trao đổi nguyên tử (*compare-and-swap*) với epoch hiện hành, rồi tăng **đúng 1**.
- Ghi tăng epoch ngay cả khi `sourceHash` không thay đổi. Vì vậy có thể lưu sự kiện **A→B→A** và những lần ghi có cùng bytes; chỉ so mã băm sẽ không phát hiện được.
- `recordObservedEpoch` ghi epoch mới và sự kiện append-only trong cùng transaction SQLite; UUID của operation chống replay; trigger chống xóa/lùi phiên bản hay sửa lịch sử qua những lệnh SQLite bình thường.
- `readSourceEpoch({storyId})` đọc một metadata fence nhất quán trong một transaction: `storyId`, `ownerUid`, `sourceEpoch`, `sourceHash`, `chapterCount` và `operationHighwater` của riêng story. Không trả văn chương, token, grant hay dữ liệu tài khoản.

**Ranh giới quan trọng:** tên phương thức là `recordObservedEpoch`, *không phải* `commitFirestoreSource`. Source fixture giả lập được cập nhật bên ngoài giao dịch SQLite rồi mới ghi observation. Chưa có cách bắt buộc tất cả tác giả/client phải ghi epoch trong cùng transaction với bản thảo; cũng chưa có rollback nguyên tử giữa hai store.

### Lớp fence bao quanh G2P

`cloudflare/src/vangioi-v49-epoch-fence-g2q.mjs` xuất `createV49EpochFencedRehearsal`. Nó đọc epoch trước khi gọi G2P, chỉ nhận kết quả `inspectionOnly:true`, `raceRehearsalOnly:true`, `canPublish:false` trùng hash/số chương, rồi đọc epoch lần cuối. Nếu `sourceEpoch`, `sourceHash`, số chương hoặc operation high-water khác nhau thì trả `{ok:false,code:'source-epoch-conflict'}`.

Nếu mọi kiểm tra khớp, chỉ trả metadata `epochFencedFixtureOnly:true`, `inspectionOnly:true`, `canPublish:false`; không sinh token và không làm thay chức năng xét quyền G2N/G2O/G2P. Tất cả callback phải do host tin cậy cấp lúc khởi tạo. Không có route public hoặc logic gửi duyệt thật.

## Ca kiểm thử

`cloudflare/tests/vangioi-v49-source-epoch-g2q.test.mjs` dùng SQLite `node:sqlite` thật; gồm 15 ca:

1. Ghi epoch đầu bằng proof từ snapshot, không lộ prose/quyền publish.
2. Từ chối operator/hash/owner tự khai từ client.
3. Epoch tiến 1→2→3 khi nguồn A→B→A, dù hash cuối bằng hash đầu.
4. Từ chối stale CAS, dùng lại operation UUID và bảo toàn lịch sử khi transaction lỗi.
5. Trigger cấm xóa epoch, sửa hoạt động hoặc đảo chiều phiên bản.
6. Không cho owner nguồn bị đổi và từ chối proof không hợp lệ.
7. Cách ly `projectId`/`storyId`, đọc fence trong một transaction.
8. Chủ nguồn kiểm tra bình thường qua G2N/G2O/G2P/G2Q.
9. Hai thay đổi A→B→A *có ghi epoch* khiến G2Q từ chối kết quả G2P vốn không thấy ABA.
10. Ghi lặp cùng bytes có epoch mới vẫn vô hiệu hóa kết quả cũ.
11. Thao tác trên story khác không làm nhiễu fence của story này.
12. Reviewer vẫn bị ràng buộc scope và thu hồi G2O.
13. Nguồn đổi nhưng chưa ghi epoch, hash thay đổi vẫn bị G2N bắt.
14. **Ca giới hạn có chủ đích:** A→B→A không ghi epoch *không thể được G2Q phát hiện*. Test ghi lại rủi ro, không phải ca bảo mật đã giải quyết.
15. Không có epoch, thiếu quyền hoặc môi trường production thì chặn; không import hai module G2Q vào Worker live.

## Điều kiện bắt buộc trước triển khai thật

1. **Epoch phải thuộc cùng miền transaction với source write.** Nếu Firestore là nguồn sự thật, mỗi mutation hợp lệ của book/chapter phải tăng `sourceEpoch` trong cùng Firestore transaction với mutation, dùng epoch cũ làm điều kiện CAS. Thao tác của import/converter/admin cũng phải đi qua cùng invariant; nếu có đường ghi lách, ABA vẫn tồn tại.
2. **Phải có một bước kiểm tại commit cuối cùng.** G2Q chỉ đo trước/sau lượt kiểm; nguồn có thể đổi ngay sau lần đọc cuối. Reviewer submit/publish tương lai phải xác minh epoch, hash, owner, phép chuyển thể, quyền reviewer và snapshot ngay trong giao dịch/authority quyết định commit. Chỉ read-after-read không đủ để loại TOCTOU.
3. **Quyền phải được kiểm tại máy chủ**: Firebase Auth/IAM/Firestore Rules, riêng quyền reviewer và permit G1R/G1Q, quyền thu hồi và source projection. Không đọc chương qua client chỉ vì có một biên nhận fixture.
4. **Không coi SQLite fixture như source epoch production**: bản hiện hành chỉ có metadata, không khóa writer của Firestore, chưa có source-side `sourceEpoch`, không có projection/consumer/CAS trong Firestore, không chịu được quản trị DB độc hại hoặc thay đổi không được ghi nhận.
5. G2L/G2M vẫn còn phân tách metadata `published` public/private và các giới hạn index; không điều chỉnh Rules, IAM, Firestore, EPUB live hoặc bật tài khoản/Creator picker trong đợt này.

## Hồi quy, rollback và bàn giao

```sh
node cloudflare/tests/vangioi-v49-source-epoch-g2q.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Kết quả local: G2Q **15/15 PASS**, Cloudflare **711/711 PASS**, ứng dụng **103/103 test files PASS**, Functions **2/2 test files PASS**, Wrangler **dry-run PASS**. CI trên GitHub phải được xác minh riêng sau commit. Không deploy Cloudflare Worker, Firebase Rules/migration hoặc phát hành world.

Rollback: bỏ hai module G2Q, test, contract này và liên kết README. G2N/G2O/G2P không bị sửa, schema SQLite G2O không đổi, không có migration hay dữ liệu production cần phục hồi.
