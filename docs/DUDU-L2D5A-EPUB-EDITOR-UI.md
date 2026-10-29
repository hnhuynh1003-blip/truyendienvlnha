# DUDU Studio — L2D.5A: giao diện xem trước biên tập EPUB

## Trạng thái

Đã bổ sung giao diện chuyên biệt cho chủ sở hữu EPUB ngay tại trang chi tiết truyện, nhưng **gate `EPUB_CHAPTER_TOOLS_L2D5_ENABLED=false` tại `index.html`**. Nút "Biên tập chương" bị ẩn, và quản lý không cho mở nếu không qua kiểm tra tác giả hiện tại. Bản production không có nút công cụ chưa lưu được.

Không thay Firebase Security Rules, không sửa dữ liệu Firestore thật, không thay ID hoặc quyền legacy, không xóa chương.

## Công cụ biên tập được chuẩn bị

1. **Một chương:** tải chương riêng từ Firestore (đúng `chapterIndex`) và xem trước số dòng/số từ thay đổi. Không lưu văn bản từ ô nhập trong đợt này.
2. **Tìm & thay thế:** tối đa 30 quy tắc, quét EPUB tối đa 4 chương mỗi nhóm; cập nhật tiến trình đọc; lọc kết quả theo chương; hiển thị văn cảnh bằng `textContent`/`createTextNode`; kiểm tra lựa chọn và vùng trùng lặp trước khi tạo kế hoạch thay đổi. Không tự chọn và không tự viết dữ liệu.
3. **Giao diện:** CSS responsive, ô nhập từ 16px trên điện thoại, hộp thoại cuộn, chọn tất cả/bỏ chọn và tải thêm kết quả, ngăn dùng bản xem trước cũ khi đổi quy tắc. Đóng hộp thoại hủy phiên quét đang chạy và bỏ qua dữ liệu đến muộn.

## Tiếp theo — L2D.5B (trước lần cập nhật Rules cuối cùng)

- Liên kết nút lưu một chương và lưu kế hoạch đã chọn với L2D.3 transaction (revision nguyên bản), cho xác nhận rõ và kiểm tra lại version.
- Lưu nhiều chương từng bước với báo cáo đã lưu/chưa lưu; xử lý được lỗi mạng hoặc Rules bị từ chối giữa chừng, cơ chế khôi phục từng chương/tất cả chương đã sửa có kiểm soát.
- Tải danh sách revision để chủ sở hữu lựa chọn phục hồi; kiểm tra điều kiện dữ liệu từng chương và tránh đánh lừa trạng thái đã đồng bộ.
- Kiểm thử UI trên mobile/desktop và Emulator với tài khoản guest, độc giả, admin khác chủ, đúng chủ.
- Sau đó mới tổng hợp một bản Rules đầy đủ cho metadata, chapter và revision, đối chiếu với bản production thật, kiểm thử Emulator và xin duyệt triển khai một lần.

## Kiểm thử

`node tests/library-epub-edit-ui-l2d5.test.cjs` dùng DOM/Firestore giả lập, **không phải thử nghiệm browser hoặc Firestore Rules Emulator**. Toàn bộ UI mới hiện chưa kích hoạt trên production; có thể rollback commit này không ảnh hưởng dữ liệu thực tế.
