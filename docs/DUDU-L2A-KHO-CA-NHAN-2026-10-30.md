# DUDU Studio — L2A tiếp nối: hoàn thiện Kho Đồ cá nhân

Ngày: 30/10/2026. Baseline trước chỉnh sửa: `42161f7` (`main`).

## Phạm vi

Sau bản vá phân loại Kho, các món phổ thông mua tại DUDU Market đã có nút Bán, nhưng vật phẩm chức năng mua tại cửa hàng chưa có giá thu mua và không hiện nút Bán. Chức năng Sổ Sưu Tập Thế Giới trên Cyber Phone chỉ được render trong Sandbox, còn nút truy cập vẫn xuất hiện ở chế độ cá nhân.

## Thay đổi

- Trong tài khoản Spark cá nhân, chỉ vật phẩm **FUNCTIONAL** có metadata khớp sản phẩm chuẩn, `instanceId` thuộc lệnh mua `shop-UUID`, nguồn `SHOP/DUDU_MARKET` và không bị bảo vệ mới được bán lại. Giá thu mua là **35% giá gốc, làm tròn xuống**, tối thiểu 1 Xu; giữ nguyên quy tắc bán đồ phổ thông hiện có.
- Giao dịch bán vẫn chạy qua `DuduPersonalSparkItemsV1.run` và Firestore transaction sẵn có, có mã giao dịch duy nhất để gửi lại không cộng Xu hai lần. Không mở bán kỷ vật, đồ truyện, vật phẩm không xác minh hoặc đồ đang lưu ký.
- Nút Bán trong inspector bị khóa khi giao dịch trước đang xử lý. Nút Sổ Sưu Tập Thế Giới chưa được hỗ trợ ở chế độ cá nhân được ẩn; Sandbox giữ nguyên.
- Nâng phiên bản query CSS/JS để giảm nguy cơ dùng lại asset cũ sau cập nhật GitHub Pages.

## Kiểm thử và giới hạn

- `node --test tests/*.test.cjs`: **128/128 bộ test đạt**.
- `git diff --check`: đạt.
- Browser smoke chưa chạy được trong môi trường này vì thiếu Chromium cho Playwright. Cần nghiệm thu trực tiếp trên GitHub Pages, đăng nhập tài khoản cá nhân: chọn thẻ **Dụng cụ** → mở Gói Tiếp Tế → kiểm tra **Mở gói** và **Bán** → chọn bán một gói thử → xác nhận +7 Xu, gói rời Kho; khi dùng, nhận chính xác một nước và một bánh; refresh và kiểm tra số dư/Kho còn nguyên. Chỉ thử **một** trong hai hành động trên mỗi gói.

Không sửa hay deploy Firestore Rules, không migration, không đổi Auth, không đụng Vạn Giới, không truy cập hay sửa số dư/tài sản production trong đợt này.

Rollback: `git revert <commit-cua-dot-nay>`, không có thay đổi dữ liệu cấu trúc.
