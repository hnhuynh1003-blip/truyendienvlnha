# FUN-P1 — Tiền Xanh / Xu Vàng (02/11/2026)

Mốc khảo sát: `main` C4.52 `a6887ddd250172dce1a67a7871e4c8f997b3fcf0`.

## Hiện trạng và quyết định an toàn

| Khu vực | Dữ liệu hiện hành | Hiển thị sau P1 | Quyền giao dịch |
| --- | --- | --- | --- |
| Bốn game Arcade | `dudu-personal-arcade:v1:<uid>` trong `localStorage`; `coins` đếm phần mười | 💚 Tiền Xanh | Giữ toàn bộ giá, thưởng, nâng cấp và tiến độ hiện tại |
| Ví chung, Shop, FUN | `profiles_v2/{uid}.currency` trong hồ sơ hiện hành | 🟡 Xu Vàng | Giữ số dư, UID, kho, biên nhận và giao dịch hiện có |
| Quầy đổi | `personal-arcade-exchange-v1.js` báo giá 10:1; `personal-spark-exchange-v1.js` là bridge thử nghiệm | 💚 10 → 🟡 1, hiển thị tiền dự kiến | **Vẫn tắt** `DUDU_SPARK_EXCHANGE_V1_READY`; không được chuyển Xu thật |
| Hình nền | Bộ hình nền V27/V34/V37; lựa chọn local theo tài khoản/thiết bị | Không đổi trong P1 | Mua hình nền bằng Xu Vàng để P2, chưa tạo entitlement mới |
| DUDU FUN | Vạn Bảo/Hộp Mù và Vé Cào Vạn Phúc; giá vé 10 `currency`, xác suất/biên nhận hiện hành | Nhãn Xu Vàng | Không đổi RNG, giá vé hay phần thưởng trong P1 |

### Tỷ giá thử nghiệm

- Giữ **10 Tiền Xanh = 1 Xu Vàng**, tối thiểu 10 Tiền Xanh/lượt, chỉ đổi một chiều, **không trần ngày/tuần**, không có thời gian chờ.
- Đây là tỷ giá **đề xuất trên báo giá**, chưa vận hành. Trạm Neon đầu game tính khoảng 0,3 Tiền Xanh mỗi lượt phục vụ 45 giây, tương đương khoảng 24 Tiền Xanh/giờ nếu duy trì nhịp; các khoản từ kỹ năng, đào đá, câu cá và nâng cấp sẽ làm tốc độ thực tế khác nhau. Cần thử trực tiếp với save C4.52 để chốt giá hình nền trước khi bật.
- Mốc giá khảo sát cho FUN-P2 (chưa đưa vào shop): nền phổ thông 20–40 Xu Vàng, nền hiếm 80–150 Xu Vàng, nền sự kiện hoặc thành tựu mở theo điều kiện thay vì bán; tránh biến một lượt may mắn FUN thành đủ để mua hết bộ sưu tập.
- Vé Cào hiện có giá 10 Xu, giá trị kỳ vọng 8,43 Xu/vé; P1 không sửa xác suất và không giới thiệu vòng thu nhập bằng FUN.

### Vì sao chưa bật chuyển tiền

- Xu Arcade chỉ nằm trong bản lưu trình duyệt, nên có thể bị sửa. Chuyển số dư đó thẳng vào `profiles_v2.currency` sẽ biến dữ liệu tự khai thành tiền mua sắm.
- Bridge cũ có biên nhận và `requestId` chống gửi lại đúng ID, nhưng `localStorage` và việc trừ Tiền Xanh xảy ra **sau** giao dịch Firestore: mất dữ liệu/cố ý khôi phục save có thể khiến một khoản tiền bị chuyển lần nữa bằng ID mới.
- `firestore.rules` trong repo là ứng viên **chưa xác minh đã deploy**; `arcade_receipts_v1` đang bị deny và `profiles_v2.currency` vẫn là hồ sơ chủ sở hữu có thể ghi. Không thể gọi đây là ví đã xác thực mọi thu nhập.
- Chỉ bật P4 khi Du duyệt mô hình nhất quán, kiểm tra cấu hình Rules đang chạy và có kiểm thử replay, hai tab/thiết bị, đổi UID, offline, crash giữa credit/debit, rollback. Phương án đáng tin cậy yêu cầu máy chủ/authority giữ cả số dư Arcade chuyển được và Xu Vàng trong cùng một giao dịch hoặc một sổ nguồn chứng thực; không cộng dựa vào `availableTenths` do browser gửi.

## Các đợt tiếp theo

1. **P2 — Hình nền:** dùng lại V27/V34/V37, kiểm tra chất lượng và kích thước thật, bộ sưu tập + xem trước + chọn lại; giữ nền cũ. Bắt đầu với nền miễn phí và thành tựu client-local; mua bằng ví khi đã chốt authority.
2. **P3 — FUN:** kiểm tra lỗi nhấn lặp, mất mạng và các biên nhận Vé Cào/Vạn Bảo. Cải thiện hiệu ứng thắng thua, công khai tỷ lệ, không thay vô cớ RNG hay luật đang chạy.
3. **P4 — Quầy đổi:** ledger nguồn xác thực, debit-credit nguyên tử hoặc cơ chế đối soát bền vững, biên nhận hiển thị, retry cùng `requestId`, kiểm thử Emulator và nghiệm thu Du trước mọi Rules/deploy.

FUN-P1 chỉ đổi **lớp trình bày**, CSS và kiểm thử liên quan; không sửa `coins`, `currency`, schema, Firestore Rules, Functions, thứ tự thưởng, season, gameplay hoặc dữ liệu của tài khoản.
