# DUDU Studio — L2B.1: Đồng bộ phần mở đầu các trang

Ngày: 29/10/2026. Bắt đầu từ `main` tại `154b2d478696ae77e3f037e4963039eceb99cc58`.

## Phản hồi của An Du

Thanh điều hướng đã ghi rõ `Trang chủ / Thư viện / Thế giới / Tủ sách / Góc tác giả`, nhưng phần thân lại lặp lại tên trang bằng tiêu đề lớn. Đặc biệt Thư viện dùng serif và huy hiệu rất cao, Thế giới có một tiêu đề ngắn, còn Tủ sách và Góc tác giả dùng một bố cục khác. Điều này tạo lặp thông tin và làm nội dung chính bị đẩy xuống.

## Quyết định giao diện

- Thanh điều hướng là **nơi duy nhất hiển thị tên tuyến trang**; không dựng một tên trang lớn thứ hai trong phần nội dung.
- Thư viện, Thế giới, Tủ sách và Góc tác giả dùng chung một **dải ngữ cảnh gọn**: mã nhận diện DUDU và một câu mô tả *chức năng đang có*, thay vì tiêu đề lặp lại.
- Giữ một `h1` ẩn thị giác cho công cụ hỗ trợ đọc màn hình; không làm mất cấu trúc truy cập.
- Trang chủ vẫn dùng hero “Đọc truyện. Mở vạn giới.” vì đó là thông điệp giới thiệu sản phẩm, **không phải** tiêu đề “Trang chủ” bị lặp.
- Loại bỏ huy hiệu D lớn khỏi đầu Thư viện (vẫn có dấu ấn DUDU ở điều hướng và trong thiết kế), giúp kết quả tìm kiếm bắt đầu cao hơn.
- Không sửa logic thế giới, creator, NPC, sự kiện kinh tế, reader hay hai nguồn truyện.

## Mã nguồn

- `js/site-shell-v60.js`: helper `contextHeading()` dùng cho bốn route, không còn tên trang lớn lặp.
- `css/site-shell-v60.css`: typography và spacing dải ngữ cảnh thống nhất, có mobile và `h1` ẩn cho truy cập.
- `css/library-discovery-l2b.css`: bỏ hero chữ và crest cũ chỉ ở Thư viện, giữ trải nghiệm catalog/editorial.
- `index.html`: bump cache cho hai CSS và shell JS để GitHub Pages không hiển thị phiên bản cũ.
- `tests/library-l2b.test.cjs`, `tests/library-intake-v1.test.cjs`: cập nhật assertions và bảo vệ version mới.

## Giới hạn / rollback

Không thay đổi dữ liệu truyện, IDs, Auth/Firebase, Xu/EXP, Worker hay PR #22. Rollback bằng `git revert` commit L2B.1 nếu Du muốn quay lại tiêu đề lớn; không cần migration.

## QA cần xác nhận

- [ ] Header giữa bốn route trông đồng đều trên desktop và Android thật, không che hoặc đẩy nội dung xuống quá xa.
- [ ] Thanh nav vẫn hiển thị trạng thái đang chọn; screen reader vẫn có tiêu đề trang.
- [ ] Truyện legacy và EPUB vẫn có thể mở từ Thư viện.
- [ ] Github Pages đã deploy asset version L2B.1.

