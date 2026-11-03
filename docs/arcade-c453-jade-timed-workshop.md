# C4.53 — Ngọc Phường: chế tác theo thời gian thực

## Thay đổi

- Thay cơ chế 3 món/phút bằng **một bàn thợ làm từng phôi**. Mặt nhẫn bắt đầu từ 60 giây; dây chuyền, chuỗi hạt, vòng tay lâu hơn. Cấp ngọc tăng thời gian và cấp thợ giảm thời gian, nhưng không có món nào dưới 60 giây.
- Chọn chế tác chỉ trừ phí **một lần** và chuyển phôi đã cắt vào `jade.craftJob` với `startedAt`, `readyAt`, `type`, giá trị thành phẩm đã khóa ở thời điểm nhận việc. Không sinh vật phẩm ngay khi bấm.
- Thời gian dựa trên timestamp; vẫn tiến triển khi người chơi chuyển sang Trạm Neon/Đào đá/Vườn Sương hoặc đóng trình duyệt. Quay lại Xưởng để nhận thành phẩm vào Kho Ngọc sau khi hết giờ. Không cộng Tiền Xanh khi nhận.
- Một công việc đang chạy chặn đơn mới. Kho đầy thì chưa được nhận, công việc vẫn giữ nguyên đến khi có chỗ; nhận lại không thể nhân đôi món.
- Giữ cấu trúc save Arcade v1, mã đá, giá trị phôi, sổ ngọc và vật phẩm đã chế tác trước C4.53. Hai trường `craftWindowAt`/`craftUsed` cũ vẫn được đọc để không phá save, nhưng không còn điều khiển chế tác.

## Ranh giới an toàn

- Chỉ sửa mô phỏng Arcade ở localStorage; không thay đổi ví Xu Vàng, Firestore, Auth, Rules hoặc reset Mùa 1.
- Không sửa hoặc xóa ngọc đã có. Bộ kiểm tra save từ chối công việc chế tác sai định dạng/nhân bản ID với túi/kho.
- Nếu thiết bị mất dữ liệu localStorage thì không thể phục hồi công việc bằng Firebase; đây là giới hạn hiện hữu của Arcade cá nhân.

## QA

`node --test tests/personal-jade-*.test.cjs tests/arcade-c442-expansion.test.cjs`

`node --test tests/*.test.cjs`

Kiểm tra trực quan trên Android: gửi phôi, chuyển game, quay lại xem đồng hồ, đóng/mở trang, nhận ngọc, mở Kho Ngọc và thử nhận lần hai. Không Publish Rules.
