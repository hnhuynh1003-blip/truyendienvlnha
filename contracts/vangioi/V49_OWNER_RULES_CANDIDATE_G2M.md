# G2M — Rules ứng viên: bản thảo EPUB V49 chỉ thuộc tác giả, thử nghiệm Emulator

Ngày 27/10/2026. Nền G2L `39de923`. Quyết định chủ dự án: **tác giả chỉ xem và chỉnh bản thảo của mình**. Người làm reviewer chỉ được truy cập sau khi một **dịch vụ tin cậy xác minh phân công trên server**; không xem `admin:true` hay các trường reviewer/assignment do client tự khai là giấy phép xem tất cả bản thảo.

## Đã soạn, chưa kích hoạt

- `cloudflare/tests/fixtures/vangioi-g2m-v49-owner-only.rules`: **bộ Rules độc lập dành riêng cho Firestore Emulator**. File này mặc định từ chối tất cả ngoài đường EPUB V49; **tuyệt đối không thay cả Rules của Firebase project thật** (vốn có nhiều collection khác). Chưa có Firestore database/edition hoặc full Rules production để merge.
- `tools/vangioi/firebase-emulator-g2m.json`: duy nhất `127.0.0.1:18083`; dự án tổng hợp `demo-vangioi-g2m`. Script `cloudflare/tests/manual/vangioi-g2m-owner-rules-emulator.mjs` từ chối chạy sai host/project hoặc khi có `GOOGLE_APPLICATION_CREDENTIALS`. Nó nạp candidate trực tiếp vào Rules Unit Testing; dữ liệu chỉ nằm trong Emulator.
- `cloudflare/tests/vangioi-g2m-owner-rules-candidate.test.mjs`: kiểm ngăn nối vào app/live, tính nhất quán với V49 và các kịch bản tấn công bắt buộc.
- Không sửa `security/firestore-epub-v49.rules.review`, `security/firestore-spark-personal-v53.rules.review`, `firebase.json`, client EPUB, Worker, tài khoản, Auth Claims, Firebase IAM hay dữ liệu.

## Hợp đồng vận hành được giữ

| Nghiệp vụ EPUB V49 hiện có | Rules ứng viên |
| --- | --- |
| Guest đọc book/chapter `published` và `where(status==published).limit(60)` | Cho đọc; danh sách không lọc published bị từ chối |
| Owner có `admin:true` nhập book `importing`, batch tạo chapter | Cho khi đúng UID và schema/giới hạn |
| Owner tạm dừng rồi đọc book/chapter `importing` hoặc `draft` để resume | Cho owner; guest/reader/admin khác bị chặn |
| Owner xác minh số chương bằng list chương, chuyển `importing → draft → published` | Cho đúng trình tự và các trường được sửa |
| Admin khác hoặc client tự ghi `reviewer:true`/`assignedStoryIds` muốn xem bản thảo | Từ chối. Reviewer phải dùng API sau này dựa trên assignment server-side |
| Người viết thêm trường lạ, đổi chủ/quyền, sửa title hay ngày tạo khi chuyển trạng thái | Từ chối qua schema validator và transition field whitelist |
| Chương bị sửa/xóa sau tạo hoặc sách bị xóa | Từ chối |

Kiểu dữ liệu theo `js/epub-production-v49.js`: book bắt buộc `id/title/author/genre/status/ownerUid/chapterCount/chapterIndex/createdAt/updatedAt/sourceName/importSchema/importFingerprint/coverImage`, chỉ thêm `publishedAt` lúc published; chapter bắt buộc `id/order/title/content/wordCount`. Các chuỗi và danh sách được chặn kích thước, chapter kiểm thêm UTF-8 byte limit. Validator `validBookV49` được gọi **ở cả create và update**. `ownerUid` được đối chiếu UID trong token đã xác thực, không do dữ liệu sách tự cấp quyền.

## Giới hạn và những điều G2M không thể tuyên bố đã sửa

1. **Metadata của sách published vẫn lộ toàn document**, bao gồm `importFingerprint`, `sourceName`, `ownerUid`. Firestore Rules không ẩn theo trường. Đây vẫn là phát hiện mở của G2L; muốn tách public projection và dữ liệu nội bộ phải có thiết kế/migration riêng, xét cả độc giả V49 cũ.
2. **Kiểm sâu chapterIndex và tính đầy đủ trước publish chưa chứng minh được ở Rules**: Firestore Rules không có phép lặp qua cả 160 phần tử. Candidate kiểm schema index đầu/cuối và ràng buộc từng ô index khi một chương được tạo, nhưng không chứng minh tất cả 160 phần tử tốt hoặc 160 chương đã tồn tại trước publish. V49 client kiểm số chương trước publish, song client không phải hàng rào chống gian lận. Cần validator trusted server hoặc giới hạn lại mô hình khi thiết kế production. Không dùng candidate để đảm bảo dữ liệu sách mọi trường hợp hợp lệ.
3. `createdAt/updatedAt/publishedAt` của V49 là **ISO string** do client tạo, chỉ kiểm định dạng; chưa thể xác nhận thời điểm thật bằng server timestamp khi chưa thay schema V49. `importFingerprint` V57 là định danh kiểm trùng, **không phải chữ ký quyền chuyển thể**.
4. Còn phải xác định Firestore edition, database và **Rules đang deploy thực tế**; kiểm tất cả collections và dữ liệu EPUB đã tồn tại; reviewer assignment/permit ở SQLite cần API được cấp quyền riêng. Không suy ra Vạn Giới đã đủ điều kiện dùng nội dung truyện từ việc EPUB có `published`.

## Reproduce, tiêu chí bảo vệ và rollback

Từ gốc repo, chỉ với Emulator và dữ liệu tổng hợp:

```sh
npm install --no-save --no-package-lock --prefix cloudflare @firebase/rules-unit-testing firebase
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2m.json \
  --only firestore --project demo-vangioi-g2m \
  'node cloudflare/tests/manual/vangioi-g2m-owner-rules-emulator.mjs'
node --test cloudflare/tests/vangioi-g2m-owner-rules-candidate.test.mjs
```

Manual test thực hiện cả công việc hợp lệ của người viết lẫn trường hợp từ chối: public list không lọc, guest/nonadmin/admin khác đọc draft và chương, claim reviewer tự khai, giả chủ, schema không đúng, bổ sung field, title 25k ký tự, mảng chương thừa, byte/character vượt hạn, chương mồ côi, quyền chỉnh sửa sau publish, field bất biến và trạng thái nhảy cóc. **Những ca phủ định phải trả `PERMISSION_DENIED`**. Report bao gồm cờ `publicParentMetadataStillExposed:true` để không quên lỗi thứ ba.

Kết quả chạy cục bộ: **15 ca đúng quyền được chấp nhận, 53 ca không đúng quyền bị từ chối**, Emulator trả `functionalChecks:'pass'`. Đã kiểm cú pháp Rules thông qua biên dịch/nạp thực tế vào Rules Emulator (Firestore Emulator 1.19.8). Hồi quy Worker **658/658 PASS**, app **103/103 test files PASS**, Functions **2/2 test files PASS**; Cloudflare Wrangler `--dry-run` hoàn thành. Các bài thử thực thi cần child process được chạy ngoài sandbox chặn fork để tránh `EPERM` giả.

### Đánh giá an toàn của riêng candidate (không phải Firestore project thật)

```json
{
  "score": 3,
  "summary": "G2M candidate giải quyết cross-admin draft read và transition schema pollution đã thấy ở G2L; giữ public EPUB V49 nhưng chưa phù hợp để merge vào Rules thật",
  "findings": [
    {
      "check": "Document-wide public metadata",
      "severity": "moderate",
      "issue": "Book published vẫn cho guest đọc importFingerprint, ownerUid và sourceName",
      "recommendation": "Chốt public/private projection rồi thay V49 reader/import có kế hoạch migration riêng"
    },
    {
      "check": "Deep chapterIndex and publish completeness",
      "severity": "moderate",
      "issue": "Rules không duyệt toàn bộ 160 map entries và không thể xác nhận mọi chapter đã có trước publish",
      "recommendation": "Dùng trusted server pre-publish validator hoặc cơ chế manifest server-managed; giữ candidate ở Emulator"
    },
    {
      "check": "Client timestamps and reviewer assignment",
      "severity": "moderate",
      "issue": "ISO date string chỉ kiểm format; reviewer chưa có trusted server assignment API",
      "recommendation": "Thiết kế server timestamps/assignment, đối chiếu database edition và production Rules trước khi nối thật"
    }
  ]
}
```

Điểm đánh giá ứng viên trong phạm vi riêng V49: **3/5 (prototype)** — chưa đủ làm bộ Rules hoàn chỉnh để triển khai. Rollback G2M: bỏ đúng **năm file** mới và liên kết tài liệu; không có thay đổi database/Rules chạy thật cần phục hồi.
