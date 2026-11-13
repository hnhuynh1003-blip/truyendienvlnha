# DUDU Studio — R1: Khách đọc Web, EPUB & ứng dụng cá nhân cần duyệt

**Trạng thái: CHỜ AN DU DUYỆT RULES / CHƯA PUBLISH FIREBASE / CHƯA BẬT AUTH-A1.**

Ứng viên Rules: `security/firestore-r1-web-public-epub-approved.rules.review`.
Kiểm thử riêng: `firebase.r1-guest-review.json`. **Không thay thế** `firestore.rules`, `firebase.json` hay Storage Rules đang vận hành.

## Quyết định R1 và phạm vi chính xác

| Vai trò | `studio_data/main_library` (truyện Web cũ) | EPUB đã xuất bản (metadata + chương) | EPUB nháp/chưa xuất bản | `profiles_v2` và dữ liệu ứng dụng cá nhân |
| --- | --- | --- | --- | --- |
| Khách chưa đăng nhập | Đọc | Cấm | Cấm | Cấm |
| Đã có Firebase Auth nhưng **chưa được chủ duyệt** | Đọc | Cấm | Cấm | Cấm |
| Tài khoản đã duyệt trong `approved_accounts_v1` (`enabled: true`) | Đọc | Đọc | Cấm | Chỉ hồ sơ của chính UID |
| Chủ sở hữu có **custom claim** `admin: true` | Đọc/biên tập Web | Đọc EPUB đã xuất bản; quản lý EPUB của **chính UID** kể cả nháp | Đọc/sửa EPUB sở hữu | Chỉ hồ sơ của chính UID; quyền duyệt UID khác |
| UID đã thu hồi (`enabled: false`) | Đọc | Cấm | Cấm | Cấm |

Đối với EPUB, *đã đăng nhập* không đồng nghĩa *đã được duyệt*. Firestore kiểm tra allowlist bằng `approved_accounts_v1/{uid}` trên mỗi truy vấn đọc. Quản lý EPUB, lịch sử sửa chương và xóa vĩnh viễn trạng thái `archived → deleting` giữ nguyên cơ chế C4.22.

**Giới hạn bắt buộc phải hiểu trước khi Publish:**

- `studio_data/main_library` là **một document chung**, nên khách truy cập được mọi trường trong document, không chỉ nhan đề/chương; phải kiểm tra không có dữ liệu riêng tư **hoặc EPUB cũ bị chép lẫn** vào đó. Rules không thể trả về một phần của document.
- Đây là khóa **truy cập dữ liệu từ server**, không tự ẩn nút/menu ứng dụng cá nhân. Giao diện phải khóa các app và ẩn EPUB với khách/chưa duyệt; cần xử lý danh sách EPUB đang ở bộ nhớ/cache khi đăng xuất hoặc thu hồi quyền.
- Không hồi tố nội dung người dùng đã tải/lưu offline khi còn được duyệt; cần xem xét cấu hình Firestore offline persistence và localStorage nếu yêu cầu thu hồi tuyệt đối trên thiết bị đó.
- Khách/độc giả chưa duyệt không tự mở được hồ sơ để tạo Xu hoặc ghi tiến độ trên cloud. Không phải cơ chế bảo vệ chống gian lận phức tạp; các khoản Xu người chơi tự ghi vẫn không được xem là giao dịch đã xác minh.
- Rules R1 **không** kiểm tra đã mua từng chương bằng Xu. Nếu có EPUB tính phí, phải bổ sung entitlement ở một bước được phê duyệt riêng trước khi coi đây là bảo vệ chương trả phí.
- File Storage đang hoạt động cũng cần đối chiếu bản Published: các bản EPUB thô/đường dẫn tải không được mở công khai ngoài Firestore.

## Điều kiện chặn Publish (chưa hoàn thành)

1. Chủ sở hữu xuất **Rules Firestore và Storage đang Published** trong đúng Firebase project/database. So sánh toàn diện với ứng viên này để tránh làm mất các rule triển khai mới hơn. Chỉ đọc kiểm tra `studio_data/main_library.novels` không chứa bản sao EPUB.
2. Xác nhận chủ sở hữu có `request.auth.token.admin == true`. Đối chiếu UID tài khoản hiện có và **chỉ pre-approve các UID do Du xác nhận**. Không reset, di chuyển, xóa hay sửa hồ sơ, EPUB, Xu.
3. Chạy **Firestore Rules Emulator** với đúng file R1. Phải kiểm tra `get` và `list` riêng cho Web, EPUB, chương, profile, danh sách pending, tạo request, chủ duyệt; kịch bản từ chối và thu hồi. `node --test` chỉ xác nhận cấu trúc/logic JavaScript, **không chứng minh Rules thực thi đúng**.
4. Chuẩn bị thay đổi UI nhỏ **sau khi Du duyệt riêng**: chỉ bật `DUDU_ACCOUNT_APPROVAL_V1_READY` khi allowlist đã sẵn sàng; khi tài khoản chuyển từ chờ → duyệt thì tải lại EPUB, khi logout/thu hồi thì bỏ EPUB khỏi `novels`/bộ lọc và đóng màn đọc nếu đang mở; ẩn app cá nhân với khách. Luồng đọc Web vẫn dùng `main_library` công khai.
5. Chạy smoke test ở màn hình 360–390 px, laptop, đăng nhập/đăng xuất, đọc Web, EPUB, sửa EPUB và xóa vĩnh viễn với chủ, đọc tiếp của người cũ. Cuối cùng mới xin Du đồng ý **Publish một lần riêng**; sau đó kích hoạt UI qua commit `main` và xác nhận GitHub Pages.

## Kịch bản Emulator cần chạy

| Tình huống | Kết quả bắt buộc |
| --- | --- |
| Guest/chưa duyệt `get` Web | ALLOW |
| Guest/chưa duyệt `list/get` EPUB đã xuất bản | DENY |
| Guest/chưa duyệt `get/list` chapter của EPUB xuất bản | DENY |
| Guest/chưa duyệt `get/create/update profiles_v2` | DENY |
| UID chưa duyệt gửi request `pending` đúng email, 1 lần | ALLOW create lần đầu; DENY tự sửa hoặc duyệt |
| UID tự tạo `approved_accounts_v1/{uid}` | DENY |
| UID `enabled:true` tìm EPUB `status == published` và `limit <=60` | ALLOW; không cần đúng UID chủ sở hữu |
| UID `enabled:true` đọc EPUB nháp | DENY |
| UID `enabled:true` `get`/sửa profile của người khác hoặc viết EPUB | DENY |
| UID bị thu hồi `enabled:false` đọc EPUB và profile | DENY |
| Owner `admin:true` duyệt UID, đọc/biên tập EPUB của mình | ALLOW theo validation gốc |
| Owner `admin:true` xóa EPUB khi chưa `deleting` | DENY; chỉ xóa sau `archived → deleting` |

**Cấu hình chạy Emulator sau khi có Firebase CLI và test SDK:**

```sh
firebase emulators:start --config firebase.r1-guest-review.json --only firestore
```

**Phương án rollback:** lưu bản sao Rules Published trước khi đổi; nếu có lỗi, khôi phục chính xác Rules cũ và đặt cờ Auth-A1 về `false` bằng commit mới. Không xóa các collection duyệt, profile hay truyện khi rollback.
