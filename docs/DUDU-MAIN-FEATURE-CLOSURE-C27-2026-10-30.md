# DUDU Studio — C2.7: Arcade Workshop + rà soát main

Ngày 30/10/2026. Baseline main trước đợt: `14e5dc592d8a4af26ddd7befa44699282016344b` (C2.6).

## Arcade Workshop — gameplay trên main

Không thay địa chỉ lưu tiến trình `dudu-personal-arcade:v1:<uid>`, không tăng
phiên bản đối tượng save và **không xóa số dư, quặng, cấp máy, cuốc hay cây cũ**.
`norm()` bổ sung mặc định cho các trường mới và kiểm tra biên dữ liệu sau khi
đọc. Cả ba trò tiếp tục dùng **Xu Arcade riêng trên thiết bị**, không phải Xu
thật trong Ví hệ thống. Không tự mở chức năng đổi Xu 10:1.

| Trò | Cơ chế mới | Vật tư/cấp trang bị có tác dụng |
| --- | --- | --- |
| Trạm Neon | Ép xung ×2 trong 3–5 phút, hồi 10 phút; ba hợp đồng một lần | Tản nhiệt cấp 1–5: tăng tốc độ nền và kéo dài ép xung; CPU/VGA/Mạng/Dàn/LED cũ giữ nguyên |
| Địa Tầng 07 | Ba địa tầng có yêu cầu mở, xác suất quặng khác nhau; đào nạp năng lượng; **Phá mạch** tiêu 5 năng lượng nhận 3 quặng | Đèn mở hầm; xe tăng 10% giá bán/cấp và chứa nhiều năng lượng; máy dò chế bằng 8 sắt + 3 tinh thạch cải thiện quặng hiếm; cuốc, khoan, rèn và dầu cũ giữ nguyên |
| Vườn Sương | Ba giống cây có giá trị/thời gian khác nhau; mở 2→4 luống; tưới hàng loạt; thu hoạch hàng loạt; **câu cá thật** tiêu mồi và nhận Xu Arcade | Dàn tưới cấp 1 mở tưới hàng loạt, cấp 2 rút ngắn thời gian lớn; cần câu tăng giá cá và tỷ lệ cá hiếm; bồn nước và hồ cá tiếp tục nâng cấp |

Giống Hoa sương có từ đầu, Bạc hà mở sau 10 lần thu hoạch,
Hoa nguyệt sau 30 lần. Sự kiện thu hoạch/cá/đào đều được kiểm tra điều kiện
và trừ nguyên liệu trước khi cộng đúng **Xu Arcade**, không thể bấm lại khi
không có năng lượng, mồi, cây chín hoặc khoáng sản.

Đã cập nhật giao diện điện thoại: menu địa tầng, thanh năng lượng, hiệu ứng
phá mạch, các thẻ giống cây, dàn câu cá và nút tăng tốc. Các nút chưa đủ
điều kiện bị khóa; thông báo sử dụng từ ngữ trong trò chơi. Màn mở rộng
4 luống có bố cục cuộn phù hợp màn hình nhỏ. Bản cũ có thể tải mã mới nhờ
đổi query cache của ba asset Arcade trong `index.html`.

## Rà soát chức năng Sandbox → main dựa trên mã nguồn

`Có mã main` nghĩa là đường thao tác đã nối và có kiểm thử mô phỏng, **không
tương đương xác nhận thành công trên Firebase thực tế**.

| Nhóm | Main sau C2.7 | Điều kiện/việc còn lại |
| --- | --- | --- |
| Thư viện L2A–L2D, EPUB, đọc truyện | Có mã main, kiểm thử thư viện đạt | Kiểm thử quy trình tác giả và đọc/ghi EPUB bằng tài khoản thực trên Android |
| Điện thoại 16 ứng dụng | Mounts và điều hướng có bài kiểm thử; 16 ứng dụng đều được khai báo | `lab-v445` là phòng thử nghiệm **chỉ Sandbox**; thư tác giả đã ẩn theo quyết định hủy tặng quà tác giả |
| Liên lạc NPC: yêu thích, hỏi thăm, phong bao, tặng quà | C2.1–C2.2 có giao dịch UID và biên nhận; timeline phong bao có trạng thái **Đã gửi** | Kiểm thử hai tài khoản, nhận/từ chối quà, hạn mức phong bao, reload; không giả định NPC đã đọc/nhận tiền |
| Cửa hàng, Kho, hình vật phẩm, bán một chạm, Sổ Sưu Tập | C2.3–C2.4 có mua/dùng/bán và nhật ký theo UID; hình shop/kho thống nhất | Kiểm thử giữ số Xu/instance ID qua hai tab, hoàn đơn và reload |
| Đọc chương, nhiệm vụ, nhặt đồ, EXP | C2.3c có biên nhận giao dịch ngăn cấp trùng thông thường | Chưa có xác thực thời lượng đọc/RNG phía máy chủ; kiểm thử hai UID và đồng bộ nhiều thiết bị |
| DUDU FUN Hộp Mù/Vé Số | C2.5 thưởng **Xu/Vật phẩm thật trong tài khoản** sau nhận, 1 lượt/trò/ngày | Kiểm thử live trên hai UID, mất mạng, ngày UTC; RNG hiện từ client, chưa chống gian lận phía máy chủ |
| Arcade ba trò | C2.7 gameplay, nâng cấp, dữ liệu cũ giữ lại; 143 tập kiểm thử Node toàn repo đạt | Cần tự chơi thử trên điện thoại thật; tiến trình Arcade lưu theo thiết bị, không phải kho server |
| Đổi Xu Arcade → Ví Xu | Có báo giá 10:1 và mã giao dịch dự kiến, **nút chuyển thật vẫn khóa** | Cần chốt cơ chế xác thực nguồn Xu, biên nhận và Rules an toàn trước khi mở; Xu local không đủ tin cậy để cấp Xu server |
| Ký gửi/Đấu giá | Sandbox có draft `AWAITING_SERVER`, **main không mở** | Cần hệ thống người mua thật, escrow, đối soát và bảo vệ chuyển quyền vật phẩm; không dựng giao dịch giả khi chưa có người chơi |
| Reset mùa mới | C2.6 **khóa ở UI và hàm xử lý**, có nút xuất JSON backup | Cần xác nhận phạm vi reset, sao lưu thực sự, đối chiếu Rules và thử một UID; tuyệt đối không reset âm thầm |

### Kết luận phạm vi C2.7

- **Chốt phần mã nguồn Arcade và giao diện gameplay.** Không phát hành
  chuyển đổi Xu Arcade hay ký gửi giả để coi là “đủ tính năng”.
- **Chưa chốt production** cho toàn bộ giao dịch real-wallet, vì chưa
  xác minh Rules đã triển khai và chưa có kiểm thử cùng hai UID/máy thật.
- Không thay `firestore.rules`, không triển khai Functions, không ghi/
  reset Xu, Kho, liên lạc hay dữ liệu người dùng trong đợt này.
- Đã chạy `node --test tests/*.test.cjs` (143/143 tập pass), kiểm tra
  Phone V67 manifest và vòng đời ứng dụng. Bài chạy browser V71 chưa thể
  chạy tại môi trường này vì thiếu Chromium Playwright, **không phải kết
  quả browser pass**. Trình tự kiểm tra tiếp theo: mở main trên điện thoại,
  chơi 3 trò, reload, chuyển tab, xem lại tổng Xu Arcade/thiết bị; sau đó
  kiểm thử hai UID + Firebase Rules trước khi mở reset hoặc chuyển Xu.
