# DUDU Arcade C4.37 — Hành Trình Của Tôi

Ngày triển khai: 01/11/2026. Nền mã: `main` sau C4.36V3 (`a0302fa`).

## Phạm vi

- Sổ Vinh Danh → **Thử thách** có bảng **Hành Trình Của Tôi** ở đầu danh sách.
- Ghim/bỏ ghim tối đa **ba trong bốn hành trình** Trạm Neon, Địa Tầng 07, Vườn Sương, Ngọc Phường; không tự chọn thay người chơi.
- Mỗi hành trình theo dõi hiển thị tiến độ, mốc tiếp theo (ẩn tên và con số với mốc bí mật), nút xem mốc và nút vào thẳng game tương ứng.
- Trên danh sách bốn hành trình có nút theo dõi; khi đủ ba, không tự thay hành trình cũ.
- Giao diện điện thoại 320–390px, trạng thái trống rõ ràng, thông báo trong bảng thay vì popup.

## Lưu dữ liệu và giới hạn quyền

- Sử dụng tùy chọn thiết bị riêng: `dudu-arcade-journey-c437:v1:<encoded owner>` với `owner=uid:<Firebase UID>` hoặc `sandbox:<sandbox username>`.
- Phiên bản dữ liệu `1`; chỉ bốn ID hợp lệ, loại trùng, giới hạn ba, từ chối dữ liệu khác chủ tài khoản hoặc sai định dạng.
- Không ghi vào `profiles_v2`, `honorV1` hoặc tiến trình Arcade `dudu-personal-arcade:v1:*`. Không đụng tới sách, EPUB, Rules, ví Xu và kho vật phẩm.
- Tiến độ chỉ **đọc** từ bốn hành trình đã có ở `DuduPersonalHonorC46.view`; lưu theo dõi không phải bằng chứng nhận thưởng.
- Lựa chọn theo dõi chỉ nằm trên thiết bị đang dùng, không hứa đồng bộ giữa các máy và không giả vờ rằng tiến trình Arcade đã xác thực ở server.
- Mùa 1 vẫn `preview`; C4.37 không nhận hoặc cấp kỷ vật mùa, Xu, EXP, danh hiệu hay vật phẩm.

## Điểm chạm mã

- `js/personal-arcade-journey-c437.js`: logic tùy chọn, mã hóa khóa lưu, kiểm tra giới hạn, chuẩn hóa dữ liệu.
- `js/personal-honor-ui-c46.js`: bảng theo dõi và nút ghim trong giao diện thử thách hiện có.
- `js/personal-arcade-ui-v1.js`: `openGame(id)` để chuyển thẳng tới một trong bốn game.
- `css/arcade-journey-c437.css`: phong cách bảng tối, khung màu từng game, bố cục điện thoại.
- `index.html`: liên kết các tài nguyên C4.37 với tham số chống cache cũ.

## Kiểm thử

- Test đơn vị C4.37: giới hạn ba, thêm/bỏ, chống trùng, dữ liệu sai, tách chủ tài khoản, lỗi ghi thiết bị, UI và không làm đổi `honorV1`/ví.
- Regression Node: `node --test tests/*.test.cjs`.
- Browser: `node tests/browser-arcade-mobile-c410.cjs` mở rộng để kiểm tra thao tác và không tràn ngang tại 320/360/390px, luồng mở game đúng tab.
- GitHub Actions Smoke/Browser và GitHub Pages phải thành công sau khi commit `main` mới coi là phát hành đạt.

## Cách Du thử trên điện thoại

1. Tải lại trang GitHub Pages sau khi deploy (nếu dùng PWA, đóng và mở lại ứng dụng để nhận tài nguyên mới).
2. Mở **Điện thoại → Sổ Vinh Danh → Thử thách**.
3. Ghim ba hành trình, thử ghim cái thứ tư: phải được nhắc bỏ ghim trước, không tự mất lựa chọn.
4. Bỏ ghim một hành trình rồi chọn hành trình khác; thử **Vào game** và quay lại Sổ.
5. Kiểm tra tiến độ theo hành động trong game, thử trên màn hình nhỏ và xác nhận Xu/kho đồ/Mùa 1 không thay đổi vì thao tác theo dõi.

Không reset dữ liệu thử, không chỉnh Rules, không mở phát thưởng mùa.
