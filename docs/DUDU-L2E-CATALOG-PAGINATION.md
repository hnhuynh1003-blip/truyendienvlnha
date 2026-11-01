# L2E — Danh mục Thư viện: 20 truyện/trang

- Danh sách truyện trong route **Thư viện** (không phải trang chủ hay Tủ sách) được phân thành 20 mục mỗi trang sau khi lọc và sắp xếp. Có điều khiển Trước / chọn số trang / Sau ở cả đầu và cuối danh mục.
- Truy cập văn án hoặc đọc trực tiếp từ một thẻ trong Thư viện rồi bấm **‹ Thư viện** sẽ trở về đúng trang và vị trí cuộn của danh mục, không cuộn về đầu.
- Số trang đang chọn được lưu riêng trong `sessionStorage` của tab (`dudu-library-catalog-page-l2e`) để tải lại trang vẫn nhớ trang. Nếu danh sách thu hẹp, trang được tự điều chỉnh về cuối danh sách.
- Đổi từ khóa, thể loại, trạng thái hoặc kiểu sắp xếp sẽ về trang 1; không giữ vị trí cuộn cũ sau khi đổi tập kết quả.
- Chỉ thêm trạng thái giao diện cục bộ. Không ghi/sửa truyện, tiến trình đọc, dữ liệu EPUB, tài khoản, ví Xu hay Firestore Rules.

Kiểm thử: `node --test tests/*.test.cjs`; bài thử Chromium `node tests/browser-library-catalog-l2e.cjs` sử dụng 47 truyện giả trong Sandbox cô lập, không ghi dữ liệu bên ngoài.
