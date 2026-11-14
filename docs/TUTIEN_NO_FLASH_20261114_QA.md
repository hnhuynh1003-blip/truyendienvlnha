# Tu Tiên — chặn nháy giao diện prototype, 14/11/2026

Baseline main2202c5b, worktree sạch. Nguyên nhân: iframe hiện HTML MOD-P2 ngay, nhưng bridge chỉ chèn CSS/module VIS sau load; module mới tiếp tục tải ảnh. Đây là thứ tự khởi tạo UI, không phải ghi đè save hoặc hai nhân vật.

## Bản sửa

- js/tutien-integ-t0.js: visibilityhidden và aria-hidden trước append iframe. Chỉ mở sau4stylesheetload, visualReady, ảnh cave/character complete + decode và một animation frame. Không sửa game core/fixture/state/reward.
- Lớp trạng thái Đang mở Động Phủ; lỗi CSS/module/ảnh hoặc timeout30s giữ raw prototype ẩn, cho retry hoặc về Library.
- Cleanup gắn với đúng instance: clear poll/deadline, bỏ loading khi rời app; callback của iframe cũ không làm hiện lại UI. Retry không reset IndexedDB.
- css/tutien-integ-t0.css: loading overlay trong vùng app, không đổi kích thước phone, không animation bắt buộc.
- index.html: cache version no-flash-20261114 cho đúng bridge/CSS vừa sửa.
- tests/browser-tutien-no-flash.cjs: route-gate CSS/ảnh, lỗi CSS mô phỏng, retry, rời khi đang chờ,5viewport, save byte-identical. Auth modal giả được đóng trong fixture để không che ảnh.
- tools/tutien-main-integration/run-browser.mjs: test waves=1 qua URLSearchParams để chấp nhận presentation cache tag hiện hữu, và chờ iframe thực sự hiện trước thao tác touch.

## Đã chạy

- Node prototype và integration/projection/bag/equipment:96PASS/0FAIL.
- Browser no-flash:20PASS/0FAIL;320x568,360x640,390x844,430x932,1280x900; không lỗi JS.
- Browser website MOD-P2:21PASS/0FAIL;3trận, animation, receipt/reload,Library/KỳVận/BáchHí/Kho/Ví; không request ngoài loopback.
- Ảnh no-flash: C:/Users/TUFF16~1/AppData/Local/Temp/tutien-no-flash-yR5gjU/ (slow-css-320.png,slow-images-320.png,ready-{width}.png,load-error.png,report.json). Đã xem loading,ready320 và lỗi desktop trực quan.
- Hồi quy website: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-tutien-main-NonL3h/.

Không xóa prototype hoặc dữ liệu cũ, không thay schema, không tài khoản/Firebase production. Ảnh vẫn cần thời gian tải; bản sửa loại bỏ flash thay vì tuyên bố mạng tải tức thì. Chưa push/deploy.
