# G2N — Kiểm toàn vẹn bản thảo EPUB V49 và phân quyền người kiểm duyệt (fixture server)

Ngày 27/10/2026. Nền G2M `3ae8557`. Đây là **kiểm tra thử nghiệm chỉ đọc ở tầng dịch vụ tin cậy**, không sửa `js/epub-production-v49.js`, Firestore Rules, Firebase SDK, registry quyền chuyển thể hoặc luồng publish đang sử dụng. Chưa có edition/database staging hoặc cổng reviewer/publisher thực, nên các dependency chỉ là callback tổng hợp; **không xem đây là tính năng đã hoạt động trên web**.

## Phần code đã thêm

`cloudflare/src/vangioi-v49-draft-integrity-g2n.mjs` xuất hai hàm độc lập:

- `hashV49DraftSnapshot(snapshot,{storyId})`: kiểm **tất cả** mục `chapterIndex` và văn bản từng chương, kể cả mục giữa của 160 chương mà Rules ứng viên G2M chưa kiểm sâu được. Kiểm id theo thứ tự `chapter-0001`, title, word count thực, độ dài UTF-16 và byte UTF-8, cấm các trường lạ của index/chapter, chapter thừa/thiếu/trùng/sai order. Tạo mã SHA-256 cho từng chương và mã băm gốc trên book/index/các mã băm con. Hàm không cấp quyền và không dùng `importFingerprint` V57 để làm chữ ký hay giấy phép.
- `createV49DraftIntegrityInspection({verify,readDraftHeader,readConsistentSnapshot,readSourcePin,readReviewerAssignment,now})`: trả một hàm `inspect(request,{storyId,mode})`. Toàn bộ sáu callback **phải do máy chủ cung cấp**. Dịch vụ này không khởi tạo Firebase, không đọc credentials, không ghi Firestore/SQLite, không tích hợp Worker/HTTP đang dùng.

## Chính sách nghiệp vụ G2N

| Vai trò có danh tính được server xác minh | `prepublish` | `review` |
| --- | --- | --- |
| Tác giả, đúng `ownerUid`, custom claim `admin:true` đã xác minh | Được **tiền kiểm read-only** | Được xem kết quả tiền kiểm |
| Reviewer khác chủ, có assignment **đang active** của server, trùng story ID/source hash/pin revision/scope, chưa hết hạn | Từ chối | Chỉ được xem **kết quả kiểm tra**, chưa nhận prose/chương |
| Admin khác không có assignment, người thường, guest, token lỗi | Từ chối | Từ chối |

Không lấy UID, admin, reviewer, `assignedStoryIds`, `sourceHash`, `pin` hoặc quyền publish từ JSON client. Callback `verify` phải giải mã/xác minh phiên server; `readSourcePin` và `readReviewerAssignment` phải tra nguồn mà client không ghi được. Mỗi kết quả thành công đều `inspectionOnly:true` và `canPublish:false`. Không tồn tại route thực để trả văn bản riêng cho reviewer.

### Chuỗi kiểm tra

1. Xác minh phiên và `mode`; lấy header `draft` + pin nguồn từ server. **Không tải nội dung chương** nếu chưa chứng minh chủ sở hữu hoặc có phân công reviewer hiện hành.
2. Đọc một snapshot hoàn chỉnh **nhất quán** do host bảo đảm; kiểm tất cả chương, tính SHA-256. Pin server phải khớp `sourceHash` và chủ sách. V57 fingerprint không được dùng thay pin.
3. Đọc lại pin; với reviewer, đọc lại assignment. Thay revision, thu hồi, quá hạn hoặc khác nội dung đều bị chặn. Đọc lại header để phát hiện trạng thái đã chuyển `published`, thay thời gian cập nhật hoặc đổi index trong giai đoạn kiểm.
4. Trả **metadata tối thiểu**, không trả prose, cover, đường dẫn Firestore, Firebase Auth, record assignment hoặc secret của registry. `sourceHash` ở đây là SHA-256 nội bộ của phép kiểm G2N, **khác** `storyVersion` của G1Q và tuyệt đối **không phải adaptation permit**.

## Các điều kiện còn thiếu trước khi triển khai thật

1. **Không có bản pin nguồn bền vững hoặc assignment reviewer thật**. G2N đòi callback server đọc từ kho được quản lý; fixture chỉ mô phỏng cả hai. Cấm cho tác giả tự đặt pin khớp sách rồi dùng nó làm chứng nhận.
2. **Snapshot Firestore V49 thực chưa được kết nối.** Một lần đọc nhất quán toàn bộ 160 chương lớn có thể cần chiến lược theo version/freeze thay vì một giao dịch Firestore lớn. G1T có giới hạn payload chuyển thể 1 MiB; không lấy giới hạn đó ép lên bản EPUB V49 đang tồn tại. G2N chỉ kiểm payload fixture được host đưa vào.
3. **Không có transaction xuyên Firestore và sổ reviewer/pin.** Các lần recheck giảm một số lỗi đổi trạng thái trong lúc kiểm, nhưng không khóa thay đổi xuất hiện ngay sau lần kiểm cuối. Lệnh xuất bản thực phải xác minh lại trong authority commit với khóa phiên bản hoặc cơ chế CAS/server publication. G2N không được gọi là phát hành an toàn.
4. **Công khai metadata published của G2L vẫn chưa sửa.** Không thay đổi quyền đọc công khai EPUB và không thay Rules emulator G2M. Các trường như `importFingerprint` vẫn ở parent document công khai sau publish.
5. Quyền tác giả EPUB `admin:true` không tự trở thành quyền chuyển thể Vạn Giới; permit của G1R/G1Q và kiểm lại ở G1Y tiếp tục độc lập. Chưa bật UI reviewer, nguồn truyện thật, Canon, thưởng, NPC AI hoặc 48 seed.

## QA và rollback

Chạy từ repo root sau khi cài đúng dependencies `cloudflare`:

```sh
node cloudflare/tests/vangioi-v49-draft-integrity-g2n.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

Các phép thử bao gồm đúng chủ/assignment, admin khác bị từ chối **trước khi đọc prose**, tự khai quyền trong body không tác dụng, assignment giả/thu hồi/hết hạn/stale pin, thay source SHA-256, header đổi trạng thái, chapter giữa bị bẩn, sai thứ tự/word count/trùng/thiếu/thừa, text quá byte và đủ **160 chương**, cũng như ebook nhiều chương có tổng văn bản trên 1 MiB (không áp thêm trần intake G1F vào V49).

Kết quả local thực tế: **G2N 11/11 PASS**, Cloudflare **669/669 PASS**, app **103/103 test files PASS**, Functions **2/2 test files PASS**; Wrangler dry-run thành công, không phát hành Worker. Cả bài test riêng lẫn bộ hồi quy đều không cần Firestore thật, tài khoản thật hay project credentials.

Rollback G2N: bỏ module thuần kiểm tra, file test và tài liệu này cùng liên kết README. Không có migration, dữ liệu, Firestore Rules, tác vụ nền hay quyền reviewer thật để khôi phục.
