# DUDU Cyber Phone V12 — Hồ sơ NPC và Kho đồ chi tiết

Ngày 15/10/2026. Nhánh `feat/identity-npc-editor-v2`. **Chỉ Sandbox. Chưa merge, chưa deploy.**

## Hồ sơ nhân vật (Sổ Tay)
- Thẻ hai cột với chân dung NPC tỷ lệ dọc 88 × 113 px (320px dùng 72 × 104 px); tải ảnh riêng đã chọn nếu có hoặc ảnh vector dự phòng đã tồn tại.
- Hiển thị tên nhân vật, vai trò, trạng thái, giai đoạn quan hệ cùng thanh Thiện cảm và Tin tưởng riêng.
- Không thêm NPC, không đổi giới tính/thiết lập nhân vật gốc, không trao quyền mở khóa. Với NPC chưa mở khóa, không suy đoán tình cảm/tin tưởng bí mật.
- Mốc quan hệ phụ thuộc cốt truyện vẫn không có chứng cứ hoàn thành từ máy chủ: giao diện chỉ đọc, không tự mở nội dung riêng.
- Giữ nguyên nút Tặng quà, Trò chuyện, Sửa và Lưu trữ/Khôi phục với logic, giới hạn và quyền hiện hành.

## Kho đồ
- Có nút **Chi tiết** trên mỗi vật phẩm trong Sandbox. Bảng đọc thông tin hiển thị tên, biểu tượng, phẩm cấp F–SSS, mô tả và trạng thái bảo vệ.
- Nhấn Chi tiết **không** làm thay đổi kho, tiến độ, bản lưu, xu hay kỷ vật đã sở hữu. Có thể đóng bảng bằng nút rõ ràng.
- Kiểm tra vật phẩm còn tồn tại bằng tham chiếu vật phẩm hiện hành; nếu vật phẩm bị xóa/thay sau đó, bảng tự ẩn khi render lại.
- Bộ lọc và tìm kiếm cũ giữ nguyên; nút Vứt vẫn kiểm tra kỷ vật được bảo vệ. Không thêm nguồn phần thưởng hoặc vật phẩm tự sinh.

## Giao diện và kiểm thử
- CSS trong `css/phone-ui-v12-dossiers.css` đặt dưới `body.dudu-phone-v11`, chỉ có trong `?sandbox=1`.
- Giao diện dọc dành cho điện thoại 320–375px, không đặt HTML/JS động vào dữ liệu nhân vật hoặc vật phẩm ngoài trường đã escape/DOM textContent.
- Node và headless Chromium sẽ kiểm tra ảnh hồ sơ, số liệu quan hệ, bảng vật phẩm, mở/đóng, màn hình nhỏ và không ghi Firestore giả lập.
- Chưa kiểm thử trên điện thoại thật hoặc xác thực hệ thống giao dịch Cloudflare/Firebase thật.

## Bảo toàn
- Không merge vào `fixapp`, không cập nhật Worker hoặc website thật.
- Không thay đổi save schema, profile thực tế, UID, bản đồ nhân vật, quyền độc giả hoặc kho đồ.
