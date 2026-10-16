# DUDU V27 — Audit giao diện Cyber Phone & Sandbox (đợt 1)

**Mục tiêu:** ít nút hơn, thao tác tự nhiên hơn, diện tích nội dung lớn hơn; vẫn giữ tất cả tính năng hữu ích và dữ liệu cũ.  
**Trạng thái:** nhánh thử nghiệm `feat/dudu-v27-phone-sandbox-ux-r1`, chưa gộp vào website chính.

## Quy tắc thiết kế
1. Một hành động chỉ có **một điểm bấm chính** trên cùng màn hình. Nhấn vào ảnh nhân vật để xem ảnh lớn; không đặt thêm nút “Xem ảnh” hoặc “Xem chân dung”.
2. Những gì nhìn giống nút phải bấm được; hỗ trợ bàn phím Enter/Space và hiển thị viền focus rõ ràng.
3. Những tính năng chưa mở khóa vẫn hiển thị trạng thái rõ, nhưng không được lách giới hạn qua giao diện mới.
4. Nội dung đọc, ảnh, hội thoại là ưu tiên; thông báo hệ thống ngắn, trợ giúp dài ở nút “?” hoặc trang chi tiết.
5. Không đưa tính năng Sandbox, thử nghiệm hoặc quyền tác giả ra màn hình độc giả khi không thích hợp.
6. Đánh giá điện thoại chiều rộng 360–390px, tablet và PC; không để nút đè, tràn ngang hoặc phải kéo xuống vì phần trang trí dài.

## Đợt 1 — đã sửa trên nhánh thử nghiệm
| Vị trí | Trước đây | Sau V27 đợt 1 |
| --- | --- | --- |
| Liên Lạc | Có avatar nhỏ **và** nút “Xem ảnh” | Avatar chính là nút mở chân dung; bỏ nút thừa |
| Nhân Vật | Thumbnail **và** nút “✦ Xem chân dung” trong thanh hành động | Nhấn vào thumbnail để mở hình; ưu tiên diện tích cho Quà tặng, Trò chuyện, Sửa/Lưu trữ |
| Hồ Sơ | Avatar **và** nút “Đổi avatar & khung” cùng mở một trình biên tập | Nhấn avatar mở editor; bỏ nút phụ |
| Modal chân dung | Đã có phím Escape và nút đóng | Giữ nguyên; khi đóng quay focus về chính thumbnail vừa nhấn |
| Trạng thái khóa | Nút xem ảnh từng ẩn nhưng thumbnail là ảnh tĩnh | Thumbnail khóa không bấm được; kiểm tra quyền lần nữa trong trình xem |
| Lưu trữ / tài khoản | Không liên quan thay đổi UI | Không chỉnh `userProfile`, Firebase, quyền NPC, quan hệ hoặc kho đồ |

Các thay đổi cũ về ảnh cá nhân, ảnh NPC gốc, quy tắc mở khóa và R2 vẫn giữ nguyên.

## Kết quả rà soát toàn bộ 8 ứng dụng điện thoại
Đây là **các việc nên làm tiếp**, chưa tuyên bố đã sửa trong đợt 1.

| Khu vực | Vấn đề/khả năng cải tiến | Ưu tiên |
| --- | --- | --- |
| Liên Lạc | Hàng đầu gồm avatar, chọn NPC, chỉ số, Quà và Xóa; thu gọn chỉ số; đưa “Xóa” vào menu có xác nhận để tránh nhấn nhầm; quan hệ/giải thích dài ở “?” | P1 |
| Nhân Vật | Thẻ có ảnh, 2 thanh tiến trình, vai trò, trạng thái, hành động; cần kiểm tra độ cao và hiển thị NPC bị khóa, thẻ dài/chồng nút ở 360px | P1 |
| Hồ Sơ | Thư viện công khai và thống kê cá nhân đang là hai khối cao; thiết kế lại thành khối chỉ số gọn và các phần mở rộng | P1 |
| Trang chủ Phone | Avatar người chơi và icon Cá Nhân cùng mở Hồ Sơ; cân nhắc giữ avatar là điểm nhấn, icon là lối truy cập cho người mới, đánh giá trước khi xóa | P2 |
| Kho Đồ | 4 bộ lọc, tìm kiếm, nút Nhặt đồ và chi tiết vật phẩm; cân đối nút và các empty state, tránh hai khối thông tin dày đặc | P2 |
| Nhiệm Vụ | Nút “Reset” ở thanh tiêu đề có tính chất thử nghiệm; cần kiểm tra hành vi/điều kiện trước khi chuyển khỏi giao diện độc giả | P1 |
| Cửa Hàng | Số dư và sản phẩm; đồng nhất bố cục thẻ, trạng thái thiếu Xu và chỉ báo đã sở hữu | P2 |
| Bảo Tàng | Dòng giải thích luôn hiện chiếm chỗ; chuyển phần dài sang “?” sau khi kiểm tra điều kiện nhận và quyền sở hữu | P2 |
| Cài Đặt | Nhiều nút chọn cỡ chữ/màu, khối AI và công cụ nhập chat; nhóm chế độ hiển thị và nhóm công cụ quản trị riêng | P1 |
| Sandbox chung | Phân biệt mục quản trị/thử nghiệm khỏi nội dung độc giả, hạn chế thông điệp lặp lại; vẫn giữ cổng kiểm quyền thật ở backend | P1 |

## Kiểm thử bắt buộc
- Chromium 375×812: nhấn avatar Liên Lạc và thumbnail Nhân Vật để mở modal, xem ảnh, đóng bằng Escape, focus trở về ảnh vừa nhấn.
- Không còn nút “Xem ảnh” hay “✦ Xem chân dung” lặp lại trong thẻ.
- Độc giả chưa mở khóa NPC không được xem dữ liệu riêng; tác giả vẫn thao tác được nếu có quyền.
- Không có ghi Firestore hay thay đổi save chỉ vì mở/đóng ảnh.
- Kiểm thử nền JavaScript, Cloudflare, và browser smoke trên GitHub Actions.
- Không thay đổi flags hay triển khai trang chính.

## Hướng tiếp theo: V27 đợt 2
Ưu tiên 4 điểm có ảnh hưởng thị giác lớn: bố cục Liên Lạc và chỉ số quan hệ, hàng nút của thẻ Nhân Vật, thống kê Hồ Sơ, màn Cài Đặt. Sau đó mới chỉnh Kho Đồ/Nhiệm Vụ/Bảo Tàng. Mọi hành động nhạy cảm như “Xóa” và “Reset” phải kiểm tra ý nghĩa dữ liệu trước khi đổi vị trí.

**Chưa làm:** thiết kế lại tất cả tám app, đổi giao diện bản production, tải thêm hình NPC, phát thưởng backend và phát hành V23–V26. Phần kế hoạch không đồng nghĩa chức năng đã được triển khai.
