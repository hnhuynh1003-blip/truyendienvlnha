# C4.9 — Rà soát kinh tế và phục hồi vốn Arcade (31/10/2026)

Trạng thái: hoàn thiện logic và hồi quy tại mã nguồn. Phạm vi **chỉ Xu Arcade giả lập**, không chuyển Xu vào ví web, không reset mùa, không thay luật Firestore, không xóa save cũ.

## Đo nhịp bốn game

| Game | Nhịp khởi đầu (mã nguồn hiện hành) | Điểm cần lưu ý | C4.9 |
| --- | --- | --- | --- |
| Trạm Neon | 36 Xu/giờ từ máy + 24 Xu/giờ lãi dịch vụ, **60 Xu/giờ khi tab hoạt động** | Không tính lãi tự động khi đã đóng tab; lộ trình nâng cấp CPU đầu tiên 40 Xu, có hợp đồng/mốc một lần | Giữ nguyên thời gian và giá để không phá save/bài test |
| Địa Tầng 07 | Trung bình **0,72 Xu/lượt đào** tầng đầu (tính theo tỷ trọng 10 quặng), tài nguyên có thể bán | Đào thủ công; cuốc sửa sau 4 phút; lên tầng cao tăng lợi nhuận nhưng phải đạt lượt đào và đèn | Giữ cơ chế có đường kiếm Xu dù ví hết |
| Vườn Sương | Hoa đầu 5 Xu mỗi chu kỳ 3 phút, nước hồi 1 bình/15 phút; bọt hồ 90 giây cho mồi + 0,5 Xu, cá thường cho 2 Xu | Người chơi cần luân phiên gieo, tưới, câu; nước và mồi tự hồi | Giữ nhịp thu nhập thủ công và khả năng phục hồi vốn |
| Ngọc Phường | 5 bãi đầu tư 5–400 Xu/đá, xẻ thêm 0,5–30 Xu/đá, phần thưởng biến động mạnh | Trước C4.9 bãi cuối lời trung bình hơn 5.000 Xu/lượt xẻ, khiến phần mua/nâng cấp dễ bị bỏ qua; thiếu phí cưa làm đá kẹt trên bàn | Chỉnh trung bình bãi 2–5; thêm bán đá thô và đá cứu vốn |

### Mô phỏng đá của C4.9

20.000 viên/bãi, tạo dữ liệu theo hạt ngẫu nhiên xác định; **luôn xẻ trực tiếp** (chưa tối ưu bằng soi hay khai song), chưa tính phí chế tác. Cột lãi đã trừ giá mua và phí xẻ, riêng đá số 1 tặng miễn phí không được tính vào trung bình dài hạn.

| Bãi | Giá mua (Xu) | Giá xẻ trung bình (Xu) | Lãi ròng trung bình (Xu) | Tỷ lệ xẻ có lời | Jackpot quan sát lớn nhất (Xu) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chợ Đêm | 5 | 2,6 | -2,9 | 14,6% | 79,8 |
| Mộc Khảm | 14 | 22,9 | +7,5 | 43,6% | 465,3 |
| Mạc Tây Cát | 42 | 66,1 | +20,6 | 44,9% | 1.248,5 |
| Hắc Ô Sa | 135 | 245,4 | +100,4 | 38,8% | 8.023,1 |
| Tàn Tích | 400 | 846,0 | +416,0 | 53,3% | 11.886,0 |

Phân phối Đậu/Kính/Long Thạch, sắc Đế Vương, rủi ro 70% phế thạch ở bãi 1 và xác suất biến cố khi cắt được **giữ nguyên**. Giá trị ngọc ở bãi cao cấp được nhân hệ số bù giá/lợi nhuận khi **mua đá mới từ C4.9**. Đá đã nằm trên bàn ở save cũ giữ nguyên công thức định giá ban đầu qua `payoutV=1`; đá mua mới mang `payoutV=2`. Giá trị những phôi đã xẻ trong save không bị tính lại.

## Hai đường cứu vốn khi mắc kẹt

1. **Thanh lý đá thô** (chỉ đá đã mua bằng tiền, còn nguyên vỏ): bán lại 25% giá gốc; không được cộng thêm lượt giao dịch mở bãi. Không có nút thanh lý cho viên tặng/viên cứu vốn và không thể bán hai lần.
2. **Đá tập cứu vốn** khi Xu Arcade dưới 5, đã chơi hết lượt tặng đầu và hiện không có đá trên bàn: nhận một viên Chợ Đêm miễn phí, soi/khai song/xẻ miễn phí. Thời gian nhận lại: 10 phút tính theo đồng hồ và được lưu trong save. Nhận đá **không tự cấp Xu**; phải khai đá và bán theo kết quả, 70% phế thạch vẫn giữ nguyên. Không dùng được khi còn đủ tiền mua đá.

Ngoài hai cách này, Trạm Neon, Địa Tầng 07 và Vườn Sương vẫn dùng **cùng ví Xu Arcade** để tích vốn quay lại Chợ Đêm. Xu web chính không liên quan.

## Kiểm thử / lưu ý vận hành

- Test có thêm kiểm tra xác suất, giá trung bình, jackpot, tương thích save cũ, thanh lý một lần, cooldown qua reload, nút UI và nhịp kiếm Xu ba game cũ.
- Khảo sát xác suất là ước lượng theo mô phỏng, không phải cam kết lời cố định cho từng viên.
- C4.9 không đổi dữ liệu achievement/title đã mở, số Xu, cấp độ, kho ngọc, hay thành tích game trước đây.
- Còn để đợt sau: thử cảm nhận trên điện thoại thật 5–10 phút mỗi game và cân chỉnh nếu nhịp bấm/đọc thông số chưa dễ chịu.
