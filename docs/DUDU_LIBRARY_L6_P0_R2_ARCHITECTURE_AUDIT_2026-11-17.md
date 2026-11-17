# DUDU STUDIO — LIBRARY L6-P0
## Kiểm toán lưu trữ EPUB và cổng thiết kế R2 (17/11/2026)

**Baseline kiểm toán (main):** a5fbddd9e58043d202208c01d81b74c3536d4a8f
**Kết quả:** hoàn thành khảo sát mã nguồn; chưa đủ điều kiện kích hoạt R2 hoặc thay nguồn đọc EPUB production.
**Thao tác trong giai đoạn này:** chỉ tài liệu kiểm toán. Không ghi Firestore/Firebase Storage/R2, không đổi Rules, không bật Cloudflare feature flag, không di chuyển/xóa sách.
**Nguồn bằng chứng:** file trong repository tại baseline; không có quyền xem dữ liệu, Rules đang chạy, bucket, hóa đơn và token của tài khoản Firebase/Cloudflare thật.

### 1. Sơ đồ dữ liệu và hành vi hiện tại

| Đối tượng | Nơi lưu/đọc trong code | Nguồn bằng chứng | Ghi chú |
|---|---|---|---|
| Truyện Web cũ và chương | Firestore studio_data/main_library, trường novels; snapshot đọc; localStorage my_novels_library_db | index.html:2596, 7021–7065 | Một document chung, có nguy cơ giới hạn kích thước; saveDB chỉ lưu legacy và loại _cloudV49. |
| Truyện EPUB đã nhập V49 | Firestore epub_stories_v49/{bookId} (metadata, status, chapterIndex) | js/epub-production-v49.js:12–16, 93–103, 193–215 | _cloudV49 là thẻ ứng dụng trong danh mục; không nhúng toàn văn chương. |
| Nội dung chương EPUB | Firestore epub_stories_v49/{bookId}/chapters/{chapterId}, trường content | js/epub-production-v49.js:112–136, 216–225; index.html:8571–8642 | Lúc chọn chương mới tải content; giữ trong bộ nhớ đối tượng để tránh tải lại trong phiên. |
| Bản EPUB ZIP nguyên gốc (tùy chọn) | Firebase Storage author_epub_drafts/{uid}/{uuid}.epub | js/epub-import-v48.js:168–191, 325–339 | Nút Storage ẩn trong Spark Personal, luồng khác với xuất bản chương. Giới hạn lưu nguyên gốc hiện 15 MiB. |
| Sandbox | localStorage dudu-sandbox-library | index.html:2565–2567, 2663, 7030–7036 | Không sử dụng làm nguồn production; không được migration nhầm. |
| Tiến trình đọc, bookmark | Local/session/account profile theo adapter hiện tại, giữ storyId/chapterId/chapterIndex và scrollTop | js/library-reading-return-c443.js:9–39; index.html:8610–8665 | Không được đổi ID khi đổi storage. |
| Tên nhân vật / thuật ngữ L5.3–L5.6B | Dữ liệu riêng theo truyện trên trình duyệt; dựng từ nội dung chương hiển thị | js/reader-name-ui-l54.js, js/reader-names-l54.js, js/reader-terms-l56b.js | Không ghi ngược EPUB; phải tiếp tục hoạt động khi backend đổi. |
| Cloudflare Worker | cloudflare/src/index.mjs, wrangler.toml | cloudflare/wrangler.toml:1–94 | Hiện KHÔNG khai báo [[r2_buckets]] cho Library. Mã private R2 avatar (AVATAR_R2_ENABLED=false) không phải kho EPUB. |

### 2. Ràng buộc đang có

1. EPUB import V57 hiện giới hạn file đầu vào 30 MiB, tổng giải nén 80 MiB, tối đa 3.000 ZIP entries, tối đa 160 spine items và 4.500.000 ký tự; nội dung từng chương tối đa 220.000 ký tự hoặc 420.000 byte UTF-8. Không tự nới giới hạn lúc chuyển sang R2. Xem js/epub-import-v48.js và js/epub-production-v49.js.
2. Luồng tác giả importDraft -> importing -> draft -> publishDraft -> published; publishDraft kiểm tra các chapter document Firestore thực sự tồn tại. Resume kiểm tra UID, thứ tự, vân tay nội dung và không ghi đè chapter đã có. Không thể thay bằng object R2 một cách âm thầm mà vẫn giữ các bất biến này.
3. index.html:2673–2674 đã bật EPUB_MANAGEMENT_L2D2_ENABLED=true và EPUB_CHAPTER_TOOLS_L2D5_ENABLED=true. Một số tài liệu L2D.* cũ ghi OFF là trạng thái cũ; phải dùng mã main mới nhất và xác minh Rules sống trước khi chỉnh sửa/xóa.
4. firestore.rules trên repository tự ghi rõ là REVIEW CANDIDATE / NOT DEPLOYED (dòng 1–6). File này KHÔNG chứng minh Rules đang chạy. firebase.json tại baseline chỉ khai báo functions, không phải bằng chứng triển khai Firestore/Storage Rules.
5. Bản Rules ứng viên (firestore.rules:224–259, 327–347) chỉ chấp nhận danh sách trường cụ thể và bắt buộc chapter.content (nonempty). Muốn dùng R2 chapter pointer, cần migration schema + Rules mới, Emulator tests và phê duyệt riêng. Không thể chỉ thêm storageBackend/key vào document cũ.
6. Vấn đề phân quyền trọng yếu: Rules ứng viên cho phép đọc metadata và nội dung chương khi status=published, kể cả không đăng nhập (firestore.rules:304–315, 411–420), trong khi index.html:2574 đặt DUDU_ACCOUNT_APPROVAL_V1_READY=false. Đây là quan sát về MÃ, không phải xác nhận quyền đọc thực tế ở Firebase. Trước bất kỳ xuất bản R2 nào cần quyết định rõ guest/reader/invite/owner và xác minh Rules đang chạy.
7. R2 chưa có bucket/binding cho EPUB trong repository; Cloudflare account, subscription, billing, quotas, secrets và live Worker deployment chưa được kiểm chứng. Không phát sinh R2 chỉ vì repo có mã avatar quarantine.
8. Legacy Web dùng một Firestore document lớn; chuyển riêng EPUB sang R2 không tự chữa vấn đề legacy document 1 MiB. Đây là hạng mục kiến trúc độc lập.

### 3. Phương án kiến trúc khuyến nghị

**Giữ Firestore làm nơi xác nhận identity/status/metadata và giữ nguyên IDs. Chỉ sử dụng R2 làm kho byte lớn, qua API Cloudflare Worker kiểm tra quyền.**

- L6-P1 (offline, chưa cấp bucket): dựng contract cho backend đọc và adapter với mặc định Firestore, R2 chỉ mock; cờ LIBRARY_R2_ENABLED=false; không đổi index.html reader nếu chưa có kiểm thử Web/EPUB/Android tương đương. Không đưa secrets hay bucket name production vào GitHub.
- L6-P2 (cần chủ dự án duyệt tài khoản/chi phí): bucket R2 PRIVATE riêng cho bản EPUB nguồn, upload tùy chọn theo UID đã xác minh, khóa object do server sinh, giới hạn byte, xác minh loại tệp, đối chiếu SHA-256, idempotency, retry an toàn và xóa có quy trình. Không lộ key hoặc URL công khai và không thay nguồn đọc chương hiện tại.
- L6-P3 (một release được duyệt riêng): hỗ trợ chapter object R2 qua manifest/pointer và version mới. Ưu tiên append/dual-write hoặc migrate có staging, kiểm tra hash từng chương, xác nhận reader trả đúng nội dung/tiêu đề/bộ ký tự; đặt cutover có rollback về Firestore. Không xóa Firestore chapter khi chuyển cách đọc. Cần Firestore schema/Rules được test và công bố theo kế hoạch, không sửa Rules trực tiếp trong P0.
- L6.1 (sau backup + nghiệm thu): chỉ cân nhắc dọn bản cũ khi có danh mục kiểm kê, đối chiếu digest, hai đường khôi phục và quyết định riêng. Không có thao tác xóa tự động khi upload hoặc archive.

**Gợi ý khóa object (chưa triển khai):** originals/{verifiedOwnerUid}/{opaqueUUID}.epub cho bản nguyên gốc; chapters/{opaqueBookId}/{immutableRevisionId}/{opaqueChapterId}.txt cho văn bản chương. UID/đường dẫn từ client không được dùng làm bằng chứng cấp quyền. BookId/ChapterId và thứ tự chương ở metadata gốc không đổi.

### 4. Bảo mật và quyền truy cập bắt buộc

- Cloudflare Worker có thể tái sử dụng trình kiểm tra Firebase ID Token ở cloudflare/src/auth.mjs, nhưng phải tự kiểm tra owner/author/published/entitlement với nguồn trạng thái đáng tin; JWT chỉ xác minh danh tính, không đủ để chứng minh quyền đọc bản nháp hay chương hạn chế.
- CORS và danh sách origin chỉ là bảo vệ trình duyệt, KHÔNG thay authorization; không public bucket và không cho browser gọi trực tiếp một API Worker có thể GET/PUT/DELETE arbitrary object keys.
- Duy trì phân biệt published / draft / importing / archived / deleting. Metadata publish phải luôn là sự kiện sau cùng khi tất cả các object đã lưu và đối chiếu thành công.
- Không dùng localStorage, EXP, Xu, profile client hoặc việc biết URL để cấp quyền cho nội dung hạn chế. Rate limit, content-size limit, private Cache-Control, access logging tối thiểu và kiểm thử chéo UID là bắt buộc cho bước thật.
- Quy trình purge Firestore hiện ở js/epub-production-v49.js:306–365 chỉ dọn subcollection rồi xóa parent sau trạng thái deleting; R2 tương lai không được tự xóa song song và tạo trường hợp không thể phục hồi.

### 5. Cổng nghiệm thu trước khi đụng cloud

- [ ] Đối soát *deployed* Firestore và Storage Rules với bản lưu, kiểm tra admin claim, guest/reader/tác giả khác, published/draft/archived. Không suy từ GitHub CI.
- [ ] Kiểm kê dữ liệu thật (số truyện/chương, bytes, file lớn nhất, ảnh, sách đã archive, object Storage đang có) theo READ-ONLY; đối soát backup/restore. Chưa có số liệu thật trong P0.
- [ ] Xác nhận trạng thái Cloudflare R2 subscription, hạn mức, cảnh báo chi phí và tài khoản chi trả với chủ dự án; không đăng ký dịch vụ có chi phí trong phiên audit.
- [ ] Chạy Firestore Emulator + R2 mock: từ chối sai owner, draft/archived, truy cập không đăng nhập, quyền đang đổi, ID path traversal, upload quá dung lượng, replay, offline/retry, thiếu object, dữ liệu sai hash, lỗi rollback.
- [ ] Giữ nguyên toàn bộ regression Library (reader Web/EPUB, 160 chapters, bookmark/scroll, native selection, L5.3–L5.6B), chạy mobile 320/390/430px; nghiệm thu Android thật trước phát hành backend.
- [ ] Test import và đối chiếu ít nhất 1 EPUB2 và 1 EPUB3 có quyền sử dụng; file lớn, Unicode tiếng Việt/NFD, bìa, nhiều line breaks, chương dài và bản nháp gián đoạn.
- [ ] Chỉ sau khi có nghiệm thu P1/P2: đề xuất riêng thao tác tạo bucket, binding, secrets, sửa Rules và migration; không thực hiện ngầm.

### 6. Chi phí và điều chưa xác minh

Tài liệu Cloudflare hiện hành cho R2 Standard nêu phần sử dụng miễn phí theo tháng gồm 10 GB-month lưu trữ, 1 triệu Class A operations và 10 triệu Class B operations; egress R2 không thu phí. Đây không phải cam kết tài khoản DUDU đang có quyền truy cập hoặc hóa đơn bằng 0. Việc tạo R2 cần Cloudflare account có R2 subscription; chi phí Workers, các vượt ngưỡng và yêu cầu tài khoản cần kiểm tra độc lập.
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/workers-api/
- https://developers.cloudflare.com/r2/get-started/

**Quyết định P0:** giữ nguyên Firestore và tất cả chương đã xuất bản. L6-P1 là bước code kế tiếp có thể thực hiện trực tiếp trên main bằng mock/offline, mặc định OFF. L6-P2/P3 cần duyệt riêng trước khi sử dụng dịch vụ R2 thật, thay Rules, xuất bản dữ liệu hoặc xóa bất kỳ bản nào.
