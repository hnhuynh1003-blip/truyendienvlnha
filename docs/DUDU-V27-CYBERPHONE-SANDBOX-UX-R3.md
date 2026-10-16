# DUDU V27 R3 — Kho Đồ dạng ô vuông, tinh gọn Nhiệm Vụ / Bảo Tàng / Cửa Hàng

**Ngày:** 16/10/2026 • **Nhánh:** `feat/dudu-v27-phone-sandbox-ux-r3` (nối tiếp R2). **Chỉ Sandbox, chưa merge/deploy.**

## Kho Đồ — thay đổi trọng tâm
- Đổi danh sách vật phẩm từ **hàng ngang có nhiều nút** thành **lưới 4 cột**, thu còn **3 cột trên màn ≤360px**. Các ô là nút có thể bấm qua cảm ứng, chuột, Enter hoặc Space.
- Mỗi ô gồm **hình minh họa/emoji**, **phẩm cấp**, **tên ngắn tối đa hai dòng** và biểu tượng **🔒** cho kỷ vật được bảo vệ. Ô được chọn có viền sáng. Không có nút **Chi tiết/Vứt** lặp trên từng ô.
- Nhấn ô sẽ **mở/đóng bảng chi tiết duy nhất** phía trên lưới, giữ tên đầy đủ, mô tả, phân loại, cấp hiếm, ảnh. Trong bảng chi tiết, nút **Vứt vật phẩm** chỉ xuất hiện cho đồ được phép vứt, và phải **xác nhận rõ ràng** trước khi xóa.
- **Không tự gộp vật phẩm trùng tên:** mỗi bản sao là một instance riêng, vì vật phẩm cùng tên có thể khác `instanceId`, thuộc tính hoặc nguồn gốc; việc cộng dồn thiếu kiểm chứng có thể xóa nhầm đồ hiếm. Bộ lọc Tất cả / Đồ ăn / Vũ khí / Vật dụng và tìm kiếm vẫn hoạt động.
- Thay đổi bộ lọc sẽ xóa lựa chọn cũ nếu món đã chọn không nằm trong kết quả mới, tránh hiển thị bảng chi tiết không liên quan. Trạng thái trống có giải thích ngắn.
- **Bảo toàn:** hàm `discardItem` vẫn kiểm tra ID/chỉ mục, quyền `discardable`, `unique`, `scope==='DUDU'`; chỉ thao tác xác nhận xóa mới gọi lưu tài khoản. Mở/đóng chi tiết **không ghi Firestore hoặc thay save**. Giao diện kho của website live vẫn dùng các hàng cũ ngoài Sandbox.

## Các ứng dụng khác
- **Nhiệm Vụ:** chuyển thao tác đặt lại nhiệm vụ ngày vào menu ⋯; trên Sandbox yêu cầu hộp xác nhận trước khi reset, không ảnh hưởng các nhiệm vụ chính tuyến. Giữ `renderQuests`, `claimQuestReward`, bộ lọc và tiến độ hiện có. Lưu ý: bản production không tự thay đổi.
- **Bảo Tàng:** chuyển giải thích dài sang thẻ có thể mở; nút làm mới có nhãn truy cập, những kỷ vật **chỉ lấy từ dịch vụ sở hữu máy chủ**, vẫn từ chối ghi nhận đồ loot Sandbox thành vật phẩm hiếm.
- **Cửa Hàng:** đưa các hàng sản phẩm sang bố cục thẻ hai cột, giữ giá Xu, tên vật phẩm, phẩm cấp và nút Mua; không thay chi phí hay quy tắc giao dịch.

## Kiểm thử & chặn phát hành
- Node: cách xây lưới, ranh giới Sandbox, từng instance và điều kiện bỏ đồ, không vô hiệu hóa khóa kỷ vật, các chức năng shop/quest/museum còn nguyên.
- Chromium: 375px lưới 4 cột, 320px lưới 3 cột, không tràn ngang; mở bảng chi tiết; không vứt nhầm; kiểm tra kỷ vật được bảo vệ; không ghi Firestore khi chỉ mở ảnh và chi tiết.
- CI đủ bộ `tests/*.test.cjs`, `functions/tests/*.test.cjs`, `cloudflare/tests/*.test.mjs`, Chromium và Wrangler dry-run.
- **Không** gộp nhánh, không bật backend V23–V26, không chuyển save Firebase/Cloudflare, không triển khai site chính.

## Công việc UI tiếp theo
- Kiểm tra ảnh nhiều phẩm cấp và vật phẩm có tên cực dài trên màn hình điện thoại thật.
- Cân nhắc tính năng **xếp chồng số lượng** sau khi đặc tả cách giữ riêng `instanceId`, nguồn gốc và giao dịch được nghiệm thu; R3 không tự xếp chồng.
- Đánh giá tổng thể Cyber Phone R1–R3 để chuẩn hóa spacing, thao tác, màu sắc, khả năng cuộn trước khi công bố bản giao diện.
