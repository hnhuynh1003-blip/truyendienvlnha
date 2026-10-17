# DUDU V45.2 — Khắc phục nhầm lẫn bình luận riêng vs chung (testA / testB)

Ngày: **17/10/2026** · Branch: **main** · Trạng thái: **giao diện và mô hình kết nối đã ghép**, **chưa kích hoạt Worker staging**.

## Nguyên nhân được xác minh trong mã nguồn

Trước V45.2, khu bình luận ngay tại trang truyện/chương gọi `DuduStoryCommentsUIV442.render` với `state:userProfile.commentsV442` và `onSave -> saveCurrentAccount()`. Dữ liệu này nằm trong profile/localStorage theo tài khoản. Vì vậy **testA chỉ nhìn thấy comment testA, testB chỉ nhìn thấy comment testB**. Bài test V44.x từng cố ý xác nhận comment không ra ngoài thiết bị. Bộ bình luận dùng chung đã có API Worker `/v1/comments/list` và `/v1/comments/create`, nhưng chỉ được nối vào Phòng Thử Nghiệm trên điện thoại; **không tự liên thông với trang truyện**.

## Sửa V45.2 trên main

1. Trang **bìa truyện** và **đọc chương** có khu `🌐 Bình luận chung Pilot` nằm **trước** khu `🔒 Nhật ký bình luận ... riêng`.
2. Shared board gửi/tải bình luận từ **cùng Durable Object staging**, qua `DuduPilotClientV451`, xác thực bằng **Firebase UID và allowlist phía Worker**; cùng `storyId` và `chapterId` thì A/B đọc được cùng danh sách sau khi refresh. Không dùng `userProfile.commentsV442` làm nguồn chung.
3. Firebase Auth **named app** của Phòng Thử Nghiệm điện thoại và trang truyện là **một phiên Pilot dùng chung** (`getShared()`), nhưng không khởi tạo tự động khi mở trang.
4. Để dùng: **Điện thoại → Phòng Thử Nghiệm → Đăng nhập Google Pilot → Kiểm tra quyền Pilot**, quay lại trang truyện/chương, chọn **Kiểm tra lại phiên → Tải bình luận chung**. Chỉ sau khi server xác thực quyền mới hiện ô gửi.
5. Scope truyện/chương phải được **admin có JWT thật và thuộc vai AUTHOR Pilot** đăng ký vào sổ staging. Nút **Đăng ký mục thử (admin)** tại trang truyện chỉ xuất hiện cho người có quyền này; không tự đăng ký hay nhập dữ liệu bản chính.
6. Dữ liệu comment riêng **không tự động chuyển** vào shared board; người dùng có thể giữ nhật ký cũ không mất dữ liệu. Nút cũ đổi thành **Lưu bình luận riêng** tránh hiểu nhầm.
7. Shared board **không đụng Kho/Xu/Firestore và không tặng vật phẩm**. Chỉ client gọi API bình luận đã allowlist. Backend `COMMENTS_ENABLED/PILOT_ENABLED` cùng khóa quà vẫn fail-closed.
8. Cache bình luận Pilot được ràng buộc bằng `sessionRevision`, không dựa vào 6 ký tự đầu UID: đổi tài khoản sẽ không xem nhầm dữ liệu lưu trong bộ nhớ UI từ phiên cũ.
9. Nếu Worker chưa triển khai, Pilot chưa mở, UID ngoài allowlist hoặc scope chưa đăng ký: hiển thị lỗi rõ, **không** đánh tráo bằng việc lưu local rồi báo đã gửi chung.

## Cách kiểm thử sau khi Worker staging được cấu hình

1. Mở `https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=45-2` trên 2 trình duyệt/thiết bị riêng.
2. Đăng nhập **hai Firebase UID khác nhau**, đã có trong Pilot allowlist, từ **Điện thoại → Phòng Thử Nghiệm**; bấm **Kiểm tra quyền Pilot** ở cả hai.
3. Dùng tài khoản AUTHOR Pilot có claim Firebase `admin=true` để đăng ký truyện và danh sách chương vào DO staging cách ly.
4. Mở cùng truyện/chương trên testA và testB; chọn **Tải bình luận chung**. A gửi một bình luận; B bấm Tải phải nhìn thấy đúng văn bản; B trả lời và A tải lại để đọc.
5. Kiểm tra khi A chọn nút **Lưu bình luận riêng**, bình luận chỉ thuộc local account A, **không** xuất hiện trong bình luận chung. Đây là cơ chế cũ, không phải lỗi backend mới.
6. Thử UID thứ tư hoặc đăng xuất/đổi UID khi đang tải: phải chặn và không lộ comment của phiên cũ.
7. Tuyệt đối không bật `GIFTS_ENABLED`, `GIFT_SETTLEMENT_ENABLED`, `PILOT_SETTLEMENT_ENABLED` trong thử nghiệm này.

## Giới hạn hiện tại

- **Chưa triển khai Worker staging** và chưa bật `PILOT_ENABLED`, `COMMENTS_ENABLED`, chưa có UID Firebase thử nghiệm trong Secrets; vì vậy **chưa thể chứng minh hai tài khoản Firebase thật thấy bình luận nhau qua môi trường web trực tiếp**.
- Test SQLite trong Node có luồng A/B chung với UID stub, không thay thế kiểm thử JWT Firebase và Worker đã deploy.
- Chỉ cập nhật GitHub Pages không thể tự động đồng bộ hai bộ localStorage/tài khoản Sandbox.
- Thiết bị Safari iOS/Android cần nghiệm thu riêng sau khi backend staging hoạt động.

Liên quan: [V45.1 R2](DUDU-V45-1-R2-SANDBOX-INTEGRATION.md) · [Cấu hình Pilot](DUDU-V45-PILOT-STAGING-PREFLIGHT.md).
