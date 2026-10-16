# DUDU V17 — Xác thực sở hữu khung avatar & đồng bộ lựa chọn (staging, chưa bật)

**Ngày:** 15/10/2026 · **Nhánh:** `feat/identity-npc-editor-v2` · **Trạng thái:** PR Draft, KHÔNG merge/deploy.

## V17 đã đưa vào mã thử nghiệm

- API staging riêng trên Cloudflare Worker: `GET /v1/player-avatar/mine` và `POST /v1/player-avatar/save`. Hai đường dẫn mới dùng cờ `PLAYER_AVATAR_SYNC_ENABLED = "false"` nên **không thể sử dụng trên máy chủ hiện tại**. Các commit GitHub chưa làm đổi Worker đang chạy.
- Mỗi yêu cầu được xác thực bằng Firebase JWT ký RS256, issuer, audience, UID. Server chọn Durable Object bằng **UID đọc từ token đã xác minh**, không tin bất cứ UID nào từ dữ liệu trình duyệt.
- Mỗi tài khoản có một Durable Object SQLite riêng (`DuduPlayerAppearance`) và bản ghi `{revision,kind,presetId,frameId,updatedAt}`. Lưu dùng điều kiện `expectedRevision`; nếu phiên bản cũ thì trả **409 revision-conflict**, không ghi đè thay đổi từ thiết bị khác.
- Server chỉ nhận preset gồm 4 chân dung anime, 60 nữ / 12 nam vector và avatar chữ mặc định. Ảnh tự tải cục bộ, `uploadId`, base64 hoặc URL ảnh không được phép đưa vào cơ sở dữ liệu metadata này. **Ảnh tự upload chưa đồng bộ nhiều thiết bị.**
- Khung `none/moon/violet/sakura/cyber/starlight` dùng chung. Khung `author` chỉ khi Firebase verified token có claim `admin:true`. `legend` và `soulbond` **luôn khóa**, vì chưa có sự kiện/thành tựu quan hệ có chứng cứ hoàn thành từ máy chủ. Client không có API cấp quyền khung cho người khác.
- Thư viện phía frontend `js/player-avatar-sync-v17.js` được thêm ở trạng thái *opt-in, default disabled*, cố định endpoint staging. Chỉ khi được bật hợp lệ nó mới lấy JWT thật từ callback và gọi read/save; không dùng `currentUsername` làm bằng chứng quyền sở hữu, không gửi ảnh hoặc khóa qua localStorage. **Chưa tự nối vào UI V16 để tránh đồng bộ sai lên Worker cũ.**
- Save cũ và V16 IndexedDB/localStorage vẫn giữ nguyên, không có migration, không động chạm hệ thống kỷ vật, thiện cảm, nhiệm vụ hoặc kinh tế.

## Các phần CHƯA thực hiện

1. Chưa tạo Cloudflare R2 bucket, đường tải ảnh, quy trình kiểm định JPEG/WebP/PNG, khử EXIF, quota, phiên bản, xóa ảnh và kiểm duyệt; vì vậy chưa thể quảng bá đồng bộ ảnh tự tải.
2. Chưa bật cờ Worker hoặc chạy thử với hai tài khoản thật; cần review bảo mật, kiểm tra giới hạn/giao dịch và tiền phát sinh trước.
3. Khung sự kiện `legend` và khung tri kỷ `soulbond` chưa có chứng cứ đáng tin cậy từ server. Chỉ khi có sự kiện server xác minh mới bổ sung ledger cấp quyền bất biến và idempotent.
4. Chưa có đồng bộ tự động V16 từ server về thiết bị, giải quyết xung đột trên giao diện hoặc tự di trú lựa chọn cũ. Không được mặc định ghi đè avatar cục bộ khi bật tính năng.

## Quy trình mở sau này (cần duyệt riêng)

- Chuẩn bị Worker staging với cờ OFF, kiểm thử build và JWT với 2 tài khoản; thử tấn công UID khác / giả mạo khung.
- Bật đồng bộ **metadata preset** staging trong thời gian giới hạn, so sánh revision, xử lý 409 mà không mất avatar trên máy cũ.
- Tiếp tục R2 upload riêng, có quota, metadata, phê duyệt nội dung và khôi phục dự phòng. Đánh giá quyền sở hữu khung đặc biệt từ nguồn sự kiện tin cậy.
- Chỉ sau nghiệm thu mới bàn việc merge/deploy sản phẩm thật.

**Không tự ý deploy hoặc gửi hình ảnh người dùng lên máy chủ.**
