# C4.55 · Trạm Neon có ca phục vụ & Ngọc Phường gọn hơn

## Ngọc Phường

- Giữ nguyên ba tuyến, giá, xác suất nguồn và vật phẩm C4.54.
- Drawer Săn đá mù: bỏ banner lớn, lược mô tả, thu nhỏ túi minh họa; một thẻ nay chỉ có tuyến, tỷ lệ nguồn, điều kiện/giá và nút săn. Dòng lưu ý về xác suất đặt cuối danh sách.
- Chữ xác suất và giá giữ độ đọc được trên điện thoại; không đè nội dung khác.

## Quầy Trạm Neon

| Chế độ | Truy cập | Cách chơi | Phần thưởng |
| --- | --- | --- | --- |
| Tập nhịp | Luôn mở | Chuỗi 3–5 phím của C4.41B | Giữ 0,3–0,5 Tiền Xanh để tương thích save và test cũ |
| Tốc chiến | Luôn mở | Chuỗi biến thiên 4–6 phím, sau đó chốt SPACE đúng vùng sáng | Từ khoảng 3,8 Tiền Xanh và tăng theo phòng, khách, combo; PERFECT +25% |
| Khách VIP | Phòng 2 + mạng 2 | Chuỗi biến thiên 6–7 phím, vùng chốt hẹp hơn, ít giây hơn | Thưởng cao hơn Tốc chiến, tăng cùng cấp phòng và combo |

- Nhiều nhóm khách: game thủ, khách gấp, khách VIP, đội thi đấu. Thứ tự khách và chuỗi phím sinh theo `orderRound`/cấp phòng; không random lại khi reload.
- Chạm phím theo hướng trên điện thoại hoặc dùng phím mũi tên trên PC. Với hai chế độ mới, chờ con trỏ chạy đến vùng sáng rồi nhấn nút **SPACE / Chốt nhịp** (hoặc phím Space).
- Hoàn thành hướng chưa trao thưởng; chỉ chốt nhịp hợp lệ mới cộng Tiền Xanh một lần và ghi đơn/chuỗi. Bấm sai hoặc hết giờ mất combo, không mất thêm tiền.
- Ca kỹ năng hẹn khách tiếp theo sớm hơn giới hạn 90 giây của chế độ cũ; mạng cấp cao tiếp tục có ích.
- Một đơn chỉ ghi một lần; tiến trình chương trình Neon, mùa và toàn bộ mốc nâng cấp giữ nguyên.

## Giới hạn

- Tiền Xanh là số dư Arcade giả lập. Không chạm Ví Xu Vàng, Firestore, Rules hay reset Mùa 1.
- Thiết bị cấp thấp có thể cập nhật vạch canh theo nhịp làm mới 1 giây; vùng canh Tốc chiến cố ý rộng hơn VIP.

## Kiểm thử

- `node --test tests/arcade-c455-neon-shifts.test.cjs`
- `node --test tests/*.test.cjs`
