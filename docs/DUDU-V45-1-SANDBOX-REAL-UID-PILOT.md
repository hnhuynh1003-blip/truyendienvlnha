# DUDU Studio V45.1 — Pilot Firebase thật trong Sandbox cách ly

Ngày: **17/10/2026** · Mã nguồn: **GitHub main** · Worker: **chưa deploy các thay đổi V45.0/45.1**.

## Phân biệt hai phòng thử
- **Phần trên (V44.5):** giả lập A/B/Tác giả dùng `localStorage` riêng. Không đăng nhập Firebase, không tác động tài khoản thật.
- **Phần dưới (V45.1):** một bảng Pilot trong **cùng Phòng Thử Nghiệm** có thể đăng nhập Google thật trên một **Firebase Auth app đặt tên riêng** (`dudu-v451-pilot-auth`, phiên dạng SESSION), sau đó gọi Worker staging **chỉ khi người dùng bấm nút**. Không khởi tạo phiên Auth khi chỉ mở tab; không tải hồ sơ `profiles_v2`, không gọi Firebase Firestore, không thay đổi hồ sơ/Kho/Xu.
- Worker chỉ chấp nhận 3 UID đã được cấu hình phía server; UID khác bị từ chối. Tên A/B/Tác giả giả lập không cấp quyền. Giữ `PILOT_SETTLEMENT_ENABLED=false` không cho tặng/chuyển đồ.

## Thao tác kiểm thử trên trình duyệt
1. Mở GitHub Pages bằng `?sandbox=1&v=45-1`; chờ Pages triển khai bản đã qua CI.
2. Mở **Điện thoại → Phòng Thử Nghiệm**. Phần **PILOT V45.1 · STAGING** nằm bên dưới mô phỏng V44.5.
3. Bấm **Đăng nhập Google Pilot**. Đây là Firebase Auth phiên độc lập, chỉ nên dùng tài khoản kiểm thử; không tự đổi tài khoản đăng nhập của DUDU chính.
4. Bấm **Kiểm tra quyền Pilot**. Nếu Worker chưa deploy hoặc `PILOT_ENABLED=false`, sẽ có thông báo Pilot chưa mở: **đây là trạng thái đúng hiện tại**.
5. Khi staging đã bật và UID thuộc danh sách ba tài khoản, màn hình hiển thị vai được server xác nhận. Nhập `storyId`, `chapterId` đã đăng ký trên staging; bấm **Đọc bình luận staging**.
6. Gửi một bình luận thử bằng A, dùng trình duyệt/thiết bị khác đăng nhập B rồi tải bình luận. Kiểm tra B xem được tin A, không xem dữ liệu production; sau đó đổi tài khoản C ngoài allowlist phải bị từ chối.
7. Bấm **Đăng xuất Pilot**. Phòng thử giả lập V44.5, tài khoản DUDU và kho/xu thật không thay đổi.

### Những mã lỗi dự kiến
| Mã | Ý nghĩa |
|---|---|
| `pilot-disabled` | Chưa bật `PILOT_ENABLED` trên staging |
| `pilot-config-incomplete` | Thiếu ba UID khác nhau hoặc namespace riêng |
| `pilot-forbidden` | UID không nằm trong ba UID kiểm thử |
| `unauthenticated` | JWT không hợp lệ hoặc chưa đăng nhập |
| `pilot-check-required` | Chưa kiểm tra quyền trên Pilot |
| `unknown-scope` | Truyện/chương chưa được quản trị viên đăng ký vào sổ bình luận staging |
| `cooldown` / `daily-limit` | Chống spam bình luận phía server |
| `gift-settlement-disabled` | Gửi/quyết định quà thật vẫn khóa |

## Backend: cần triển khai *riêng* và có điều kiện
Các biến `PILOT_ENABLED`, `COMMENTS_ENABLED`, `GIFTS_ENABLED` và **hai khóa chuyển sở hữu quà** vẫn mặc định OFF trong `cloudflare/wrangler.toml`. Để thử đăng nhập, chỉ nên bật `PILOT_ENABLED` với ba UID Firebase thật, một `PILOT_NAMESPACE` dạng `v45-...`; để thử bình luận sau khi qua preflight mới mở `COMMENTS_ENABLED` và đăng ký truyện/chương mẫu qua endpoint quản trị yêu cầu claim admin được Firebase xác thực. Không dùng role 'AUTHOR' client để tự cấp quyền đăng ký truyện.

Dùng **Worker staging hiện tại đã sao lưu** và bí mật Cloudflare; không ghi UID thật lên repo, ảnh chụp màn hình, tài liệu, console log hoặc URL. **Không bật** `GIFTS_ENABLED`, `GIFT_SETTLEMENT_ENABLED` hay `PILOT_SETTLEMENT_ENABLED` cho V45.1. Việc đổi `?sandbox=1` chỉ điều khiển giao diện web, **không** thay đổi quyền hoặc storage của Worker.

Thử nghiệm đa tài khoản phải dùng ba **UID Firebase phân biệt**; việc liên kết Google/Email vào một UID vẫn chỉ là một tài khoản. Tốt nhất dùng trình duyệt riêng, cửa sổ ẩn danh hoặc thiết bị khác cho A/B.

## Tiêu chí nghiệm thu V45.1
- [x] Mã nguồn JS Pilot riêng có test không đọc/ghi `userProfile` hoặc Firestore.
- [x] Mã nguồn Worker xác thực UID, allowlist và giữ sổ bình luận Pilot riêng; quà thật bị khóa riêng.
- [x] Có test HTTP Worker + SQLite real trong Node, với UID stub A/B/author và namespace riêng.
- [ ] 3 UID Firebase *thật* truy cập qua Worker staging đã deploy.
- [ ] Kiểm chứng token thật (JWT, thu hồi quyền, hết hạn, đăng xuất, account switch).
- [ ] QA Chromium trên mã mới nhất; kiểm thử Android và Safari iOS thật.
- [ ] Admin đăng ký scope truyện/chương mẫu, A/B gửi và nhận, xác minh không rò sang dữ liệu chính.
- [ ] Ảnh chụp lỗi và biên bản đối chiếu thời gian/thiết bị, kế hoạch rollback.

Mọi thử nghiệm mã nguồn chỉ tạo bộ dữ liệu **giả lập trong CI**, không phải bằng chứng Firebase hay Cloudflare staging thật đã vận hành. **V45.1 chưa nghiệm thu live, chưa chuyển sang V45.2.**

## Lệnh chạy trong repo
```bash
node --test tests/pilot-client-v45-1.test.cjs
node --test cloudflare/tests/pilot-policy-v45.test.mjs cloudflare/tests/pilot-router-v45.test.mjs cloudflare/tests/pilot-discussion-integration-v45-1.test.mjs
```
CI mặc định cũng chạy `node --test tests/*.test.cjs`, `npm test --prefix cloudflare`, đóng gói thử Wrangler và Chromium browser-smoke.

Liên quan: [V45.0 staging preflight](DUDU-V45-PILOT-STAGING-PREFLIGHT.md).
