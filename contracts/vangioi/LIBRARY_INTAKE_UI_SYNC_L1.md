# LIB1 — Đồng bộ lối vào đăng truyện Thư viện và tham chiếu Vạn Giới

Ngày 27/10/2026. Baseline `a9e37b6` (G2X). Yêu cầu An Du: đối chiếu cơ chế đưa truyện lên Thư viện cũ với Vạn Giới, sửa để tác giả nhìn thấy những lựa chọn đúng và không phải đăng lại tác phẩm khi tạo world. **LIB1 là chỉnh giao diện điều hướng; chưa hợp nhất database hay triển khai uploader production.**

## Thực tế mã nguồn trước LIB1

| Khái niệm | Hiện có trong code | Điều LIB1 thể hiện rõ |
|---|---|---|
| Viết truyện gốc từng chương | `openStoryModal()` và `saveStoryModal()` của `index.html`; lưu qua `novels` / `saveDB()` legacy | Dẫn tới trình soạn cũ, không tự đổi cách lưu/khởi tạo chương/XP. |
| Nhập tệp `.epub` | `js/epub-import-v48.js` + `js/epub-text-v57.js` + `js/epub-production-v49.js`; Sandbox hoặc Firestore theo điều kiện tài khoản/Rules | Dẫn tới importer EPUB V57 hiện có: xem trước, resume, tách chương, quyền phát hành như cũ. Không nhận TXT/DOCX/PDF giả. |
| Dùng truyện Thư viện làm nguồn Vạn Giới | `storySource.kind='library'` trong `js/vangioi-creator.js`; phải có story ID, phiên bản, hash nguồn | Nhắc **không đăng lại**, mở Thư viện và World Creator. Source picker + kiểm quyền vẫn chưa nối server. |
| Sáng tác gốc / Thư viện / Bản thảo trong Vạn Giới | `storySource.kind=original/library/manuscript` | Đây là **nhóm xuất xứ nguồn**, không phải ba định dạng upload. |
| JSON Vạn Giới | Import/Export hồ sơ world trong World Creator G1N | Không coi đây là truyện/chương được đăng lên Thư viện. |

## Thay đổi giao diện

- `js/library-intake-v1.js`: popup **“Đưa truyện vào Thư viện”** cho tác giả, hai cách đưa nội dung vào thư viện là *Viết truyện theo chương* và *Nhập EPUB*, cộng hai hành động *Xem truyện Thư viện* và *Mở World Creator* để tham chiếu. Có kiểm `canEditStories()` **khi mở và khi nhấn thao tác**, không cấp role. Truy cập qua `window.DuduLibraryIntakeV1`; `backendConnected:false`.
- `css/library-intake-v1.css`: hiển thị responsive, nút điều hướng rõ ràng, focus/đóng bằng ESC với dialog. Không sửa phong cách đọc truyện.
- `index.html`: nút tác giả `+ Tạo` ở Thư viện cũ chuyển thành **`+ Đăng / nhập truyện`**, dùng popup với fallback có kiểm quyền; nạp JS/CSS với cache key riêng.
- `js/site-shell-v60.js`: Góc tác giả có một lối vào **Đăng / nhập truyện** thống nhất thay cho hai nút rời, vẫn giữ Quản lý Thư viện và Khung kịch bản. Lối gọi `openStoryModal()`/`openEpubImportV48()` cũ giữ nguyên để các tính năng khác không hỏng.
- `tests/library-intake-v1.test.cjs`: mock DOM kiểm quyền trước/sau mở, bốn hành động, modal không trùng, không ghi Firebase, sự tồn tại importer cũ và khai báo định dạng chưa hỗ trợ.

## Điều chưa đồng bộ về hạ tầng

1. **Hai nơi lưu truyện hiện vẫn khác nhau**: nguồn truyện legacy trong `main_library`/`novels` và EPUB V49 trong `epub_stories_v49`. Popup không trộn dữ liệu hay tự chuyển truyện giữa hai loại. Không ghi lại EPUB đã công khai, không đổi chapter ID, không cấp quyền chủ tác phẩm.
2. Vạn Giới hiện lưu world draft offline; tham chiếu Thư viện muốn có quyền chuyển thể phải giải quyết story ID/version/hash, quyền truy cập, giấy phép và thu hồi quyền từ G1Q–G2X. Không tự gắn hash, nâng quyền hoặc cho phép submit/publish khi thiếu.
3. Không triển khai parser TXT/PDF/DOCX: các định dạng này cần chuẩn hóa encoding, chia chương, bản quyền, resume và chính sách storage riêng; chỉ hiện cảnh báo công khai và hướng dẫn dán vào trình soạn. Không gắn nhãn nút không hoạt động là đã hỗ trợ.
4. `publishDraft()` V49 legacy vẫn tồn tại, G2S candidate chưa deploy, writer G2W Emulator-only; không thay Firestore Rules, IAM, Auth, Functions, Cloudflare Worker, Storage, EPUB reader, XP/Xu/Kho, NPC AI hay 48 seed.

## Kiểm thử và rollback

```sh
node --test tests/library-intake-v1.test.cjs
node tests/browser-library-intake-v1.cjs # cần Chromium cài sẵn
node --test tests/*.test.cjs
npm test --prefix cloudflare
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
node tools/vangioi/audit-v49-writers-g2x.mjs
```

Rollback chỉ bỏ popup JS/CSS, bài test/doc và khôi phục các nút điều hướng Thư viện/Góc tác giả trong `index.html`/`js/site-shell-v60.js`. Không có dữ liệu thật, migration, hành vi publish hoặc quyền nào cần rollback.

**Kết quả local:** app **104/104 test files**, Cloudflare **794/794**, Functions **2/2**; Wrangler `--dry-run` và G2X writer inventory **PASS**. Bài mock DOM `library-intake-v1.test.cjs` PASS. Browser smoke đã được viết nhưng **chưa chạy được**: môi trường không có Chromium, tải trình duyệt Playwright thất bại vì gói tải về không hợp lệ. Không tuyên bố đã QA giao diện trên thiết bị thật hoặc Firebase live; cần chạy lại browser smoke ở môi trường có Chromium trước staging.

## LIB1-UI2 — Tinh gọn nút theo góp ý tác giả (27/10/2026)

Sau LIB1, An Du xác nhận nút **Xem truyện trong Thư viện** không cần thiết trong hộp đăng truyện vì tab Thư viện đã có điều hướng riêng. Bản UI2 điều chỉnh:

- Hộp **Thêm truyện vào Thư viện** chỉ còn **Viết truyện theo chương** và **Nhập EPUB** — đúng hai luồng tạo/nhập đang hoạt động. Bỏ lối mở Thư viện và lối mở World Creator lặp trong hộp này. Vạn Giới vẫn có nút **Tạo / nhập thế giới** ở tab Thế giới.
- Góc tác giả bỏ nút **Quản lý trong Thư viện** vì trùng tab Thư viện; giữ nút đăng/nhập truyện và Khung kịch bản. Không đổi điều hướng chính, `canEditStories()`, trình EPUB hay trình viết chương.
- Rút gọn lời giới thiệu, giảm chiều rộng hộp, thay version query tài nguyên JS/CSS để người xem nhận bản cập nhật; kiểm thử số lượng hành động đúng bằng 2 và quyền bị thu hồi trong lúc hộp mở.

**Giới hạn không đổi:** Chưa đồng bộ hai backend lưu truyện; chưa có nguồn picker đã xác thực, nối giấy phép chuyển thể, uỷ quyền phát hành thật hoặc ghi Firebase staging/production. Không thể dùng thao tác GUI này để kết luận đã hoàn thành đồng bộ nguồn Vạn Giới.
