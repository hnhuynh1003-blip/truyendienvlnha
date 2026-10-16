# DUDU Studio — NPC editor safe housekeeping

**15/10/2026 · chỉ nhánh `feat/identity-npc-editor-v2`.** Chưa hợp nhất `fixapp`, không triển khai GitHub Pages, Cloudflare Worker hoặc thay đổi Firestore security rules.

## Đã thực hiện

- Edit Chương → **Nhân vật xuất hiện trong chương**: mặc định chỉ hiển thị các NPC **đã gắn vào chương đang chỉnh sửa**, không lặp cả Sổ Tay. Chương mới bắt đầu với danh sách trống. Nút **+ Chọn từ Sổ Tay (N)** mở/thu gọn tất cả NPC còn hoạt động để gắn, kèm ô tìm theo tên và biệt danh. Nút **+ Tạo NPC** vẫn giữ nguyên.
- Bỏ dấu chọn NPC → chỉ **gỡ liên kết trong chương đang sửa** (có hiệu lực khi bấm **Lưu Nội Dung**). Không xóa NPC, chương khác, phần thưởng, ký ức hay lịch sử của độc giả. Việc đóng/hiện ô tìm không làm mất các NPC đang chọn.
- Cyber Phone → **Nhân Vật**: nút **Xóa** cũ dùng `characters.splice` đã thay bằng **Lưu trữ**: đặt `archived:true` trên bản ghi, giữ nguyên `id` và toàn bộ liên kết. NPC đã lưu trữ không xuất hiện trong danh sách chọn mới, nhưng vẫn có thể xuất hiện trong chương trước đây đã gắn; tác giả có thể bấm **Xem NPC lưu trữ** → **Khôi phục**.
- Nhân vật nhập sai tên → vào Cyber Phone / Nhân Vật → **Sửa**, chỉnh tên hoặc biệt danh; `id` giữ nguyên nên không phá liên kết với chương hay kỷ vật.
- Module thuần `js/npc-editor-v1.js` chứa lọc NPC, đánh giá tham chiếu chương/vật phẩm công khai, lưu trữ và khôi phục. Không ghi Firestore hay ảnh hưởng tới kho đồ/EXP/tiền.
- Khi tác giả lưu trữ NPC, thông báo cảnh báo số chương/kỷ vật công khai đang tham chiếu. Trạng thái `archived` bổ sung theo cách tương thích dữ liệu NPC cũ, các NPC chưa có cờ được coi là hoạt động.

## Tại sao chưa cho xóa vĩnh viễn?

ID NPC có thể tồn tại trong:
- các chương cũ, kỷ vật công khai `specialItems`;
- **kỷ vật bí mật** trên Cloudflare (không có trong JSON truyện công khai);
- tiến độ đã mở khóa, ký ức, thiện cảm và lịch sử trò chuyện của **những tài khoản độc giả khác**.

Không thể bảo đảm xóa an toàn chỉ dựa vào một danh sách trên trình duyệt. Vì vậy tính năng **xóa vĩnh viễn hiện vẫn khóa**; thay bằng lưu trữ/khôi phục. Nếu thực sự cần xóa sạch dữ liệu NPC, phải có thao tác quản trị có xác thực, rà soát mọi nơi tham chiếu và cơ chế di chuyển/giữ ID trước khi sửa dữ liệu thật. Không tự động đổi ID, xóa ký ức hoặc tịch thu kỷ vật.

## Kiểm thử

- `tests/npc-editor-v1.test.cjs`: bộ lọc, selected-only, lưu trữ/khôi phục giữ ID, chương và kỷ vật.
- `tests/browser-smoke.cjs`: Edit Chương hiện NPC được chọn, thu/mở Sổ Tay không mất chọn, chương mới trống; giao diện Codex lưu trữ/khôi phục, không ghi Firestore sandbox, giữ kết nối với kỷ vật.
- Các bài smoke cho Firebase Auth, chương di sản, kho bí mật và bảng rơi ở Đợt 1–4 tiếp tục được chạy qua GitHub Actions.

**Vận hành:** Đây là tính năng frontend trên nhánh chưa hợp nhất. Bản localhost đã giải nén **không tự cập nhật** sau commit; phải tải ZIP nhánh mới hoặc `git pull` nếu đang làm việc bằng Git. Không yêu cầu thay đổi `wrangler.toml` hoặc redeploy Worker.
