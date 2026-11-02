# DUDU FUN — CASINO FANTASY / VẠN TƯỢNG THIÊN CƠ

**Đợt CASINO-DESIGN1 · 02/11/2026 · Chỉ thiết kế và toán thưởng.**  
**KHÔNG kích hoạt cược Xu, KHÔNG sửa ví/Auth/Rules, KHÔNG reset dữ liệu.**

## Định hướng đã chọn

Kết hợp **Máy Quay Vạn Tượng** + **Tháp Vận Mệnh** + **Tiệm Thiên Cơ** vào *DUDU FUN hiện có*, không dựng thêm ứng dụng riêng. Giữ Vạn Bảo và Vé Cào. Mỗi trò phải có tương tác thực, hiệu ứng quay/mở, kết quả rõ, có vật phẩm để mua và đầu tư chiến thuật; không biến thành trò đọc văn bản hoặc chỉ chọn Đỏ/Đen.

Phong cách: casino fantasy tím–vàng, pha lê/sao/kim loại giống bộ Vạn Bảo; tái sử dụng ảnh `assets/dudu-fun/tower-v1/fate-tower-stage.webp` cho Tháp. Máy Quay có giao diện ba cuộn chuyển động, ba hàng, đèn thắng từng đường; điện thoại ưu tiên nút lớn, tối đa một thao tác tiền đang xử lý. Hiệu ứng hỗ trợ `prefers-reduced-motion`.

## 1. Máy Quay Vạn Tượng — trò chủ lực

- **3 cuộn × 3 hàng**, mỗi hàng ngang là một đường thưởng; không tính đường chéo ở bản đầu.
- Mức cược **đề xuất**: 10 / 20 / 50 Xu Vàng mỗi lượt.
- Cặp giống nhau trên một hàng: trả `0,1 × cược`; ba hình giống nhau: trả theo hệ số của hình dưới đây. Có thể thắng nhiều hàng cùng lúc; tổng trả bằng tổng ba đường.
- Trừ cược và chốt kết quả máy trước khi hoạt ảnh quay. Sau khi cuộn dừng mới hiện kết quả đã chốt; tải lại phải tiếp tục kết quả đó, không quay lại để nhân đôi tiền.
- Cờ `pending → revealed → claimed` và ID lượt độc nhất; giao dịch mua lượt + nhận thưởng có biên nhận chống lặp. Không tự tăng `userProfile.currency` từ hiệu ứng giao diện.

| Biểu tượng | Tần suất mỗi ô | Ba hình trên một hàng |
|---|---:|---:|
| ⭐ Tinh Tú | 26% | ×5 |
| 🔔 Chuông Ngọc | 22% | ×6 |
| 🍑 Đào Tiên | 18% | ×8 |
| 💎 Bích Ngọc | 14% | ×12 |
| 🐉 Kim Long | 10% | ×20 |
| 🪶 Phượng Hoàng | 6% | ×35 |
| 👑 Thiên Miện | 4% | ×70 |

**RTP cơ sở tính chính xác: 92,0784%** (trước vật phẩm; các ô được lấy ngẫu nhiên độc lập). Một lượt cược 10 Xu có trung bình 9,20784 Xu trả về, chênh lệch kỳ vọng −0,79216 Xu. Đây là đề xuất để Du duyệt, chưa phải tỷ lệ đang chạy. Vật phẩm thay đổi kết quả phải được mô phỏng lại trước khi bán để không tạo vòng Xu vô hạn.

## 2. Tháp Vận Mệnh — mạo hiểm có nhiều lựa chọn

- Tạo **5 tầng** hiện trực tiếp trên hình tháp. Người chơi bấm cổng/cửa, quan sát hoạt ảnh, khám phá phòng và quyết định *Rút thưởng* hoặc *Leo tiếp*.
- Phòng thay đổi giữa các lượt: cổng may mắn, rương nhỏ, thương nhân bán bùa. Các tình huống này cần thiết kế ảnh và thao tác, không triển khai bằng hộp thoại chữ dài.
- Khi bắt đầu lượt, chốt trước các cổng an toàn. Bấm lặp lại hoặc tải lại không được đổi kết quả.
- Cược và thưởng là **Xu Vàng ngoài Arcade**; không thưởng Tiền Xanh trực tiếp.

| Tầng | Cổng an toàn | Hệ số rút thưởng | Xác suất tới tầng này |
|---|---:|---:|---:|
| 1 | 2/3 | ×1,3 | 66,67% |
| 2 | 2/3 | ×2 | 44,44% |
| 3 | 1/2 | ×4 | 22,22% |
| 4 | 1/2 | ×8 | 11,11% |
| 5 | 1/3 | ×24 | 3,70% |

Giá trị kỳ vọng nếu rút ở tầng 2–5 xấp xỉ **88,89% tiền cược**, trước bùa và sự kiện. Tầng 1 thấp hơn (86,67%). Bản Tháp `fun-tower1` hiện đang dùng **điểm thử**, không được dùng dữ liệu điểm thử đó để cộng Xu thật; khi chuyển sang bản cược phải có biên nhận riêng.

## 3. Tiệm Thiên Cơ — cùng Ví và Kho

Tiệm nằm trong DUDU FUN, nhưng **không tạo ví/kho thứ hai**. Vật phẩm sau khi mua hợp lệ phải có ID định danh, nguồn `DUDU_CASINO`, số lượng, lần dùng và biên nhận; hiển thị cùng Kho và có thể dùng tại bàn tương ứng. Phần đồ trang trí chỉ đổi hình ảnh, không biến thành quyền cộng tiền.

| Mặt hàng đề xuất | Xu | Loại | Tác dụng dự kiến |
|---|---:|---|---|
| 🌟 Ấn Khóa Trục | 12 | Tiêu hao | Khóa một cuộn trước lượt quay |
| 🌙 Bùa Đổi Trục | 15 | Tiêu hao | Đổi một cuộn sau khi quay |
| 🔮 Kính Thiên Cơ | 20 | Tiêu hao | Hiện một cổng nguy hiểm ở tầng kế |
| 🛡️ Hộ Mệnh Phù | 25 | Tiêu hao | Hoàn một phần tư tiền cược khi trượt lần đầu |
| 💜 Bàn Pha Lê Tím | 90 | Trang trí | Đổi giao diện bàn |
| 🎰 Khung Máy Hoàng Kim | 180 | Trang trí | Đổi khung cuộn |
| 🃏 Bộ Bài Hắc Nguyệt | 120 | Trang trí | Đổi mặt bài trong kế hoạch tương lai |
| 🏮 Đèn Sao Vạn Giới | 150 | Trang trí | Đổi hiệu ứng đèn quầy |

**Giá và hiệu ứng là bản nháp**. Chưa bán, chưa cộng vào danh mục vật phẩm chính. Danh mục `js/item-catalog-v2.js` đang có kiểm tra số lượng và quyền sở hữu nghiêm ngặt; sẽ tích hợp bằng một đợt chuyên biệt có test, không làm sai dữ liệu người chơi hiện có. Vật phẩm cải thiện xác suất cần tính lại RTP *cộng cả giá mua và giới hạn dùng*.

## 4. Kết nối hệ thống

1. 💚 **Tiền Xanh**: chỉ kiếm/tiêu trong bốn khu Arcade như hiện tại. Không sửa gameplay Arcade.
2. 🟡 **Xu Vàng**: dùng trong FUN, Shop, Tiệm Thiên Cơ; Xu từ Arcade đi qua Quầy đổi một chiều **10 Tiền Xanh → 1 Xu Vàng** sau khi giao dịch được xác minh an toàn.
3. **Ví DUDU**: chỉ có một số dư có thẩm quyền; mỗi cược/mua/nhận thưởng phải có transaction nguyên tử và ID idempotent. Trình duyệt chỉ hiển thị kết quả xác nhận, không tự chứng thực số dư. V52 verified ledger chưa bật; không gắn nền toán thưởng vào giao dịch thật khi chưa chốt hạ tầng.
4. **Hạng thẻ**: Bạc, Gold, VIP/Kim Cương; cân nhắc chiết khấu *đồ trang trí*, không bán lợi thế casino vô hạn. Nâng hạng bằng tiền vẫn chờ xác minh ví.
5. **Auth**: UID chưa được chủ sở hữu duyệt không được giao dịch sau khi AUTH-A1 kích hoạt; không tự mở account khác.
6. **Kho/Bảo Tàng**: đồ sở hữu vào Kho; một góc thành tích FUN nhỏ có thể hiện trong Bảo Tàng hiện có. Không tạo thêm Phòng Danh Vọng.
7. **Mùa 1**: chưa reset. Chỉ gom Rules một đợt cuối sau khi casino, ví, quầy đổi, Auth và reset đã được thiết kế/test xong và Du duyệt.

## 5. Các đợt nhỏ

| Đợt | Kết quả có thể kiểm tra | Ảnh hưởng tiền thật trong game |
|---|---|---|
| **CASINO-DESIGN1 (hiện tại)** | Bản thiết kế, danh mục đồ, phép tính trả thưởng thuần và test | **Không** |
| CASINO-SLOT1 | Cuộn quay hoạt ảnh, bảng thưởng, chốt kết quả và ID lượt | Chưa mở cược khi chưa có giao dịch an toàn |
| CASINO-SHOP1 | Tiệm Thiên Cơ hiển thị và tích hợp Kho, vật phẩm tiêu hao/trang trí | Cần Du duyệt giá trước khi bật mua |
| CASINO-TOWER2 | Tháp có cổng/rương/phòng tiệm, rút thưởng, dùng bùa có giới hạn | Cần Du duyệt tỷ lệ và giao dịch |
| CASINO-ECONOMY | Gắn Xu Vàng đã xác minh, Quầy đổi tiền, replay tests, backup/rollback | **Thay đổi quan trọng, phải Du duyệt trước** |
| SEASON1 | Gom Auth/Rules/Wallet/reset, kiểm thử Emulator, một đợt Publish do Du duyệt | Chỉ cuối dự án |

## Kiểm tra bắt buộc trước khi bật cược Xu

- Hai lượt chạm nhanh, hai tab hoặc tải lại chỉ trừ/trả tiền một lần; mất mạng phải đối soát receipt thay vì tự trừ lần nữa.
- Cược khi thiếu Xu bị từ chối; trúng giải khi ví chạm giới hạn không được cộng tràn; không trộn Xu Vàng/Tiền Xanh.
- Vật phẩm tiêu hao không được nhân bản; mua một món trang trí đã sở hữu không trừ Xu thêm lần nữa.
- Kiểm chứng tỷ lệ cơ sở bằng công thức và mô phỏng; mỗi món bùa phải xét thêm chi phí và giới hạn dùng.
- Giữ nguyên bốn khu Arcade, Vạn Bảo, Vé Cào, Kho, Bảo Tàng và bảo vệ EPUB xóa vĩnh viễn C4.22.

Các hằng số thiết kế và phép tính nằm trong `js/dudu-casino-design-v1.js` (không tải vào trang người chơi ở đợt này).
