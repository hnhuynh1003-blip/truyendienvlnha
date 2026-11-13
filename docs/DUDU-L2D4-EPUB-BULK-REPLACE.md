# DUDU Studio — L2D.4: tìm và thay thế qua nhiều chương (bản kế hoạch thay đổi)

## Đã triển khai (không ghi Firebase)

`js/epub-bulk-replace-l2d4.js` là bộ máy tìm và thay thế **độc lập**, chưa nối vào giao diện công khai.

- Nhập tối đa 30 quy tắc `tìm → thay thế` để chuẩn hóa nhiều tên nhân vật, địa danh hoặc thuật ngữ trong cùng một lượt.
- Quét tối đa 160 chương EPUB đã được nạp vào bộ nhớ, tối đa 20.000 kết quả; ưu tiên khớp nguyên từ/cụm từ và không phân biệt chữ hoa-thường. Có lựa chọn phân biệt hoa-thường, khớp trong từ.
- Không thay chữ đã đúng chính xác với kết quả; không sửa chuỗi nằm trong URL HTTP(S)/`www`.
- Trả từng kết quả kèm ID chương, vị trí, văn bản trước/sau để giao diện tương lai xem trước bằng `textContent`.
- Phát hiện quy tắc chồng lấn; không tự chọn quy tắc ưu tiên hoặc tự thay thế. Người dùng phải chọn rõ từng kết quả. Nếu cả hai lựa chọn trùng vùng, công cụ từ chối tạo bản sửa.
- Kết quả tạo một **bản kế hoạch** cho các chương được chọn: nội dung cũ, nội dung đề xuất, `expectedVersion` và số lần sửa. Luôn dựa trên nguồn ban đầu, không thay thế dây chuyền trong cùng lượt.
- Không có phương thức `save`/`apply`, không tự gọi SDK Firestore và không âm thầm thay đổi chương. Đợt L2D.5 sẽ triển khai giao diện, cơ chế lưu có revision, trạng thái thành công một phần và hoàn tác.

## Những việc còn phải xác nhận

1. Tải các chương theo đúng `chapterIndex`, có trạng thái tiến trình/quá tải. Chỉ tài khoản quản lý được dùng công cụ tác giả; độc giả không có UI biên tập.
2. Cho chọn/bỏ chọn kết quả theo từng chương, xem so sánh trong đoạn văn. Kiểm tra giao diện thực trên điện thoại/desktop.
3. Khi lưu nhiều chương, phải dùng mỗi transaction có revision của L2D.3. Không thể giả định một transaction đơn bao toàn bộ 90 chương; cần checkpoint và xử lý lỗi nửa chừng, phục hồi có xác nhận.
4. Quyền cập nhật chapter, tạo/xem revision, giới hạn của phiên bản và phân quyền theo `ownerUid` phải được hợp nhất vào Firestore Rules **sau cùng**, sau khi toàn bộ công cụ và Emulator test đạt yêu cầu.

## Kiểm thử và rollback

`node tests/epub-bulk-replace-l2d4.test.cjs` chạy với nội dung EPUB giả lập, không truy cập production. Kiểm thử Unicode, tên trùng, URL, lựa chọn riêng và thay đổi chồng lấn.

Module chưa được tham chiếu từ `index.html` nên không đổi trải nghiệm đọc hay dữ liệu hiện hữu. Có thể rollback commit này độc lập. Không sửa Rules trong L2D.4.
