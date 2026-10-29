# DUDU Studio — L2B.2: Trang chủ, lời dẫn và Cyber Phone

Ngày: 29/10/2026. Baseline `main`: `d31af7a8efbac061764b6c28d1dd3de491f47a75`.

## Phản hồi của An Du

- Trang chủ vẫn có cổng tròn màu tím và câu “Đọc truyện. Mở vạn giới.”, không cùng phong cách mực đêm, giấy cũ của Thư viện.
- Lời dẫn ở Thư viện mang tính hướng dẫn máy móc, chưa có cá tính.
- Các dải giới thiệu liên tục nhắc lại chữ `DUDU` ngay dưới logo `DUDU STUDIO`.
- Cyber Phone bị ẩn trên route Thư viện từ L2B, dù đây là một công cụ cá nhân cần truy cập được.

## Thay đổi an toàn

1. **Trang chủ:** Đổi lời dẫn thành “Có những thế giới bắt đầu từ một dòng chữ.” và bỏ shortcut `Liên lạc NPC` trong hero (điện thoại chung của hệ thống vẫn có chức năng liên lạc). Thay cổng tròn neon bằng hình quyển sách mở dựng bằng CSS; giảm gradient, ánh sáng và các hiệu ứng thừa. Giữ các thẻ truyện thật, `Đang đọc`, thể loại và trạng thái các thế giới.
2. **Nhận diện:** Header chung vẫn là `DUDU STUDIO`; nhãn ngữ cảnh rút về `THE STORY ARCHIVE / WORLD ATLAS / DẤU TRANG / BÀN VIẾT`, không lặp thương hiệu trong mọi section.
3. **Lời dẫn Thư viện:** Đổi thành “Một cái tên lạ đôi khi mở ra cả một hành trình.”
4. **Cyber Phone:** Bỏ CSS ẩn FAB trên Library; trên mobile đặt nút gọn ở góc dưới trái, cao hơn bottom-nav, và neo popup phù hợp. Reader vẫn áp dụng chế độ tập trung nên điện thoại ẩn khi đọc chương. Không thay đổi `togglePhone()`, ứng dụng trong điện thoại hoặc trạng thái người chơi.
5. Bump query version của CSS/JS trong `index.html` để trình duyệt nhận thay đổi từ GitHub Pages.

## Giới hạn

Chỉ đổi shell và CSS giao diện, không đổi gameplay Vạn Giới, PR #22, Auth, Firebase, Xu/EXP, EPUB/legacy data, bookmark IDs hay quyền tác giả. Có thể rollback bằng `git revert` commit L2B.2, không cần migration.

## QA

- [ ] Unit tests L2B, Intake và app suite.
- [ ] Browser desktop: hero, Thư viện, các nhãn route, Cyber Phone mở/đóng.
- [ ] Browser Android thật: FAB không che CTA và popup không tràn màn hình.
- [ ] Reader legacy/EPUB vẫn ẩn Phone khi tập trung.
- [ ] Pages đã deploy bản L2B.2; xác nhận cache mới.

