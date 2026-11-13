# DUDU R1.1 — Mã mời dùng một lần (chờ duyệt, chưa Publish)

**Không thay `firestore.rules`, không sửa `firebase.json`, chưa Publish Rules/Auth/Storage, chưa kích hoạt giao diện.**

Ảnh Firebase của An Du ngày 03/11 cho thấy **3 document tại `profiles_v2`** (1 tác giả, 2 độc giả/test). Đây là dữ liệu cần bảo toàn, **không** phải bằng chứng đã có quyền tại `approved_accounts_v1`.

## Lựa chọn của chủ dự án

- Khách/chưa kích hoạt được đọc **tất cả Web** trong `studio_data/main_library`; không đọc EPUB và hồ sơ cá nhân trên cloud.
- Chủ có custom claim `admin: true` được tạo **mã mời dùng một lần**, hạn 6 ngày (Rules tối đa 7 ngày). Mã 16 ký tự ngẫu nhiên an toàn, dạng `DUDU-XXXXXXXX-XXXXXXXX`, không lưu bí mật trong JS.
- Người mới có thể tạo Firebase Authentication trước; DUDU chỉ kích hoạt quyền sau khi nhập mã. Việc **chặn tạo Auth identity** ngay từ đầu đòi hỏi cơ chế Auth backend khác.
- Kích hoạt bằng một **Firestore batch nguyên tử**: chuyển `invite_codes_r11/{code}` sang `redeemed` + tạo `approved_accounts_v1/{uid}`. Rules hai phía bắt buộc có cả hai thay đổi trong cùng batch.
- Mã đã dùng/hết hạn/bị thu hồi không được dùng lại; người đọc không được tự tạo quyền nếu không có mã. UID đang `enabled:false` không tự mở khóa bằng mã mới.
- Không tác động `profiles_v2`, Xu, tiến độ, EPUB, lịch sử chỉnh sửa, quyền xóa EPUB vĩnh viễn C4.22 hay DUDU FUN/Arcade.

## Đường dữ liệu mới

`invite_codes_r11/{code}` (chỉ admin tạo; người dùng sở hữu mã chỉ được **update** theo batch được Rules kiểm tra):

| Trường | Kiểu | Khi tạo / khi sử dụng |
| --- | --- | --- |
| `createdBy` | string UID admin | Bất biến |
| `createdAt` | timestamp | Bất biến |
| `expiresAt` | timestamp | Bất biến, <= 7 ngày |
| `status` | `open`/`redeemed`/`revoked` | `open → redeemed` đúng một lần |
| `redeemedBy` | string | Ban đầu rỗng, sau bằng UID người nhập mã |
| `redeemedAt` | timestamp/null | Ban đầu null, sau bằng server timestamp |

`approved_accounts_v1/{uid}` cho người nhận mã: `{uid,enabled:true,approvedAt,approvedBy:'invite',inviteCode}`. Hồ sơ đã duyệt thủ công trước đó (4 trường không có `inviteCode`) vẫn hợp lệ.

## Ba tài khoản đang dùng

1. **Tác giả:** giữ nguyên. Cần xác nhận có Firebase custom claim `admin:true` thật (role hiển thị trong profile không đủ); claim này cho phép tạo mã và quản lý EPUB.
2. **Độc giả hiện tại:** giữ nguyên UID + profile; sau khi triển khai chỉ cần nhận/nhập một mã một lần nếu chưa có allowlist.
3. **Test/độc giả:** tương tự, không tạo hồ sơ mới và không reset Xu.

Không tự thêm 3 UID hoặc chuyển đổi dữ liệu. Nếu chủ muốn duyệt trước để không gián đoạn, có thể chuẩn bị allowlist theo kế hoạch R1; nếu không, hai độc giả kích hoạt bằng mã sau khi Rules được Published.

## Cờ triển khai (hiện đều `false`)

- `window.DUDU_ACCOUNT_APPROVAL_V1_READY`: chặn truy cập cá nhân/EPUB tới khi được duyệt.
- `window.DUDU_ACCOUNT_INVITES_R11_READY`: hiện tạo/nhập mã và tắt gửi yêu cầu chờ duyệt tự động.

Khi bật đủ hai cờ sau Publish, auth xử lý đăng xuất/đổi tài khoản bằng cách loại EPUB khỏi danh sách đang hiển thị; khi được duyệt thì truy vấn lại EPUB từ Firebase. Menu ứng dụng cá nhân được chặn khi profile chưa sẵn sàng; Web vẫn công khai.

## Những kiểm thử bắt buộc trước khi Publish

1. Lấy **Rules Firestore & Storage đang Published** (không suy từ file GitHub). Đối chiếu với file `security/firestore-r11-invite-approved.rules.review`, kiểm tra `studio_data/main_library` không lẫn EPUB hoặc dữ liệu riêng.
2. Chạy Firebase Rules Emulator bằng `firebase.r11-invite-review.json`. `node --test` chỉ kiểm tra mã nguồn/logic giả lập, **không chứng minh bộ Rules được Firebase chấp nhận**.
3. Emulator: anonymous/pending bị từ chối EPUB + profile; Web công khai; approved chỉ đọc EPUB published và profile riêng; admin chỉ sửa EPUB sở hữu; mã mời không đọc/list được bởi khách; mã giả/hết hạn/từng dùng bị từ chối; batch thiếu một vế bị từ chối; batch có hai vế thành công; hai UID cùng tranh một mã chỉ một thành công; UID revoked không tự mở lại; bảo toàn quyền archive/deleting/revision.
4. UI trên điện thoại 360–390 px, laptop: owner tạo/sao chép mã; người mới tạo Auth → nhập mã → tải profile/EPUB; đăng xuất loại EPUB; đăng nhập lại không cần mã; Web vẫn đọc không đăng nhập. Thử cả 2 độc giả cũ không mất tiến độ.
5. Chỉ khi đủ kết quả mới xin An Du duyệt **Publish Firebase** riêng. Sau Publish, commit bật hai cờ `true` trên GitHub `main` và xác nhận GitHub Actions/Pages.

Lệnh Emulator **chưa chạy** vì môi trường hiện không có Firebase CLI/test SDK:

```sh
firebase emulators:start --config firebase.r11-invite-review.json --only firestore
```

Rollback: sao lưu và khôi phục Rules Published trước đó, đổi cờ `false`; **không xóa tài khoản, profile, chương, EPUB, mã hay số dư**.
