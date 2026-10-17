# DUDU Studio — V45.1 R2: Mô phỏng nhiều UID + tích hợp bình luận Pilot

Ngày: 17/10/2026 · Nhánh chính: `main` · Chỉ triển khai mã web; Worker **chưa được redeploy**, staging **chưa cấu hình UID thật**, các cờ backend vẫn OFF.

## Đợt R2 có gì mới?

1. **Độc giả A/B** có thể đọc/gửi bình luận bằng API staging, **trả lời** bình luận gốc và **báo cáo** Spam/Lộ nội dung/Quấy rối/Khác.
2. **Thông báo phản hồi** và nút đánh dấu đã đọc truy xuất theo Firebase UID đã được Worker kiểm chữ ký, không nhận UID người đọc từ trình duyệt.
3. **Quản trị riêng của Pilot:** sau khi Worker preflight trả `canManagePilot=true`, giao diện mới hiện đăng ký scope truyện/chương test, danh sách báo cáo, ẩn/hiện bình luận. Worker chỉ cấp capability nếu **đồng thời** có UID nằm ở vai `AUTHOR` trong allowlist Pilot và token Firebase có claim `admin=true`. Đây **không phải** xác nhận sở hữu truyện của bản chính.
4. **Chống giả tên:** người gửi không thể dùng trường `displayName` để nhận tên “Tác giả”; Worker tự lấy nhãn `Độc giả A / Độc giả B / Tác giả (Pilot)` từ danh tính Firebase đã xác thực.
5. **Chống nhầm phiên:** yêu cầu đang bay phải bị bỏ kết quả nếu người dùng đăng xuất, đổi Firebase UID, hoặc khi một lần kiểm tra Pilot mới thay thế phiên cũ. Nếu server trả 401/403, quyền tạm được thu hồi trong client.
6. **Không chạm dữ liệu thật:** phiên Auth Firebase phụ, thời hạn SESSION; không sử dụng `userProfile`, Firestore, Xu, Kho hay đường dẫn chuyển quà. Không có login tự động khi chỉ mở điện thoại. Dữ liệu của Phòng Thử V44.5 vẫn là riêng biệt.
7. **Trạng thái chuyển vật phẩm:** Worker trả `settlement=true` khi **cả** `GIFT_SETTLEMENT_ENABLED` và `PILOT_SETTLEMENT_ENABLED` đều là `true`; hai khóa vẫn giữ OFF.

## Hướng dẫn chạy thử bằng giao diện

Mở <https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=45-1-r2> sau khi GitHub Pages triển khai thành công. Vào **Điện thoại → Phòng Thử Nghiệm** → cuộn xuống **PILOT V45.1 · STAGING**.

- **Chưa có Worker staging cấu hình ba UID**: bấm nút Kiểm tra quyền sau khi login sẽ hiện `pilot-disabled` hoặc `pilot-config-incomplete`. Đây là kết quả **đúng**, không phải lỗi UI.
- Khi triển khai Worker staging có 3 UID thật (khác nhau) và namespace thử riêng: A/B đăng nhập Google qua 2 trình duyệt riêng; ADMIN Pilot có JWT claim admin và là vai AUTHOR thì mới có quyền tạo `storyId`, danh sách `chapterIds`. Mọi bước chỉ cấp scope **trong DO Pilot**, không sửa dữ liệu truyện thật.
- A đăng bình luận, B bấm **Đọc bình luận staging** → **Trả lời**, A bấm **Thông báo trả lời** rồi **Đánh dấu đã đọc**.
- A báo cáo lời nhắn của B, tài khoản Pilot tác giả có JWT admin bấm **Xem báo cáo cần kiểm duyệt** → Ẩn bình luận → B/A đọc lại.
- Thử C không thuộc allowlist phải bị 403. Khi đang gửi yêu cầu, đổi tài khoản hoặc đăng xuất phải không để phản hồi cũ xuất hiện trên phiên mới.
- Luôn để các cờ `GIFTS_ENABLED`, `GIFT_SETTLEMENT_ENABLED` và `PILOT_SETTLEMENT_ENABLED` **false**.

**Ghi nhớ:** Google Account khác không đồng nghĩa Firebase UID khác nếu đã liên kết nhiều phương thức vào một user. Cần ba UID riêng trong Firebase Authentication. Chỉ dùng dữ liệu và tên truyện giả ở staging. Tránh đăng UID đầy đủ hoặc token lên GitHub, bản ghi log và chat.

## Phần được thử bằng CI

- `tests/pilot-client-v45-1.test.cjs`: riêng biệt Auth app, không tự khởi tạo, đăng nhập/chặn trước preflight, từ chối tuyến và metadata giả mạo.
- `tests/pilot-extended-v45-1.test.cjs`: reply/report, hộp thư và đánh dấu đọc, chặn giả uid/đồ, khóa quản trị, chặn thay phiên khi mạng đang chờ và thu hồi quyền 403.
- `cloudflare/tests/pilot-discussion-integration-v45-1.test.mjs`: Worker HTTP xử lý A/B/Tác giả với **SQLite thực trong Node** (Firebase token **giả lập**, không phải token thật); chặn UID ngoài danh sách, inbox UID A, báo cáo, ký nhận quản trị, ẩn/hiện bình luận và vùng namespace cách ly; kiểm tra giả tên tác giả.
- `tests/browser-smoke.cjs`: Chromium phải lắp giao diện Pilot trong Sandbox nhưng không tự tạo phiên Firebase và không ghi dữ liệu production.
- `.github/workflows/phase1-smoke.yml`: `node --test` toàn bộ test JS + Cloudflare, Wrangler dry-run và Chromium. GitHub Pages có workflow riêng.

## Chưa nghiệm thu

- Worker staging chưa redeploy, allowlist ba UID thật chưa nhập; chưa có network E2E với JWT Google/Firebase thật.
- Safari iOS/Android ngoài đời, xác thực quyền tác giả dựa trên registry production, giao dịch quà server-to-server, thông báo tự đẩy và liên kết vật phẩm với bình luận chưa qua kiểm tra thật.
- **R2 vẫn là Sandbox**. Không bật production hoặc cấp tiền/vật phẩm/trạng thái sở hữu cho người đọc.

Tham khảo: [Hướng dẫn V45.1](DUDU-V45-1-SANDBOX-REAL-UID-PILOT.md), [Cổng staging V45.0](DUDU-V45-PILOT-STAGING-PREFLIGHT.md).
