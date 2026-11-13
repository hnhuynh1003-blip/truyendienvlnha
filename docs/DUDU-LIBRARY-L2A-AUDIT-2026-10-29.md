# DUDU Studio — L2A: kiểm toán Thư viện và đợt sửa an toàn đầu tiên

Ngày: 29/10/2026. Chủ dự án: An Du. Repo `hnhuynh1003-blip/truyendienvlnha`.
Baseline `main` đã kiểm tra bằng `git ls-remote` và clone: `f20577d7fe6b783eab0c8ec9d88707c821448472`.

## Ranh giới dữ liệu và chức năng đã xác nhận

- Luồng viết từng chương: `openStoryModal()`, `saveStoryModal()`, `saveDB()` trong `index.html`; dùng mảng `novels`, cache local và `studio_data/main_library` cho legacy.
- Luồng nhập EPUB: `js/epub-import-v48.js` + `js/epub-text-v57.js` + `js/epub-production-v49.js`; EPUB production lưu `epub_stories_v49` và các document chương riêng. `refreshEpubCloudBooksV49()` ghép danh sách đọc với legacy qua `_cloudV49`; không gộp database.
- Cùng một trang bìa, mục lục, `readChapter()` để hiển thị cả hai nguồn; EPUB chỉ tải nội dung chương khi người đọc mở. `pTag.textContent` ngăn HTML trong văn bản chương thực thi thành mã trang.
- Có lọc thể loại, trạng thái, tìm tên/mô tả/nhân vật và bốn cách sắp xếp. Có bookmark qua `DuduPersonalSyncV568`, localStorage, và cloud sync *có điều kiện* cho tài khoản xác thực. Không khẳng định guest đã đồng bộ máy chủ.
- Hộp đăng/nhập LIB1-UI2 có đúng **hai** lối tác giả: viết chương và nhập EPUB. Kiểm `canEditStories()` vẫn nguyên trạng.
- Trình đọc còn gắn NPC, bình luận, nút nhặt đồ và các nhánh EXP/nhiệm vụ **đã tồn tại từ trước L2**. Đợt này không tăng, kích hoạt, bỏ, hoặc viết lại phần thưởng; cần tách UX đọc và kinh tế trong đợt riêng sau L2.

## Quan sát giao diện

Đã mở trang GitHub Pages đang phát hành bằng Chrome cloud ở desktop, ở vai trò khách không đăng nhập: Thư viện hiện 3 truyện sau khi cloud tải xong; mở được EPUB công khai `[BHTT-EDIT][HOÀN] Phượng Hoàng Hoa - Tuyệt Ca` và trang mục lục 90 mục; chương "Văn án" hiển thị văn bản thuần. Đồng thời mở được truyện legacy `Hệ Thống ERR...O` chương 1 (khoảng 2.509 từ). Khi vừa mở chương legacy, banner **nhiệm vụ hoàn tất** hiện trên trang — xác nhận sự chen ngang do hệ kinh tế cũ. Đây là **kiểm tra baseline production**, không phải bằng chứng bản L2A local đã xuất bản hoặc QA mobile.

| Mức | Khu vực | Bằng chứng / ảnh hưởng | Trạng thái L2A |
|---|---|---|---|
| Cao | Chương EPUB | Trước khi `readChapter()` tải xong, shell ẩn danh sách và không báo đang tải; trang tạm trống. Khi lỗi chỉ có `alert()`. | **Đã sửa local:** status có tên chương, lỗi và nút thử lại; có token hủy kết quả trễ khi đổi trang. |
| Cao | Tập trung khi đọc | Header sticky, thanh điều hướng mobile, Cyber Phone nổi, ba nút điều hướng nổi dễ lấn chữ; CSS cũ canh đều văn bản dài. | **Đã sửa local:** chế độ đọc ẩn header/điện thoại/bottom navigation; hai lối tắt nhỏ chỉ hiện khi cuộn lên; typographic width 68ch, font serif, không canh đều. |
| Cao | Thẻ truyện | `renderHome()` cũ ghép `coverImage` vào chuỗi `innerHTML` trong HTML attribute; dữ liệu bìa không nên trở thành markup. | **Đã sửa local:** node/image qua DOM API và `textContent`; giới hạn loại URL ảnh, có fallback. |
| Vừa | Thông tin trên thẻ | Danh sách cũ chưa hiện tác giả/số chương, ảnh bị co thành một dải; title không là nút bàn phím. | **Đã sửa local:** tỷ lệ bìa, tác giả, số chương, title bằng button, màu/spacing thống nhất. |
| Vừa | Mục lục | 90 chương hiển thị theo hàng dài; tiêu đề là `div onclick` không có vai trò button. | **Đã sửa local:** tiêu đề chương thành button; **còn lại:** phân nhóm/nút tới chương đang đọc, xử lý chương dài ở L2B/C. |
| Vừa | Chi tiết | Ô văn án kỹ thuật hiện ngay cả khi EPUB không có nội dung (ví dụ `[ Không có dữ liệu văn án ]`), lặp với tóm tắt. | **Chưa sửa:** xử lý điều kiện hiển thị ở L2B; tránh xóa dữ liệu gốc. |
| Vừa | Tùy chỉnh | Cài đặt đọc nằm trong Cyber Phone, không sát vùng chữ; guest không có bảo đảm khôi phục font/theme sau tải lại. | **Chưa sửa:** thiết kế điều khiển trực tiếp, kiểm tra persistence ở L2C. |
| Vừa | Trạng thái | Không có nhãn lỗi danh sách EPUB cloud trong `refreshEpubCloudBooksV49()` (chỉ ghi console), dữ liệu trống dùng chung thông báo "không tìm thấy". | **Chưa sửa:** empty/loading/error rõ ràng trong L2B/D. |
| Cần xác minh | Dữ liệu/trạng thái | EPUB có tên chứa `[HOÀN]` nhưng metadata hiển thị `Đang ra`. Không tự đoán hoặc đổi dữ liệu trạng thái. | **Chưa sửa:** cần quy tắc tác giả nhập/trạng thái EPUB trước khi cho sửa metadata. |
| Ngoài L2 | Kinh tế legacy | Trong `readChapter()` có `addExp(5)` khi mở chương và cập nhật nhiệm vụ local. Kể từ đợt nhặt mới, `claimChapterLootDrop()` chỉ kích hoạt từ cơ hội ngẫu nhiên nằm trong nội dung, không còn nút cố định cuối chương. Đây không phải chứng cứ hoàn thành đọc do máy chủ xác nhận. | **Giữ nguyên ranh giới bảo mật:** không bật phần thưởng chính thức; cần audit Xu/nhiệm vụ/kho riêng trước Rules. |
| Cao | Thông báo nhiệm vụ | Khi mở chương legacy trên site đang phát hành, banner tự báo hoàn tất nhiệm vụ và che khu vực trên cùng; không do độc giả yêu cầu. | **Chưa sửa:** L2C cần phương án giảm thông báo tự phát trong lúc đọc, vẫn giữ phản hồi cho hành động chủ động và không đổi logic thưởng. |

## Lộ trình tiếp theo

1. **L2A QA gate:** kiểm tra bản sửa tại localhost/staging với Chromium thật; chụp desktop và mobile 320/375/390/430, kiểm trang bìa, lọc, nút chương, một truyện legacy và một EPUB; xác nhận không có phần tử che chữ. Trong môi trường CLI hiện tại Playwright không có browser binary và tải bản Chromium thất bại (zip rỗng); browser cloud chỉ kiểm được **website đang phát hành**, không kiểm được patch local.
2. **L2B:** bố cục khám phá; số lượng tag và metadata cần thiết; bìa fallback; chi tiết truyện có điều kiện, trạng thái tìm/lọc/rỗng/lỗi; mục lục dài với jump-to-current. Không tự đổi metadata hoặc các collection.
3. **L2C:** điều khiển đọc sát nội dung, theme/font/line-height với lưu và khôi phục được xác nhận; đọc một tay; scroll restoration khi đổi chương; giảm phần tử game tại vùng đọc bằng quyết định UX riêng (không sửa logic thưởng).
4. **L2D:** test matrix legacy/EPUB V49/V57, quyền tác giả/khách, chapter IDs, reload/resume, EPUB văn bản dài/ký tự HTML; Firebase Rules chỉ xem xét/test emulator theo sự chấp thuận, không deploy hoặc migration.

## Thay đổi trong L2A local

- `index.html`: dựng thẻ bằng DOM an toàn; chapter title là button; trạng thái reader focus; feedback khi tải EPUB; giản lược lối tắt; không đổi `saveDB()`/bộ sưu tập/role/logic thưởng.
- `css/site-shell-v60.css`: kiểu bìa và thẻ, giao diện tập trung đọc, feedback tải và focus indication.
- `js/site-shell-v60.js`: hủy yêu cầu tải EPUB đang chờ khi chuyển route.
- `js/library-reader-status-l2a.js`: chỉ quản lý thông báo, retry và loại bỏ kết quả async cũ.
- `tests/library-l2a.test.cjs`, `tests/library-reader-status-l2a.test.cjs`: hồi quy DOM input, điều hướng, hai loại sách và bất đồng bộ.

Không sửa Firestore Rules, Firebase Auth, Worker, functions, Thư viện dữ liệu thật hoặc Vạn Giới; không thêm migration. Nếu cần rollback: revert commit L2A (các file trên), sẽ trở lại renderer và kiểu đọc trước L2A, không cần thao tác khôi phục database. PR #22 G5 vẫn là phạm vi khác: không gộp/đóng.

## Kết quả test của bản làm việc

- `node --test tests/*.test.cjs`: **106/106 file PASS**, gồm 2 file test L2A mới, các bài EPUB/Library và phần mềm nền.
- `node --test functions/tests/*.test.cjs`: **2/2 PASS**.
- `npm test --prefix cloudflare` sau khi cài dependency cho workspace: **83/86 file PASS**; 2 file không chạy trọn do `spawnSync ... EPERM` từ sandbox ở bước check bundle, 1 browser test không có Chromium. Không xem đây là lỗi business logic của L2A, nhưng cũng không ghi là toàn bộ Cloudflare xanh.
- `git diff --check`, kiểm tra cú pháp JS và inline script: PASS.
- Browser smoke Playwright local: chưa chạy vì thiếu browser executable; thử tải Chromium không thành công (`End of central directory` trên ZIP tải về). Không có test Firebase Auth/Rules trên production.

## Checklist nghiệm thu còn mở

- [x] HEAD và tài liệu trọng yếu đã đối chiếu
- [x] Luồng thủ công và EPUB giữ đường đọc riêng ở tầng lưu, chung UI ở tầng hiển thị
- [x] Đã quan sát baseline desktop public với EPUB và guest
- [x] Bài test logic/unit có khả năng chạy offline
- [ ] Browser QA cho **patch local** ở mobile/desktop (Chromium không sẵn có)
- [ ] Quyền admin thật, export/publish và server sync (không thử trên production)
- [ ] Chương legacy dài/EPUB dài ở iOS Safari và Android Chrome
- [ ] Kiểm trải nghiệm toàn bộ sau L2B/C/D và chính thức giao L2
