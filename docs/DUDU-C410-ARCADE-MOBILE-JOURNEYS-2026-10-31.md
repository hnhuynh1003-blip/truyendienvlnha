# C4.10 — Hồi quy hành trình Arcade trên điện thoại

Ngày: 31/10/2026. Phạm vi: 4 trò Arcade đã có; màn hình điện thoại, lưu tiến trình cục bộ, logic nhiệm vụ/thành tựu/danh hiệu. **Không reset mùa, không đổi Xu ra ví thật, không thay Firestore Rules, không chỉnh module Vạn Giới.**

## Kết quả rà soát

| Hành trình | Các bước đã kiểm thử tự động | Kết quả kỳ vọng |
| --- | --- | --- |
| Trạm Neon | Nâng CPU, router, lắp dàn máy; nhận 3 hợp đồng; phục vụ 25/100/250 lượt; mở phòng 2/3; nhận 4 mốc | Mở danh hiệu **Vương Giả Phố Đêm**; mỗi mốc thưởng được nhận duy nhất một lần |
| Địa Tầng 07 | Đào đủ 160 lượt; cạn cuốc, tự sửa trong 4 phút; mở đèn, đổi tầng 1 → 2 → 3; bán quặng | Không kẹt cuốc hay khóa tầng; nhận mốc đào và phát triển; không bán quặng lần hai nếu túi rỗng |
| Vườn Sương | Gieo → tưới → đợi chín → thu; lấy bọt làm mồi, thả câu → chờ cá cắn → thu | Ghi nhận thu hoạch, loài cá hiếm và danh hiệu nếu câu được Long ngư; không thu cá trước khi cắn |
| Ngọc Phường | Nhận viên đá thử, soi đủ ba điểm, xẻ và bán; tiếp tục trồng vườn | Nhận thành tựu **Một Đao Khai Ngọc** và danh hiệu **Tập Sự Thẩm Ngọc**; bốn trò dùng cùng ví **Xu Arcade** |

## Lỗi UI đã sửa

Khi chuyển tab game, bản trước giữ vị trí cuộn của tab cũ. Ví dụ: kéo xuống phần nâng cấp Trạm Neon, bấm Ngọc Phường thì vào thẳng đoạn nội dung tương ứng thay vì nhìn thấy bàn soi đá ở đầu game.

C4.10 đặt lại cuộn **về đầu khi chuyển sang game khác**; còn khi mua/cưa đá, đào, mở popup, cập nhật thời gian hoặc vẽ lại game hiện tại thì giữ vị trí để không làm mất ngữ cảnh. Bản JS thay đổi được cập nhật tham số phiên bản `c410-1` trong `index.html` để trình duyệt nhận tệp mới.

## Kiểm thử giao diện thật trong CI

Thêm `tests/browser-arcade-mobile-c410.cjs` vào công việc **browser** bắt buộc của GitHub Actions, dùng Chromium với nội dung mã nguồn thực, đăng nhập **Sandbox cục bộ**, chặn các yêu cầu ghi Firestore. Kiểm tra:

- Ba chiều rộng 320 / 390 / 430 px: thanh bốn tab nằm trong điện thoại và nội dung Arcade không tràn ngang.
- Đổi game trở về đầu sân chơi.
- Chạm nút nhận đá, soi ba điểm, cưa, bán; đào và bán quặng; gieo, tưới luống.
- Nút câu cá nằm **bên dưới hồ**, không che cảnh.
- Những game khác không làm mất tiến trình đã lưu của từng game; không có thao tác ghi dữ liệu ngoài.

Môi trường phát triển hiện tại thiếu bộ Chromium khả dụng, vì vậy **không được coi lượt kiểm thử trình duyệt này là đã chạy ở máy làm việc**. Kết quả đáng tin cậy của kịch bản Playwright cần kiểm tra ở công việc browser trên GitHub Actions sau khi commit. Các bài kiểm thử logic Node.js có thể chạy cục bộ.

## Tình trạng còn theo dõi

- Trải nghiệm vuốt và phông chữ trên điện thoại thật nên được chủ dự án chơi thử 5–10 phút/game sau khi GitHub xuất bản. Bộ kiểm thử tự động không đánh giá đầy đủ cảm giác thẩm mỹ, hiệu ứng và độ tiện tay.
- Các thưởng Xu trong Arcade vẫn là tiền trò chơi giả lập; bộ sưu tập vinh danh chỉ là mỹ phẩm. Không mở ngầm đường chuyển Xu hệ thống.
