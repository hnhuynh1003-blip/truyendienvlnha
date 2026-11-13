# DUDU Studio — L2D.5C: khôi phục lượt sửa EPUB sau khi tải lại trang

## Trạng thái triển khai

Đã chuẩn bị `js/epub-recovery-journal-l2d5c.js` và nối với hộp biên tập chương. **Cả hai feature gate `EPUB_MANAGEMENT_L2D2_ENABLED` và `EPUB_CHAPTER_TOOLS_L2D5_ENABLED` vẫn là `false`**. Không thay Firebase Rules, không ghi Firestore production. Kiểm thử hiện là Node với Firestore/DOM giả lập, chưa phải kiểm thử Firestore Emulator hay điện thoại thật.

## Phục hồi sau khi mất tab, tải lại hoặc mất mạng

Trước lần ghi đầu tiên, công cụ lưu bản kế hoạch sửa vào `localStorage` của **trình duyệt đang dùng**. Nhật ký gồm mã truyện, tài khoản, phiên bản chương, các vị trí/thay thế đã duyệt và mã kiểm tra nội dung. Không lưu nguyên văn toàn bộ chương ở `localStorage`; toàn văn bản gốc vẫn nằm trong Firestore và các revision bất biến của từng chương.

Khi mở lại tác phẩm ở cùng trình duyệt và cùng tài khoản:

1. Hiển thị nút **Kiểm tra lượt cũ trên thiết bị**. Trước khi xử lý lượt cũ, không thể quét/lưu một lượt mới cho cùng truyện.
2. Đọc phiên bản thực tế của mỗi chương và revision gắn với phiên bản. Từ vị trí sửa đã duyệt, tái tạo hai bản văn để đối chiếu toàn bộ nội dung, không tin vào trạng thái in-memory đã mất.
3. Phân biệt `pending` (chưa ghi), `done` (đã ghi), `restored` (đã hoàn tác) và `unknown` (không xác minh được). Với `unknown`, dừng mọi thao tác ghi tiếp.
4. Chỉ cho **Tiếp tục** sau khi đã xác minh các chương thành công trước đó. Khi chọn **Hoàn tác**, ghi quyết định vào nhật ký **trước** lần phục hồi đầu tiên. Nếu trình duyệt bị tắt giữa chừng, lần mở sau tiếp tục hoàn tác những chương còn lại, không lặp lại chương đã được phục hồi.
5. Chỉ dọn nhật ký thiết bị khi tất cả chương đã lưu và tác giả xác nhận kết thúc; hoặc đã phục hồi; hoặc chưa có chương nào được ghi và chủ dự án chủ động hủy lượt.

Nếu không ghi được nhật ký vì bộ nhớ bị chặn/quá dung lượng, thao tác lưu nhiều chương **không bắt đầu**. Giới hạn manifest là 1,5 MB và tối đa 20.000 vị trí sửa; những lượt quá lớn cần chia nhỏ.

## Giới hạn và kiểm thử bắt buộc trước khi mở gate

- Nhật ký chỉ tồn tại **trên cùng thiết bị/trình duyệt**. Xóa dữ liệu website, dùng máy khác, hoặc chế độ riêng tư có thể làm mất nhật ký; bản lưu revision trên Firebase vẫn tồn tại nhưng không tự khôi phục kế hoạch từng vị trí.
- Chưa có khóa độc quyền xuyên nhiều tab trên cùng tài khoản. Version check của Firestore ngăn ghi đè im lặng nhưng cần kiểm thử trường hợp hai tab tranh chấp nhật ký.
- Mã kiểm tra nội dung trong manifest dùng để phát hiện sai khác vô ý, không phải chữ ký bảo mật. Quyền ghi phải do **Rules chốt cuối cùng** kiểm soát, không dựa vào localStorage.
- Test Firestore Emulator đầy đủ cho đúng owner, admin khác, độc giả, phiên hết hạn, `published`/`archived`/`draft`, revision giả, mất ACK, khôi phục dở dang và thiết bị hết dung lượng.
- Kiểm thử trực quan trên Android/desktop: modal cuộn, nút phục hồi, nhập tiếng Việt, dữ liệu dài, thoát/khôi phục tab. Chưa kích hoạt UI thật, chưa có bằng chứng QA này.
- Không thay thế hoặc làm yếu Rules V49; chưa thêm quyền delete/chapter/revision trong đợt này.

## Kiểm thử mã nguồn

```bash
node tests/epub-recovery-journal-l2d5c.test.cjs
node tests/library-epub-edit-ui-l2d5.test.cjs
node --test --test-reporter=dot tests/*.test.cjs
```

Trước lần sửa Rules duy nhất, vẫn cần chốt đầy đủ metadata, sửa/xóa EPUB, nội dung chương, bản sao phục hồi và phân quyền theo chủ sở hữu.
