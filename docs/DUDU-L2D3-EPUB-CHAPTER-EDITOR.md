# DUDU Studio — L2D.3: nền tảng chỉnh sửa chương EPUB (chưa kích hoạt)

## Ranh giới đợt này

- Đã tạo `js/epub-chapter-editor-l2d3.js` gồm kiểm tra nội dung và xem trước thay đổi, lưu **một chương** có kiểm tra phiên bản, sao lưu nội dung cũ và phục hồi không xóa lịch sử.
- Nội dung cũ được ghi vào `epub_stories_v49/{bookId}/chapters/{chapterId}/revisions/{revId}` trong **cùng transaction** với nội dung chương mới. Các revision là dữ liệu bất biến theo thiết kế; bản khôi phục cũng tạo một revision mới trước khi thay nội dung.
- Không sửa ID truyện, ID chương, `ownerUid`, `chapterIndex`, `status` hay nội dung chương khác. Kiểm tra Firebase admin claim và đúng chủ sở hữu; chỉ chấp nhận `published` hoặc `archived`, đối chiếu `editVersion` và `expectedContent` để tránh phiên cũ ghi đè.
- **Chưa kết nối module vào `index.html`, chưa thêm nút giao diện, chưa thay Firebase Rules, chưa ghi Firestore thật.** Người đọc vẫn chỉ dùng trình đọc cũ.

## Những việc còn phải xong trước khi mở quyền ghi

1. L2D.3 hoàn chỉnh giao diện chỉnh sửa từng chương và lịch sử phục hồi (nút chỉ hiện khi đã có backend hợp lệ); kiểm tra nội dung dài, trạng thái tải/lỗi và mobile.
2. L2D.4 thêm tìm/thay thế xuyên nhiều chương với khớp nguyên cụm từ, phân biệt hoa/thường, xem trước theo chương, lọc từng kết quả. Không sửa ngay khi chỉ nhập từ tìm.
3. L2D.5 bổ sung kiểm soát giới hạn lịch sử, giao dịch nhiều chương với khả năng khôi phục khi quá trình lưu một phần thất bại, đối chiếu số từ trong danh sách chương và kiểm thử trực quan.
4. **Cuối cùng** mới hợp nhất bản Rules production sau khi chủ dự án xác nhận: chỉ admin đúng `ownerUid` được cập nhật content của chương; mọi cập nhật phải tạo revision chứa nội dung cũ ở cùng transaction và đảm bảo revision không bị sửa/xóa. Rules cần kiểm thử Emulator (guest, reader, admin khác chủ, stale version, sửa chương không kèm backup, khôi phục và nhập EPUB cũ).

## Kiểm thử và giới hạn

`node --test tests/epub-chapter-editor-l2d3.test.cjs` dùng Firestore giả lập tại chỗ, **không** phải Rules Emulator hay chứng minh production có quyền tương ứng. Chưa kiểm thử trên browser và chưa có thao tác lưu công khai. Không sửa `security/firestore-epub-l2d2-merged.rules.review` ở đợt này theo quyết định của chủ dự án.

## Rollback

Có thể hoàn tác riêng module, test và tài liệu L2D.3 trước khi kích hoạt vì không có dữ liệu mới trên production. Sau khi bật thực tế, từng revision sẽ giữ bản cũ để phục hồi theo đúng quyền chủ sở hữu; không xóa chapter/ID.
