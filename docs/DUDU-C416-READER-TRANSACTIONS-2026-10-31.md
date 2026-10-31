# C4.16 — Khôi phục giao dịch tài khoản độc giả (31/10/2026)

## Triệu chứng & nguyên nhân

- Tài khoản tác giả mua ở Cửa Hàng, nhận vật phẩm trong Kho/DUDU FUN được;
  tài khoản độc giả gặp hộp thoại `CHƯA XÁC NHẬN ĐƠN MUA`.
- Ảnh DevTools do chủ dự án cung cấp có nhiều lệnh `documents:commit` trả
  HTTP 403 trong khi `documents:batchGet` trả 200. Đây là lỗi quyền **ghi**
  Firestore, không thể kết luận là mất kết nối.
- `DuduPersonalQuestEventsC45.record()` thêm `questV437` và `questsDayV43`
  lần đầu người chơi nhận mốc Shop/FUN/Kho. Rules ứng dụng C4.14 chưa có hai
  trường trong `allowedLegacyProfileFields()`. Vì `allow update` đối chiếu
  `addedKeys()`, hồ sơ độc giả mới bị `permission-denied`; người dùng cũ đã
  có sẵn hai trường có thể không bị ảnh hưởng.
- Auth v2 trước đây đánh dấu phiên sẵn sàng dù `profiles_v2/{uid}` chưa tồn
  tại, trong khi giao dịch Shop/FUN/Kho đều yêu cầu có hồ sơ trước khi update.

## Bản sửa

1. `firestore.rules` cho phép chủ sở hữu thêm `questV437` (map tối đa 40
   khóa) và `questsDayV43` (string tối đa 10 ký tự), không bỏ quyền `self(uid)`,
   giới hạn ví/Kho, kiểm tra Honor, hay các collection bị khóa.
2. `js/profile-save-c23.js` thêm `ensureNewProfile`: giao dịch chỉ tạo hồ sơ
   nếu UID đang đăng nhập và tài liệu thực sự còn thiếu. Nếu tài khoản khác
   hoặc thiết bị khác đã tạo trước, ứng dụng lấy hồ sơ đó làm nguồn; không
   ghi đè Xu và vật phẩm bằng bản lưu cũ trên thiết bị.
3. `js/auth-v2.js` đợi xác nhận khởi tạo trước khi mở quyền thao tác của phiên
   mới; nếu Firestore từ chối tạo, phiên vẫn chưa sẵn sàng và có nút thử lại.
4. Shop, Kho, nhiệm vụ và DUDU FUN dùng `DuduPersonalErrorC416` để phân biệt
   `permission-denied` (403), thiếu hồ sơ, đăng nhập, hết Xu và lỗi kết nối.
   Mã giao dịch mua hiện tại vẫn được giữ để không nhân đôi khi retry.

## Kiểm thử

- `node --test tests/*.test.cjs`: **158/158** file kiểm thử xanh.
- Firebase Firestore Emulator, dự án giả `demo-dudu-standard`, Rules review
  mới nhất: **93/93** phép kiểm tra xanh. Có chạy *engine thật* cho tài khoản
  độc giả chưa có `questV437`/`questsDayV43` để mua Shop và nhận hộp DUDU FUN.
- Các phép thử từ chối khác UID, tạo quyền admin giả, title/achievement giả,
  tiền âm, hồ sơ không hợp lệ, ghi ví server và Arcade exchange vẫn xanh.
- Chưa chạy giao dịch bằng UID thật trên Firebase production.

## Publish Firebase Rules — chỉ sau khi kiểm tra bản đang chạy

**GitHub `main` và `firestore.rules` không tự Publish Firebase Rules.**
`firebase.json` mặc định chỉ có cấu hình Functions; file `firestore.rules`
được gắn `NOT DEPLOYED` và có cấu hình riêng `firebase.rules-review.json`
cho emulator.

1. Trên Firebase Console đúng dự án `truyendienvl` → Firestore Database →
   Rules, **sao lưu Rules đang Published** (toàn bộ, không chỉ đoạn profile).
2. So sánh toàn bộ Rules đang Published với bản GitHub. Nếu có chỉnh sửa
   production ngoài GitHub, merge có kiểm soát thay vì ghi đè toàn tệp.
3. Chỉ thay đổi đoạn `validLegacyProfile()` và `allowedLegacyProfileFields()`
   nếu các match còn lại ở production đã khớp. Không dùng `allow read,write:
   if true`, không xóa tài khoản, không tự điều chỉnh ví/vật phẩm.
4. Publish sau khi chủ dự án xác nhận. Tải lại web (Ctrl+Shift+R), đăng nhập
   tài khoản độc giả và thử **đúng món** đã báo lỗi trước đó để tái sử dụng
   mã đơn cũ. Sau đó thử mở hộp/nhận vật phẩm ở Kho. Nếu vẫn có HTTP 403,
   đối chiếu mã lỗi/thông tin từ Firestore Rules Simulator và hồ sơ hiện có.

Không có bước nào trong thay đổi này viết trực tiếp lên Firebase production.
