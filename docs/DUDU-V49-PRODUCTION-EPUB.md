# V49 — EPUB trên phiên bản chính thức, Sandbox giữ nguyên

Ngày: 17/10/2026. Repo `hnhuynh1003-blip/truyendienvlnha`.

## Quyết định phạm vi
- Tạm dừng mọi tác vụ Worker Pilot / bình luận, giao tiếp và đấu giá. Không kích hoạt bất kỳ feature gate nào.
- Sandbox `?sandbox=1` giữ nguyên dữ liệu local để sau này tiếp tục thử nghiệm. Không sử dụng Sandbox làm bước bắt buộc để đăng EPUB.
- Bản chính ở URL không có `sandbox=1`: tác giả Firebase đã có **custom claim admin=true** vào **+ Tạo → Nhập EPUB**. Không cấp quyền admin bằng client.
- Luồng trực tiếp: chọn tệp EPUB → phân tích trên thiết bị (không upload nguyên tệp tự động) → danh sách chương → **Lưu bản thảo trên Firestore** → **Xác nhận có quyền xuất bản** → **Xuất bản cho độc giả**. Không ghi đè truyện/chương cũ.
- Tùy chọn riêng **Sao lưu tệp EPUB gốc lên Storage** vẫn có, nhưng không phải điều kiện nhập chương; yêu cầu Storage Rules, Storage bucket và gói Blaze phù hợp.

## Cấu trúc lưu Firestore
- `epub_stories_v49/{bookId}`: metadata truyện, `ownerUid`, `status` (importing/draft/published), thứ tự/tựa chương.
- `epub_stories_v49/{bookId}/chapters/{chapterId}`: nội dung từng chương. Giới hạn 420 KB/chương và 160 mục từ OPF/spine.
- Reader lấy danh sách truyện `status=published` và chỉ tải nội dung chương khi người đọc nhấn. Các truyện cũ trong `studio_data/main_library` vẫn được đọc như trước; code `saveDB` loại truyện `_cloudV49` khỏi dữ liệu cũ.
- Trạng thái `importing` hoặc `draft` không được hiển thị công khai; mất mạng giữa chừng không tạo truyện nửa xuất bản. Không có tự động thử lại draft import dang dở ở V49; kiểm tra Firebase Console khi gặp lỗi.
- EPUB V49 chưa hỗ trợ chỉnh sửa/xóa nội dung chương đã đăng bằng trình soạn cũ, để bảo vệ ID và không gây ghi ngược vào dữ liệu cũ. Sẽ xây editor/migration mới về sau.
- Vẫn có giới hạn EPUB V48: 15 MB file, <=160 mục trong spine, <=1.5 triệu ký tự tổng và nội dung mỗi mục phù hợp. Tệp quá lớn cần chia tập hoặc phát triển importer theo batch.
- EPUB có cấu trúc HTML/TOC không chuẩn hoặc book có hình ảnh phức tạp chỉ hỗ trợ văn bản thuần trước mắt; cần QA với file thực tế của người dùng.

## Điều kiện BẮT BUỘC trước khi dùng Firebase thật

**GitHub Pages PASS không đủ để cho phép upload/xuất bản.** Các bước này thuộc tài khoản quản trị Firebase thật và chưa được xác nhận:

1. Firebase Console → Firestore Database → **Rules**: sao lưu bản Rules đang chạy. Kiểm tra quyền đọc `studio_data/main_library`, hồ sơ và các collection hiện hành.
2. **Hợp nhất có kiểm tra** quy tắc từ `security/firestore-epub-v49.rules.review` vào bộ Rules hiện hữu. Không dán đè cả bộ rules, không áp dụng bộ review cũ vì có thể làm độc giả bị mất quyền. Hợp nhất trong Firebase Emulator và kiểm thử guest đọc published, guest không đọc draft, reader không ghi, admin tạo->draft->published, owner khác không ghi.
3. Tài khoản dùng để đăng EPUB phải có Firebase Authentication token chứa **custom claim `admin:true`** từ Firebase Admin SDK môi trường tin cậy, không phải chỉ đăng nhập vào Firebase Console.
4. Sao lưu `studio_data/main_library` và dữ liệu hồ sơ; xác nhận restore thử nghiệm và giới hạn chi phí Firestore. Cần cân nhắc chi phí tối thiểu một document write/chương, lần đầu publish metadata, và document read/chương/độc giả.
5. Truy cập URL công khai không có `?sandbox=1`, ví dụ `https://hnhuynh1003-blip.github.io/truyendienvlnha/?v=49-1`; đăng nhập Firebase tác giả, nhấn **+ Tạo → Nhập EPUB**. Chưa xác minh Rules sẽ nhận lỗi permission-denied. Tác giả không có custom claim sẽ không thấy quyền tạo.
6. Chỉ xuất bản tài liệu mà bạn có quyền lưu và chia sẻ công khai. Preview và thử trên bản chính chỉ thực hiện sau khi chuẩn bị permission/backup.

## Giới hạn chưa giải quyết trước go-live hoàn chỉnh
- PWA manifest vẫn mở Sandbox khi cài App: **chưa thay** cho đến khi xác minh Auth, Rules và dữ liệu thật.
- Legacy library vẫn dùng một tài liệu Firestore; việc chia chương V49 chỉ áp dụng truyện EPUB mới. Chưa migration truyện cũ.
- Xu/EXP/Kho, vật phẩm và game rewards vẫn chủ yếu client-authoritative; cần ledger máy chủ nếu có giao dịch thật.
- Chưa kiểm thử end-to-end Firebase thật; GitHub CI chỉ là unit và Chromium/mock. Chưa kiểm tra trực tiếp Safari iOS.
- Công cụ thêm EPUB sau khi xuất bản chưa có chức năng editor/xóa/đổi vị trí chương hay xử lý ảnh trong EPUB.
