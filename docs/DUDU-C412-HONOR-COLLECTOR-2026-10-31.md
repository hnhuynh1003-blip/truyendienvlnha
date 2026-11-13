# C4.12 — Lộ trình sưu tập danh hiệu (31/10/2026)

## Phạm vi

C4.12 nối tiếp hiệu ứng nhận danh hiệu C4.11, tập trung giúp người chơi nhận
biết **món đang có, món còn thiếu, độ hiếm và tiến độ săn tiếp theo**. Không
thêm danh hiệu, điều kiện thưởng, điểm năng lực hay nguồn phát Xu mới.

## Trải nghiệm trên điện thoại

- **Mục tiêu đáng săn:** Sổ Vinh Danh gợi ý một danh hiệu *chưa sở hữu*,
  chưa bị giữ bí mật. Ưu tiên theo tỷ lệ hoàn thành hiện tại, sau đó theo
  quy mô mục tiêu và độ hiếm. Hướng dẫn và bộ đếm lấy từ điều kiện thật.
- **Danh hiệu khóa:** hiển thị tên, độ hiếm, điều kiện và bộ đếm tiến độ;
  nút **Xem mốc** mở đúng thẻ thành tựu. Mục tiêu được viền nổi bật và đưa
  lên đầu danh sách liên quan để không phải tìm cuộn dài.
- **Danh hiệu bí ẩn:** không hiện tên, mô tả, bộ đếm hay độ hoàn thành ẩn;
  chỉ thấy cấp hiếm và nguồn. Nút dẫn sang mục **Bí ẩn**.
- **Lọc sưu tập:** tất cả, chưa có, đã sở hữu, hiếm trở lên và huyền thoại,
  kết hợp cùng bộ lọc địa điểm/game. Bộ lọc cuộn ngang để không đẩy giao
  diện điện thoại quá dài.
- **Đồ họa:** danh hiệu đã có giữ nguyên khung/sáng tương ứng C4.7; vật phẩm
  chưa sở hữu có viền nét đứt theo bậc, không được giả làm hiệu ứng sở hữu.

## Ràng buộc dữ liệu

- Nguồn sự thật: danh sách `TITLES`, `CATALOG`, `view` từ `personal-honor-c46.js`.
  Không duy trì một bảng mục tiêu song song.
- Bảo toàn đồng bộ Firebase và phương án thiết bị ở C4.6.1; xem/lọc mục tiêu
  không gọi transaction, không ghi Firestore/localStorage và không trao thưởng.
- Danh hiệu bí mật chỉ lộ điều kiện sau khi thực sự được mở khóa.
- Chỉ tăng cache version các tệp Honor UI/core/CSS (`c412-1`), để giữ nguyên
  C4.11 Arcade gameplay.

## Kiểm thử

- `tests/personal-honor-c412-collector.test.cjs`: ánh xạ 19 nguồn mở khóa,
  gợi ý gần hoàn tất, bí mật, bộ lọc độ hiếm/trạng thái, điều hướng tới mốc
  thật, không trao Xu/EXP và không đổi hồ sơ.
- `tests/browser-arcade-mobile-c410.cjs`: sau hành trình 4 game, kiểm tra Sổ
  Vinh Danh với danh hiệu Ngọc đã nhận, bộ lọc Huyền thoại, điều hướng đến
  Bí ẩn và không tràn ngang trên điện thoại 320/390/430 px.
- Giữ các kiểm thử C4.6–C4.11 và kiểm thử hồi quy dự án.
