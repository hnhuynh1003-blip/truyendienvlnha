# DUDU Studio — R1.2: kế thừa tài khoản cũ (CHƯA PUBLISH)

**Quyết định B của An Du (04/11/2026).** Ba tài khoản sẵn có (1 tác giả, 2 độc giả/test) đều đã có document tại `profiles_v2`, trong khi ảnh Firestore chưa thấy collection `approved_accounts_v1`. Trạng thái này lý giải việc Rules R1.1 dự thảo chặn độc giả, nhưng chưa đủ để khẳng định Rules nào đang được Published.

## Quy tắc cấp quyền

| Trường hợp | Quyền cá nhân/EPUB | Ghi chú |
| --- | --- | --- |
| Chủ sở hữu có Firebase custom claim `admin:true` | Có | Không dựa vào trường `role` do client sửa được |
| `approved_accounts_v1/{uid}` tồn tại, `enabled:true` | Có | Đường duyệt và nhập mã R1.1 |
| `approved_accounts_v1/{uid}` tồn tại, `enabled:false` | **Không** | Thu hồi quyền được ưu tiên, dù hồ sơ cũ tồn tại |
| Không có allowlist, nhưng có đúng `profiles_v2/{request.auth.uid}` | Có | **Kế thừa** hồ sơ đã có; không tạo/sửa document |
| Người đăng ký mới, chưa có allowlist và profile | **Không** | Phải nhập mã mời một lần |
| Khách chưa đăng nhập | Chỉ đọc truyện Web | Thư viện `studio_data/main_library` vẫn công khai |

Không tự cấp quyền theo tên hiển thị, email, `role` trong profile, hoặc chỉ vì tài khoản tồn tại trong Firebase Authentication. Người dùng chỉ được đọc/sửa **profile của chính UID đăng nhập**. Một profile sẵn có không thể bị tự tạo bởi UID mới chưa duyệt dưới bộ Rules R1.2.

## Những thay đổi trong repo

- `security/firestore-r12-grandfathered-profiles.rules.review`: Rules v2 hoàn chỉnh từ R1.1; chỉ khác hàm `approvedPlayer` và hàm trả path hồ sơ cũ. Giữ nguyên quyền đọc Web, kiểm soát EPUB, giao dịch Xu và xóa EPUB vĩnh viễn.
- `js/account-approval-v1.js`: nếu chưa có allowlist thì thử đọc đúng profile cũ. Nếu có, cho qua bước duyệt; nếu document không tồn tại hoặc Firebase trả `permission-denied`, **không** được xem như đã duyệt. Quyền `enabled:false` vẫn được kiểm tra trước.
- `firebase.r12-grandfathered-review.json`: file cấu hình **chỉ để chạy Emulator**, không tự đưa vào `firebase.json`.
- Bổ sung regression tests; **không** thay `firestore.rules`, dữ liệu Firestore, tài khoản, hoặc các cờ kích hoạt trong `index.html`.

## Chẩn đoán 403 và điều kiện Publish

1. Mở Firebase Console đúng project `truyendienvl`, database `(default)`; sao lưu nguyên văn Firestore Rules **Published** hiện tại. Ảnh danh sách collection không chứng minh Rules hiện tại.
2. Kiểm tra trong Authentication: cùng UID của từng tài khoản thật có đúng document `profiles_v2/{UID}`. Không cần gửi UID cho ChatGPT.
3. Chạy bộ kiểm thử logic: `node --test tests/account-approval-a1.test.cjs tests/account-invite-r11.test.cjs tests/firestore-r12-grandfathered.test.cjs`.
4. Chạy **Firebase Rules Emulator thực**, xác nhận Firestore edition hỗ trợ bộ Rules, và thử: profile cũ (được), account mới (chặn), `enabled:false` (chặn), Web guest (được), EPUB guest (chặn), không sửa profile người khác, mã mời atomic đúng một lần, EPUB delete/revision không đổi. Có thể khởi động Emulator bằng `firebase emulators:start --config firebase.r12-grandfathered-review.json --only firestore` sau khi có Firebase CLI.
5. Nếu Emulator đạt, kiểm tra lại diff so với **Rules đang Published** (không chỉ so với R1.1 GitHub), kiểm tra project ID/Auth/Firestore REST: `projects/truyendienvl/databases/(default)`, sao lưu và xin chủ sở hữu duyệt **Publish** riêng.
6. Chỉ sau khi Rules đã Published và kiểm thử trực tiếp ba tài khoản mới bật `DUDU_ACCOUNT_APPROVAL_V1_READY` và `DUDU_ACCOUNT_INVITES_R11_READY`, commit trên `main` và xác nhận Pages/Actions.

**Không tiến hành reset Mùa 1** trong R1.2. EPUB, Web, dấu trang, số dư và tiến độ của cả ba tài khoản giữ nguyên. Một tài khoản mới chưa có quyền đọc EPUB sẽ vẫn xem được Web công khai.

### Lưu ý quan trọng

Việc cho hồ sơ cũ tự được quyền đồng nghĩa **mọi document từng tồn tại** trong `profiles_v2` đều được kế thừa (không chỉ ba UID nhìn thấy trong ảnh). Cần xác nhận collection thật chỉ có ba account tin cậy, không chứa account test đã từng bị cấm. Nếu cần thu hồi, chủ sở hữu tạo `approved_accounts_v1/{uid}` với `enabled:false`; **đừng xóa profile**.

Đây là phương án **chờ duyệt**, không phải bằng chứng đã chữa được HTTP 403 trên production. Sai project, REST token không hợp lệ, API bị hạn chế hoặc Rules Published khác vẫn có thể gây 403; phải xác nhận theo Network/Console và Emulator.
