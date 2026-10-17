# V44.3.1 — Chọn quà nhanh trong bình luận (bản vá UI)

**Phạm vi:** giao diện chọn vật phẩm của bình luận truyện và bình luận chương trong `?sandbox=1`. Không bật giao dịch người chơi thật, không sửa logic sở hữu máy chủ, không chỉnh đấu giá.

## Giao diện mới

- Thay native `select` dài bằng cửa sổ modal riêng trên `document.body`. Dialog có nhãn, đóng bằng nút ×/phông nền/Escape, khóa focus bên trong khi nhấn Tab và tự khôi phục focus khi đóng.
- Ô tìm kiếm có hỗ trợ tiếng Việt không dấu, ví dụ `ca phe` tìm `Cà Phê`. Các bộ lọc: Tất cả, Phổ thông, Thế giới, Nguyên liệu, Dụng cụ, Gần đây.
- Mỗi mã vật phẩm giống nhau chỉ một thẻ và số lượng `×N`. Các instanceId hợp lệ riêng biệt vẫn được giữ nguyên; khi gửi chỉ chọn instance đầu tiên trong nhóm phù hợp với truyện/chương hiện tại và trừ đúng **1** qua `DuduInventoryTradeV439.storyGift`.
- Không còn giới hạn lấy 100 instance đầu. Cho phép tối đa 500 vật phẩm hiện có trong Kho; chỉ hiển thị tối đa 8 loại ban đầu và nút **Xem thêm**. Danh sách nằm trong vùng cuộn nhỏ, không kéo dài trang đọc.
- Trước khi gắn: xem tên, emoji, số lượng, phẩm cấp và phạm vi. Sau khi gắn: chip nhỏ dưới khung nhập, nút Đổi và Bỏ. Không trừ vật phẩm tại thời điểm chọn trong modal — chỉ khi bấm Đăng thử và cả giao dịch cùng lưu thành công.
- Không hiển thị nút tặng tác giả giả. Nhãn ở cuối popup khẳng định chỉ thiệp ủng hộ Sandbox, chưa gửi tài khoản tác giả. Không tạo quà hoặc Xu thật.
- Responsive ở 320px, hỗ trợ màn hình thấp và thiết bị cảm ứng. Phần bình luận mặc định vẫn thu gọn.

## Nguyên tắc kỹ thuật

- Pure selection model `js/gift-picker-model-v44-3-1.js` tách biệt dữ liệu và giao diện. Nhóm theo catalog item ID; nếu ID thiếu thì không gộp hai instance khác nhau. Lọc chỉ trong số instance **đã được kiểm tra phù hợp truyện/chương** bởi `DuduInventoryTradeV439.storyTargets` trước khi tạo danh sách.
- Không sửa `inventoryTradeV439`, `commentsV442`, Firestore Rules, Cloudflare Worker, quest engine hoặc các bản ghi vật phẩm cũ. UI không gửi request mạng.
- Bộ lọc Gần đây dùng thứ tự các vật phẩm đầu tiên trong Kho hiện tại, **không khẳng định thời gian nhặt thực** nếu bản ghi không lưu thời gian.
- Không nhập số lượng gửi nhiều món: V44.3 chỉ hỗ trợ chính xác 1 instance mỗi bình luận để tránh nhầm chủ sở hữu và giao dịch trùng.

## Kiểm thử

- Test model: gộp duplicate giữ instanceId, ngăn trừ cả stack, tìm tiếng Việt không dấu, lọc phạm vi, định dạng sai, không thay đổi đầu vào.
- Chromium: 15+ món, xem chỉ 8 loại, tìm kiếm không thấy, lọc nhanh, xem thêm, Escape, màn hình vừa viewport, không trừ item nếu chưa đăng; sau khi chọn xác nhận và đăng sẽ tạo đúng một comment + một nhật ký + trừ đúng một instance; không có Firestore writes.
- URL: https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=44-3-1
