# DUDU CORE — Background Style Bible 2A · Quan Đạo

> **Trạng thái**: Chuẩn bị asset và thêm lớp hỗ trợ ảnh AI; các file ảnh nhị phân chưa được tải lên GitHub. Vì vậy game vẫn dùng ảnh SVG cũ cho đến khi ảnh WebP có mặt. Không được thông báo rằng ảnh mới đã xuất bản nếu thiếu file.

## Hai ảnh cần đặt vào repo

| Place ID | Asset AI WebP | Fallback SVG | Mục đích |
|---|---|---|---|
| gate | `assets/worlds/quan-dao-gate-cinematic.webp` | `assets/worlds/quan-dao-gate.svg` | Đường mưa và mặt trước quán |
| hall | `assets/worlds/quan-dao-hall-cinematic.webp` | `assets/worlds/quan-dao-hall.svg` | Đại sảnh quán trọ |

Đã chuẩn bị thêm `assets/worlds/quan-dao-store-cinematic.webp` cho nhà kho; chỉ kích hoạt khi kịch bản được mở rộng để có `placeId=store` thật. Không thay đổi event/rule chỉ vì thêm ảnh.

## Style Bible v2A

- Vẻ ngoài: cổ trang cinematic semi-realistic, không hoạt hình, không nhãn chữ nằm trong ảnh. Bảng màu mưa xanh than bên ngoài, gỗ nâu và ánh đèn vàng ấm bên trong.
- Góc máy: khung hình môi trường ngang 16:9; tiền cảnh không có người để không xung đột với NPC được vẽ ở lớp riêng.
- Giữ các dấu mốc nhận diện (đèn lồng, mái ngói, cột gỗ, lối vào quán). Sự kiện trong game không được tự đổi địa danh hoặc tự thay đổi sự thật câu chuyện.
- Ảnh dùng WebP 800×450 bản pilot, có thể thay bằng bản xuất chất lượng cao sau nghiệm thu. Các file dưới 60 KB/ảnh; không nhúng base64 trong HTML. SVG cũ luôn giữ lại.
- Chỉ gắn ảnh với `placeId` và dùng khi tệp có thật. Khi thiếu tệp, khi trình duyệt không hỗ trợ WebP hoặc mạng lỗi, hiển thị SVG mà không chặn thao tác.
- Từ cảnh vào quán đến đại sảnh phải có chuyển cảnh rõ. Nhiệm vụ E về sau cần Scene ID riêng theo địa điểm, không áp đặt số ảnh cứng nhắc.

## Tiến độ

Đã tạo 2 background cắt riêng và 1 kho dự phòng tại gói ZIP của cuộc trò chuyện triển khai 2A. Đã thêm trường tùy chọn `photo` vào world pilot và đặt trình tải ảnh dự phòng. **Chưa đưa WebP nhị phân lên GitHub**, do connector ghi mã UTF-8, không cung cấp đường truyền nhị phân tại phiên này. Chưa kích hoạt ảnh trên bản công khai.

## Nghiệm thu

1. Ảnh SVG vẫn hiện bình thường khi file AI chưa có mặt.
2. Khi tải lên đúng file WebP, đường vào quán và đại sảnh đổi sang cảnh cinematic tương ứng; không có ảnh lặp.
3. Không tải đè ảnh của scene cũ khi chuyển cảnh nhanh.
4. Kiểm thử desktop + Android + iOS; các nút không che góc cảnh quan trọng.
5. Không mở cấp thưởng/Xu/EXP/khế ước hay thay đổi NPC, role, thư viện EPUB.
6. Nhiệm vụ F hiện tại còn đơn giản và cần Đợt 2B làm lại World Bible, logic NPC và điều kiện nghiệm thu; không ngụy tạo đã giải quyết lỗi chọn mò.
