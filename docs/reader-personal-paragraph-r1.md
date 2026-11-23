# Chỉnh đoạn văn cá nhân R1 — nghiệm thu cục bộ

Nhánh `feature/reader-personal-paragraphs`, từ main `2b581ec6`. Chưa merge/deploy.

## Xem thử

Chạy `node scripts/preview-reader-paragraph-r1.cjs`, mở
<http://127.0.0.1:8766/tests/fixtures/reader-paragraph-r1.html>.
Demo độc lập không đăng nhập thật, không kết nối Firebase/R2. Nút đổi tài khoản/revision chỉ thay dữ liệu thử.

Trong ứng dụng thật: mở chương → ⚙ Kiểu đọc → ¶ Chỉnh đoạn cá nhân.
Cần UID Firebase đã sẵn sàng; khách chưa đăng nhập vẫn đọc bố cục gốc.

1. Bấm **Tự chia theo câu**: chia toàn chương theo ranh giới câu và ngắt đoạn dài ở khoảng trắng. Kết quả hiện và lưu ngay trong Reader; xem số đoạn rồi bấm **Xong — đọc tiếp**. Có thể Hoàn tác. Đây là bố cục cá nhân do máy đề xuất, không chỉnh chữ gốc.
2. Muốn chọn chính xác: mở **Chia/gộp thủ công · Bố cục gốc · Sao lưu**, chạm/chọn chữ trong truyện hoặc ô chữ gốc rồi bấm **Chia tại con trỏ** / **Gộp với đoạn trước**. Không gộp qua ảnh. Chọn đúng đầu đoạn đã tồn tại sẽ báo chưa có thay đổi, không báo chia thành công.
3. Thử Hoàn tác và Bố cục gốc. Hoàn tác giữ tối đa 30 bước trong phiên/chương hiện tại.
4. Bấm **Xong — đọc tiếp**: thanh công cụ ẩn, bố cục đã lưu vẫn áp dụng và tên riêng được hiển thị lại. Trong lúc chỉnh dùng tên gốc để vị trí chọn không lệch do alias. Sao lưu chương thành JSON trong mục mở rộng; đổi bố cục rồi phục hồi tệp. Tệp chỉ chứa UID, định danh, fingerprint SHA-256 và mảng vị trí UTF-16, không chứa chương.
5. Tải lại: giữ bố cục. Đổi tài khoản: không áp dụng bố cục cũ. Đổi revision/chữ gốc: không áp dụng fingerprint cũ. Sang thiết bị khác cần chuyển tệp JSON và đăng nhập cùng UID, mở cùng nội dung/revision.
6. Kiểm tra hình vẫn nằm giữa đúng khối; không thể gộp qua hình. Kiểm tra sửa tên, dấu trang, đọc tiếp và chuyển chương trong bản ứng dụng cục bộ trước nghiệm thu.

## Phạm vi và bảo toàn dữ liệu

Model thuần `reader-paragraph-model-r1.js` định nghĩa record schema 1 và kiểm tra vị trí grapheme Unicode. UI adapter quản lý localStorage; có thể thay adapter để hỗ trợ sync sau, R1 không có API sync.

Key riêng `dudu-paragraph-r1:[uid,backend:bookId,chapterId,fingerprint]`. Mỗi lần lưu chỉ ghi key chương hiện tại; không sửa key bookmark, tên, pending hoặc chapter.content. Thao tác không gọi lại readChapter, không gọi cloud, không tính lại EXP. Bản sao cục bộ vẫn nằm trên trình duyệt dùng chung; phân tách UID không phải mã hóa chống người có quyền DevTools.

Fingerprint gồm nội dung gốc, R2 revision, văn bản hiển thị trước sửa tên và cấu trúc ảnh/text. Khoảng chia không cắt grapheme. Ảnh giữ nguyên node/blob và thứ tự; chỉ thay node p trong từng khối. Bố cục gốc lấy từ các node p gốc, không suy đoán từ newline bên trong segment R2. Sửa tên luôn bind lại từ chữ gốc. Giá trị scrollY được giữ khi thay đoạn; sau đổi bố cục, vị trí trên trang có thể khác ý nghĩa văn bản. Không cam kết giữ nguyên một từ ở vị trí cuộn.

Giới hạn: 10.000 ranh giới mỗi khối, backup nhập tối đa 500 KB; thiếu Web Crypto/Intl.Segmenter hoặc storage lỗi không được làm mất khả năng đọc gốc. Không đồng bộ tự động, không hỗ trợ dời ảnh/chỉnh chữ. Chưa kiểm thử trên thiết bị iOS/Android vật lý hoặc TTS bên ngoài trình duyệt.

## Kiểm thử

`node --test tests/reader-paragraph-r1.test.cjs`.

`node tests/browser-reader-paragraph-r1.cjs` cần Playwright và Chrome; có thể đặt PLAYWRIGHT_MODULE đến đường dẫn module đã cài. Browser test dùng localhost và dữ liệu thử, không chứng minh production.

Browser kiểm tra chia/gộp, undo, reset, download/import JSON, lỗi storage, alias, thứ tự ảnh, reload, cách ly tài khoản và sai revision. Regression Reader hiện có được chạy riêng. Test Tu Tiên `V71 game has eight server-derived stats and no browser-generated passport` đang lỗi sẵn trên main do chuỗi version script; không bỏ qua hoặc sửa game để làm xanh kết quả.

Kết quả local ngày 2026-11-23: 44/44 unit/contract Reader liên quan PASS; browser mới PASS cả chương hơn 200.000 ký tự và hook readChapter thật trong Sandbox offline; 14/14 browser Reader UI T1 PASS. Toàn bộ `tests/*.test.cjs`: 1.562 test, 1.561 PASS, 1 FAIL Tu Tiên như trên (tái hiện với index.html gốc từ origin/main). Khi mở hộp/focus/cuộn, bookmark vẫn cập nhật scrollTop/updatedAt theo cơ chế sẵn có; kiểm tra đảm bảo chapterId/chIdx đúng, không yêu cầu đóng băng tiến độ cuộn. Chưa nghiệm thu trên tài khoản production/thiết bị vật lý.

Rollback trước phát hành: bỏ nhánh. Sau phát hành cần quyết định riêng; có thể bỏ hook và ba asset mà không xóa key người đọc. Không có thay đổi cloud để rollback.

## Thư viện gọn hơn

Ẩn thông báo tải R2/V49 và thông báo cache thông thường; vẫn hiển thị lỗi quyền, mạng, dữ liệu không đầy đủ cùng nút thử lại. Nút **Cập nhật thư viện** nằm cùng hàng số tác phẩm, vẫn dùng fresh:true và bị vô hiệu hóa khi đang tải. Không thay cache TTL, quota logic, preflight chống trùng hoặc pending. Browser QA kiểm tra callback onState thật, vị trí nút, lỗi quyền còn hiển thị và cập nhật luôn yêu cầu fresh. 86/86 test liên quan PASS ở bản sửa này.
