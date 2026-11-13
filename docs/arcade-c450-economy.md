# DUDU Arcade C4.50 — kinh tế 4 khu

Phạm vi: **chỉ Arcade**, không tác động ví Xu chính, NPC AI, Thư viện hay Vạn Giới.
Không thay cấu trúc dữ liệu `dudu-personal-arcade:v1:*` và không định giá lại đá đang sở hữu.

## Thay đổi gameplay

- **Ngọc Phường:** Phí quầy cho **phôi mua mới** ở bốn chợ cao lần lượt là
  4 / 7,5 / 32 / 80 Xu trước ưu đãi đèn. Mỗi cấp đèn từ cấp 2 giảm phí thêm
  5% so với phí chuẩn (tối đa 15%). Tất cả hình thức mua (mua lẻ cũ,
  mua lô, tự chọn phôi) có cùng quy tắc. Chợ khởi đầu, đá đã mua,
  giá xẻ/bán/chế tác và thưởng sưu tập giữ nguyên.
- **Vườn Sương:** Dàn tưới cấp 2 tưới hai luống bằng một bình, bên cạnh
  tốc độ sinh trưởng +20% sẵn có. Cấp 1 vẫn mỗi bình một luống.
- **Tiệm câu:** Làm rõ mồi Tinh Nguyệt không mở cá hiếm tại hồ cấp 1.
  Không thay tỉ lệ câu hoặc thời gian chờ.
- **Giao diện:** Giá trên sạp, lựa phôi và nút mua lô đều là giá thực tế,
  phí quầy được ghi nhỏ bên dưới. Chỉ bổ sung hai dòng CSS; giữ background AI.

## Số liệu hồi quy

Mô phỏng tất định 20.000 viên mỗi chợ, xẻ ngay, không tuyển mẫu theo dấu vỏ,
không chế tác và chưa tính lời/lỗ của người chơi thực tế.

| Chợ | Phôi mới (đèn thường dùng) | Lãi bình quân khi xẻ rồi bán theo giá gốc |
| --- | ---: | ---: |
| Chợ Đêm | 5 Xu | −2,88 Xu/viên |
| Mộc Khảm | 17,8 Xu | +1,59 Xu/viên |
| Mạc Tây Cát | 49,1 Xu | −1,51 Xu/viên |
| Hắc Ô Sa | 163,8 Xu | +4,41 Xu/viên |
| Tàn Tích | 472 Xu | +3,78 Xu/viên |

Tàn Tích trước C4.50: trung bình **+75,78 Xu/viên** nếu mua/xẻ/bán bừa.
Giá thương nhân thật còn chịu dao động ngày; bảng chỉ xét giá gốc. Các ngọc
cực hiếm vẫn trả thưởng lớn và chơi giỏi vẫn có thể chọn phôi/chế tác để lời.

Trồng Hoa nguyệt bốn luống: trần bền vững do nước hồi 15 phút/bình là
**80 Xu/giờ** (dàn tưới cấp 1) hoặc **160 Xu/giờ** (cấp 2, đất 3);
chưa trừ thời gian nhấn nút. Câu cá: mồi Tinh Nguyệt ở hồ cấp 1 có
**0% cá hiếm** dù dùng mồi tăng hiếm, nên chỉ nên mua khi mở hồ cấp 2.

Chạy lại: `node tools/arcade-balance-c440b.cjs` và
`node --test tests/arcade-c450-economy.test.cjs`.
