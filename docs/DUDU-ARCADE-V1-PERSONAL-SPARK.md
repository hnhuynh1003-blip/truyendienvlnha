# DUDU Studio — Arcade V1 / ba minigame miễn phí

## Mục tiêu

Một điện thoại cá nhân có ba trò độc lập, không gắn lượt chơi với số chương đã đọc:

1. **Trạm Neon** — bắt đầu với 1 máy, tự tăng **0,1 Xu trò chơi/giây** khi trang còn mở. Dùng Xu trò chơi để nâng CPU/VGA và mở khóa tối đa 3 dàn máy thực sự; mỗi dàn nhân công suất hiện có. Máy thứ hai giá 80 Xu, máy thứ ba giá 320 Xu.
2. **Địa Tầng 07** — đào quặng bằng một cuốc 100/100 độ bền, mỗi lần đào tốn một điểm. Bán đá/than/sắt/tinh thạch lấy Xu; sửa trong 4 phút hoặc dùng 5 than + 2 sắt để sửa ngay. Có thể mua dầu bôi trơn (+25 độ bền / 15 Xu) hoặc cuốc mới (80 Xu) hoàn toàn bằng Xu trò chơi.
3. **Vườn Sương** — trồng/tưới/thu hoạch cây, hồ cá xuất hiện bọt mỗi 90 giây. Bình nước tự hồi một đơn vị mỗi 15 phút (tối đa 3), kể cả khi người chơi đóng trang; cây lớn sau 3 phút.

Các tên được chọn ngắn, có cảm giác giao diện hệ thống, tránh lặp tên thương hiệu trên từng app.

## Phạm vi kỹ thuật V1

- Mã tính toán `js/personal-arcade-core-v1.js` thuần JavaScript, nhận mốc thời gian và lượt đào để kiểm thử xác định.
- Giao diện `js/personal-arcade-ui-v1.js` mở trong điện thoại qua một biểu tượng **Arcade**; ba tab nằm trong cùng ứng dụng để không chiếm ba vị trí ở màn hình chính.
- Các màn chơi dùng CSS vẽ trực tiếp, không dùng hình tải ngoài: Trạm Neon là phòng máy có monitor phát sáng và máy khóa/chạy theo tiến trình; Địa Tầng 07 cho chạm vào khối đá với hiệu ứng trúng quặng, kho quặng và xưởng rèn; Vườn Sương có cây lớn theo trạng thái, hồ cá bơi và bong bóng. Đây là lớp hiển thị thay thế cho các thẻ bảng số ở bản đầu; giữ nguyên khóa lưu `dudu-personal-arcade:v1:` để không mất tiến trình cũ.
- Tiến trình lưu trong `localStorage` theo UID của tài khoản Firebase hiện đang đăng nhập; không tạo collection mới và **không gọi Firestore**.
- Xu trò chơi nằm trong biến `state.coins` riêng; tuyệt đối không ghi `userProfile.currency`, ví Xu hệ thống, Shop, nhiệm vụ, vật phẩm thật hoặc quyền mở khóa chương.
- Nút **Chuyển vào ví Xu hệ thống** hiển thị nhưng bị vô hiệu hóa, cho đến khi Rules và luồng chuyển Xu được nghiệm thu. Xu V1 **không được coi là số dư có giá trị trên máy chủ**.
- Trạm Neon được tính theo thời gian **tab thực sự chạy**; khi mở trang lại sau khi đã đóng, không tự cấp Xu cho khoảng thời gian đã tắt. Hồi nước, cuốc và tăng trưởng cây vẫn dựa trên đồng hồ thực.
- Không sử dụng Cloud Functions, dịch vụ AI, thanh toán, cổng nạp tiền hoặc dịch vụ nào bắt buộc Blaze.

## Giới hạn cố ý

- Giải trí cá nhân giai đoạn đầu **không đồng bộ tiến trình game xuyên thiết bị**. Nếu dùng điện thoại khác, một UID có bản lưu game riêng ở mỗi thiết bị, dù trang đọc vẫn có thể đồng bộ Firestore.
- `localStorage`, đồng hồ trình duyệt và lượt đào không phải cơ chế chống gian lận. Không được dùng dữ liệu này làm nguồn phát Xu server cho tới khi có quy tắc xác nhận, hạn mức và chống ghi trùng.
- Nhiều tab cùng tài khoản dùng chung localStorage có thể tranh chấp. UI lắng nghe `storage` và tải lại khi tab khác lưu, nhưng đây chỉ là giảm xung đột, **không phải giao dịch tiền tin cậy**.
- Các giá trị nhịp chơi đang là cấu hình thử nghiệm: 0,1 Xu/s, sửa 4 phút, hứng nước 15 phút, cây 3 phút, bọt cá 90 giây. Điều chỉnh sau khi thử trực tiếp.
- Tài khoản khách không thể chơi/lưu; không tạo dữ liệu game cho người chưa đăng nhập.

## Kiểm thử

```bash
node tests/personal-arcade-core-v1.test.cjs
node --test --test-reporter=dot tests/*.test.cjs
```

Trước khi kết nối Xu vào quyền đọc EPUB: xác định Firestore edition, thiết kế ledger và entitlement bất biến theo UID, kiểm thử tính nguyên tử, kiểm soát quyền chương, xác minh không đọc được nội dung trả Xu qua đường đọc công khai. Chỉ cập nhật Firestore Rules **một lần** sau khi những phần này hoàn thành và chủ dự án đã sao lưu bản đang chạy.
