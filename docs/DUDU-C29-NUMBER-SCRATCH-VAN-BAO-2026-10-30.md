# DUDU Studio — C2.9 · Vé Cào Dò Số & Hộp Mù Vạn Bảo

Ngày: 30/10/2026 · Phạm vi: giao diện điện thoại `main` DUDU FUN.

## 1. Chỉnh lại cách chơi vé cào

- Vé Vạn Phúc giá 10 Xu ảo/vé, không giới hạn lượt mua tuần tự; giữ 13 tầng giải C2.8 và mức cao nhất 10.000 Xu. Tổng trọng số 1.000.000, kỳ vọng chi trả 8,43 Xu/vé.
- Vé mới hiển thị **một số may mắn**, **10 số có giải tiền dưới mỗi số**, **5 hộp quà bất ngờ** theo bố cục thẻ giấy. Nhấn hoặc vuốt để mở cả 10 số; 5 quà hiện nội dung khi cào xong. Một giải tiền được phân bố cố định vào đúng **một** vị trí khớp số hoặc quà bất ngờ; không nhân thưởng ngoài quỹ tiền đã xác định.
- Tất cả số/gói quà được dựng cố định từ seed và tiền thưởng đã được lưu trước. Chỉ khi mở xong 10 ô, trạng thái `ready` mới được xác nhận trong giao dịch riêng; `claim` là một giao dịch cộng Xu duy nhất.
- Không còn sưu tầm mẫu vé, không còn bảng chọn tám mẫu ở luồng vé mới; chỉ còn lịch sử mua/trúng giải và bảng công khai xác suất.
- Vé ba ô thuộc C2.8 vẫn được mở và nhận giải bằng luồng cũ. Sau khi hoàn tất, vé mua mới dùng dạng dò số.

## 2. Hộp Mù Vạn Bảo

- Một hộp miễn phí mỗi ngày UTC cho tài khoản. Mở thêm hộp **20 Xu/hộp**, tuần tự không giới hạn trong khả năng Ví và Kho.
- Bộ sưu tập gồm **19 kỷ vật DUDU**, phẩm chất E, D, C, B, A, S, SS, SSS, với ảnh SVG riêng theo hình dạng, màu sắc và bậc phẩm chất. Mỗi món là độc nhất, không bán, tặng hoặc trao đổi; không tăng sức mạnh hay EXP.
- Giao dịch `start` lưu lựa chọn vật phẩm và trừ tiền nếu hộp mua thêm. Giao dịch `claim` kiểm tra món trong Kho và bộ sưu tập, ghi Kho + sổ cá nhân trong cùng một transaction; mở lại/trùng request không cấp hai lần.
- Khi trúng món đã sưu tầm, trả lại **4 Xu** từ phần thưởng của hộp, không tạo vật phẩm nhân bản. Mở miễn phí bị trùng cũng nhận 4 Xu an ủi.
- Các lượt C2.5 đang mở dở được giữ ở phần hoàn tất cũ để người chơi không mất quà. Không reset profile, không cấp lại quà C2.5 đã nhận.

| Phẩm chất | Số món | Tỷ lệ mỗi hộp |
|---|---:|---:|
| E | 6 | 72% |
| D | 4 | 20% |
| C | 3 | 6% |
| B | 2 | 1,8% |
| A | 1 | 0,17% |
| S | 1 | 0,026% |
| SS | 1 | 0,0036% |
| SSS | 1 | 0,0004% |

## 3. Tính toàn vẹn & giới hạn

- UID là ranh giới tài khoản; giao dịch chỉ sửa hồ sơ `profiles_v2/{uid}` đã xác thực, giữ nguyên các trường không liên quan. Hộp mới dùng metadata `storyStates.__duduBlindBoxC29` và nhật ký sưu tầm C2.4.
- Không chuyển Arcade Xu sang Ví hệ thống; không thay đổi Rules, không reset Xu, vật phẩm, NPC hay liên lạc.
- **Giới hạn trước khi mở cho cộng đồng:** kết quả ngẫu nhiên được rút trên máy người chơi, không phải bằng server/trọng tài xác minh. Đối với game cá nhân, kết quả và khấu trừ được ghi nhất quán qua transaction; không nên coi là hệ thống chống gian lận public.

## 4. Kiểm thử

- Test C2.9 bao gồm: tỷ lệ chính xác, miễn phí một lần/ngày, nhiều hộp trả tiền, trùng món, sổ vật phẩm và Kho thực, replay/UID tách biệt.
- Test vé bao gồm: thẻ số và 5 quà, chỉ một ô trúng đúng tổng tiền, nhận thưởng một lần, vé C2.8 cũ giữ nguyên.
- Cần thử bằng tay trên điện thoại sau khi cập nhật GitHub Pages: cào bằng vuốt, mở hộp, Kho, sổ và trạng thái Xu sau khi tải lại.
