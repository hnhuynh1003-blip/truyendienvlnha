# DUDU C4.6 — Sổ Vinh Danh & Danh hiệu cá nhân

Triển khai 30/10/2026. **Không sửa Firebase Rules, không phát Xu/EXP/vật phẩm, không mở reset mùa, không kích hoạt chuyển Xu Arcade.**

## C4.6.1 — Sửa thao tác trang bị danh hiệu (30/10/2026)

- Khắc phục một nguyên nhân có thể khiến giao diện báo danh hiệu đã mở nhưng giao dịch trang bị thất bại: dữ liệu tiến trình đọc truyện, nhiệm vụ hoặc Hộp Mù trên điện thoại chưa được đồng bộ kịp vào hồ sơ Firestore.
- Giao dịch xác minh điều kiện bằng tiến trình máy chủ **và** bằng các tín hiệu tiến trình chỉ dùng để mở khóa thành tựu thẩm mỹ trên thiết bị của đúng UID. Chỉ ghi danh sách ID thành tựu, danh hiệu, huy hiệu ghim; không sao chép Xu, EXP, Kho, số nhiệm vụ hay bất kỳ phần thưởng thật nào từ trạng thái cục bộ.
- Phân biệt thông báo khi chưa đủ điều kiện, hồ sơ thiếu, tài khoản thay đổi, bị từ chối quyền ghi hoặc chưa có kết nối. Không báo đã trang bị khi chưa có kết quả giao dịch thành công.
- Kiểm tra lại UID hồ sơ đang mở trước khi ghi; tránh thao tác khi tài khoản đang chuyển. Khi hệ thống đang xử lý, nút sẽ nhắc chờ thay vì im lặng.
- Đổi phiên bản tải hai script liên quan để điện thoại không dùng lại bản JavaScript C4.6 đã lưu trong bộ nhớ đệm.
- Chưa truy cập được Firebase production của chủ dự án; cần xác nhận thao tác trực tiếp trên điện thoại sau khi bản mới được tải.

## Kết quả

- Trang chính Điện thoại: một chip danh hiệu bên dưới thẻ avatar; rút tên danh hiệu khỏi dòng LV để tránh trùng nội dung.
- Hồ sơ: danh hiệu đang dùng, thống kê danh hiệu/thành tựu và tối đa ba huy hiệu ghim.
- `Sổ Vinh Danh`: danh hiệu đã mở/chưa mở, thành tựu theo game, tiến độ, huy hiệu ghim và các mục ẩn chưa khám phá. Mobile có bộ lọc trượt ngang, hiệu ứng màu theo độ hiếm và hỗ trợ giảm chuyển động.
- Khoảng hai chục mốc gameplay kế thừa bộ đếm và dấu mốc có sẵn của Trạm Neon, Địa Tầng 07, Vườn Sương, Ngọc Phường. Thêm các thành tựu theo số chương đọc, số nhiệm vụ nhận thưởng, tặng NPC và lần đầu mở Vạn Bảo. Không nhân bản hệ thống nhiệm vụ/phần thưởng.
- Danh hiệu và huy hiệu là phần thưởng **thẩm mỹ**, không buff và không phát Xu. Thành tựu đã được ghi vào `honorV1.earned` giữ nguyên khi đổi danh hiệu, tải lại ứng dụng hoặc chơi ở trình duyệt khác sau khi tài khoản đồng bộ.
- Trò chơi Arcade vốn lưu trên thiết bị. Mốc được phát hiện từ trạng thái local và bổ sung vào danh sách cosmetic của chính UID khi hoàn thành; quy tắc này là **honest-play** cho chủ dự án đang tự trải nghiệm, **không tuyên bố là chống gian lận do máy chủ xác thực**.

## Dữ liệu và luồng

- `js/personal-honor-c46.js` là catalog + mô hình thuần và giao dịch owner-scoped. `honorV1 = {version:1, earned:string[], equipped:string, pinned:string[]}`. Giới hạn 100 thành tựu, ba huy hiệu. `profile.title` tiếp tục giữ tên danh hiệu đang dùng để tương thích UI cũ.
- `js/personal-honor-ui-c46.js` quản lý giao diện: đọc tiến trình Arcade theo namespace UID, chuẩn hóa bằng `DuduPersonalArcadeCoreV1.norm`, gửi giao dịch lên `/profiles_v2/{uid}`. Các hành động trang bị/ghim kiểm tra lại thành tựu đã mở trong cùng transaction. Không sửa field không liên quan.
- Tại mỗi lần Arcade lưu thành công trên thiết bị, module quan sát nếu có thêm thành tựu; chỉ ghi lên server khi xuất hiện mốc mới, có khử lặp và thời gian chờ khi mạng lỗi. Khi mở Sổ Vinh Danh sẽ kiểm tra và bổ sung những mốc đã đạt từ trước phiên bản C4.6.
- Trong Sandbox có thể thử trang bị/ghim nội bộ; không chuyển entitlement Sandbox sang tài khoản thật.
- Luồng chính `saveCurrentAccount` không ghi trực tiếp `honorV1`: field này thuộc transaction của module Sổ Vinh Danh. `title` vẫn được cập nhật bằng giao dịch và phản ánh lên Hồ sơ.

## Các giới hạn hiện tại

1. Bộ sưu tập danh hiệu không làm thay đổi vật phẩm trong Kho hay Bảo Tàng. Các huy hiệu chỉ là biểu tượng cosmetic, không phải item có thể giao dịch.
2. Trạng thái chơi Arcade hiện vẫn ở localStorage theo UID. Danh hiệu đã ghi lên cloud sẽ còn, nhưng bản thân tiến trình game trên thiết bị khác chưa được đồng bộ.
3. Một số mốc có thể được ghi nhận hồi tố khi tài khoản đã đáp ứng điều kiện trước C4.6. Không truy tặng Xu.
4. Firebase production và màn hình điện thoại thật cần kiểm thử smoke bằng tài khoản chủ; unit tests không xác nhận việc Publish Rules/Hosting.
5. Việc giữ hay đặt lại danh hiệu nếu sau này chủ dự án mở **mùa mới** phải được quyết định trong kế hoạch reset mùa và sao lưu. Reset hiện khóa.

## Kiểm thử bắt buộc

- Danh hiệu mặc định luôn mở.
- Mốc của đủ bốn game dẫn đến danh hiệu đúng; thành tựu ẩn vẫn che điều kiện khi chưa sở hữu.
- Giao dịch `sync` lặp lại không nhân đôi thành tựu.
- Không trang bị danh hiệu còn khóa hoặc ghim thành tựu chưa đạt; tối đa ba huy hiệu.
- Thao tác trong tài khoản khác bị từ chối; giao dịch danh hiệu không đổi Xu, EXP, cấp độ, Kho, truyện hay NPC.
- Kiểm thử cú pháp, ứng dụng tổng thể, giao diện mobile hẹp và thử nghiệm trực tiếp trên thiết bị sau khi commit.
