# L2B.5 — Đồng nhất kích thước thẻ tác phẩm

Ngày 29/10/2026. Thay đổi chỉ liên quan đến diện mạo và mã dựng thẻ.

## Nguyên nhân

`renderHome()` gán `archive-featured` cho phần tử đầu tiên theo `displayIndex === 0`, nên tác phẩm sắp xếp đầu (thường là EPUB có ngày cập nhật mới hơn) trở thành một thẻ lớn; các truyện còn lại, gồm truyện viết theo chương, bị hiển thị nhỏ. Trang chủ `fillHome()` cũng phóng to card con đầu tiên bằng CSS `:first-child`.

Điều này không phải cơ chế ưu tiên nguồn EPUB, nhưng tạo bất bình đẳng thị giác do vị trí sắp xếp.

## Cách xử lý

- Tất cả truyện trong danh mục dùng cùng class `archive-shelf-item` và kích thước thẻ tiêu chuẩn. Tên dài được giới hạn số dòng để không kéo giãn thẻ.
- Trang chủ hiển thị một kệ ba bìa có diện tích bằng nhau, đánh số hồ sơ bằng CSS counter. Không phân cấp theo truyện đầu hay nguồn nhập.
- Đổi tiêu đề hero thành `Từ chữ thành thế giới.`; giữ ô mã nghệ thuật, bỏ dòng diễn giải dài.
- Không thay đổi truyện, ID, thể loại, metadata, sắp xếp/tìm kiếm, quyền tác giả, Firebase, bookmark, Vạn Giới hoặc phần thưởng.

## Kiểm thử và hoàn tác

- `node --test --test-reporter=dot tests/*.test.cjs`
- `node --check js/site-shell-v60.js`
- `git diff --check`
- Kiểm tra trực quan Trang chủ và Thư viện sau deploy, gồm đường dẫn cache-bust.
- Rollback bằng revert duy nhất commit L2B.5. Không có thay đổi dữ liệu.
