# L2E — Danh mục Thư viện: 20 truyện/trang

- Danh sách truyện trong route **Thư viện** (không phải trang chủ hay Tủ sách) được phân thành 20 mục mỗi trang sau khi lọc và sắp xếp. Dải nút trang tròn, nút lùi/tiến và dấu `…` hiển thị những trang gần vị trí đang xem cùng trang đầu/cuối. Không giới hạn tổng số trang ở 9.
- Nút **⌕ Đi tới trang** mở ô nhập số để đến trang bất kỳ từ 1 đến tổng số trang hiện có; số không hợp lệ được báo ngay trên giao diện.
- Từ L2E.2, điều hướng phía trên danh sách chỉ còn **‹ / Trang hiện tại-tổng trang / › / Đi tới trang**; dải số cuối danh sách rút gọn tối đa thành `1 2 3 … trang cuối`, hoặc `1 … trang hiện tại … trang cuối`. Các nút nhỏ và không còn đẩy danh sách truyện xuống nhiều màn hình.
- Truy cập văn án hoặc đọc trực tiếp từ một thẻ trong Thư viện rồi bấm **‹ Thư viện** sẽ trở về đúng trang và vị trí cuộn của danh mục, không cuộn về đầu.
- Số trang đang chọn được lưu riêng trong `sessionStorage` của tab (`dudu-library-catalog-page-l2e`) để tải lại trang vẫn nhớ trang. Nếu danh sách thu hẹp, trang được tự điều chỉnh về cuối danh sách.
- Đổi từ khóa, thể loại, trạng thái hoặc kiểu sắp xếp sẽ về trang 1; không giữ vị trí cuộn cũ sau khi đổi tập kết quả.
- Chỉ thêm trạng thái giao diện cục bộ. Không ghi/sửa truyện, tiến trình đọc, dữ liệu EPUB, tài khoản, ví Xu hay Firestore Rules.

Kiểm thử: `node --test tests/*.test.cjs`; bài thử Chromium `node tests/browser-library-catalog-l2e.cjs` sử dụng 247 truyện giả (13 trang) trong Sandbox cô lập, không ghi dữ liệu bên ngoài.
