# DUDU Studio — C2.8: khoáng sản, câu cá và Vé Cào Vạn Phúc

Ngày 30/10/2026. Phát triển trên main C2.7 `0d5bb3301c26622e7061a08f210aec2a49303f4b`.

## Vườn Sương

- Nút **Thả câu** chuyển vào ngay trên hồ, bên trên nút thu bọt; không cần
  cuộn xuống qua bảng vật tư rồi mới thả câu. Trên hồ hiện hiệu ứng chữ
  cá bắt được, tiền thắng/cá hiếm trong 1,7 giây; phía dưới vẫn có thống kê.
- Trừ mồi và cộng Xu Arcade như giao dịch cục bộ đã có; không tạo vật phẩm
  trong Kho người chơi hoặc Xu hệ thống từ thao tác câu cá.

## Địa Tầng 07

- Từ 4 thành **10 loại** quặng: Đá, Than, Sắt, Đồng, Bạc, Vàng, Tinh
  thạch, Ngọc bích, Thiên thạch, Cổ vật. Sắp xếp tỉ lệ theo ba địa tầng;
  nơi càng sâu tỷ lệ cao cấp càng tăng; mũi khoan và máy dò cải thiện thêm.
- Tầng đất: 1 mẫu/cú; Mạch Sắt và Hang Tinh Thể: 2 mẫu/cú; cuốc cấp 3+
  thêm 1 mẫu/cú. Phá mạch vẫn gồm 3 cú, lấy số mẫu phù hợp tầng và cấp cuốc.
- **Sổ địa tầng** ghi nhận loại từng đào, dù sau đó người chơi đã bán hết.
  Dữ liệu save vẫn là `dudu-personal-arcade:v1:<uid>`, không xóa quặng cũ.
  Nếu đã bán một món từ trước C2.8 và không có biên nhận, không tự bịa
  lịch sử khám phá cũ; quặng đang giữ sẽ được tính là đã phát hiện.
- Bán quặng chỉ tăng Xu Arcade, không tăng Xu thật trong Ví; giá vật phẩm
  hiếm cao hơn nhưng cơ chế đổi Arcade → Ví hệ thống vẫn khóa.

## DUDU FUN — Vé Cào Vạn Phúc trên main

- Trò Vé Số miễn phí một lần/ngày được **thay trên main** bằng Vé Cào Vạn
  Phúc: **10 Xu hệ thống ảo/thẻ**, chọn 1/8 mẫu vé (Kim Long, Phượng Vũ,
  Hoa Đăng, Ngọc Thỏ, Liên Hoa, Kỳ Lân, Vân Cẩm, Kim Nguyên). Có thể mua
  thẻ tiếp theo sau khi hoàn tất thẻ trước, không giới hạn số vé/ngày.
- Phần thưởng được chọn trước và cam kết ở hồ sơ UID cùng lúc trừ 10 Xu;
  người chơi cào ba ô rồi bấm **Nhận**. Nhận và cộng tiền cùng một giao dịch
  với biên nhận đã xử lý: một thẻ không cộng lần hai khi chạm lặp, reload,
  hoặc gửi lại yêu cầu. Ví đầy giữ quyền nhận để thử sau.
- Sổ vé lưu bộ đếm 8 mẫu, các hạng giải đã từng gặp, 48 lượt hoàn thành
  gần nhất và 96 mã mua gần nhất (giới hạn dung lượng hồ sơ). Thẻ đã sở hữu
  không mất khỏi thành tích khi hoàn thành; hàng trăm lần mua không làm
  phình vô hạn hồ sơ. Vé miễn phí cũ vẫn giữ lịch sử trong trạng thái C2.5;
  main không mở lượt vé cũ mới. Sandbox vẫn giữ gameplay cũ để tham chiếu.
- Hộp Mù C2.5 **vẫn miễn phí 1 lượt/ngày** và tiếp tục thưởng Xu/vật phẩm
  qua giao dịch UID cũ. Các nhiệm vụ DUDU FUN miễn phí không bị cộng lặp
  từ mỗi thẻ Vé Cào trả phí.

### Bảng xác suất công khai

Giá vé **10 Xu**. Các xác suất sau chính xác theo `1.000.000` kết quả
trong bảng `PRIZES` của `js/personal-scratch-c28.js`:

| Giải Xu | Tỷ lệ | Mốc trung bình |
| ---: | ---: | ---: |
| 10.000 | 0,0001% | 1/1.000.000 |
| 2.000 | 0,001% | 1/100.000 |
| 500 | 0,01% | 1/10.000 |
| 200 | 0,05% | 1/2.000 |
| 100 | 0,2% | 1/500 |
| 50 | 0,8% | 1/125 |
| 30 | 2% | 1/50 |
| 20 | 7% | 1/14,3 |
| 15 | 12% | 1/8,3 |
| 10 | 20% | 1/5 |
| 5 | 25% | 1/4 |
| 2 | 30% | 1/3,3 |
| 0 | 2,9389% | 1/34 |

Giá trị kỳ vọng phần thưởng là **8,43 Xu/vé**. Một vé có thể thắng, hoàn
vốn, lỗ hoặc không trúng; không có bảo đảm thắng sau số vé cụ thể. Vé,
Xu và giải đều **ảo trong trò chơi**, không đổi ra tiền thật.

### Giới hạn tin cậy và điều kiện trước khi mở rộng người chơi

- Firestore Standard/Spark của chủ dự án được xác định ở các đợt trước;
  chưa đọc lại cấu hình live bằng Firebase CLI ở môi trường này. C2.8
  dùng transaction trên `profiles_v2/{uid}`; không deploy Rules hoặc Functions.
- RNG do client sử dụng Web Crypto cung cấp và lưu thưởng trước khi cào,
  **không phải RNG đã được máy chủ chứng thực**. Người biết sửa client
  vẫn có thể thao túng đầu vào nếu họ có quyền ghi hồ sơ của mình. Với
  cơ chế mua không giới hạn và giải 10.000 Xu, đây là rủi ro nghiêm trọng
  nếu mở cho người chơi công khai hoặc chuyển Xu thành giá trị khác.
  Cần chuyển khâu rút thưởng/phát hành sang nguồn quyết định đáng tin cậy
  trước khi mở rộng; không tuyên bố có chống gian lận.
- Không kích hoạt đổi Xu Arcade → Ví, không reset mùa, không xóa tiến độ
  C2.5/C2.7, không tự sửa số dư hiện tại. Cần kiểm tra giao dịch thực tế
  với hai UID và ít nhất một thiết bị Android trước khi công bố hoàn thiện.
