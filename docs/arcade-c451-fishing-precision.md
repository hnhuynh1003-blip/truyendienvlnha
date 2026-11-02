# DUDU Arcade C4.51 — nhịp kéo chuẩn

Phạm vi: minigame câu cá Vườn Sương. Không thay schema lưu trữ, không tăng
tỉ lệ cá hiếm, Xu, mồi, thời gian chờ hoặc quyền truy cập các hệ thống khác.

## Cơ chế

- Phần **vàng** giữa dải an toàn là vùng kéo chuẩn, nhỏ hơn vùng kéo thường.
  Kéo vào dải xanh vẫn tính nhịp bình thường, không bị phạt.
- Hai cú **chuẩn liên tiếp** hạ một lỗi căng dây đã mắc. Chỉ hồi một lỗi
  mỗi chuỗi, không thể hồi âm và không cộng dồn qua cú hụt.
- Cần câu **cấp 4–5** chịu được thêm một lỗi khi kéo cá Hiếm, Sử thi hoặc
  Huyền thoại. Nâng cấp trước đây (vùng kéo rộng hơn, tốc độ phao chậm hơn
  và thưởng Xu khi câu được) vẫn còn nguyên.
- Mồi Tinh Nguyệt vẫn có thêm một cơ hội sửa sai ở cá khó; kết hợp cần
  cấp cao tối đa bốn lỗi trước khi dây đứt.
- Hiển thị số cú chuẩn cạnh tiến độ nhịp. Không vẽ gì mới lên background hồ.

## Kiểm tra

- `node --test tests/personal-arcade-fishing-c451.test.cjs`
- `node --test tests/personal-arcade-fishing-c425f.test.cjs`
- `node tests/browser-arcade-fishing-c446.cjs` — Chromium trong GitHub CI,
  kiểm tra độ rộng 320/375/390/430 và nhấp nút kéo thực.

Tiếp tục giữ dữ liệu cá, kỷ lục và Tinh Hoa cũ; thay đổi này chỉ quản lý
độ chuẩn và số lỗi trong **một lượt câu đang mở**.
