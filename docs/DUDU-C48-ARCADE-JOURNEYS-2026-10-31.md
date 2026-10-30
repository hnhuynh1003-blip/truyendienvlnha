# DUDU Studio — C4.8: Hành trình thử thách của bốn game Arcade

Triển khai tiếp từ C4.7 trên `main`. Không đổi cấu trúc Arcade `version:1`,
không cấp Xu/EXP/vật phẩm tài khoản chính, không bật chuyển Xu Arcade, không sửa
Firestore Rules, không reset mùa, không đụng tiến trình Vạn Giới.

## Thiết kế và quyền lợi

- 17 thành tựu Arcade mới, nâng Sổ Vinh Danh lên **44 thành tựu / 20 danh hiệu**.
- Bốn danh hiệu mới: **Vương Giả Phố Đêm** (Huyền thoại),
  **Chưởng Mạch Địa Tầng** (Huyền thoại), **Người Giữ Vườn Sương** (Sử thi),
  **Đại Sư Trác Ngọc** (Sử thi).
- Mỗi hành trình có 4–5 mốc. Thành tựu mở tự động từ *bộ đếm đã có*;
  không có bảng claim mới hay luật thưởng Xu thứ hai.
- Huy hiệu/danh hiệu là **cosmetic**, gắn với tài khoản bằng `honorV1.earned`;
  `honorV1.pinned` tối đa ba, `honorV1.equipped` một. Các danh hiệu cũ và
  lịch sử thành tựu cũ được giữ nguyên.

| Game | Hành trình, mốc mới | Dữ liệu thực tế được đọc |
| --- | --- | --- |
| Trạm Neon | 250 khách; doanh thu phục vụ 500 Xu Arcade; bộ máy chuyên nghiệp; hoàn thiện đế chế | `neon.guestsServed`, `serviceRevenue`, `cpu`, `router`, `cooling`, `contracts`, `roomTier`, `milestones` |
| Địa Tầng 07 | Đủ điều kiện mở hang tinh thạch; 25 phá mạch; máy dò cấp 3; chưởng mạch | `mine.dug`, `lantern`, `bursts`, `scanner`, `found` (cộng dồn, không phải túi đang cầm) |
| Vườn Sương | 10/30 lần thu hoạch; 5 loài cá; thành tựu trồng–câu–nâng hồ | `garden.harvests`, `fishAlbum`, `pondTier` |
| Ngọc Phường | 20 viên đã xẻ; 12 tổ hợp Chủng–Sắc; 10 trưng bày; quyền vào Tàn Tích; đại sư chế tác | `jade.cut`, `album`, `exhibits`, `permit`, `sold`, `carver` |

### Quy tắc điều kiện

- Thành tựu tổ hợp đếm số yêu cầu đã hoàn tất: ví dụ 3/4. Chỉ mở ở 4/4.
- Không tính **mua đá** là **xẻ đá**, không tính **mua giấy phép** riêng là
  **đã vào Tàn Tích**, không coi `mine.ores` là album quặng vì túi có thể bán.
- Không dùng trạng thái không có bộ đếm lưu vĩnh viễn, ví dụ "chơi từ 0 Xu"
  hoặc "câu liên tiếp không trượt"; sẽ thiết kế event ledger riêng nếu cần.
- Các mốc từng đạt sẽ được ghi hồi tố khi mở Sổ/tiếp tục chơi, theo cùng
  giao dịch đồng bộ cosmetic của C4.6; không cộng Xu hồi tố.
- Luồng đồng bộ cosmetic vẫn dựa Arcade local theo UID (honest-play); không
  tự tuyên bố có chứng thực server cho số liệu game.

## Trải nghiệm điện thoại

- Sổ Vinh Danh có bốn thẻ **Danh hiệu · Thử thách · Thành tựu · Bí ẩn**.
- Thử thách hiển thị bốn hành trình dạng thẻ ngắn, tiến độ hoàn thành và mốc
  kế tiếp, danh hiệu đích; chọn **Xem mốc** để lọc thẳng thành tựu đúng game.
- Danh hiệu/Thành tựu dùng lọc nguồn; mặc định hiển thị tám thẻ/lượt với nút
  **Xem thêm**, không đặt 44 thẻ dài tràn trang cùng lúc.
- Trong các popup công cụ của mọi game có biểu tượng ✦ ở tiêu đề, dẫn tới đúng
  hành trình của game đang chơi; không thêm dải nút trên sân khấu Arcade.
- Toast thành tựu chỉ thông báo một lần theo kết quả transaction mới, khi
  cùng lúc nhiều mốc đạt sẽ nêu số lượng và mốc có độ hiếm cao nhất.

## Kiểm tra và giới hạn

- Kiểm thử dữ liệu chưa đạt/đã đạt, đủ điều kiện từng hành trình, tiến trình
  một phần, chuẩn hóa lưu cũ, giữ danh hiệu và huy hiệu đã có.
- Kiểm thử nút từ Arcade tới Sổ Vinh Danh, bộ lọc, giới hạn tám thẻ và Xem thêm.
- Kiểm thử `node --test tests/*.test.cjs` và kiểm thử miền liên quan.
- **Cần thử trực tiếp** trong điện thoại 320/375/390: mở popup từng game → ✦,
  kiểm 4 tab không chồng chữ; đạt mốc → cập nhật số liệu và huy hiệu, tải lại
  trang, đổi trình duyệt (nếu đã đồng bộ thành công).
- Browser smoke cục bộ cần Playwright Chromium; nếu môi trường thiếu binary
  thì phải đánh dấu **chưa chạy**, không gắn nhãn "đã test browser".

## Để lại cho C4.9–C4.10

- C4.9 rà giá nâng cấp, thời gian chờ, nhịp tạo tiền, cách phục hồi khi ít Xu,
  tỷ lệ ngọc/loài cá; không dùng thêm thưởng từ C4.8 để bù lỗi cân bằng.
- C4.10 bảo vệ Arcade local qua cơ chế sao lưu/khôi phục hoặc đồng bộ có xác
  nhận, không tự copy tiền từ trình duyệt lên Firestore.
