# DUDU STUDIO — L6: R2-first EPUB re-upload master plan

Ngày: 17/11/2026. Trạng thái: kế hoạch và kiểm thử offline, CHƯA migration.
Quyết định người dùng: lưu EPUB gốc, nội dung từng chương, hình bìa và minh họa trên R2; chỉ giữ danh mục, metadata, trạng thái, tài khoản và tiến độ trên Firestore. Tác giả giữ EPUB cũ trên máy và chấp nhận bỏ dữ liệu từ điển thử nghiệm. Game không đổi.

Bucket được cung cấp qua ảnh: dudu-library-epub-private; Standard; Public Access Disabled; 0 B lúc chụp. Chưa có binding từ Worker; chưa upload nội dung.
Quyền truy cập: Rules R1.2 do chủ dự án cung cấp và xác nhận đang dùng; Web được đọc công khai, EPUB published cần approvedReader() hoặc tác giả admin, tài khoản cũ có cơ chế grandfather profiles_v2 trừ khi enabled:false. Tệp Rules trong repo là bản ứng viên cũ và KHÔNG được deploy đè lên R1.2.

## 1. Sơ đồ lưu trữ được duyệt về mặt thiết kế

| Dữ liệu | Hệ lưu trữ mục tiêu | Ràng buộc |
|---|---|---|
| Tệp EPUB gốc | R2 private | Lưu nguyên byte và checksum, revision bất biến |
| Text từng chương | R2 private | UTF-8, một object mỗi chương, không lưu content dài ở Firestore |
| Bìa và ảnh trong EPUB | R2 private | MIME cho phép, không chèn XHTML/CSS EPUB thô vào DOM |
| Tên truyện, tác giả, số chương, chapterIndex, trạng thái | Firestore | Chỉ metadata gọn và ID, không lộ URL R2 |
| Tài khoản, quyền đọc, bookmark, tiến độ đọc | Firebase | Giữ UID, bookId/chapterId nếu có thể |
| Từ điển tên riêng và thuật ngữ theo người dùng | Firestore + local cache | Chưa triển khai cloud sync; hiện tính năng L5.3–L5.6B lưu chủ yếu cục bộ |
| Bộ từ điển Hán–Việt dùng chung | GitHub Pages, R2 nếu lớn | Dữ liệu có quyền phân phối, cache theo phiên bản |
| Truyện Web trong studio_data/main_library | Giữ Firestore | NGOÀI phạm vi migrate EPUB |
| Game, Xu, EXP, Kho, hồ sơ | Giữ nguyên | Không xóa, đổi schema hoặc reset |

KHÔNG xóa toàn bộ Firebase. Lệnh xóa về sau chỉ nhắm tới dữ liệu chương EPUB cũ (bao gồm revision cũ) được xác minh đã chuyển và có backup; Firestore metadata, tài khoản và Game phải còn nguyên.

## 2. Kiến trúc target và quyền

- Dự kiến dùng collection metadata mới epub_catalog_r2_v1/{bookId} (schema chưa triển khai), chứa title, author, status, ownerUid, chapterIndex [id,title,order,wordCount,bytes,sha256,revision], coverAssetId và storageBackend = r2; KHÔNG có text chapter hoặc public link.
- R2 private key do server sinh: originals/{opaqueBookId}/{immutableRevisionId}/source.epub, chapters/{opaqueBookId}/{immutableRevisionId}/{chapterId}.txt và assets/{opaqueBookId}/{immutableRevisionId}/{opaqueAssetId}.{ext}.
- Cloudflare Worker là điểm truy cập duy nhất. Phải verify Firebase JWT và TRA quyền từ nguồn Firestore đáng tin ở phía server tương ứng chính sách R1.2, không chỉ kiểm tra có đăng nhập. CORS không thể thay quyền truy cập.
- Quyền owner/admin có thể upload/đổi trạng thái. Approved reader chỉ GET chương published. Guest và unapproved không được đọc EPUB, không được lấy object key hay URL tải trực tiếp. Không có quyền trả Xu theo chương trong R1.2 hiện tại.
- Giữ nguyên bookId/chapterId là ưu tiên để không mất bookmark, nhận diện truyện trong từ điển, lịch sử đọc và phần thưởng. Nếu bắt buộc thay ID khi nhập lại cần migration map và kiểm tra tác động phần thưởng Game (không reset tự động).
- Parser mới phải giới hạn ZIP entries, tổng giải nén, file size, path traversal, image MIME, xóa script/HTML nguy hiểm. Hình trong EPUB cần viewer an toàn, không có insert raw XHTML.

## 3. Giai đoạn triển khai trên main, không tạo nhánh

**P2A — Hợp đồng metadata / kiểm thử offline (hiện tại):**
- Module js/library-epub-r2-manifest-l6p2a.js và tests/library-epub-r2-manifest-l6p2a.test.cjs chỉ validate IDs, chapterIndex, dung lượng, SHA-256, minh họa.
- Không có network, cloud writes, delete, Worker route hay sửa index.html.
- Danh sách receipt do client cung cấp không phải bằng chứng cấp quyền xóa. Chỉ phía server đọc đối chiếu object R2 thực, hash/bytes và trạng thái mới được xác nhận migration.

**P2B — Worker R2 private + quyền R1.2:**
- Thử nghiệm trên Worker mock, cờ R2 mặc định OFF. Không thay Worker live đang phục vụ Game cho tới khi qua test.
- Cần binding dự kiến DUDU_LIBRARY_EPUB_BUCKET tới dudu-library-epub-private. Không thêm binding vào cấu hình deployment hiện tại một cách âm thầm.
- Cần thiết kế và test Rules Firestore mới cho metadata R2 riêng; giữ toàn bộ Rules R1.2 hiện dùng.
- Server authorizer xác minh guest/unapproved/approved/grandfather/revoked/admin; test thay đổi quyền giữa lúc đọc, draft, archived, request giả mạo, path traversal và replay.

**P2C — Nhập lại EPUB từ máy, chỉ thêm mới:**
- Tác giả chọn EPUB nguồn ở máy; parse lại đúng số chương, title, bìa và ảnh; tính SHA-256.
- Upload riêng tư vào R2 theo revision mới; retry idempotent; object thiếu/khác hash không thể publish.
- Worker đọc ngược bytes từ R2, xác minh checksum từng chương và ảnh. Chỉ server mới tạo receipt verified có thể tin cậy, client không được tự chứng nhận.
- Tạo metadata Firestore nhỏ và publish sau khi đủ object. Không xóa chapter Firestore cũ ở bước upload/publish.

**P2D — Chuyển nguồn đọc, giữ rollback:**
- Frontend đọc Firestore cũ cho Web, đọc qua Worker R2 cho EPUB mới theo metadata server cho phép. Không để trình duyệt tự tự chọn backend để vượt quyền.
- QA Web/EPUB, 160 chapters, Android, 320/390/430 px, bookmark/scroll, L5.3–L5.6B, ảnh bìa và ảnh nội dung, mạng chập chờn, quyền bị thu hồi.
- Kiểm thử cả những tài khoản đã có profiles_v2 và account bị enabled:false; verify rằng guest không đọc được EPUB.
- Khi R2 lỗi 401/403 không âm thầm fallback sang Firestore hay rò nội dung.
- Firestore cũ giữ nguyên cho đến khi tất cả sách được xác minh mới và rollback hoạt động.

**P2E — Dọn chương EPUB Firestore cũ sau khi nghiệm thu:**
- Kiểm kê chính xác ID sách/chương/revision. Có bản sao lưu dữ liệu và quy trình rollback.
- Chạy dry-run chỉ hiển thị danh sách tài liệu sẽ xóa; kiểm chứng độc lập checksum/đọc lại R2 và lưu kết quả QA.
- Chỉ sau xác nhận xóa riêng của chủ dự án mới cho phép dọn chapter + revision Firestore cũ; không xóa metadata cần thiết, không đụng studio_data/main_library, profiles_v2, economy_accounts_v52, Game.
- Không có hàm DELETE hay tự dọn trong giai đoạn P2A này.

## 4. Điều kiện chi phí và vận hành

- Standard free tier 10 GB-month, 1 triệu Class A, 10 triệu Class B operations/tháng; không phải giới hạn cứng. Nên bật Cloudflare budget alert và quan sát Workers cost.
- Chưa tạo token R2 API. Với Worker R2 binding không cần cung cấp S3 key vào trình duyệt.
- Không bật Public Access/r2.dev. Không upload file thật hay thay live Rules trước khi thử quyền và xây xong pipeline.
- Hiện chưa có kết nối đến live Cloudflare account hoặc Firebase Rules trong công cụ: xác nhận ảnh/dashboard của chủ dự án, nhưng không khẳng định đã upload, đổi Rules hay migrate.

## 5. Cổng nghiệm thu P2A

- Unit test validate manifest, duplicate IDs, giới hạn byte, SHA-256, hình ảnh, chapterIndex và receipts không có thẩm quyền xóa.
- Kết nối đọc thực tế trên website giữ nguyên Firestore; adapter L6-P1 cũng mặc định OFF.
- Các phần Game, Firebase Rules, Cloudflare Wrangler và bucket không được chỉnh trong P2A.
