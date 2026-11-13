# DUDU Studio — L2B: DUDU Archive / Editorial Library

Ngày: 29/10/2026. Baseline `main`: `0ece1368a6d1679460f65990663afb1f380fede6`.

## Lý do điều chỉnh

An Du gửi ảnh chụp mobile sau L2A: tiêu đề và khu lọc cao, phần lớn thẻ có cùng hình dáng, CTA tiếp tục đọc trông như nút trò chơi, Cyber Phone nổi che nút của thẻ, bottom navigation to. Thiết kế mới ưu tiên cảm giác **thư viện bản thảo được biên tập**: mực đêm, màu giấy cũ, nhịp chữ serif, chỉ số hồ sơ và đường kẻ mảnh. Không thêm minh họa giả, ảnh nền toàn trang, kính mờ, hiệu ứng phát sáng hay dữ liệu tác phẩm được chọn lọc thủ công.

## Các thay đổi UI, không đổi dữ liệu

| Khu vực | L2B làm gì | Giới hạn |
|---|---|---|
| Đầu trang Thư viện | Nhận diện `DUDU / THE STORY ARCHIVE`, tiêu đề serif, dấu ấn chữ D, lời dẫn ngắn | Chỉ là lớp hiển thị, không tạo lore hay dữ liệu truyện mới |
| Khám phá | Search/sort ở một hàng; thể loại và trạng thái trong `details`; hiển thị số tác phẩm tách khỏi bộ lọc; có reset thật | Vẫn dùng `onSearchChange`, `onSortChange`, `filterStatus`, `selectTagFilter` cũ |
| Danh sách | Tác phẩm đầu tiên theo thứ tự lọc/sắp xếp hiện là opening folio; các tác phẩm còn lại thành catalog rows nhỏ hơn, không phải đề cử do AI hay biên tập | Dữ liệu và thứ tự sắp xếp vẫn lấy từ `novels`; không ghi Firebase |
| Thẻ và bìa | Bỏ CTA gradient/symbol game, hạn chế tag, dùng cover thật hoặc chữ D fallback; title, author, chương và nút đọc giữ tương tác thật | Không thêm upload format mới hoặc metadata giả |
| Header mobile | CTA tác giả rút ngắn thành `＋ Tạo`, giữ `canEditStories()`; ẩn Cyber Phone nổi **chỉ trên route Thư viện**; bottom navigation gọn | Phone vẫn hiện ở route khác; không sửa app Thiên Mệnh |
| Trang chi tiết | Bìa–metadata theo bố cục hồ sơ; ẩn ô văn án nếu không có nội dung thực; bỏ nhãn trùng số chương; nút đọc tiếp ngắn | Không sửa văn án/truyện/chương được lưu |
| Mục lục | Hai cột trên desktop, một cột gọn trên mobile; đánh dấu chương đang đọc bằng bookmark hiện có | Không đổi ID chương hoặc cơ chế bookmark |
| Không có kết quả | Thông báo dễ hiểu và nút reset hoạt động | Không chế dữ liệu demo |

## Tệp và kiểm thử

- `index.html`: cấu trúc search/filter, render card, chi tiết và mục lục.
- `js/site-shell-v60.js`: nhận diện đầu trang và class route cho chrome mobile.
- `css/library-discovery-l2b.css`: lớp style riêng cho Library, không tác động renderer Vạn Giới.
- `tests/library-l2a.test.cjs`: cập nhật nhãn UI mới, giữ kiểm soát dữ liệu không tin cậy.
- `tests/library-l2b.test.cjs`: xác nhận opening folio/catalog, nút đọc thật, zero chapters, lọc/rỗng/khôi phục, dấu chương đang đọc và phạm vi CSS.

L2B chưa thay server, Firebase Auth/Rules, legacy/EPUB storage, Xu/EXP, NPC, hoặc source Vạn Giới. Không merge hay đóng PR #22. Khi cần rollback: revert commit L2B trên `main`; không phải chạy migration hoặc khôi phục database.

## Cổng QA còn mở

- [x] Mã nguồn giữ luồng legacy/EPUB và phân quyền tác giả/độc giả.
- [x] Kiểm thử logic danh sách, nút và dữ liệu không đáng tin cậy.
- [ ] Đo/kiểm hiển thị patch L2B trên Android 320/375/390/430 và desktop bằng browser thực. Ảnh An Du gửi phản ánh production L2A, không phải visual QA của patch L2B.
- [ ] Kiểm Safari iOS, zoom text 200%, tương phản theme sáng/tối, mạng chậm, nhiều trăm truyện.
- [ ] Đảm bảo GitHub Pages đã triển khai commit trước khi yêu cầu An Du kiểm duyệt sản phẩm.

Sau L2B, L2C sẽ tập trung vào reader settings, nội dung chương dài, bookmark restore và thông báo tự động gây phân tâm.
