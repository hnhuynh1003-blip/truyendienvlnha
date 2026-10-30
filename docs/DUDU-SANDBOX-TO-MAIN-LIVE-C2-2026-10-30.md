# DUDU Studio — C2: chuyển chức năng Sandbox sang tài khoản Firebase thật

Ngày 30/10/2026. Baseline GitHub main: bb94155 (C1).

## Làm rõ mục tiêu của An Du

Tích hợp lại gameplay mà người dùng đã thử trong Sandbox, **không chỉ mở tab hay
hiện icon**. Mỗi chức năng phải có lưu trữ theo UID, quyền sở hữu, truy hồi và
quy tắc không cấp trùng. Chỉ khi đó mới coi là đã chuyển sang main.

## C2.1: Liên lạc và NPC — chức năng thật không tiêu Xu

- Trong Sổ Tay, **NPC yêu thích** của từng truyện có thể chọn/bỏ chọn và lưu
  vào profiles_v2/{uid}.storyStates[storyId].favoriteNpcV43.
- **Hỏi thăm NPC**: dùng kịch bản và quy tắc Tin tưởng của Sandbox (R5),
  giới hạn một lần mỗi NPC mỗi ngày UTC, cập nhật Tin tưởng và mốc ngày
  gắn kết V43.4; không tự mở khóa mốc truyện Tin cậy/Gắn bó.
- Từ Sổ Tay có thể chọn NPC và hỏi thăm ngay trong giao diện, hoặc hỏi thăm
  ở màn hình Liên lạc. Bảng trạng thái gắn kết và trợ giúp V2 có thể hiển thị
  cho UID đã xác thực; Thiện cảm của vai nhập vai V56 vẫn được phân biệt với
  quan hệ tài khoản/NPC.
- Xem **chân dung NPC** trong Sổ Tay hoặc Liên lạc: cho phép với NPC đã mở
  khóa hoặc trong quyền tác giả, chỉ đọc. Ảnh do tác giả tải cục bộ có thể
  chưa có trên thiết bị khác và sẽ dùng hình dự phòng.
- Firestore Web SDK đã được tích hợp sẵn trong app (compat); lớp giao dịch
  mới chỉ sử dụng runTransaction, đọc hồ sơ chủ sở hữu rồi ghi hợp nhất
  đúng nhánh storyStates của NPC. Không thay thế toàn bộ hồ sơ, không gọi
  saveCurrentAccount sau giao dịch.
- **Không** thay currency, inventory, EXP, Quest, Auth, Rules, Worker, thư viện
  tác giả hoặc dữ liệu tài khoản khác. Dữ liệu chỉ thay đổi khi chính chủ
  bấm Yêu thích/Hỏi thăm và Firestore chấp nhận ghi.

## Bảng chuyển Sandbox → main còn lại

| Tính năng đã thử trong Sandbox | Trạng thái sau C2.1 | Việc để đạt thực sự |
| --- | --- | --- |
| Liên lạc, NPC đã mở khóa, chat AI | Main đã có, cần test runtime | Test UID/story/role và giới hạn AI |
| Chọn NPC yêu thích | Đã nối giao dịch Firebase | Test hai tài khoản và tải lại |
| Hỏi thăm, Tin tưởng, gắn kết | Đã nối giao dịch Firebase | Test ngày UTC, online/offline |
| Chân dung, trang quan hệ NPC | Mở trong main có quyền | Test ảnh trên di động |
| Tặng quà từ Kho cho NPC | C2.2 đã nối giao dịch Firebase; chờ thử UID thật | Kiểm tra quà thích/ghét, reload, vật phẩm và trần Thiện cảm trên thiết bị thực |
| Phong bao NPC bằng Xu | C2.2 đã nối giao dịch Firebase; chờ thử UID thật | Kiểm tra Xu trước/sau, 3 lượt/ngày, cooldown và lịch sử khi đăng nhập lại |
| Kho: lịch sử quà, sổ sưu tập | Chủ yếu Sandbox | Chốt mô hình ownership và lịch sử có thể đọc lại |
| Kho: bán/ký gửi/đấu giá | Main có mua/dùng/bán phổ thông; Sandbox có bản ký gửi nháp | Phân biệt đấu giá thật và nháp, không giả tạo người mua |
| Quà tặng tác giả, hộp thư | Sandbox bản nháp, main placeholder | Thiết kế hai UID, người nhận và biên nhận |
| DUDU FUN phần thưởng | Main luyện tập không thưởng | Tích hợp event và quyền nhận thưởng thật |
| Nhiệm vụ, nhặt đồ, EXP | Có cả mã client cũ và module mới | Thống nhất nguồn ghi, chống cộng lặp |
| Arcade → Ví Xu 10:1 | Main có game/quote; chuyển thật khóa | Chốt Rules receipt và kiểm tra reset |
| Reset mùa mới | Chưa chạy | Sao lưu, quyết định trường, thử 1 UID trước |

## Kiểm thử và điều kiện đưa lên

- Node unit test lớp NPC thật: giao dịch UID riêng; chỉ cập nhật nhánh NPC;
  không cộng Xu/EXP/vật phẩm; chặn NPC chưa mở; chặn hỏi thăm lặp.
- Kiểm tra các ràng buộc UI hiện có, bảo vệ avatar và vai NPC.
- Node: 130/130 bộ test đạt; git diff --check đạt.
- **Chưa thử đăng nhập và Firestore Rules thực tế** trong browser ở lượt
  làm việc này; không suy ra kết quả live từ mock. Firebase của chủ dự án
  trước đó được xác định là Standard (default) trên Spark.
- Trước C2.2: cần test ít nhất hai UID, chọn/bỏ yêu thích, hỏi thăm một
  NPC, tải lại, bảo đảm số dư và Kho không đổi; nếu giao dịch bị từ chối,
  dừng và đối chiếu Rules đã triển khai, không tự nới Rules.

## C2.2 — chuyển Tặng quà và Phong bao sang main (mã nguồn)

- `js/personal-npc-exchange-v1.js` dùng một giao dịch `profiles_v2/{uid}`
  với `runTransaction` trên Firebase Spark hiện tại; kiểm tra `auth.uid`,
  NPC đã mở khóa trong hồ sơ trên máy chủ, vật phẩm có `instanceId` duy nhất,
  metadata vật phẩm hợp lệ theo catalog và quyền tặng. Kết quả nhận/từ chối
  theo engine R2; chỉ nhận quà mới trừ **đúng instance**, cập nhật Thiện cảm,
  Tin tưởng và chuỗi gắn kết. Không cộng thưởng Xu, EXP, Quest khi tặng.
- Phong bao V32 chấp nhận 10/50/100/520/1314 Xu *trò chơi*, 3 lần/NPC/ngày
  UTC, cách 5 phút; một giao dịch cùng lúc trừ Xu và ghi lịch sử cho đúng
  NPC. Không có ví NPC, chuyển tiền thật hay thưởng Thiện cảm.
- Mã giao dịch tạo bằng UUID và giữ ở localStorage khi chưa xác nhận. Nếu
  mạng lỗi sau khi Firebase đã ghi xong, bấm lại dùng mã cũ; NPC nhận quà và
  sổ phong bao nhận biết yêu cầu đã xử lý, không trừ lần thứ hai. Sandbox
  vẫn chạy nhánh cũ, không đổi cơ chế mô phỏng.
- Nút phong bao và quà đã được mở ở tài khoản Firebase xác thực và NPC
  đã mở khóa, thay cho nhánh main chỉ trừ quà cũ và nút phong bao khóa.
- C2.2a: Sổ Tay chuyển rõ `storyId` vào hộp quà và giao dịch để tránh
  nhầm truyện nếu Liên lạc đang chọn truyện khác; NPC chưa mở khóa bị
  khóa nút. Sự kiện quà chỉ gửi vào hội thoại khi đúng truyện và NPC.
- C2.2b: Phong bao không còn bị vẽ lại cố định ở cuối hội thoại. Chat mới
  lưu `at` và sắp xen kẽ với sự kiện phong bao theo `at`, giữ mã sự kiện
  riêng khi render. Hội thoại V55/V56 cũ không có thời gian được giữ
  nguyên và gom trước các sự kiện có mốc thời gian, vì không đủ bằng
  chứng để suy ra thứ tự chính xác. Quà cũ không bị trừ/cộng lại.
- C2.2b: Trạng thái phong bao `SENT` hiển thị **Đã gửi — chưa có xác nhận
  NPC đã nhận**. Không giả định NPC đã đọc/nhận vì hiện chưa có endpoint
  phản hồi độc lập hay ví NPC; `RECEIVED` dành cho một lần xác nhận thật
  trong tương lai. Mốc giờ hiển thị trên thẻ. Không chuyển tiền hoặc
  phát thưởng chỉ vì render thẻ.
- Những lần gọi lưu *toàn hồ sơ* đã bắt đầu trong cùng tab được chờ hoàn
  thành trước giao dịch mới; không gửi `saveCurrentAccount()` từ kết quả
  C2.2. Tuy vậy, **lưu hồ sơ cũ ở các chức năng khác và nhiều tab/thiết bị
  vẫn có thể ghi đè trạng thái mới**. Đây là nợ đồng bộ cần xử lý ở C2.3
  trước khi đặt trạng thái live-production hay làm reset mùa.

Kiểm thử máy: 132/132 tập Node đạt sau khi thêm giao dịch quà/phong bao,
bao gồm retry cùng ID, từ chối không trừ đồ, Xu thiếu, cooldown và quyền UID;
2 kiểm tra Phone manifest/lifecycle đạt. Chưa có kiểm thử thực bằng đăng
nhập và Firestore Rules production. Không cập nhật hay deploy Rules, không
reset tài khoản, không thay Worker trong đợt này.

## C2.3 kế tiếp (chưa thực hiện)

1. Rà soát và tách `saveCurrentAccount()` thành các cập nhật theo trường
   để tránh ghi đè Kho/Xu/quan hệ đã giao dịch, kể cả khi chạy nhiều tab.
2. Kiểm thử 2 UID thật: quà nhận, quà từ chối, phong bao, reload,
   đảm bảo tài khoản A không thể ghi vào tài khoản B; xác minh Rules đã
   triển khai và chính sách đọc/ghi.
3. Rà soát các chức năng Sandbox còn lại (bán/ký gửi, quà tác giả,
   Arcade, nhặt đồ, quest, liên lạc) và chốt phạm vi Rules trước reset.

Rollback C2.1: revert commit mã nguồn; bản ghi yêu thích/hỏi thăm đã thực
sự được người dùng thực hiện sẽ được giữ lại trong hồ sơ, không xóa tự động.
