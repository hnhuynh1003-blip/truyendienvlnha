# DUDU Studio — Kho vật phẩm cá nhân trên Firestore Spark (30/10/2026)

**Phạm vi:** Chủ web + vài UID do chính chủ sở hữu. Không tiền thật, không chuyển vật phẩm giữa các UID, không Cloud Functions/Blaze, không thay Rules đang chạy.

## Đã nối

- DUDU Market / tab **Mua sắm**: 12 món COMMON chính tắc từ `DuduEconomyCoreV43`.
- Tab **Chức năng**: **Gói Tiếp Tế**, **Bộ Nạp Tần Số**, **Xung Thời Gian**. **Phiếu Ưu Đãi** chỉ hiển thị “Chưa mở”, không cho mua khi chưa có quy trình áp phiếu.
- Mua bằng `profiles_v2/{uid}.currency`, thêm instance hợp lệ vào `inventory`.
- Trong Kho: **Dùng** Gói Tiếp Tế → 1 nước uống + 1 bánh quy, **Dùng** Bộ Nạp → xóa hồi chiêu Điện thoại, **Dùng** Xung Thời Gian → giảm hồi chiêu 60 giây; **Bán** vật phẩm COMMON hợp lệ → cộng Xu theo giá thu mua chuẩn (thấp hơn giá mua).
- Firestore `runTransaction` sửa đồng thời `currency`, `inventory` và biên nhận trong `storyStates.__duduPersonalItemsV1.receipts` (tối đa 80 biên nhận gần nhất) của chính UID. Mỗi lệnh có ID UUID; thử lại cùng ID không phát thêm vật phẩm/Xu. Trạng thái hiển thị và cache trình duyệt cập nhật **sau khi** giao dịch máy chủ xác nhận.
- Trang shop cá nhân không gọi Firebase Functions V52. Các tính năng Sandbox và đường API V52 cũ không bị xóa.

## Phạm vi tin cậy

- Đây là game cá nhân: chủ tài khoản có thể tự sửa profile Xu/Kho bằng client đang được cấp quyền. Biên nhận giúp tránh **lỗi bấm lặp/mạng chập chờn**, không phải bằng chứng giao dịch chống gian lận công khai.
- Vẫn cần kết nối mạng khi mua/bán/dùng. Không mua vật phẩm hiếm, vật phẩm nhiệm vụ, vật phẩm kỷ niệm hay nhận thưởng NPC bằng đường Shop này.
- Hồi chiêu nhặt đồ Điện thoại hiện theo thiết bị (localStorage scoped UID), không đồng bộ thời gian giữa hai máy. Dùng công cụ sẽ tiêu hao trên Kho Firebase; thời điểm hồi chiêu trên thiết bị đang dùng được cập nhật khi xác nhận.
- Nếu hai điện thoại cùng sửa các trạng thái khác trong profile cũ, `saveCurrentAccount` của phần legacy vẫn có thể ghi đè dữ liệu mới; nên tải lại trang trên thiết bị thứ hai trước khi thực hiện nhiều giao dịch.
- Chưa áp phiếu khi thanh toán, chưa đổi Xu Arcade thật, chưa bật nhiệm vụ nhận thưởng máy chủ, giao dịch NPC và chuyển quà giữa tài khoản. Những mục này tiếp tục theo kế hoạch Rules tổng.

## Test tay trên một UID thật

1. Đăng nhập Firebase → Cyber Phone → **Cửa hàng** → tab **Chức năng**.
2. Mua **Gói Tiếp Tế Hành Trình** (20 Xu). Kiểm tra Ví Xu giảm 20 và Kho có một gói.
3. Mở Kho → chọn gói → **Dùng**. Kiểm tra gói biến mất, nhận đúng 1 nước uống + 1 bánh quy.
4. Chọn bánh quy → **Bán**, xác nhận. Kiểm tra Xu tăng đúng giá thu mua; refresh trang và kiểm tra Kho/Ví không bị trả về số cũ.
5. Dùng 2 điện thoại đăng nhập **hai UID khác nhau**. Giao dịch bên UID A không xuất hiện trong Kho UID B.
6. Với nút đổi Xu game → Ví Xu hệ thống: vẫn chờ đợt chốt Rules chung, **không bật cờ Arcade** vì đợt này chỉ mở mua/bán/dùng vật phẩm.

## Kiểm thử tự động

- `node --test tests/personal-spark-items-v1.test.cjs tests/personal-spark-items-integration-v1.test.cjs`
- `node --test tests/*.test.cjs`
- `firestore.rules` và Firebase Console **không sửa/deploy** trong batch này. Thuật toán giao dịch sử dụng đường profile hiện có.
