# G2L — Kiểm toán Rules EPUB V49 bằng client mô phỏng trên Firebase Emulator

Ngày 27/10/2026. Nền G2K `66e4f09`. Đợt này **chỉ kiểm toán đoạn Rules đang chờ duyệt**, `security/firestore-epub-v49.rules.review`, bằng Rules Unit Testing và Firestore Emulator tại `127.0.0.1:18082`, project `demo-vangioi-g2l`. **Không sửa hay ghi đè** đoạn Rules, `firebase.json`, database/edition, IAM, Firebase Console, production hoặc ứng dụng V49. Edition staging vẫn chờ An Du lựa chọn: kết quả này là **quy tắc V49 cô lập trên Emulator**, không kiểm thử Rules của một database thật.

## 1. Phạm vi bằng chứng

- Đã đọc `js/epub-production-v49.js`: ứng dụng lọc `where('status','==','published')`, giới hạn 60 sách, đọc chương của book published; author `admin:true` import qua các trạng thái `importing → draft → published`.
- `security/firestore-epub-v49.rules.review` là một **snippet để hợp nhất có kiểm tra**, không phải file Rules hoàn chỉnh. `firebase.json` của repo chỉ khai báo Functions; không chứng minh đoạn này được triển khai lên Firebase.
- Bài manual `cloudflare/tests/manual/vangioi-g2l-v49-rules-emulator.mjs` đọc **nguyên văn** snippet, bọc bằng cú pháp `rules_version = '2' / service cloud.firestore / match ...` và `deny-all` ngoài phạm vi, rồi gửi nội dung **chỉ tới Emulator** qua `initializeTestEnvironment`. Đó là bản bao kiểm thử, không tạo chính sách bảo mật mới cho production.
- Test tạo hồ sơ tổng hợp trong Emulator bằng `withSecurityRulesDisabled`; sau đó gửi yêu cầu bằng **client có/không có mock Firebase Auth token**, để kiểm `assertSucceeds`/`assertFails` thực tế. Không dùng Admin SDK để kết luận Rules của client, không liên kết người dùng thật.
- Test kết thúc bằng `env.cleanup()`; Firestore Emulator dưới project `demo-*` tự đóng sau `emulators:exec`. Không có access token, service account hay migration thật.

## 2. Kết quả thử nghiệm thực tế

Đã chạy với Firebase CLI 13.35.1, Firestore Emulator 1.19.8, Node 24, Java 17. Bài manual trả `functionalChecks:'pass'` **nhưng** `reviewRequired:true`, vì phát hiện ba vấn đề của đoạn Rules chờ duyệt.

| Bài kiểm thử | Kết quả |
| --- | --- |
| Guest đọc sách/chương `published` | PASS — được phép theo chủ đích hiện hành |
| Guest/reader thường đọc draft/chương draft | PASS — bị từ chối |
| Guest query danh sách có `where(status==published)` | PASS — được phép; list toàn tập không có filter bị từ chối |
| Guest/nonadmin tạo sách; admin khác đặt `ownerUid` giả | PASS — bị từ chối |
| Admin đúng chủ tạo `importing`, tạo chương, chuyển trạng thái; admin khác cập nhật sách | PASS — luồng hợp lệ được phép, sửa của owner khác bị từ chối |
| **Admin B đọc draft của Admin A** | **PHÁT HIỆN** — được phép, vì rule `admin:true` cho đọc toàn bộ draft |
| **Admin A thêm field `arbitraryPrivilege` và title 25.000 ký tự khi chuyển `importing → draft`** | **PHÁT HIỆN** — được phép; validator update chưa khóa schema/các trường có thể thay |
| **Guest đọc book `published` kèm `importFingerprint`** | **PHÁT HIỆN** — được phép, vì Firestore Rules bảo vệ theo document chứ không ẩn riêng trường |

### JSON assessment — bản snippet, không phải trạng thái production

```json
{
  "score": 2,
  "summary": "Major nếu nhiều tài khoản tác giả cùng có custom claim admin; chưa đủ điều kiện merge/deploy đoạn review nguyên trạng",
  "findings": [
    {
      "check": "Cross-author draft confidentiality",
      "severity": "major",
      "issue": "Mọi người có admin:true đều được đọc draft của admin khác",
      "recommendation": "Cân nhắc giới hạn draft theo ownerUid hoặc quyền reviewer/operator riêng do backend cấp, trong khi giữ workflow admin hợp lệ"
    },
    {
      "check": "Update bypass / type and field validation",
      "severity": "moderate",
      "issue": "Admin chủ sở hữu được thêm field lạ, thay title kích thước lớn khi đổi status",
      "recommendation": "Validate schema ở create lẫn update, kiểm immutable fields và chỉ cho phép fields hợp lệ đổi theo mỗi state transition"
    },
    {
      "check": "Published document metadata exposure",
      "severity": "moderate",
      "issue": "Public book document có importFingerprint và thông tin khác không dành riêng cho đầu đọc",
      "recommendation": "Xác định trường nào thực sự được public; nếu cần giấu trường thì tách document/projection công khai riêng, vì Rules không che từng field"
    }
  ]
}
```

**Phân biệt chính xác:** `admin:true` trong test là **mock Auth claim của một tài khoản khác**. Đây không phải bằng chứng người dùng thường có thể tự giả token admin ngoài đời. Vấn đề chỉ phát sinh **nếu** có nhiều tác giả/reviewer/admin hợp lệ và họ không được phép xem bản thảo của nhau. Chủ dự án cần chốt chính sách đó trước khi thay Rules.

## 3. Hướng sửa đề xuất (CHƯA SỬA RULES)

1. Chốt chính sách bản thảo: admin là chủ sở hữu sách, hay admin toàn Thư viện? Nếu chỉ tác giả có quyền trên sách mình, deny draft read của admin khác; reviewer cần entitlement riêng không suy từ claim `admin` dùng cho EPUB.
2. Bổ sung validator cho V49 book/chapter ở cả **create/update**, đúng các fields mà `js/epub-production-v49.js` thực sự tạo (`id`, `title`, `ownerUid`, `status`, `chapterIndex`, `createdAt`, `updatedAt`, `importFingerprint`, `publishedAt`, ...). Khóa các trường bất biến, giới hạn độ dài, không chấp nhận field tùy ý. Không áp dụng một schema thiếu field để vô tình khóa người đăng EPUB cũ.
3. Quyết định `importFingerprint`, sourceName, ownerUid có được công khai không. Nếu không, tách projection public thay vì trông mong Rules ẩn một vài fields trong cùng doc. Tránh chỉnh cơ chế độc giả V49 trước khi có kế hoạch tương thích.
4. Sau khi An Du chọn database/edition và bộ Rules thật, lập bản candidate **riêng**, chạy lại Rules Emulator, kiểm nghiệp vụ V49 và các collection khác, so sánh với Rules production đã backup. Chỉ sau phê duyệt độc lập mới xem xét cập nhật Rules thật.

## 4. Chạy lại QA và giới hạn

Các dependencies QA chỉ cài tạm `@firebase/rules-unit-testing` và `firebase`; không thêm vào package runtime. Lệnh tại repo root:

```bash
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2l.json \
  --only firestore --project demo-vangioi-g2l \
  'node cloudflare/tests/manual/vangioi-g2l-v49-rules-emulator.mjs'
```

Startup Emulator có thể cảnh báo Rules mặc định mở khi không có `firestore.rules` trong config. **Bài test nạp đoạn snippet trong `initializeTestEnvironment` và đã quan sát PERMISSION_DENIED thực tế ở các yêu cầu bị chặn**; không lấy cảnh báo khởi động làm kết luận quyền đang mở khi test đã chạy. Dù vậy đây vẫn là môi trường cô lập và chỉ test các ca V49 được liệt kê, không phải audit toàn bộ Rules của ứng dụng.

Test cục bộ `cloudflare/tests/vangioi-g2l-rules-review.test.mjs` kiểm ranh giới và ngăn nhầm tệp `.review` là config live; không thay thế Emulator. Chạy toàn bộ Worker/app/Functions và dry-run để hồi quy. Không cấp quyền chuyển thể, sửa Canon, bật creator picker, review/publisher, XP/Xu/Kho, AI hay 48 seed.

Rollback G2L: bỏ manual/unit tests, config emulator và contract. Không có dữ liệu thật/Rules thật để khôi phục.
