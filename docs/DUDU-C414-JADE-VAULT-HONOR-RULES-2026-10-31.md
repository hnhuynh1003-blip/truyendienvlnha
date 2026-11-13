# DUDU C4.14 — Chợ cược thạch, Kho Phỉ Thúy, giá động và khắc phục quyền hồ sơ

## 1. Vì sao nhận thưởng, mua hàng và Kho có thể cùng báo lỗi?

`firestore.rules` đang kiểm tra toàn bộ `profiles_v2/{uid}` theo
`validLegacyProfile()` ở **mọi** thao tác ghi, kể cả giao dịch Xu/vật phẩm
không chủ đích thay đổi `honorV1`. C4.8 đã mở thêm **17 thành tựu** và
**4 danh hiệu** nhưng `honorAchievementIdsC463()` và `honorTitleIdsC463()`
trong Rules vẫn dùng danh sách cũ của C4.6.3.

Nếu hồ sơ đã có `honorV1` chứa mã mới, giao dịch khác có thể bị `permission-denied`
vì toàn bộ hồ sơ không còn hợp lệ theo Rules cũ. Việc Du vừa sử dụng nút đồng
bộ danh hiệu có khả năng là yếu tố kích hoạt, **nhưng chỉ log giao dịch hoặc
kiểm thử sau khi Published mới xác nhận được lỗi thực tế của tài khoản**.

Đã thêm chính xác 17 mã achievement và 4 mã title vào hai danh sách, giữ nguyên:

- `self(uid)`, quyền role không tự nâng, deny cross-UID.
- Kiểm tra Xu, EXP, Kho, quest, danh sách các trường được phép và dữ liệu EPUB.
- Các giao dịch vật phẩm/ví đang có; **không bỏ kiểm tra `honorV1`**, không reset dữ liệu.
- Test tự so sánh 44 achievement + 20 title trong JS với hai allowlist của Rules;
  test sẽ báo đỏ nếu thêm danh hiệu mà quên cập nhật Rules.

**Cần thực hiện:** Mã nguồn GitHub thay đổi **không** tự Publish Firestore Rules.
Sau khi kiểm tra Rules hiện đang Published trên Firebase, cần Publish bản mới
ở đúng dự án `truyendienvl` rồi mới kiểm tra mua hàng/nhận thưởng bằng UID thật.
Không khẳng định đã sửa được Firebase production nếu chưa làm bước này.

## 2. Chợ cược thạch

- Giữ 5 quầy và quy tắc mở khóa C4.13.
- Mở sạp, so ba mẫu A/B/C có kích thước, nét bì, hình dáng, **giá chào riêng**;
  có thể mua theo lô 1/3/5 viên với giá quầy nếu không muốn tự lựa.
- Trả phí **Thử đèn tại quầy** một lần/mẫu để lấy một gợi ý về ruột đá.
  Đã thử thì tải lại vẫn còn ghi chú, không trừ tiền lần hai; sau lần mua tiếp
  theo, khay mới sinh theo mã đá tiếp theo.
- Tỷ lệ chủng, sắc, vết nứt, độ hiếm, seed cố định và hạn mức 12 đá thô không đổi.
  Không cho xem trước phẩm cấp thật hoặc thay seed sau khi mua.

## 3. Kho ngọc & bảng giá

- Thêm `jade.vault` tối đa **30 phôi hoặc tác phẩm đã cắt/chế tác**, tách khỏi
  `jade.stash` (12 viên đá thô). Nút “Cất vào Kho Ngọc” dọn bàn, giữ đủ phẩm
  chất, vết nứt, phí đầu tư và mức giá gốc; chọn mang ra bàn để chế tác tiếp,
  hoặc bán trực tiếp từ kho mà không cần mở bàn.
- Giá theo sắc ngọc đổi mỗi **ngày UTC**, cùng một bảng giá công khai cho tám
  sắc. Biên độ là mức giả lập khoảng 67–135% giá cơ sở; phế thạch/kháo bì
  không hưởng hệ số đầu cơ. Tất cả giao dịch dùng **Xu Arcade**, không thay
  tỷ lệ quặng hoặc ví Xu Ký Tự.
- Xưởng có thể bán ngay, cất, chế tác hoặc trưng bày theo điều kiện có sẵn.
  Bảng giá trong Kho hiển thị chiều tăng/giảm và giá mua lại từng món.
- `jade.norm()` bổ sung nâng cấp save cũ, loại bản ghi sai, ID trùng giữa bàn,
  túi và kho; không di chuyển hoặc xóa ngọc cũ.
- Các danh hiệu đang dựa trên số lần bán/cắt/tủ trưng bày tiếp tục tính theo
  giao dịch thực, không tính thao tác cất/lấy kho.

## 4. Kiểm thử và triển khai

- `tests/personal-jade-c414-vault.test.cjs`: 6 ca mới: thử đèn, mua tự lựa,
  cất/lấy/chế tác, giá khác ngày, bán kho một lần, lọc save và kiểm tra giao diện.
- `tests/personal-honor-c414-rules-sync.test.cjs`: 2 ca bảo đảm catalog Honor
  khớp Rules và quyền UID/ví/kho không bị nới rộng.
- Mở rộng `cloudflare/tests/manual/dudu-standard-spark-rules-emulator.mjs`
  với đường lưu Honor mới rồi mua hàng/nhận DUDU FUN từ cùng UID. Chưa chạy
  emulator nếu không có Firebase CLI + Rules SDK; đây là kịch bản thủ công riêng.
- Kịch bản Chromium mobile có đường Chợ → Xẻ → Cất Kho → Bán trên bảng giá.
  Kiểm thử môi trường CI/Pages phải được xem sau khi push, không suy diễn từ unit.

**Phạm vi không động tới:** reset mùa, quy đổi Xu ra tiền, gameplay Vạn Giới,
chuyển dữ liệu cloud, phí thật hoặc tự động bán khi giá đổi.
