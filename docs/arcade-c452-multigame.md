# DUDU Arcade C4.52 — chiều sâu ba khu game

Chỉ chỉnh Trạm Neon, Địa Tầng 07 và Ngọc Phường trên cơ sở C4.51.
Vườn Sương giữ nguyên. Không can thiệp NPC AI, Thư viện, Vạn Giới,
DUDU CORE hoặc ví Xu chính. Không thêm trường vào trạng thái Arcade v1.

## Trạm Neon — nâng Mạng giúp phục vụ nhanh và chính xác

- Mỗi cấp Mạng vượt cấp 1 cho thêm **0,4 giây** xử lý một vé nhịp;
  giới hạn +3,6 giây ở cấp 10.
- Sau một đơn đúng nhịp, khách tiếp theo đến nhanh hơn **6 giây/cấp**
  (từ 90 giây ở Mạng 1 còn 36 giây ở Mạng 10).
- Không thay thời gian chờ của một vé đã bắt đầu trong bản lưu cũ.
  Không tăng thưởng hoặc Xu tự động.

## Địa Tầng 07 — thăm dò đáng để nâng máy

- Máy dò cấp 1 vẫn có hiệu ứng phân bố khoáng sản như trước.
- Dò **đúng ngách** ở máy dò cấp 2 thu thêm +1 mẫu; cấp 3 thêm +2
  mẫu so với trước. Trượt ngách không có thưởng cộng thêm.
- Giữ giá quặng, độ bền, vật tư chế máy, lượng năng lượng mất và xác suất
  xuất hiện khoáng sản. Chỉ tác động đến khoáng sản **mới đào**.

## Ngọc Phường — đèn giám ngọc cho thông tin thực sự hữu ích

- Khi đã trả phí soi một phôi ở sạp, Đèn cấp 1–2 cho **1 dấu hiệu**;
  cấp 3 cho **2 dấu**; cấp 4 cho **3 dấu khác nhau**.
- Khi xem cả ba phôi, chỉ hiện gợi ý đầu và nhãn còn bao nhiêu dấu;
  chạm phôi yêu thích để đọc đủ. Giữ chữ gọn trên điện thoại.
- Phí soi, giá mua, lời/lỗ, tỷ lệ đá hiếm, đá và bộ sưu tập đã có không đổi.

## Kiểm thử

- `node --test tests/arcade-c452-multigame.test.cjs`
- `node --test tests/*.test.cjs`
- `node tests/browser-arcade-multigame-c452.cjs` trong CI có Chromium;
  kiểm tra giao diện 320/375/390/430px và giao dịch thử chỉ ở Sandbox.

C4.53 nên tiếp tục luân phiên bốn khu, ưu tiên nhiệm vụ kỹ năng tại Trạm
Neon, chọn tuyến quặng và hệ thống chế tác ngọc có quyết định thực tế.
