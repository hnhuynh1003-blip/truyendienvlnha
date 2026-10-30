# C4.11 — Vinh danh khoảnh khắc mở khóa (31/10/2026)

## Mục tiêu

Người chơi cần cảm thấy mỗi danh hiệu Hiếm, Sử thi, Huyền thoại vừa đạt được
thực sự đáng sưu tầm. C4.11 làm nổi bật **thành tựu mới đủ điều kiện** ở bốn
game Arcade mà không thêm nhiệm vụ, Xu, vật phẩm hay một kho thưởng song song.

## Phạm vi thay đổi

- Trạm Neon, Địa Tầng 07, Vườn Sương, Ngọc Phường: kết quả từ hệ thống
  `DuduPersonalHonorC46.CATALOG` hiện hữu được đối chiếu **trước/sau** một thao
  tác thành công hoặc một kỳ phục vụ mới. Việc đào, câu cá, bán đá, nâng cấp,
  hợp đồng và các mốc khác không bị đổi công thức.
- Nếu có mốc mới, hiển thị **thẻ vinh danh thu nhỏ** trong Cyber Phone, tự hết
  hạn sau 4–6,2 giây; thẻ không chặn bấm (`pointer-events:none`) và không tạo
  modal, không ép người chơi kéo đến Sổ Vinh Danh.
- Màu và ánh sáng đi theo bốn bậc của danh hiệu: khắc bạc Thường, kính ngọc
  Hiếm, lăng kính tím Sử thi, ánh sao vàng Huyền thoại. Người giảm chuyển động
  sẽ nhận bản tĩnh.
- Nếu một thành tựu mở danh hiệu cao cấp hơn chính bậc của thành tựu, hiệu ứng
  hiển thị **bậc của danh hiệu** (ví dụ "Một Đao Khai Ngọc" mở "Tập Sự Thẩm
  Ngọc" Hiếm). Mọi tên và độ hiếm lấy từ catalog chuẩn, không từ nội dung
  tùy ý của localStorage.
- Khi nhiều mốc cùng mở trong một lượt, ưu tiên thành tựu/danh hiệu có bậc
  cao nhất, kèm đếm số mốc. Không tự trang bị; người chơi vẫn tự chọn trong
  Sổ Vinh Danh.
- Khi mở lại trang, chuyển tab, tải tiến trình cũ hoặc chơi lại mốc đã sở hữu,
  không hiện "mở khóa mới" giả. Đổi tài khoản sẽ xóa thẻ đang hiện, không lẫn
  chứng nhận. Thẻ chỉ hiện khi điện thoại đang mở.
- Bộ hiển thị hoạt động cả trong Sandbox; Firebase vẫn là nơi lưu cosmetic
  ledger đối với tài khoản thật, logic đồng bộ cũ được giữ nguyên. Hiệu ứng
  không tự ghi dữ liệu lên Firestore hay cập nhật ví.

## Bảo đảm không tạo thưởng trùng

`unlockMoment(beforeIds, afterIds, sources)` xác định tập thành tựu mới từ
catalog chính thức. Khối giao diện chỉ đọc `discovered(profile, arcade)` và
`honorV1.earned`, dùng tập thông báo trong phiên để ngăn lặp khi có cả thông
báo tại máy lẫn phản hồi đồng bộ từ Firestore. `Arcade.save` chỉ gửi sự kiện
cho UID đang hoạt động, ngăn tình trạng lưu phiên cũ nhưng ghi nhận cho phiên
mới. Việc phát thưởng Xu vẫn ở `personal-arcade-core-v1.js`, hoàn toàn không
thay đổi trong đợt này.

## Kiểm chứng

- `node --test tests/*.test.cjs` và `node --test functions/tests/*.test.cjs`.
- `tests/personal-honor-c411-moments.test.cjs`: bốn nguồn game, bậc Huyền
  thoại, ẩn danh hiệu, không phát lặp, đổi tài khoản, không đổi ví/EXP.
- `tests/browser-arcade-mobile-c410.cjs`: trên Sandbox, bán viên đá đầu tiên
  phải hiện thẻ "Tập Sự Thẩm Ngọc" Hiếm với `pointer-events:none`, đồng thời
  giữ các kiểm tra bố cục và tiến trình C4.10 ở màn 320/390/430 px.
- CI chỉ chạy máy chủ và trình duyệt test; không tự triển khai Firebase Rules,
  không mở chuyển Xu Arcade sang Ví Xu, không reset mùa.
