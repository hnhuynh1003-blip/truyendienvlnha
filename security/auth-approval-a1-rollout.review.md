# DUDU Studio — AUTH-A1: Đăng ký chờ chủ sở hữu duyệt

**Trạng thái:** CHỈ CHUẨN BỊ / CHƯA PUBLISH FIREBASE / CHƯA KÍCH HOẠT.

## Quyết định của Du

- Người mới được phép đăng ký hoặc đăng nhập Firebase Auth nhưng **chưa được xem là tài khoản DUDU đã cấp quyền**. Đăng ký Firebase Auth thành công không có nghĩa là chủ sở hữu đã duyệt.
- Sau đăng nhập, UID gửi **một yêu cầu `pending`** trong `account_requests_v1/{uid}`; không tạo `profiles_v2/{uid}`, không khởi tạo ví/Xu, không mở gameplay, và không được tự cập nhật trạng thái yêu cầu.
- Chủ sở hữu với **Firebase custom claim `admin: true` đã xác minh** đọc danh sách yêu cầu, duyệt hoặc từ chối. Duyệt tạo `approved_accounts_v1/{uid}` và cập nhật yêu cầu cùng một giao dịch Firestore.
- Mọi lần tải lại/đăng nhập lại phải kiểm tra quyền từ Firestore; không dùng cờ localStorage làm quyền truy cập. UID bị thu hồi (`enabled: false`) bị chặn.
- Không tạo, xóa, reset, hay chuyển đổi hàng loạt dữ liệu người chơi. Chưa mở Mùa 1 và không thay đổi ví/gameplay.

## File và tính năng mới

| Thành phần | Mục đích | Trạng thái khi merge `main` |
| --- | --- | --- |
| `js/account-approval-v1.js` | Kiểm tra allowlist, gửi request duy nhất, panel chủ sở hữu duyệt | Đã có, **chưa chạy** |
| `js/auth-v2.js`, `index.html`, CSS | Chặn bootstrap hồ sơ trước khi duyệt, hiển thị chờ duyệt | Có sẵn nhưng **flag false** |
| `security/firestore-auth-approval-a1.rules.review` | Bộ Rules ứng viên giữ mọi safeguard hiện hành, thêm 2 collection/allowlist | **Không tự deploy** |
| `firestore.rules` | File Rules hiện tại trong repository | **Không sửa** |

**Công tắc kích hoạt:** `window.DUDU_ACCOUNT_APPROVAL_V1_READY = false` trong `index.html`. Không đổi sang `true` cho đến khi toàn bộ kiểm tra và Publish Rules có xác nhận riêng của Du.

## Những điều phải xác minh trước khi Publish (bắt buộc)

1. **Lấy bản sao Rules thực tế** đang `Published` tại Firebase Console của đúng project/database. Không coi file `firestore.rules` trong repo hay Rules cũ Du gửi là Rules đang chạy. Đọc và so diff để giữ các quyền hiện có; không thay toàn bộ nếu có tính năng khác chưa có trong bản repo.
2. **Kiểm tra admin claim trên Firebase token** của chủ sở hữu, không căn cứ vào `profiles_v2.role` hay email tự nhận. Nếu chưa có claim admin, chuẩn bị cấp claim bằng kênh Admin SDK tin cậy sau khi Du duyệt; không thêm nút tự nâng admin.
3. **Thống kê UID hiện có (chỉ đọc)** từ Firebase Auth và `profiles_v2`; đối chiếu và để Du xác nhận danh sách người chơi cũ cần giữ quyền. Chuẩn bị `approved_accounts_v1/{uid}` cho các UID đã xác nhận **trước** khi ép Rules chặn hồ sơ; chỉ thêm quyền, không đổi/xóa dữ liệu cũ. Không tự chạy migration hàng loạt.
4. **Kiểm thử trên Firestore Emulator:** chưa duyệt không đọc/tạo/sửa profile và ví; được duyệt chỉ truy cập hồ sơ của chính mình; admin được xem và xử lý request; người chơi không tự cấp duyệt; cùng UID không được gửi lại request hoặc nhân đôi Xu; từ chối/thu hồi bị chặn; các Rules EPUB C4.22, library và các quyền khác không hồi quy. `node --test tests/*.test.cjs` kiểm tra phần logic tĩnh/JS, **không thay cho Rules Emulator**.
5. **Kịch bản triển khai do Du duyệt:** lấy snapshot Rules dự phòng → thêm allowlist UID cũ đã xác nhận → Publish Rules đã review → đổi flag sang `true` bằng commit nhỏ trên `main` → chạy smoke test 2 tài khoản (owner, người mới) và 1 tài khoản cũ → kiểm tra GitHub Pages. Trong khoảng giữa bước Publish Rules và bật flag, signup mới có thể thấy lỗi quyền Firestore tạm thời; sắp xếp trong một cửa sổ bảo trì ngắn.
6. **Phương án rollback:** tắt flag về `false` và phục hồi bản Rules Published đã sao lưu nếu kiểm thử thực tế thất bại. Không xóa `account_requests_v1`, `approved_accounts_v1`, `profiles_v2` hay số dư để rollback.

## Giới hạn và chú ý về Auth

- Firebase Auth vẫn tạo một **identity** khi khách bấm Đăng ký (hoặc đăng nhập Google lần đầu); Rules chỉ chặn quyền vào dữ liệu DUDU cho đến khi duyệt. Nếu muốn *ngăn cả việc tạo Auth user*, cần kiến trúc server-side có kiểm soát hoặc Auth blocking functions phù hợp, không thể hứa chỉ với Firestore Rules trên GitHub Pages.
- Khi chưa Publish candidate Rules, bất cứ bảo vệ frontend nào đều **không** là kiểm soát bảo mật thật. Feature phải ở trạng thái tắt.
- Panel duyệt chỉ dành cho token `admin: true`; việc duyệt được thực thi bằng Firestore transaction và Rules. Phê duyệt **không** cộng tiền hoặc nâng thẻ.
- Không có giới hạn chờ ngày/tuần, không liên quan quy đổi Tiền Xanh → Xu Vàng và không tạo cơ chế kiếm Xu.

## Quyết định còn cần Du chấp thuận

- Xác nhận bản Rules đang Published thực tế, danh sách UID cũ được giữ quyền, và tài khoản chủ sở hữu có admin claim.
- Duyệt chính xác file `security/firestore-auth-approval-a1.rules.review` **sau khi** đối chiếu Rules live và chạy Emulator.
- Cho phép **một đợt Publish Firebase riêng** và sau đó bật flag. Không có quyền Publish chỉ vì mã chuẩn bị đã lên GitHub Pages.
