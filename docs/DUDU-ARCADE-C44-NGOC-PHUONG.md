# DUDU Studio — C4.4 · Ngọc Phường

Ngày triển khai: 30/10/2026. Phát triển trên `main`, kế thừa C4.3.

## Phạm vi đã đưa vào code

- Game Arcade thứ tư **Ngọc Phường**, giao diện điện thoại và tab dưới cùng, không mở nhánh hoặc Sandbox riêng.
- 5 bãi đá: Chợ Đêm, Mộc Khảm, Mạc Tây Cát, Hắc Ô Sa, Tàn Tích. Mỗi bãi có giá, tính chất bì, tỉ lệ Chủng/Sắc và điều kiện mở khóa riêng.
- Mỗi viên tạo thành phần ẩn ngay lúc mua: bãi đá, Chủng, Sắc, kích cỡ, biến cố, seed. Tải lại trang không quay lại đá khác.
- 3 điểm soi đèn, khai song mở ô, báo giá thương nhân NPC (bán sang tay) hoặc xẻ đôi. Sau khi bán/xẻ không thể nhận lại kết quả trước đó.
- Ngẫu nhiên một trong năm biến cố: hoàn hảo 15%, nứt 35%, hắc điểm 25%, hóa băng 8%, kháo bì 17%. Cưa cấp cao cứu được một số phôi bị nứt nhưng không xóa bản chất phế thạch.
- 4 phương án chế tác: vòng tay, mặt dây chuyền, nhẫn, chuỗi hạt; tính phí và giá thành tùy kích thước, chất lượng, thợ khắc.
- Nâng cấp đèn, cưa, thợ khắc và giấy phép Tàn Tích; sổ khám phá **7 Chủng × 8 Sắc = 56 tổ hợp**, tủ triển lãm tối đa 40 tác phẩm. Trưng bày là lựa chọn thay cho bán, không cùng lúc nhận tiền.
- Bản chơi đầu có **một đá thử, soi, khai song và cắt miễn phí** để trải nghiệm được ngay ở số dư 0.
- Giao diện CSS tự vẽ: hội quán, đèn lồng, bàn đá, thân đá, điểm soi, vết mài, ngọc lộ, đồ trang sức. Màn chính chỉ chứa các thao tác gần nhất; chợ, xưởng, sổ được đưa vào popup riêng.

## Quy tắc dữ liệu & Xu

- Sử dụng **chung Xu Arcade** (số nguyên một phần mười Xu) với ba trò chơi trước. Không tạo ví chính mới, không thưởng Xu Firebase, không cấp vật phẩm vào Kho tài khoản.
- Cấu trúc save vẫn `dudu-personal-arcade:v1:<uid>`, `version:1`; thêm `jade` bằng mặc định cộng dồn. Neon, Mine, Garden, Xu cũ đều giữ.
- Chỉ lưu trạng thái một viên đang xử lý và album/triển lãm trong trình duyệt đã đăng nhập; không xác nhận lưu đám mây hoặc chuyển thiết bị.
- **Giữ khóa** chuyển Xu Arcade ra ví chính, reset mùa, đổi thưởng và quyền cấp vật phẩm. `DUDU_SPARK_EXCHANGE_V1_READY` vẫn mặc định không bật. Không chỉnh Firestore Rules.

## Cấu trúc mã

- `js/personal-jade-core-v1.js` — bảng thị trường, phát sinh đá, soi/định giá, cắt, chế tác, cấp xưởng, tủ triển lãm, chuẩn hóa save.
- `js/personal-jade-ui-v1.js` — cảnh chơi tương tác và nội dung ba popup.
- `js/personal-arcade-core-v1.js` — nối state và lệnh `jade-*` vào engine Arcade hiện hành.
- `js/personal-arcade-ui-v1.js`, `css/personal-arcade-v1.css`, `index.html` — điều hướng tab thứ tư, giao diện, script/style version.
- `tests/personal-jade-c44.test.cjs` — kiểm thử các bất biến lượt chơi và tiến trình; các test Arcade cũ tiếp tục chạy.

## Kiểm thử thủ công đề nghị sau khi Pages cập nhật

1. Vào Điện thoại → Arcade → Ngọc Phường trên mobile 320/375/390 và desktop. Kiểm tab thứ tư không tràn, cửa sổ popup không bị che đáy.
2. Khi tài khoản có 0 Xu Arcade, nhận đá thử → soi 3 điểm → chọn khai song/bán **hoặc** xẻ; thử đóng/mở ở giữa lượt.
3. Bán sang tay hai lần, xẻ lại đá cũ, chế tác lại cùng phôi: mỗi thao tác phải thất bại, số dư chỉ cộng/trừ một lần.
4. Xẻ trúng ngọc → mở Xưởng, chế tác rồi chọn **bán hoặc trưng bày**; xác minh sổ 56 tổ hợp và tủ lưu qua tải lại.
5. Quay lại ba game C4.3; số Xu, nâng cấp và thành tựu trước đó giữ nguyên.

## Giới hạn cố ý

Đây là minigame mô phỏng tưởng tượng, không phải phương pháp định giá phỉ thúy thực tế. Các biến cố và công thức là luật cân bằng *Arcade*, chưa phải odds tiền thật. Khi mở mùa công khai, cần thiết kế lại xác thực giao dịch phía máy chủ trước khi cho phép bất kỳ khoản Xu Arcade nào nhập vào ví hệ thống.

### C4.4.2 — Tối ưu chiều cao giao diện

- Thanh chuyển bốn game dưới điện thoại còn 34px mỗi tab, icon và tên một dòng, không tự xuống hàng.
- Ẩn tiêu đề game phủ lên cảnh vì tên đã có tại thanh chuyển game; mỗi scene vẫn giữ nhãn truy cập trên vùng trò chơi.
- Thu gọn header ứng dụng và cảnh Ngọc Phường để các thao tác soi/khai song/xẻ sớm xuất hiện trên màn nhỏ.
- Chỉ thay CSS + tham số cache tài nguyên. Không đụng vào Xu, cấu trúc save hoặc gameplay.

### C4.4.3 — Phục hồi điều khiển và dàn cảnh 4 game

- Phục hồi nút bật/tạm dừng Trạm Neon: chuyển hẳn ra khỏi lớp header bị ẩn, đưa lên góc phải của sân khấu cùng nút ép xung; bỏ hàng ép xung lặp dưới thống kê.
- Địa Tầng 07: thống kê địa tầng ở mép trên, nhãn chạm đào ở đầu nút đá; cuốc/độ bền giữ bên dưới, không đè chữ lên nhau.
- Vườn Sương: rút chiều cao cảnh, kéo hai luống lên gần đỉnh, thêm vầng trăng và giữ hồ/đèn/điều khiển tách biệt.
- Ngọc Phường: rút chiều cao cảnh và khoảng cách danh sách gợi ý soi đá, để nút khai song/xẻ xuất hiện sớm hơn.
- Các thao tác vẫn ở cùng Arcade state; không thay đổi tiền, Kho, Firestore Rules hay logic nhiệm vụ.
