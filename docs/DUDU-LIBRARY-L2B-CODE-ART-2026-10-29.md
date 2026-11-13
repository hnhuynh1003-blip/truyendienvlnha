# DUDU Studio — L2B.3: Code Art / Font & Copy Cleanup

Ngày: 29/10/2026. Baseline `main`: `b4524a433c2de2a049098c4908e05ba1faa80c55`.

## Phản hồi

Ảnh chụp trang chủ của An Du cho thấy chữ tiếng Việt trong hero và các tiêu đề mục bị tách nét/khoảng cách khi dùng Georgia. Các câu giới thiệu dài làm banner giống poster quảng cáo, trong khi mong muốn là một **màn mã mang tính nghệ thuật của hệ thống**, có cá tính hơn và gọn.

## Thay đổi

1. Home headline rút còn `Mở trang đầu.`; bỏ tagline dài. Kicker ASCII `SYS // STORY ARCHIVE` dùng chữ mono. Không thêm CTA hoặc tương tác giả.
2. Thay minh họa quyển sách bằng **code art tĩnh** (line number, file label, cú pháp ví dụ); `aria-hidden="true"`, không truyền hoặc hiển thị trạng thái hệ thống thật. Không chạy lệnh và không cấp thưởng.
3. Font có dấu ở Home và tiêu đề Thư viện/chi tiết truyện chuyển sang hệ thống Unicode (`system-ui`, `Segoe UI`, `Roboto`, `Arial`), giữ monospace cho đoạn code ASCII. Không phụ thuộc Google Fonts hay font tải ngoài.
4. Xóa toàn bộ câu mô tả ngữ cảnh dài ở dải đầu Thư viện/Thế giới/Tủ sách/Góc tác giả; giữ một nhãn nhỏ và `h1` ẩn thị giác cho screen reader.
5. Thu khoảng cách phần mở đầu và cập nhật cache version của CSS/JS trong `index.html`.

Không thay đổi danh sách truyện, EPUB/legacy, Auth, Firebase, tiến trình, điện thoại, API kinh tế hoặc Vạn Giới. PR #22 được giữ nguyên.

## Kiểm thử và giới hạn

- Unit tests Library, Intake, site shell và toàn ứng dụng.
- Browser desktop: xem trang chủ, tên mục, code-art và thứ tự nội dung.
- Android thật: kiểm tra tiếng Việt ở 360/390/430px, code-art không tràn và các thẻ vẫn đọc được.
- Tiếp tục giữ `Cyber Phone` ở Thư viện và ẩn trong reader.
- Rollback: revert commit L2B.3; không có migration hay thay đổi dữ liệu.

