# DUDU Studio — Ví Xu, nhịp nhặt đồ và kế hoạch vật phẩm chức năng

**Đợt giao diện/nhịp chơi:** 29/10/2026. **Firestore Rules chưa đổi.**
Phục vụ một chủ tài khoản và vài tài khoản cá nhân; không nạp/rút tiền thật, vẫn ưu tiên Firebase Spark.

## 1. Quy ước hai nguồn Xu

| Nguồn | Dùng vào | Chỗ lưu hiện hành | Tình trạng |
|---|---|---|---|
| **Ví Xu hệ thống** | Cửa hàng, và mở truyện/chương trả Xu về sau | `userProfile.currency` (profile đang có) | Có màn hình Ví Xu riêng trong Cyber Phone. **Không tạo số dư profile thứ hai.** Trạng thái profile hiện tại chưa thể xác nhận chống gian lận bằng Rules hiện tại. |
| **Xu Arcade** | Nâng cấp Trạm Neon, Địa Tầng 07, Vườn Sương | LocalStorage theo UID và thiết bị | Dùng trong 3 game. Nút **⇄ Đổi** và màn hình Ví liên thông về giao diện, **chưa thể chuyển Xu thật**. |

**Bản thiết kế quy đổi:** `10 Xu Arcade → 1 Xu hệ thống`. Mỗi giao dịch tối thiểu 10 Xu Arcade, nhận số Xu hệ thống nguyên; chọn lượng đổi theo **bội số của 10**, giới hạn **30 Xu hệ thống/ngày** (tương đương 300 Xu Arcade/ngày). Không có phí và không chuyển ngược. Người dùng chọn số lượng bằng cách nhập số hoặc nút nhanh 10/50/100/Tối đa ở cả đường dẫn Arcade và Ví Xu.

`js/personal-arcade-exchange-v1.js` hiện chỉ tạo báo giá thuần, không trừ Xu hay gộp tiền. **Hạn mức trong popup đang là dự kiến**; chưa có sổ giao dịch ngày và không được xem localStorage là chứng cứ bảo mật. Phải có mã giao dịch không trùng, xác nhận nguồn số dư và lịch sử trừ/cộng cùng một giao dịch trước khi mở nút chuyển thật.

## 2. Nhịp nhặt đồ đã áp dụng tại giao diện/client

- **Kho Đồ / Nhặt đồ:** một lần mỗi **15 phút** (trước đây 2 phút). Nút đếm ngược thể hiện thời gian còn lại; giữ nguyên dấu thời gian theo tài khoản hiện hành, không xóa kho.
- **Trong chương:** tối đa **3 lượt thành công/ngày trên toàn thư viện**, mỗi chương không quá **1 lần/ngày**. Không phụ thuộc hồi chiêu Kho Đồ.
- Ngày được tính theo lịch địa phương thiết bị, như hệ thống V42 hiện hành. Dữ liệu chương cũ vẫn là `lootedChapters[storyId_chapterId]=YYYY-MM-DD`; đếm số key của hôm nay, **không thêm trường cấu trúc mới**.
- Hết lượt: nút khóa kèm giải thích ngắn, đồng thời hàm thực thi kiểm tra lại để chặn gọi trực tiếp. Khi kho đạt 500 vật phẩm, không tiêu lượt.
- **Bộ Nạp Tần Số** (mua từ shop): hiện có thể xóa hồi chiêu Kho tối đa 2 lần/ngày; **Xung Thời Gian** giảm 60 giây, tối đa 2 lần/ngày. Không hồi lượt chương. Cần đánh giá lại giá thành của hai công cụ khi giao dịch Xu được xác thực.
- Các giới hạn trên mới là **nhịp chơi ở client**, không thay thế kiểm soát thời gian máy chủ. Cần test đổi giờ máy, đăng nhập hai thiết bị, spam hai tab và trùng event trước khi mở vật phẩm có giá trị thật.

## 3. Nhóm vật phẩm có chức năng — đề xuất, CHƯA mở quyền dùng thật

Ưu tiên tái sử dụng ID trong `js/item-catalog-v2.js`; không tăng độ hiếm chỉ bằng cách gắn cho vật phẩm một nút bấm.

| Vật phẩm/ID hiện có | Tác dụng dự kiến khi hệ thống hỗ trợ | Giới hạn hợp lý |
|---|---|---|
| Nước uống đóng chai `common-bottled-water`, bánh quy `common-biscuit` | Hồi chỉ số sinh tồn trong **thế giới** có cơ chế đó; không bắt người đọc phải tiêu đồ để đọc chương | Tiêu hao 1 cái/lần, không sinh Xu |
| Băng gạc cũ `common-gauze`, bộ sơ cứu `common-basic-medkit` | Hồi phục vết thương nhỏ, có tác dụng khác nhau theo tình huống Vạn Giới | Không dùng vượt quá máu tối đa; thế giới không có hệ HP thì chỉ là đồ lưu kho |
| Pin yếu `common-weak-battery`, đèn pin `common-flashlight` | Cấp năng lượng cho thao tác soi/sửa trong cảnh tối hoặc manh mối điện tử | Mỗi pin có số lượt hữu hạn, nguồn pin gắn vào đúng công cụ |
| Dây thừng `common-rope`, bao diêm `common-matches` | Mở lựa chọn hợp bối cảnh (leo, buộc, nhóm lửa), không bỏ qua nhiệm vụ chính | Tiêu hao/độ bền khi tương tác, chỉ nếu cảnh cho phép |
| Địa bàn `common-compass`, bản đồ rách `common-torn-map` | Hiện gợi ý vị trí, ký hiệu khám phá hoặc manh mối; không tự dịch chuyển | Mỗi thế giới tự khai báo nơi được dùng |
| Bộ sửa chữa `common-repair-kit` | Sửa một lần thiết bị phù hợp, có giới hạn phẩm chất và độ hỏng | Không tự sửa vật phẩm hiếm/vật phẩm nhiệm vụ |
| Bộ lọc nước `common-water-filter` | Chế tác/biến nước bẩn thành nước dùng được ở thế giới sinh tồn | Công thức có nguyên liệu và hao độ bền |
| Các vật phẩm trùng phổ thông | Đưa vào chế tạo/công thức tiêu hao, tránh kho đầy và tạo lý do giữ đồ F/E | Công thức công khai, không đổi trực tiếp thành Xu vô hạn |

### Quy tắc dùng chung trước khi kích hoạt

1. Phân loại **tiêu hao / có độ bền / công cụ mở tương tác / kỷ vật chỉ sưu tầm / đạo cụ nhiệm vụ**. Kỷ vật Bảo Tàng và vật phẩm gắn cốt truyện **không** được đưa vào vòng quay ngẫu nhiên.
2. Chỉ hiện nút **Dùng** khi vật phẩm có hiệu ứng trong đúng bối cảnh; với vật phẩm chưa có engine, hiển thị công dụng dự kiến nhưng khóa nút rõ ràng.
3. Mỗi lần sử dụng có `instanceId`, `effectId`, `source`, `requestId` và kết quả định sẵn; kiểm tra trước khi trừ, trừ vật phẩm và áp dụng hiệu ứng trong cùng giao dịch.
4. Game Arcade không phụ thuộc vào việc đọc truyện để hồi năng lượng. Vật phẩm thế giới có thể hữu dụng trong Vạn Giới nhưng không can thiệp tự động vào xu game.
5. Giữ **500 ô vật phẩm** theo số bản thể thực, tránh phát lại item do lệnh lặp hoặc đồng bộ hai máy.

## 4. Thứ tự triển khai trước lần Rules chung

1. **Ví Xu**: chỉ đọc từ `userProfile.currency`; dùng tỷ lệ 10:1 và trần 30 Xu/ngày làm cấu hình đề xuất để kiểm thử adapter/ledger, không tự tạo ví song song.
2. **Nhặt đồ**: thống nhất giới hạn điện thoại/chương, kết quả nhận duy nhất, trùng lượt, thời gian phía máy chủ ở lần mở quyền.
3. **Sử dụng vật phẩm**: ưu tiên đồ phổ thông + 4 công cụ cửa hàng có sẵn, kiểm tra không nhân bản, không dùng trái ngữ cảnh.
4. **Quyền đọc trả Xu**: thống nhất khóa nội dung thật và đơn mua truyện/chương, không chỉ ẩn nút.
5. **Quest/FUN/Arcade**: hợp nhất event idempotent, kiểm thử ít nhất hai UID và hai thiết bị.
6. **Rules một lần**: xác minh Firestore edition, xét mọi đường viết legacy, chạy emulator và đối chiếu dữ liệu trước khi phát hành.

Không tuyên bố các chức năng chưa hoàn thành là đã mở. Không deploy Rules hoặc tạo collection mới trong giai đoạn kế hoạch này.
