# DUDU Studio V45.0 — Tiền kiểm Pilot ba tài khoản Firebase

Ngày: 17/10/2026 · Repository: `hnhuynh1003-blip/truyendienvlnha` · Nhánh: `main`

## Kết luận hiện tại
**Đã đưa lớp bảo vệ và API kiểm tra trạng thái vào mã Worker trên main. CHƯA DEPLOY Worker, CHƯA bật Pilot, CHƯA kiểm chứng ba UID thật và CHƯA chuyển vật phẩm liên tài khoản.** Các khóa trong `cloudflare/wrangler.toml` mặc định OFF. GitHub Pages có thể tự xuất bản HTML/JS từ main, nhưng điều đó không tự triển khai Worker hay kích hoạt Pilot.

V45.0 không tạo một website nháp mới; website chính có thể giữ màn hình Sandbox mô phỏng. Pilot thật phải sử dụng **Firebase ID token được Worker xác thực**, không phải `?sandbox=1`, tên hiển thị, `role` trong hồ sơ hay nút đổi vai A/B/AUTHOR.

## Cơ chế bảo vệ đã triển khai
1. `pilot-policy-v45.mjs` yêu cầu đồng thời `PILOT_ENABLED='true'`, ba **UID Firebase riêng biệt** của Độc giả A/Độc giả B/Tác giả và `PILOT_NAMESPACE` hợp lệ bắt đầu bằng `v45-`. Không có đủ cấu hình → HTTP 503, tài khoản ngoài danh sách → 403.
2. UID lấy từ `verifyFirebaseIdToken` sau kiểm chữ ký/claim. Dữ liệu JSON, query string, tên nhân vật và biến trình duyệt không được phép gán vai.
3. Bình luận Pilot dùng Durable Object `comments-pilot-${namespace}`, quà dùng `gift-pilot-${namespace}`. **Không** dùng `comments-global-v1` hoặc `gift-global-v1`.
4. Tất cả API bình luận Pilot, kể cả `GET /v1/comments/list`, đều yêu cầu UID đăng nhập thuộc allowlist. Route kiểm duyệt còn yêu cầu claim `admin` đã xác thực.
5. `GET /v1/pilot/status` chỉ trả về vai của người gọi, khả năng cách ly lưu trữ và **trạng thái các khóa**, không trả danh sách UID hay token. Không ghi dữ liệu.
6. `PILOT_SETTLEMENT_ENABLED='false'` là khóa thứ hai cho `/v1/gifts/send` và `/v1/gifts/decide`. Nếu chưa qua cả `GIFT_SETTLEMENT_ENABLED` và `PILOT_SETTLEMENT_ENABLED`, không xử lý giao dịch quà.
7. Các cờ `COMMENTS_ENABLED`, `GIFTS_ENABLED`, `GIFT_SETTLEMENT_ENABLED` vẫn mặc định `false`. Việc đổi cờ không thay thế trusted issuer, author registry hoặc outbox/saga.

## Dữ liệu cần chuẩn bị riêng trong staging (không đưa lên GitHub hoặc chat)
- Ba **UID Firebase** lấy từ Authentication → Users. Bảo đảm có ba Firebase UID khác nhau; liên kết Google/nhà cung cấp khác vào cùng một UID không được xem là ba tài khoản độc lập.
- Ba bí mật Worker: `PILOT_READER_A_UID`, `PILOT_READER_B_UID`, `PILOT_AUTHOR_UID`. Không lưu trong `wrangler.toml` công khai.
- `PILOT_NAMESPACE` riêng (ví dụ dạng `v45-qa-20261017`), không trùng không gian lưu trữ từng thử nghiệm đã chạy.
- Sao lưu phiên bản và thiết lập Worker hiện tại trước mọi thao tác deploy.

Các câu lệnh tham khảo **chỉ dùng sau khi sẵn sàng cấu hình staging**, trong thư mục `cloudflare/`:
```bash
npx wrangler secret put PILOT_READER_A_UID
npx wrangler secret put PILOT_READER_B_UID
npx wrangler secret put PILOT_AUTHOR_UID
npx wrangler secret put PILOT_NAMESPACE
npm test
npm run build
```
Nhập từng UID vào prompt bí mật của Wrangler, không ghi vào commit, console log hoặc tệp test. `PILOT_ENABLED` phải được mở có chủ đích bằng cấu hình staging sau khi kiểm tra đầy đủ, không được tự chuyển giá trị do query string.

## Ma trận kiểm tra dự kiến sau khi deploy staging
| Trường hợp | Kết quả bắt buộc |
|---|---|
| Chưa bật `PILOT_ENABLED` | 503, không truy cập DO Pilot |
| Thiếu 1 UID/UID trùng/namespace không hợp lệ | 503, không truy cập DO |
| Không có JWT hoặc JWT sai | 401 |
| UID ngoài allowlist tự ghi `isAdmin`/AUTHOR | 403 |
| Ba JWT thật của A, B, AUTHOR | Trạng thái `GET /v1/pilot/status` nhận đúng vai, không lộ UID khác |
| A/B đọc bình luận cùng scope đã đăng ký | Nhìn bản ghi chung trong DO Pilot, không đọc dữ liệu toàn cục |
| Account không nằm trong Pilot đọc bình luận | 403 (kể cả GET) |
| A thử giả UID B khi bình luận | Bị bỏ qua trường giả mạo/từ chối payload lạ |
| B gửi quà khi settlement còn OFF | 503, không khóa/trừ món |
| Thử dùng URL web chính hoặc `?sandbox=1` để leo quyền | Không có tác dụng, chỉ JWT/allowlist |
| Bị ngắt mạng, retry, đổi chủ truyện đang pending | Chưa đủ điều kiện thử chuyển thật, cần Saga và Registry đáng tin cậy |

## Cổng chuyển V45.1 → V45.2
**V45.1:** nghiệm thu staging với ba JWT thật, đọc/viết bình luận bằng dữ liệu thử, báo cáo/quản trị, kiểm tra Android/iOS, giữ quà settlement OFF.

**V45.2 (chưa kích hoạt):** hoàn tất issuer cấp instance server-verified, owner registry theo truyện/chương, transactional outbox/saga liên kết comment–gift, đối soát và test race/revoke/rollback. Tuyệt đối không nhập kho `localStorage` làm chứng cứ sở hữu.

## Rollback/kill switch
Khi có lỗi hoặc phát hiện nguy cơ: đưa `PILOT_ENABLED` về `false`, `COMMENTS_ENABLED` và `GIFTS_ENABLED` về `false`; giữ `GIFT_SETTLEMENT_ENABLED` và `PILOT_SETTLEMENT_ENABLED` là `false`. Triển khai lại cấu hình staging. **Không xóa dữ liệu sản xuất**, không dọn các DO toàn cục, không sửa `Firestore Rules` chỉ để thử nghiệm.

## Kiểm thử mã nguồn V45.0
- `cloudflare/tests/pilot-policy-v45.test.mjs`: mẫu UID giả, cấu hình thiếu/trùng, phân vai, tên DO tách biệt và trạng thái mặc định OFF.
- `cloudflare/tests/pilot-router-v45.test.mjs`: thực thi đường đi Worker với JWT và Durable Object **giả lập**; chặn request trái phép trước khi đụng storage, endpoint preflight và khóa settlement.
- Các bộ `cloudflare/tests/*.test.mjs` hiện có tiếp tục là chuẩn kiểm thử, `.github/workflows/phase1-smoke.yml` chạy tự động `npm test --prefix cloudflare` và `wrangler deploy --dry-run` khi push main.

Không được coi unit/route tests giả lập là bằng chứng đã kiểm thử Firebase thật, Cloudflare live hoặc tính nguyên tử xuyên hai Durable Object.
