# V47 — kiểm thử Firebase thật trên staging, KHÔNG phải phát hành production

## Phạm vi
- V46 đã được người dùng nghiệm thu; testA/testB/ AUTHOR trong `?sandbox=1` vẫn là các vai ảo, lưu vào `dudu-sandbox-shared-discussion-v1`.
- V47 chỉ được bật **trên giao diện** bằng URL `?sandbox=1&pilot=1&v=47-1`. Điều này mở bảng bình luận Pilot và phần đăng nhập Google/Email-Password Pilot trong **Điện thoại → Phòng Thử Nghiệm**.
- `?sandbox=1` không có `pilot=1` giữ đúng V46 (không gọi API bình luận staging); trang sản phẩm thường không hiển thị công cụ Pilot.
- V47 UI chỉ cho phép người kiểm thử chủ động đăng nhập. Nạp trang không tự đăng nhập và không tự gửi bình luận. Firebase Auth dùng app phụ `dudu-v451-pilot-auth`, lưu phiên `SESSION`. Mật khẩu không được lưu vào bộ nhớ ứng dụng, localStorage hoặc Worker.

## Các bước chưa được hoàn tất bởi commit GitHub
1. **Xác định ba Firebase Authentication UID thật, khác nhau**, gồm `READER_A`, `READER_B`, `AUTHOR`. Tài khoản ảo testA/testB không có UID Firebase. Số lượng người dùng xuất hiện trên Firebase Console trước đây là hai; phải xác nhận hiện trạng mới. Có thể tạo tài khoản thử Email/Password từ Firebase Console nếu nhà cung cấp Email/Password đã bật, hoặc sử dụng ba Google accounts. Không dùng tài khoản Google chủ sở hữu cho READER_A/READER_B nếu không cần.
2. **Quyền quản trị**: thao tác đăng ký truyện/chương và kiểm duyệt trên Worker yêu cầu **Firebase custom claim `admin=true` từ nguồn đáng tin cậy** cho UID AUTHOR; việc có vai AUTHOR hoặc sở hữu Firebase Console **không tự cấp claim**. Không chỉnh mã trình duyệt để vượt kiểm tra; nếu chưa có claim, tạm dừng thử bình luận tới khi có cách cấp quyền qua quản trị an toàn.
3. Trong GitHub `Settings → Environments → dudu-pilot-staging`, tạo `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PILOT_READER_A_UID`, `PILOT_READER_B_UID`, `PILOT_AUTHOR_UID`, `PILOT_NAMESPACE`. Ba UID khác nhau. Namespace mới ví dụ `v45-qa-20261017`; do giao thức Worker dùng schema v45, tiền tố đó vẫn phải giữ, dù frontend gọi là V47.
4. Chỉ khi có đủ khóa và muốn bật staging, vào GitHub Actions → `DUDU V45 Pilot Staging (Manual Only)`, chọn `enable` và confirmation `ENABLE_V45_SHARED_COMMENTS`. Không chạy deploy lên Worker production. **Không nhập secrets vào commit, issue, chat hay ảnh.**
5. Khi workflow báo Success, kiểm tra từ hai trình duyệt có Firebase Auth session khác nhau bằng `?sandbox=1&pilot=1&v=47-1`. Đăng nhập riêng trong điện thoại → Kiểm tra quyền Pilot; tác giả có `admin=true` đăng ký scope truyện/chương, A đăng bình luận, B tải thấy, B phản hồi, A thấy, thử báo cáo/ẩn, chống spam, đăng xuất, UID ngoài allowlist bị 403.
6. Sau nghiệm thu, chạy **disable** trên cùng workflow, confirmation `DISABLE_V45_SHARED_COMMENTS`; xác nhận Worker trở về OFF, giữ dữ liệu riêng trong Durable Object của namespace. **Không sử dụng chức năng phát hành/quà thật**.

## Bảo đảm kỹ thuật / giới hạn
- Chỉ `PILOT_ENABLED` và `COMMENTS_ENABLED` được phép ON ở **staging**. Cờ quà/chuyển Xu/chuyển đồ/AI/collectibles ở OFF.
- Trang GitHub Pages vẫn là host ứng dụng chung; `sandbox=1&pilot=1` chỉ bật **giao diện** thử nghiệm, không tạo môi trường web riêng biệt. Cách ly dữ liệu được thực thi bằng auth UID allowlist và namespace Durable Object phía staging.
- UI đơn thuần không thể xác nhận Worker đã bật hay Firebase UID đã được cấp quyền. Cần workflow thành công + thử nghiệm thực tế.
- Đăng nhập Firebase Authentication bằng Email/Password chỉ gửi mật khẩu cho Firebase SDK. Không chia sẻ mật khẩu hoặc JWT.
- Cần phân biệt **2 cách đăng nhập**: đăng nhập Google Console/CLI với tư cách chủ dự án và Firebase Authentication của người dùng cuối qua ứng dụng. Hai loại phiên không tự dùng chung.
- Trạng thái hiện tại: chỉ hoàn tất phần code và test; chưa được xác nhận ba UID, JWT admin, environment secrets, hoặc enable staging.

Liên quan: [Quy trình kích hoạt staging](DUDU-V45-PILOT-STAGING-ACTIVATION.md).
