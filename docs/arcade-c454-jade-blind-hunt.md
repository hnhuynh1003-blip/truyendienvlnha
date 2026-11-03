# C4.54 · Ngọc Phường — Săn đá mù

## Luồng chơi

- Nhận viên đá đầu tiên miễn phí ở Chợ Đêm, sau đó mở **Săn đá mù** từ bàn Ngọc Phường.
- Chọn **một trong ba tuyến**, xem giá và tỷ lệ *nguồn phôi*, rồi ký chuyến bằng **Tiền Xanh**.
- Nhận đúng **một viên đá thô niêm phong** vào túi (tối đa 12 viên kể cả mẫu trên bàn). Không nhận xu trực tiếp.
- Khi đá chưa xẻ, túi và bàn chỉ ghi “Đá mù” hoặc tên tuyến; không lộ nguồn thật. Người chơi vẫn có thể soi, khai song, xẻ, chế tác và sưu tập như mọi phôi khác.
- Tính phí soi/xẻ bình thường. Đá không bị đổi phẩm chất khi chuyển game hoặc tải lại.

## Tuyến săn

Giá dưới đây tính theo đơn vị nội bộ (10 đơn vị = 1 Tiền Xanh).

| Tuyến | Giá | Điều kiện | Xác suất nguồn đá |
| --- | ---: | --- | --- |
| Đường Mưa | 110 | Đã nhận đá tặng | Chợ Đêm 65%, Mộc Khảm 30%, Mạc Tây Cát 5% |
| Sông Ngầm | 650 | Bán 5 viên; đèn cấp 2 | Mộc Khảm 40%, Mạc Tây Cát 45%, Hắc Ô Sa 15% |
| Hắc Sa Bí Cảnh | 2.350 | Bán 25 viên; đèn cấp 3; thợ cấp 2 | Mạc Tây Cát 25%, Hắc Ô Sa 55%, Tàn Tích 20% |

Tỷ lệ công bố là nguồn phôi (tổng 100%), **không phải xác suất ngọc quý**. Grade/màu/vết nứt tiếp tục dùng cùng bộ tạo đá hiện có. Mua không bảo đảm có lãi: phải trả tiền chuyến và phí xẻ, vẫn có thể gặp phế thạch/kháo bì. Các chuyến đi được kiểm soát riêng, không cấp quyền mở quầy chợ thường.

## Giữ tương thích

- `stone.hunt` tùy chọn (0–2), chỉ tồn tại với đá từ chuyến săn. Save cũ, đá mua chợ và vật phẩm chế tác cũ không thêm trường này.
- `j.bought`, `j.stash` và kiểm tra trùng ID dùng lại hệ thống có sẵn. Không thêm ví phụ, tiền tệ, hạn mức theo ngày hay thao tác Firestore.
- Bàn thợ tính thời gian thực C4.53, kho và sổ 56 mẫu ngọc giữ nguyên.

## Kiểm thử

`node --test tests/personal-jade-c454-blind-hunt.test.cjs` kiểm tra phí một lần, nguồn theo tỷ lệ, tính bền vững của đá khi reload, điều kiện mở, túi đầy, ID giới hạn, quà newbie và giao diện drawer.

`node --test tests/*.test.cjs` kiểm thử hồi quy toàn dự án.
