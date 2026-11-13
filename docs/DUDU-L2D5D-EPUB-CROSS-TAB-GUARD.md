# DUDU Studio — L2D.5D: khóa lượt lưu EPUB giữa các tab

## Trạng thái

**Đã nối vào công cụ sửa EPUB nhưng vẫn chưa kích hoạt.** `EPUB_MANAGEMENT_L2D2_ENABLED=false` và `EPUB_CHAPTER_TOOLS_L2D5_ENABLED=false`. Không chỉnh Firestore Rules, không triển khai Functions, không đổi dữ liệu production.

## Vì sao cần thêm

Nhật ký phục hồi L2D.5C tồn tại trong `localStorage`, nhưng kiểm tra trước khi tạo nhật ký **không** phải phép khóa nguyên tử. Hai tab Chrome cùng tài khoản có thể đồng thời quét và chuẩn bị sửa một EPUB. Nếu cả hai cùng lưu hoặc hoàn tác, mỗi tab có thể hiểu sai trạng thái nhật ký của tab kia.

## Cơ chế L2D.5D

- Khi có nhật ký phục hồi, cả thao tác **Lưu nhiều chương** và **Tiếp tục / Hoàn tác / Kết thúc / Hủy** dùng Web Locks API (`navigator.locks.request`) theo khóa riêng cho UID + mã truyện.
- Khóa độc quyền được giữ trong **toàn bộ** quá trình kiểm tra chủ sở hữu, tạo/đọc nhật ký, ghi chương và phục hồi. Một tab khác đang giữ khóa thì tab hiện tại từ chối thao tác, không ghi thêm lên Firebase và không xóa nhật ký.
- Nếu trình duyệt không hỗ trợ Web Locks, **từ chối thao tác nhiều chương cần nhật ký**. Đây là quyết định an toàn khi chưa có giao thức khóa thay thế được kiểm chứng; vẫn có thể đọc và xem trước.
- Web Locks chỉ bảo vệ các tab cùng origin trong một browser profile. Không bảo vệ Chrome và Firefox riêng biệt, trình duyệt ở hai máy hoặc thiết bị khác; kiểm tra `editVersion` và giao dịch trên Firestore vẫn phải xử lý xung đột.
- Sửa **một chương** vẫn dùng so khớp phiên bản và bản sao lưu qua giao dịch Firestore; đường đi này không phụ thuộc vào khóa nhiều chương mới.

## Kiểm thử tự động

`tests/library-epub-edit-ui-l2d5.test.cjs` kiểm tra:

1. Không có Web Locks thì không bắt đầu nhật ký hay ghi chương hàng loạt.
2. Khi tab A đang giữ khóa, tab B không được dọn nhật ký bằng `Hủy`.
3. Sau khi tab A xong, tab B có thể đối chiếu và tiếp tục theo trạng thái thực tế.

Chạy:

```bash
node tests/library-epub-edit-ui-l2d5.test.cjs
node --test --test-reporter=dot tests/*.test.cjs
```

## Điều kiện để bật công cụ

1. Xác minh Firestore instance edition; chưa thể kết luận chỉ từ tên `(default)` trên trang Data.
2. Bản Rules cuối phải được đối chiếu với Rules đang chạy, test đủ create/update/delete và revision trên Firestore Emulator; quyền cấp Xu không được mở cho client tự tăng số dư.
3. Test trực tiếp Android Chrome và desktop, kể cả hai tab đang lưu, mất mạng giữa một chương, mất tab, rồi khôi phục sau khi mở lại.
4. Sao lưu EPUB nguồn và Rules đang chạy trước mọi cập nhật; cập nhật Rules **một lần** theo quyết định của chủ dự án.
5. Giữ Firebase Spark và toàn bộ chức năng kinh tế/người dùng mới ở trạng thái không phát sinh chi phí; không tự bật Cloud Functions V52.

L2D.5D chỉ bổ sung an toàn cho công cụ đã có, chưa có cơ sở để tuyên bố hoàn tất kiểm thử máy thật hay sẵn sàng bật gate.
