# truyendienvl
Một web game / ứng dụng giải trí chạy trực tiếp trên trình duyệt, hỗ trợ cài đặt dạng app (PWA) trên điện thoại.

---

### 🎮 Trải nghiệm ngay
* **Chơi trên Web:** [Truy Cập Game Tại Đây](https://hnhuynh1003-blip.github.io/truyendienvlnha/)
* **Cài đặt như App điện thoại (PWA):**
  * **Android (Chrome):** Mở link web > bấm menu 3 chấm > chọn **Cài đặt ứng dụng** (Install App).
  * **iOS (Safari):** Mở link web > bấm nút **Chia sẻ** (Share) > chọn **Thêm vào MH chính** (Add to Home Screen).

---

### 📱 Quét mã QR để chơi nhanh
![QR Game](https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://hnhuynh1003-blip.github.io/truyendienvlnha/)

---

### ✨ Tính năng nổi bật
* **Không cần tải tệp rườm rà:** Chạy mượt mà trực tiếp từ trình duyệt web.
* **Hỗ trợ PWA:** Tích hợp `manifest.json` và `sw.js` giúp lưu bộ nhớ đệm, mở toàn màn hình như ứng dụng gốc.
* **Tự động cập nhật:** Dễ dàng nhận bản vá mới nhất mỗi khi tải lại trang.

---

### 🛠️ Công nghệ sử dụng
* **Frontend:** HTML5, CSS3, JavaScript thuần
* **PWA:** Service Worker (`sw.js`), Web App Manifest
* **Hosting:** GitHub Pages

### 📚 Nhập EPUB hàng loạt (C4.21)

Đăng nhập tài khoản quản trị, vào **Thư viện → Thêm tác phẩm mới → Nhập hàng loạt**.

- **Chọn thư mục cha:** trên Chrome/Edge máy tính, chọn thư mục chứa các thư mục truyện con. Công cụ tự lọc những tệp `.epub` bên trong, không cần mở từng thư mục.
- **Chọn nhiều EPUB:** chọn trực tiếp nhiều tệp `.epub` khi không có thư mục chung.
- Tối đa 500 tệp trong một hàng đợi, mỗi EPUB tối đa 30 MB, 160 mục nội dung và 4,5 triệu ký tự. Nhập theo từng cuốn, không nạp toàn bộ sách vào bộ nhớ cùng lúc.
- Mặc định chỉ lưu **bản thảo**. Tích **Xuất bản ngay sau khi lưu thành công** và xác nhận quyền phát hành nếu muốn đưa truyện lên Thư viện. Bản thảo lưu xong có thể xuất bản từ hàng đợi bằng cách bật tùy chọn này rồi nhấn **Xuất bản bản thảo**.
- Truyện trùng nội dung đã nhập được bỏ qua; tác phẩm cũ không có dấu đối chiếu nhưng trùng tên/tác giả được giữ lại để kiểm tra. Tệp lỗi có thể thử lại, bản nhập dở được nối tiếp bằng cùng tệp gốc; **Dừng sau cuốn hiện tại** không cắt ngang việc lưu chương.

Lưu ý: nhiều EPUB có thể chạm hạn mức Firestore miễn phí; nên nhập theo các đợt nhỏ và kiểm tra kết quả trước khi nhập tiếp. Tác giả chịu trách nhiệm về quyền phát hành tác phẩm.
