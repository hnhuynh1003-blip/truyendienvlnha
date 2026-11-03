# DUDU Studio — chuẩn bị reset Mùa 01 (S01)

**Trạng thái: CHỈ XEM TRƯỚC. KHÔNG ĐƯỢC CHẠY RESET.**

Mục tiêu: làm mới hành trình của ba tài khoản thử nghiệm đã có (tác giả, độc giả,
độc giả/test) khi bộ game mới hoàn tất. Không xóa truyện, chương, EPUB, bìa,
bản thảo, dữ liệu tác giả, Firebase Authentication hay danh sách tài khoản được duyệt.

## Phần đã chuẩn bị

- `js/season-reset-s01.js`: công cụ thuần, không ghi dữ liệu; lập kế hoạch làm mới
  hồ sơ từ một snapshot Firestore và kiểm kê chính xác vùng lưu game trên thiết bị.
- `index.html` > Điện thoại > Cài đặt > Tiến độ & mùa chơi >
  **Xem trước reset Mùa 01**: đọc hồ sơ máy chủ **của chính tài khoản đang đăng nhập**,
  hiển thị Xu/EXP/Kho/nhiệm vụ và dữ liệu cục bộ sẽ bị tác động.
- Nút reset V54 vẫn khóa cứng (`DUDU_SEASON_RESET_READY_C26=false`); không có API
  `apply()` mới, không có thao tác `.set()`, `.delete()` hoặc xóa `localStorage`
  trong công cụ S01.
- Nút **Tải bản sao tiến độ** cũ vẫn hoạt động cho từng tài khoản tự đăng nhập.

## Ma trận dữ liệu

| Nhóm | Khi Mùa 01 chính thức mở | Lý do |
| --- | --- | --- |
| Truyện Web/EPUB, chương, bìa, tác giả, bản thảo/import | **Giữ nguyên** | Không thuộc tiến độ người chơi |
| Auth, UID, quyền/duyệt tài khoản | **Giữ nguyên** | Không xóa hoặc tạo lại tài khoản |
| `readingBookmarksV568`, dấu trang cục bộ | **Giữ nguyên** | Không mất vị trí đọc |
| `phoneAppearanceV568`, `playerAvatar` | **Giữ nguyên (đề xuất)** | Không cần cấu hình giao diện lại |
| `arcadeLastReceiptV1`, biên nhận giao dịch | **Giữ nguyên** | Ngăn ghi nhận lại giao dịch cũ |
| `level`, `exp` | Cấp 1, 0 EXP | Khởi đầu mùa mới |
| `currency` (Xu Vàng) | **Đề xuất 50 Xu khởi đầu** | Khớp hệ thống V54; chủ có thể đổi trước khi mở |
| `inventory`, `lootedChapters`, `readRewards` | Làm mới | Kho và thưởng thử nghiệm |
| `quests`, `questV437`, `questsDayV43` | Làm mới | Nhiệm vụ Mùa 01 |
| `dailyReadLog` | Xóa bộ đếm thưởng/ngày | Không phải dấu trang |
| `storyStates`, `collectedCharacters`, `honorV1`, `title` | Làm mới | NPC, thành tựu/danh hiệu thử nghiệm |
| Tiền Xanh, thiết bị/cấp nâng trong 4 game Arcade | Làm mới | Dữ liệu localStorage theo UID |
| Theo dõi hành trình, trưng bày Arcade, danh hiệu trên thiết bị | Làm mới | Dữ liệu mùa thử nghiệm |
| Đoạn hội thoại/NPC memory theo UID | Làm mới | Bắt đầu liên lạc mới |
| Trường hồ sơ chưa được nhận diện | **Dừng, rà soát thủ công** | Tránh mất dữ liệu mới thêm bởi bản nâng cấp game |

**Lưu ý:** `readRewards` và `lootedChapters` là *lượt nhận thưởng khi đọc*,
khác với `readingBookmarksV568` là *vị trí đọc*. Chỉ nhóm thưởng sẽ reset.

## Dữ liệu ở nhiều nơi — chưa thể reset chỉ bằng một nút trình duyệt

1. `profiles_v2/{uid}`: Xu/EXP/Kho, nhiệm vụ, NPC và phần thưởng. Rules hiện tại
   không cho chủ sửa trực tiếp hồ sơ **UID khác** từ trình duyệt.
2. `economy_accounts_v52/{uid}` cùng `items/receipts`: ví/EXP có xác thực máy
   chủ, dù cổng kinh tế V52 có thể đang tắt. Phải kiểm tra trạng thái thật
   trước khi làm mới. Không xóa biên nhận để tránh ghi tiền trùng.
3. `localStorage`: Tiền Xanh và 4 game Arcade, journey/showcase, chat/NPC,
   danh hiệu thiết bị. Những mục này tồn tại **riêng trên từng trình duyệt/điện thoại**.
4. `approved_accounts_v1`, Auth, dữ liệu Thư viện, EPUB Storage, các biên nhận
   giao dịch và dấu trang: **ngoài phạm vi reset**.

Không dùng `DuduPersonalResetV54.ownedKeys()` để reset Mùa 01: hàm V54 cũ
bao gồm cả khóa dấu trang `dudu-v2:{uid}:{story}:bookmark` và có thể bao gồm
khóa bản thảo. S01 chỉ liệt kê chính xác các khóa trò chơi được nhận diện.

## Đợt kích hoạt sau khi nâng cấp game (CHƯA THỰC HIỆN)

1. Chủ hoàn thành cân bằng Tiệm Net/Đào đá/Vườn Sương/Ngọc Phường và duyệt
   số Xu/Tiền Xanh khởi đầu, vật phẩm được giữ lại (nếu có).
2. Chốt toàn bộ bộ sưu tập: kỷ vật mùa trước có giữ làm chứng nhận hay làm
   mới cùng đồ thử nghiệm? Xác nhận tiếp tục **giữ tiến độ đọc**.
3. Sao lưu và **xác minh khôi phục**: tối thiểu ba hồ sơ `profiles_v2`, ví
   máy chủ, các subcollection có giao dịch, và dữ liệu game trên các thiết bị
   đang dùng. Bản sao trên nút Cài đặt chỉ chứa **tài khoản đang đăng nhập**.
4. Kiểm kê UID từ Firestore Auth/profiles và trạng thái chấp thuận, kiểm tra
   chủ có custom claim `admin: true`. Không nhập/nhúng UID vào mã nguồn.
5. Dựng tác vụ **Firebase Admin SDK chỉ chủ gọi được** để xem trước đủ ba
   tài khoản, có ghi nhật ký, mã chạy một lần, khóa ghi/phòng chống stale
   client, sao lưu đầy đủ và xác nhận riêng để thực thi. Server SDK dùng IAM,
   không dựa vào Rules từ trình duyệt.
6. Khi mở mùa: đổi *namespace theo mùa* cho game Arcade trên **mọi thiết bị**,
   để cache cũ không tự khôi phục game; làm mới hồ sơ theo kế hoạch S01;
   đồng bộ UI và reload mỗi tài khoản. Không xóa biên nhận thanh toán/đổi Xu.
7. Kiểm tra tác giả, độc giả, test-reader trên di động và desktop: mở Web/EPUB,
   vị trí đọc, quyền truy cập, ví, nhiệm vụ và các game. Sau đó chủ mới
   duyệt mở Mùa 01.

**Không tự bật** cờ reset hoặc Publish Firestore/Storage Rules trong đợt
chuẩn bị này. Không reset ba tài khoản trực tiếp qua Firebase Console.

## Ghi chú chi phí sao lưu

Firebase có tính năng Export/Import có quản lý, nhưng yêu cầu dự án có bật
billing/Blaze. Không bắt buộc nâng cấp trả phí ngay: trước tiên dùng bản xuất
JSON có kiểm soát và chuẩn bị phương án khôi phục phù hợp quy mô ba tài khoản.

Tài liệu chính thức:
- https://firebase.google.com/docs/firestore/manage-data/export-import
- https://firebase.google.com/docs/firestore/security/rules-conditions
