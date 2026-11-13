# DUDU V57 — Nhập EPUB lớn an toàn trên bản chính thức

Cập nhật trực tiếp nhánh `main`. Không triển khai Storage, không thay Firestore Rules, không tự tải lên/xuất bản bất kỳ sách nào.

## 1. Những gì V57 giải quyết

- **Giữ xuống dòng EPUB:** thẻ `<br>` trong cùng một `<p>` trở thành ngắt dòng thật, các đoạn riêng phân cách bằng dòng trắng. Loại bỏ `script`, `iframe`, `style`, biểu mẫu và nội dung thực thi.
- **Tiền xử lý:** bỏ trang bìa rỗng / trang thông tin gói EPUB khỏi danh sách chương; giữ **Văn án / Lời mở đầu**; nhận diện **Thông báo / Quan Trọng** với checkbox tùy chọn (mặc định không nhập thông báo); bản EPUB gốc vẫn nguyên vẹn.
- **Ảnh bìa:** nhận metadata OPF `<meta name="cover">` hoặc item `cover`; giải mã trên thiết bị, thu về JPEG cạnh dài tối đa 176 px; chỉ lưu lên Firestore nếu data URI dưới 32.000 ký tự. Không tự tải ảnh gốc lên Cloud Storage; ảnh minh họa trong thân chương hiện **chưa hỗ trợ**, sẽ cần luồng Storage/asset riêng.
- **Giới hạn trích xuất địa phương:** EPUB tối đa **30 MiB**, giải nén **80 MiB**, tổng ký tự **4.500.000**, tối đa **3.000** mục ZIP; vẫn giới hạn **160 mục spine**, **220.000 ký tự** hoặc **420.000 byte UTF-8/chương** để phù hợp Firestore + Rules V49. Giới hạn 160 chưa được nới, vì nới cần sửa Rules và thử tải theo tập.
- **Lưu từng nhóm 4 chương:** vẫn phải có Firebase Authentication custom claim `admin:true`, UID không đổi, nhập ở `importing` -> `draft` riêng tư -> xuất bản sau khi xác nhận quyền tác giả; sách `_cloudV49` vẫn tách khỏi `studio_data/main_library`.
- **Tiếp tục nếu bị gián đoạn:** ID bản nhập lưu riêng trong localStorage theo UID khi tạo tài liệu. Chọn lại **chính EPUB đó**, cùng tùy chọn trang thông báo, bấm **Tiếp tục bản nhập Firebase dang dở**. Server kiểm tra UID chủ sở hữu, trạng thái, thứ tự chương, dấu vân tay nội dung; đối chiếu chương đã lưu, chỉ ghi chương còn thiếu. Không ghi đè chương đã tồn tại; giữ `importing` nếu ngắt tiếp.
- **Khôi phục bản thảo đã hoàn tất:** nếu Firestore đã đổi sang `draft` nhưng trình duyệt đóng trước khi nhận kết quả, nút Tiếp tục sẽ nhận diện bản thảo `draft` của đúng UID và trả về màn hình xuất bản.

## 2. Bộ kiểm thử bằng EPUB người dùng cung cấp

File `[BHTT-EDIT][HOAN] Phuong Hoang - Fababaiji.epub` có:
- Dung lượng khoảng 698 KB, giải nén khoảng 1,78 MB.
- **101** mục ZIP, **94** tệp XHTML, **3.103** thẻ `<br>`.
- Ảnh cover trong `OEBPS/images/cover.jpg`; khai báo cover trong `content.opf`.
- Trang `title_page.xhtml` chứa metadata tải về, `file0001.xhtml` là **Văn án**, `file0002.xhtml` là **Quan Trọng**, phần còn lại là chương đọc.
- V57 coi `title_page.xhtml` là trang metadata, giữ văn án, cho người đăng chọn có nhập “Quan Trọng” hay không. Bìa được xem trước và thu nhỏ. Các bài kiểm thử mô phỏng cấu trúc này không chứa văn bản/ảnh có bản quyền của tệp gốc.

**Quan trọng:** Tệp mẫu chưa được upload sang Firebase hay đăng công khai; chỉ dùng kiểm tra định dạng trong phiên làm việc này. Chỉ tải lên và xuất bản nội dung khi bạn có quyền phù hợp.

## 3. Firebase cần chuẩn bị gì?

V57 **không bắt buộc Cloud Storage / Blaze** nếu chỉ đăng nội dung chương dạng chữ và ảnh bìa thu nhỏ. Luồng Firestore dựa trên `epub_stories_v49/{id}` và `/chapters/{chapterId}`, dưới custom claim `admin:true`. Dữ liệu ngoài collection này không bị chuyển đổi.

V57 **không triển khai Rules**. Trước thử Firestore thật:

1. Firebase Console → Firestore Database → Rules: sao lưu Rules đang chạy; xác nhận collection `epub_stories_v49` được phép cho admin tạo metadata với `status=importing`, cho owner admin tạo chapters và chuyển `importing → draft → published`. Độc giả chỉ được đọc `published`.
2. Nếu Rules chưa có phần EPUB, **gộp riêng** đoạn trong `security/firestore-epub-v49.rules.review` vào Rules hiện có, kiểm thử Rules emulator trước khi Publish; không dán đè toàn bộ.
3. Kiểm tra Firebase Auth custom claim `admin:true` của tài khoản tác giả, không dựa trên vai hiển thị trong giao diện.
4. Kiểm tra ít nhất một bản nháp nhỏ `draft`, đảm bảo tài khoản độc giả **không thấy được**; chỉ sau đó mới thử với sách đủ quyền phát hành.
5. Không cần cấp quyền Storage chỉ để có bìa nhỏ. Sao lưu file EPUB nguyên gốc vào Storage vẫn dùng luồng V48 riêng (tối đa 15 MiB, cần Storage Rules/billing phù hợp).

## 4. Quy trình sử dụng

1. Mở DUDU bản chính, đăng nhập tài khoản có quyền tác giả.
2. Chọn **+ Tạo → Nhập EPUB** → chọn file `.epub`.
3. Chờ phân tích địa phương, xem ảnh bìa, danh sách chương và dòng cảnh báo nội dung ảnh.
4. Chọn có nhập trang thông báo/ghi chú hay không.
5. Chọn **Lưu truyện và các chương lên Firebase (bản thảo)**. Đợi 100% và xác nhận vẫn ở trạng thái **Bản thảo**.
6. Nếu mất mạng, chọn lại file trong cùng UID, bấm **Tiếp tục bản nhập Firebase dang dở**. Nếu file/tùy chọn khác nhau, V57 sẽ từ chối để tránh trộn truyện.
7. **Chỉ khi có quyền phát hành**, kiểm tra đủ chương, xác nhận xuất bản; sau đó thử đọc vài chương với tài khoản độc giả.
8. Nếu thông báo `permission-denied`, dừng lại và kiểm tra Rules đang chạy; không mở toàn bộ database.

## 5. Giới hạn tiếp theo (V57.x hoặc V58)

- Nhiều hơn 160 mục spine: cần chia thành các tập hoặc xây importer multi-volume và Rules mới, **không tự nâng giới hạn**.
- Sách hình ảnh, truyện tranh EPUB: cần quy trình Storage cho ảnh chương.
- Chưa có công cụ chỉnh sửa/xóa/reorder chương trong truyện đã xuất bản. Không thay đổi ID sau khi đăng.
- Không có tự động tiếp tục nếu người đăng mất hoàn toàn dữ liệu trình duyệt chứa ID bản nhập; bản thảo vẫn riêng tư trên Firebase và cần công cụ admin khôi phục riêng.
