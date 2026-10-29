# DUDU Studio — L2D.5B: lưu và phục hồi nội dung EPUB (chưa kích hoạt)

## Quyết định của chủ dự án

Không cập nhật Firebase Security Rules nhiều lần khi công cụ còn đang làm. Chỉ tổng hợp **một bộ Rules cuối cùng** sau khi các chức năng, dữ liệu, quyền và kiểm thử đã sẵn sàng. Các gate trong `index.html` **vẫn là `false`**:

- `EPUB_MANAGEMENT_L2D2_ENABLED=false`
- `EPUB_CHAPTER_TOOLS_L2D5_ENABLED=false`

L2D.5B chỉ đưa đường đi của các thao tác lưu vào mã nguồn, **không cấp thêm quyền Firestore, không tự chạy khi tải trang, không ghi dữ liệu thật**. Chỉ người quản trị đang đăng nhập và sở hữu `ownerUid` mới có thể xem/gửi thao tác khi gate được bật trong một đợt nghiệm thu sau này.

## Chức năng đã nối, đang khóa

| Thao tác | Tác động thiết kế | Bảo vệ |
| --- | --- | --- |
| Sửa một chương | Xem trước văn bản, xác nhận rồi lưu đúng chương. | So khớp nội dung và `editVersion`; lưu bản cũ vào `revisions` cùng transaction. |
| Lịch sử chương | Liệt kê tối đa 20 revision gần nhất; có thể chọn một bản để khôi phục. | Chỉ owner/admin; trước khôi phục cũng sao lưu bản đang đọc; không ghi đè revision cũ. |
| Sửa nhiều vị trí | Chỉ lưu các kết quả đã đánh dấu và xem kế hoạch; xử lý tuần tự từng chương. | Không thay tất cả tự động; mỗi chương có transaction và bản lưu riêng. |
| Lỗi mạng khi ghi | Đọc lại chương và revision của chương đang nghi vấn. | Nếu đã ghi thành công thì không ghi trùng; nếu không xác định được thì đánh dấu `uncertain` và dừng. |
| Tiếp tục / hoàn tác | Tiếp tục những chương chưa ghi hoặc phục hồi những chương đã ghi. | Kiểm tra lại toàn bộ chương đã xử lý trước khi tiếp tục/hoàn tác; báo rõ khi khôi phục dở dang. |

Giao diện thông báo lỗi và buộc tải lại chương trực tiếp từ Firestore khi cần, không dùng dữ liệu chương đã cache để ghi lại sau lỗi. Hộp biên tập không cho đóng khi lượt lưu nhiều chương còn ở trạng thái `partial` hoặc `uncertain`, tránh người dùng vô tình quên phục hồi.

## Giới hạn cố ý và việc phải làm trước khi bật

1. Phiên sửa nhiều chương chưa có nhật ký công việc bền vững khi **đóng tab / tải lại trình duyệt / mất nguồn**. Cần thiết kế cơ chế tiếp tục an toàn qua phiên hoặc đảm bảo thủ tục xử lý thủ công cho từng revision trước khi triển khai production.
2. L2D.3 và L2D.5B chỉ có mô phỏng Firestore/DOM trong Node, **chưa có kết quả Firestore Emulator**, chưa thử mạng thật, Chrome Android và trình duyệt desktop. Nút chưa được bật.
3. Rules hiện tại của người dùng chỉ cho tạo EPUB và chuyển `importing → draft → published`; cấm sửa nội dung chương, cấm xóa, chưa có quyền truy cập revision. Do vậy **không thể bật công cụ chỉ bằng cách đổi gate**.
4. Bộ Rules cuối phải bảo vệ `ownerUid`, `chapterIndex`, `chapterCount`, trạng thái xuất bản, phiên bản monotonic, tính bất biến revision, giới hạn kích thước/văn bản và quyền chủ sở hữu; test cả người ngoài, người đọc, admin khác, sai version, dữ liệu trùng, trạng thái archive.
5. Cần kiểm tra tương thích với L2D.2 chỉnh metadata, nút xóa EPUB có kiểm soát, giao diện tìm/hiển thị văn án, và không ảnh hưởng luồng reader, bookmark, Xu, Vạn Giới.

## Kiểm thử ở mức mã nguồn

```bash
node tests/epub-chapter-editor-l2d3.test.cjs
node tests/epub-bulk-save-l2d5b.test.cjs
node tests/library-epub-edit-ui-l2d5.test.cjs
node --test tests/*.test.cjs
```

Kiểm thử này dùng Firestore giả lập trong bộ nhớ. Bản kế hoạch có kiểm soát thao tác lưu, nhưng **chưa được coi là đã nghiệm thu để áp dụng dữ liệu thật**.
