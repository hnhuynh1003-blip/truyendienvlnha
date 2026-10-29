# DUDU Studio — L2D.2: quản lý EPUB đã xuất bản (bản chờ duyệt Rules)

## Mục tiêu và tình trạng

**Mã nguồn đã chuẩn bị, chưa kích hoạt trên production.** Không có thay đổi nào đã được triển khai lên Firebase Security Rules hay cơ sở dữ liệu thật. `index.html` đặt `EPUB_MANAGEMENT_L2D2_ENABLED=false` để không hiện nút mà server chưa chấp nhận.

Đã bổ sung ở mức mã nguồn:

- Sửa metadata cho EPUB của chính tác giả: `title`, `author`, `genre`, `desc`, `publicationState` (*Đang ra* hoặc *Hoàn thành*), `coverImage` JPEG thu nhỏ.
- Gỡ truyện khỏi Thư viện bằng chuyển `status: published → archived`, không xóa ID, `chapterIndex`, tài liệu chương, nội dung, tiến độ cá nhân.
- Xem danh sách EPUB đã gỡ trong *Góc tác giả* và khôi phục `archived → published` giữ nguyên ID.
- Chỉ nhận tác giả Firebase có custom claim `admin=true` và đúng `ownerUid`; client còn kiểm trước để ẩn công cụ. **Firestore Rules là ranh giới quyền thật**.
- Khi Rules chưa cho phép, tuyệt đối không lưu bản giả lên `localStorage` hoặc coi lỗi `permission-denied` là thành công.

## Hai trường trạng thái khác nhau

- `status`: trạng thái xuất bản nội bộ (`importing`, `draft`, `published`, `archived`). `archived` không nằm trong truy vấn công khai.
- `publicationState`: trạng thái độc giả nhìn thấy (*Đang ra / Hoàn thành*). Nếu chủ truyện đặt sai, chỉnh trường này **không** đổi ID, nội dung hay điều kiện xuất bản.

Truyện EPUB cũ có thể lưu văn án ở một **chương** tên “Văn án”, còn `desc` rỗng. Form sửa để trống `desc` sẽ giữ nguyên; nhập văn án mới sẽ lưu tóm tắt có thể tìm kiếm trong metadata. Không tự sửa hoặc xóa chương “Văn án” cũ.

## Điều kiện trước khi bật nút

1. Chủ dự án sao lưu **bản Rules đang chạy thực tế**, đối chiếu với `security/firestore-spark-personal-v53.rules.review`. Không thay thế Rules toàn dự án bằng bản review cũ.
2. Hợp nhất có chọn lọc `security/firestore-epub-l2d2.rules.review` vào đúng `match /epub_stories_v49/{bookId}`. Đây là **đoạn bổ sung**, không phải tệp rules có thể dán nguyên xi.
3. Chạy Firebase Rules Emulator và kiểm thử quyền: guest/reader/foreign UID, EPUB lịch sử thiếu metadata, chỉnh thông tin hợp lệ/vượt giới hạn, `published ↔ archived`, danh sách theo `ownerUid`, cấm đổi ID/chapterIndex/ownerUid, import → draft → publish vẫn hoạt động.
4. Kiểm thử truy vấn `where('ownerUid','==',uid).limit(60)` theo Rules; xem xét phân trang nếu sau này tác giả có hơn 60 bản nhập.
5. Sau khi backup và chủ dự án phê duyệt, **triển khai Rules production trong thao tác riêng**. Xác minh với tài khoản tác giả thử nghiệm và tài khoản độc giả; không làm các phép ghi thử trên truyện thật.
6. Chỉ sau khi Rules hoạt động đúng, bật `EPUB_MANAGEMENT_L2D2_ENABLED=true`, cập nhật cache key và commit riêng. Lúc đó nút **Sửa thông tin** / **Gỡ khỏi thư viện** trong chi tiết EPUB và **Tác phẩm EPUB đã gỡ** ở Góc tác giả mới xuất hiện.

## Giới hạn cố ý

- Không có xóa vĩnh viễn; không xóa Firestore chapter hay ảnh; không migration, đổi ID hoặc sao chép sang `main_library`.
- Không sửa văn bản từng chương, thứ tự chương hay thêm chương EPUB sau phát hành.
- Không nâng quyền tác giả, không mở viết cho độc giả, không bật Xu/EXP/vật phẩm.
- Không tuyên bố đã chạy Emulator hoặc kiểm thử mobile khi chưa thực hiện.

## Rollback

- Trước khi bật: có thể hoàn tác commit L2D.2, vì không có thay đổi backend hay dữ liệu thật.
- Sau khi bật: tắt gate `EPUB_MANAGEMENT_L2D2_ENABLED=false` để vô hiệu hóa thao tác mới; xem xét rollback riêng đoạn Rules bổ sung **theo bản sao lưu đã đối chiếu**. Không xóa các tài liệu trạng thái `archived` hoặc rewrite bookmark khi rollback.

Tài liệu tham chiếu Firebase: [Rules về trường dữ liệu](https://firebase.google.com/docs/firestore/security/rules-fields), [quyền với truy vấn](https://firebase.google.com/docs/firestore/security/rules-query).
