# DUDU V45 — Kích hoạt bình luận chung testA/testB trên Cloudflare staging

Ngày 17/10/2026. Đây là **thủ tục triển khai thật nhưng chỉ dành cho staging**, yêu cầu tài khoản sở hữu GitHub + Cloudflare + Firebase. Mã nguồn / GitHub Pages **không thể tự bật Worker** khi chỉ push lên main.

## Đã có trong mã nguồn
- Workflow chạy **bằng tay**: `.github/workflows/dudu-pilot-staging-v45.yml`.
- Preflight: `cloudflare/scripts/pilot-activation-v45.mjs`.
- Worker staging hiện hữu: `dudu-ai-staging` tại `https://dudu-ai-staging.dudu-studio-ai.workers.dev`.
- Bật **chỉ** `PILOT_ENABLED=true` và `COMMENTS_ENABLED=true` trong cấu hình **tạm ở GitHub runner**. Không sửa `cloudflare/wrangler.toml` mặc định (luôn OFF).
- `GIFTS_ENABLED`, `GIFT_SETTLEMENT_ENABLED`, `PILOT_SETTLEMENT_ENABLED`, `AI_ENABLED`, `COLLECTIBLES_ENABLED` và tất cả quyền cấp đồ vẫn OFF.
- Người không có JWT đã được Firebase xác thực → 401; UID ngoài allowlist → 403. Mọi người dùng Pilot chỉ tương tác với DO `comments-pilot-v45-...`, không dùng `comments-global-v1`.
- Khi rollback, chọn **disable**, workflow triển khai cấu hình nền: Pilot/bình luận/quà đều OFF. DO test vẫn còn dữ liệu để đối soát, không xóa sổ.

## Việc cần làm MỘT LẦN trên GitHub (KHÔNG gửi secrets vào chat)
1. Vào repository **Settings → Environments → New environment**, đặt tên **`dudu-pilot-staging`**. Có thể thêm **Required reviewers** nếu gói GitHub và quyền quản trị hỗ trợ, để không ai tự bật Pilot khi chưa duyệt.
2. Trong môi trường này, vào **Environment secrets**, nhập:
   - `CLOUDFLARE_API_TOKEN` — API token Cloudflare chỉ đủ quyền triển khai Worker staging và thiết lập secrets.
   - `CLOUDFLARE_ACCOUNT_ID` — ID tài khoản Cloudflare.
   - `PILOT_READER_A_UID` — UID Firebase thật của testA.
   - `PILOT_READER_B_UID` — UID Firebase thật của testB.
   - `PILOT_AUTHOR_UID` — UID Firebase thật của tác giả thử nghiệm.
   - `PILOT_NAMESPACE` — mã vùng riêng, dạng `v45-qa-20261017`. Đổi namespace có nghĩa là tạo sổ thử mới, không tự di chuyển dữ liệu cũ.
3. Lấy ba UID từ Firebase Console → **Authentication → Users**. Mỗi vai phải có **UID khác nhau**. Cùng email hay nhiều phương thức liên kết vào một UID không tạo ra tài khoản khác.
4. Không nhập token Firebase ID, mật khẩu, Cloudflare API token, secret, hay UID thực vào commit, file mẫu, ảnh công khai hay chat. Chỉ nhập vào ô secret của GitHub Environment; workflow không in giá trị ra log.

### Chạy bật Pilot
5. Vào **Actions → DUDU V45 Pilot Staging (Manual Only) → Run workflow**, chọn nhánh **main**.
6. Chọn **operation = enable** và nhập đúng **`ENABLE_V45_SHARED_COMMENTS`** vào trường confirmation.
7. Workflow xác thực tất cả điều kiện, chạy test, đóng gói thử, chuyển bốn secret Firebase/namespace vào Cloudflare qua `wrangler secret bulk`, rồi **chỉ triển khai Worker staging `dudu-ai-staging`** với 2 cờ bình luận/Pilot ON. Nếu thiếu secret, UID trùng, namespace không hợp lệ, không có quyền Cloudflare hoặc lệnh test thất bại, workflow sẽ dừng, không đổi cờ Pilot trên máy chủ.
8. Xem workflow kết thúc **Success**. Bước cuối kiểm tra GET không có token vào `/v1/pilot/status` phải nhận **401**. **401 không chứng minh hai UID thật đã được nhận**; vẫn phải thử đăng nhập và tải bình luận.

### Kiểm thử hai tài khoản
9. Mở `https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=45-2` trên hai trình duyệt hoặc thiết bị **khác phiên**.
10. A và B vào Điện thoại → Phòng Thử Nghiệm → Đăng nhập Google Pilot → Kiểm tra quyền Pilot. Mỗi tài khoản phải hiện đúng Độc giả A/B.
11. **Tác giả Pilot phải có claim Firebase `admin=true` từ nguồn tin cậy** mới có thể chọn Đăng ký phạm vi truyện/chương. Chỉ đặt vai AUTHOR không tự cấp quyền admin. Nếu chưa có admin, việc đăng ký phạm vi sẽ bị 403: đây là khóa bảo vệ có chủ ý, không được sửa client để vượt qua.
12. Từ A/B mở **cùng truyện, cùng chương** và bấm **Tải bình luận chung**. A gửi một tin; B tải lại phải thấy; B trả lời, A tải lại thấy phản hồi. `🔒 Nhật ký bình luận riêng` phía dưới vẫn **không** đồng bộ. Bảo đảm cả hai nhìn chung `storyId/chapterId` đã đăng ký vào staging.
13. Thử một UID thứ tư và tài khoản đã đăng xuất → bị từ chối; thử spam/replay và kiểm tra không phát sinh quà, Xu, tiền hoặc thay đổi truyện thật.

### Tắt khẩn cấp
- Vào cùng workflow → Run workflow → **operation = disable** và confirmation **`DISABLE_V45_SHARED_COMMENTS`**.
- Thao tác này deploy cấu hình mặc định OFF của tất cả tính năng nhạy cảm, không xóa dữ liệu DO. Kiểm tra lại job Success.
- Nếu workflow không thể chạy, đăng nhập Cloudflare Dashboard/CLI để đưa `PILOT_ENABLED` và `COMMENTS_ENABLED` về `false`. Không mở các khóa quà trong quá trình khắc phục.

## Điều gì đã/chưa thực hiện?

**Đã:** mã nguồn UI đọc bình luận chung, API Worker được phân quyền JWT, test với SQLite và UID giả, có workflow bật/tắt thủ công, script kiểm tra sự tồn tại và tính hợp lệ của secret, xử lý rollback.

**Chưa:** nhập 3 UID thật vào GitHub Environments, kích hoạt Cloudflare API token, chạy workflow enable với quyền Cloudflare, hay xác nhận testA/testB đồng bộ bằng hai Firebase ID token thật. Mọi tuyên bố “Worker đã bật” phải dựa vào run triển khai **Success và kiểm thử thực tế**, không chỉ vào GitHub Pages hay CI.

Tham khảo: [Mô tả bình luận chung](DUDU-V45-2-CROSS-ACCOUNT-COMMENTS.md).
