# DUDU Studio — L2B.4: Bìa sách đồng bộ và metadata EPUB

Ngày: 29/10/2026. Phạm vi: Thư viện, Trang chủ, Tủ sách, form nhập EPUB.

## Vấn đề được xử lý

- Card Trang chủ, danh mục Thư viện và Tủ sách chưa chia sẻ ngôn ngữ thị giác.
- Card Thư viện hiện nhãn nguồn `EPUB` như thể loại truyện.
- EPUB V49 lúc tạo Firestore record ghi `genre: Nhập EPUB` và khi đọc danh sách lại trả về `genre: EPUB`, `desc: Nhập từ sách điện tử`, dù bản nhập có thể có metadata thật.
- Tìm kiếm Library chưa xét tên tác giả và thể loại.

## Phạm vi thay đổi

1. Card trên Trang chủ là bìa sách có gáy mô phỏng, tiêu đề và hành động thật; tác phẩm đầu tiên có bố cục tạp chí riêng. Tủ sách dùng hàng dấu trang ngang nhưng cùng ngôn ngữ bìa. Danh mục Thư viện dùng bìa và bố cục hồ sơ biên tập. Không hiển thị nhãn quy trình upload.
2. Khâu đọc OPF tự lấy `dc:subject` và `dc:description` nếu tồn tại. Tác giả được chỉnh tên, tác giả, thể loại, tình trạng hoàn thành, văn án ở form import trước khi lưu bản thảo. Mọi giá trị đều được giới hạn độ dài và chỉ lưu dạng văn bản thuần.
3. Bản thảo EPUB Firestore **mới** ghi thêm `genre`, `desc`, `publicationState` ở thời điểm **tạo** document; `publicBooks()` chỉ đọc metadata đã lưu. `introData.text` hiển thị văn án trên trang tác phẩm; tránh hiển thị lặp ở cả mô tả và khung văn án. `publicationState` khác hoàn toàn với trạng thái vòng đời `importing/draft/published`.
4. Với truyện EPUB cũ thiếu metadata, giao diện không giả định thể loại hoặc văn án; ẩn nhãn nhập liệu cũ `EPUB`/`Nhập EPUB`. Không sửa/migration những document đã xuất bản.
5. Tìm kiếm trên Library xét tên tác phẩm, văn án, thể loại, tác giả, nhân vật. Chip thể loại chỉ dùng thể loại thật.

## Giới hạn / an toàn

- Không chạm `studio_data/main_library`, `epub_stories_v49` đã tồn tại, chapter ID, tiến trình đọc, quyền tác giả, Firebase Rules, Xu/EXP hoặc bất kỳ luồng Vạn Giới nào.
- Không có API chỉnh metadata của **EPUB đã xuất bản**. Việc khôi phục văn án/thể loại cho các bản cũ cần thiết kế luồng cập nhật riêng, kiểm thử Firebase Rules/backup và quyết định của chủ dự án. Không thể tự suy luận chính xác thể loại từ nội dung.
- `security/firestore-epub-v49.rules.review` cho phép tạo thêm metadata khi tác giả có claim admin, nhưng Rules **đang triển khai** chưa được xác nhận trực tiếp. Cần xác minh trước khi dùng Firebase thật.
- Kiểm thử offline không chứng minh toàn bộ cấu hình permission trên production. Không có upload hoặc publish thật trong đợt này.

## Kiểm thử

- `node --test --test-reporter=dot tests/*.test.cjs`
- `node --test --test-reporter=dot functions/tests/*.test.cjs cloudflare/tests/vangioi-library-source.test.mjs cloudflare/tests/vangioi-library-precommit.test.mjs`
- `node --check js/epub-import-v48.js` và `node --check js/epub-production-v49.js`
- `git diff --check`
- Sau khi deploy: kiểm tra Trang chủ, Thư viện, Tủ sách trên trình duyệt thật; QA mobile nếu môi trường hỗ trợ.

## Rollback

Revert đúng commit L2B.4 nếu cần. Đây là thay đổi UI và schema **bổ sung cho bản nhập mới**; không có migration hoặc thay đổi dữ liệu hiện có. Metadata mới chỉ cần client mới để hiển thị; client trước đó không sử dụng trường này.
