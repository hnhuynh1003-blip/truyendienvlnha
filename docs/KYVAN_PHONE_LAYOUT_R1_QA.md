# Kỳ Vận — phone layout R1, 13/11/2026

## Nguyên nhân đã đo

Baseline main c289602, worktree sạch. Một media query trong css/dudu-casino-slot-v1.css áp dụng khi viewport>=860 và app FUN mở: tăng phone từ344x710 tại(x922,y108) lên724x850 tại(x536,y30) trên viewport1280x900. Cả3tab cùng bị ảnh hưởng. Đây là quy tắc chủ động phóng khung, không phải mất dữ liệu hay cache.

Cảnh Truy Bảo/Vạn Tượng trước sửa có580x620 bên trong stage692px, và vẫn bị styles cabinet/khung slot cũ bọc ngoài. Chiều cao art dùng viewport màn hình thay vì chiều rộng phone.

## Sửa trong phạm vi presentation

- css/dudu-casino-slot-v1.css: bỏ media query tabletop của FUN, bao gồm các kích thước control chỉ dành cho tabletop. Khung dùng đúng CSS phone hiện hữu, không đặt một kích thước app mới và không sửa host Tu Tiên.
- css/fun-art-f42b.css: scene aspect-ratio3/4, heightauto, không còn chiều cao desktop620 hoặc mobile450 cố định; override có scope phone-app-fun để loại padding/border/shadow và pseudo ornaments của stage slot cũ khi có f41-cosmos. Giữ ảnh, tỷ lệ object-fit, chuyển động, callback và gameplay.
- index.html: đổi cache query của đúng2CSS vừa sửa. Không đổi moduleID hay dữ liệu.
- tests/browser-fun-phone-layout-r1.cjs: dùng fake Auth/Firestore có sẵn, đo launcher -> Ví -> Bách Hí ->3tab Kỳ Vận ->launcher ở320x568,360x640,390x844,430x932,1280x900. So sánh toàn bộ x/y/width/height, không chỉ width. Kiểm cảnh không tràn ngang và chụp ảnh trước/sau.

## Kết quả

Bài đo trước sửa tái hiện desktop724x850. Sau sửa tất cả app giữ đúng launcher, desktop344x710. Cảnh desktop292x389.33 trong stage312px (gutter nội dung hiện hữu), không còn cabinet nền/viền dư. Mobile giữ kích thước phone hiện hữu; không ghi cứng phone theo desktop và không sửa thư viện/app khác.

Ảnh trước: C:/Users/TUFF16~1/AppData/Local/Temp/fun-phone-layout-before-20261113/
Ảnh sau: C:/Users/TUFF16~1/AppData/Local/Temp/fun-phone-layout-after-20261113/
Mỗi thư mục gồm fun-{0,1,2}-{320,360,390,430,1280}.png và metrics.json;0VạnBảo,1VéCào,2VạnTượng. Đã xem ảnh desktop trước/sau và mobile320/390.

- browser-fun-phone-layout-r1: PASS sau sửa, cả5viewport.
- Node vanbao-final-f44, fun-vantvat-f33, fun-p1-currency:20 PASS,0 FAIL.
- git diff --check: PASS.
- Browser browser-fun-cosmos-f41.cjs: PASS (touch/mouse,1/5/10,retry,skip,reducedmotion,account isolation,5width). browser-vanbao-main-f44.cjs: PASS (lobby,3tab,Kho pending,UID,5width).

Không đổi JS gameplay, kinh tế, tài sản, pending rounds, receipts, Firebase/Rules hoặc save. Kiểm bằng Chrome giả lập trên loopback; không phải thiết bị thật. Không push/deploy trong batch này.
