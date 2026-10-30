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
| Tặng quà từ Kho cho NPC | Main vẫn có nhánh cũ | Thay bằng transaction trừ đúng instance + tăng quan hệ R2 |
| Phong bao NPC bằng Xu | Chỉ Sandbox; main khóa | Transaction ghi Xu và nhật ký, cùng hạn mức V32 |
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

## C2.2 theo sau

Chuyển **tặng quà NPC thật** theo engine R2 (thích/không thích, cooldown,
trần Thiện cảm) và **Phong bao Xu** V32, nhưng trước đó phải tách những
đường lưu hồ sơ cũ đang ghi trọn currency+inventory+storyStates để không
ghi đè transaction. Sau đó mới chuẩn hóa Rules và tính chuyện reset mùa.

Rollback C2.1: revert commit mã nguồn; bản ghi yêu thích/hỏi thăm đã thực
sự được người dùng thực hiện sẽ được giữ lại trong hồ sơ, không xóa tự động.
