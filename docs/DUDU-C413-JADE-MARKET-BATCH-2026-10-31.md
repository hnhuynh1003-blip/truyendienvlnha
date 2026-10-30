# C4.13 — Chợ lựa đá và Túi đá thô Ngọc Phường

## Vấn đề giải quyết

Trước đây chỉ có một viên đá trên bàn: mua → soi/cắt → bán → quay lại mua.
Điều này làm gián đoạn vòng chơi và thiếu cảm giác tự tay lựa đá ở chợ.

## Cơ chế mới

1. **Chợ đá thô** giữ 5 địa điểm và các điều kiện mở khóa đã có.
   Mỗi quầy cho phép lấy nhanh **1 / 3 / 5 viên**. Chi phí được báo trước,
   thanh toán trọn lô hoặc từ chối nếu thiếu Xu/chỗ chứa; không mua nửa lô.
2. **Tự lựa đá**: mở khay gồm ba mẫu A/B/C ở từng quầy. Mỗi mẫu có kích cỡ,
   dấu hiệu bì và hình dạng ngoài khác nhau. Dấu hiệu chỉ gợi ý, không phải
   kết luận ruột đá. Mẫu tự lựa giữ nguyên thành phần sau khi mua và tải lại.
3. **Túi đá thô** có tối đa **12 viên** tính cả viên trên bàn. Mua đá đưa vào
   túi, không ép phải xử lý viên đang có. Người chơi chạm một viên trong túi
   để đưa lên bàn soi; có thể **Cất đá · Đổi viên khác** nếu chưa xẻ.
4. Sau khi bán, sang tay hoặc trưng bày, đá đã xử lý rời bàn; những viên khác
   vẫn nằm trong túi, sẵn sàng chọn tiếp mà không phải ghé chợ.
5. Giữ nguyên **viên thử đầu tiên miễn phí** (cả CTA cũ), phí soi/xẻ, cấp
   máy, tỷ lệ quặng, cơ chế Kháo Bì và công thức giá C4.9. Đá cứu vốn chỉ
   cấp khi người chơi đã xử lý hết đá trong túi và trên bàn.

## Bảo toàn dữ liệu

- `jade.stash` được thêm vào `jade` hiện có; không thay khóa LocalStorage,
  định dạng Arcade V1, Firebase Rules hoặc ví Xu hệ thống.
- `norm()` nhận save cũ không có túi; lọc bỏ trùng ID, mẫu lỗi, mẫu đã
  cắt/chế tác trong túi. Không tạo lại viên đá hoặc đổi kết quả sau tải lại.
- Xu chỉ trừ khi mua thành công, tính vào `invested`; tiền bán vẫn ghi
  vào `received` và `sold` đúng một lần. Không có nút nhận thưởng mới.
- Mốc nhiệm vụ/danh hiệu dựa vào số viên **đã bán/đã cắt** tiếp tục giữ
  điều kiện cũ. Mua nhiều không tự hoàn tất thành tựu.

## Kiểm thử

- `tests/personal-jade-c413-market.test.cjs`: 7 kịch bản chuyển save cũ,
  tự chọn, mua lô, không đủ vốn, giới hạn túi, đổi viên, bán và giữ đá qua
  reload; kiểm tra cả UI market và kho.
- `tests/browser-arcade-mobile-c410.cjs`: đường đi từ chợ lựa mẫu B miễn
  phí → túi đá → đưa lên bàn → soi/cắt/bán trên màn hình điện thoại, cùng
  hồi quy ba game còn lại và Sổ Vinh Danh.
