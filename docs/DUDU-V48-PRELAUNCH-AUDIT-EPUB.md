# DUDU Studio V48 — Rà soát trước khi vận hành thật + nhập EPUB

**Ngày:** 17/10/2026. **Phạm vi:** mã `main`, các bộ test có trong GitHub Actions, cơ chế đọc truyện, auth, tác giả, PWA, save, Kho, Xu, nhiệm vụ, vật phẩm, DUDU FUN và tiện ích. **Tạm hoãn:** V47 Worker staging, bình luận/giao tiếp, thư NPC, quà liên tài khoản, đấu giá và AI trò chuyện. Không nhầm Sandbox đạt test với production đạt vận hành nhiều tài khoản.

## Trạng thái và bằng chứng

| Mảng | Đã có gì | Khuyến nghị trước public |
|---|---|---|
| Thư viện, đọc chương, trang tác giả | Các luồng đọc/sửa truyện, chapter, NPC, timestamp và điều hướng hoạt động trong mô hình Sandbox và test Chromium | **P0:** `studio_data/main_library` lưu **toàn bộ truyện + nội dung chương trong 1 doc**, dễ chạm trần Firestore 1 MiB. Tách `stories/{storyId}` + `chapters/{chapterId}` hoặc Storage trước khi đăng nhiều truyện dài. Backup trước khi di chuyển. |
| Firebase Authentication | Có Firebase Auth Google + Email/Password, `DuduAuth.isAdmin()` dựa trên custom claim từ token | **P0:** `security/firestore.rules.review` chỉ là bản review, không phải Rules đã triển khai. Test thật auth, quyền admin/chỉ đọc và UID. |
| Hồ sơ/Xu/Kho | Có `profiles_v2/{uid}`, quà, nhiệm vụ và cơ chế save/rollback local; CI kiểm tra pure + Chromium | **P0 nếu muốn economy đáng tin:** client hiện ghi Xu, EXP, inventory vào profile; người dùng có thể sửa local/request. Các phần thưởng/đồ giá trị phải do backend đáng tin cấp. |
| Truyện, nhiệm vụ, DUDU FUN | Nhiều kiểm thử chống nhận thưởng lại, clock rollback, game rounds và loot | **P1:** phù hợp Sandbox/gameplay; production chỉ nên coi là tiến trình/tiền mô phỏng cho đến khi có trusted ledger. |
| Kỷ vật/relic | Cơ chế model/author/test vorhanden; staging nhiều feature gates mặc định OFF | **P0:** không mở phát kỷ vật tự động, giao dịch quà thật hay claim dựa vào local read timer. |
| Điện thoại, avatar, fonts, NPC art | Có UI responsive và test browser; giới hạn quyền riêng tư local | **P1:** thử trực tiếp Chrome Android + Safari iOS (đặc biệt máy 320 px). Một số ảnh WebP bản chính được ghi chú chưa đưa vào repo; phải đối soát assets. |
| PWA | `sw.js`, `manifest.json` đã có | **P1:** `manifest.start_url` hiện là `./index.html?sandbox=1`, cài lên điện thoại sẽ mở Sandbox; đổi chỉ trong đợt go-live khi rules/data đã sẵn sàng. |
| Sao lưu / quản trị | Có nhánh backup và GitHub Actions | **P0:** lập backup Firestore, quy trình rollback, monitor lỗi auth/save/Storage và giới hạn chi phí. |
| Bình luận Pilot/Cloudflare staging | Tạm ngừng theo yêu cầu; không mở cờ | Không chặn việc chuẩn bị trình đọc nhưng **không quảng bá giao tiếp thật**. |
| EPUB | V48 thêm nhận tệp .epub, tách metadata/spine, bỏ HTML động, xem trước; nhập được chương vào Sandbox; tác giả thật có đường lưu **tệp gốc** lên Firebase Storage | **P0 cho công khai:** Storage rules admin-only cần kiểm tra triển khai, storage bucket/Blaze và dữ liệu nhập chương đã chuyển sang kiến trúc nhiều tài liệu trước khi có nút Xuất bản. |

## V48 EPUB: chức năng và giới hạn

- Trong giao diện Tác giả → **+ Tạo → Nhập EPUB**, chọn `.epub` <= 15 MB. Tách theo OPF/spine, tối đa 160 mục, kiểm tra giới hạn giải nén và số ký tự, từ chối path traversal/XML DTD, bỏ script/style trước khi nhập văn bản thuần. Hiển thị chương, tên và số ký tự.
- Trong `?sandbox=1`, chọn **Tạo truyện mới** hoặc một truyện đã có, bấm **Nhập chương vào Sandbox**. Không ghi Firestore; hạn mức thư viện thử nghiệm 3 MB để không tràn localStorage; các chapter IDs độc lập.
- Chế độ thật (chỉ tài khoản Firebase custom claim `admin=true`) hiện chỉ có **Lưu tệp EPUB gốc lên Firebase Storage** tại `author_epub_drafts/{uid}/{uuid}.epub`. **Không tự thêm chương vào `studio_data/main_library`, không tự publish** vì nguy cơ 1 MiB. Chưa có frontend liệt kê/xóa bản thảo cloud; hãy giữ path được hiển thị sau upload và dùng Firebase Console để kiểm tra.
- **Rules:** `security/storage.rules.review` là bản tham khảo fail-closed, KHÔNG được deploy đè lên rules Storage đang dùng. Việc có admin claim ở client không tự bảo vệ Storage; bắt buộc kiểm tra quyền viết/đọc được thực thi tại Firebase.
- Cloud Storage for Firebase từ 03/02/2026 cần dự án Blaze; kiểm tra plan và ngân sách trước khi thử upload. Storage không phải Firestore; upload dữ liệu EPUB gốc phải đi qua Storage, không chèn base64/nhị phân vào tài liệu truyện.
- **Không có EPUB thực tế được cung cấp** trong yêu cầu này. Fixture browser thử OPF/XML và hai XHTML giả; cần thử ít nhất 2–3 EPUB thật (EPUB2, EPUB3, tiếng Việt, ebook có nhiều ảnh, danh mục) trước khi khẳng định tương thích.
- Bản quyền: chỉ import/tải lên nội dung mà chủ dự án được phép lưu và phân phối. Không tự mở công khai tệp bản thảo.

## Công việc tiếp theo theo thứ tự (không kéo thêm Worker)

1. **Release Gate A — Firebase Rules & backup:** đọc Rules đang triển khai; test admin/reader/guest, export backup, hạn chế author-only Storage, kiểm tra Blaze và budget.
2. **Release Gate B — Multi-document stories:** thiết kế lại Firestore `stories/{storyId}` + `chapters/{chapterId}` với migration giữ nguyên ID, cột mốc đọc, NPC và thứ tự chương; kiểm tra ảnh bìa và idempotency. Đây là điều kiện để nhập EPUB dài vào website dùng thật mà không copy/paste.
3. **Release Gate C — Trusted economy:** chỉ public chức năng đọc, tùy chỉnh giao diện và game mô phỏng trước. Với reward/market/relic thật, cần issuer server + journal / anti replay + rules nghiêm.
4. **Release Gate D — Mobile & content QA:** Safari/WebKit iOS, Android Chrome, 320–390 px, PWA install/offline, 2 EPUB thật, hồ sơ đăng nhập, lưu lại, khôi phục backup, assets ảnh.
5. **Go-live:** chuyển PWA start URL từ Sandbox sang chính thức, kiểm tra monitoring/cost, public read-only đầu tiên; chỉ mở các tính năng giao dịch sau nghiệm thu riêng.

**Kết luận:** *Mã và hành vi Sandbox đa số có test chạy thành công; chưa có bằng chứng đủ để tuyên bố production-ready.* Trình đọc có thể chuẩn bị ra mắt **read-only có kiểm soát** sau khi sửa lưu trữ truyện và Rules. Không đánh đồng “GitHub Actions PASS” với “Firebase production đã được xác minh”.
