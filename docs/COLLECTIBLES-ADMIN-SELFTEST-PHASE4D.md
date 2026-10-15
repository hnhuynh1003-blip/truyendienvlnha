# DUDU Studio — kiểm thử sở hữu kỷ vật (Đợt 4D / admin self-test)

**Ngày 15/10/2026; nhánh duy nhất: `feat/identity-npc-editor-v2`.** PR #1 còn draft, chưa merge `fixapp`. Worker staging đã được người vận hành kiểm tra độc lập; không thay đổi API Cloudflare ở đợt này, không yêu cầu `wrangler deploy`.

## Kết quả kiểm tra trước khi cấp thử

Tác giả đã xác nhận: Bảo Tàng Ký Ức của tài khoản tác giả **trống**, mặc dù kỷ vật F loại `CHAPTER_EVENT` đã có bản ghi phát hành. Như vậy **phát hành không đồng nghĩa sở hữu**, nhưng chưa xác minh cấp lặp trên Worker thật.

## Công cụ tự cấp thử có giới hạn

- Tác giả mở **Edit Truyện** (KHÔNG phải Edit Chương), tạo **vật phẩm bí mật mới** giả, đặt tên chứa chữ `kiểm thử`, rank `F`, loại `STORY_EVENT`, không gán chương, mô tả ghi rõ đây là dữ liệu giả.
- Sau khi lưu vào kho kín, nhấn **Duyệt phát hành → Xác nhận phát hành**. Bấm lại **Duyệt phát hành**. Nếu phiên bản đã phát hành đúng, giao diện mới hiển thị **🧪 Cấp thử cho chính tôi**.
- Nút tự cấp chỉ hiện nếu **server preview** xác nhận bản ghi đã phát hành chưa disabled, phương thức `STORY_EVENT`, không có chapterId, rank `F` và tên có chữ `kiểm thử`. Kỷ vật đã thử `CHAPTER_EVENT` không thể dùng nút.
- Khi người dùng thực sự bấm, một hộp xác nhận cảnh báo: đây là quyền sở hữu server thật, **tồn tại lâu dài**, kể cả nếu tác giả lưu trữ bản thảo; hiện chưa có UI thu hồi.
- Client gửi `POST /v1/collectibles/admin/grant` với UID **tự lấy từ Firebase Auth đang đăng nhập**, tuyệt đối không nhập UID của độc giả. API kiểm Firebase JWT có `admin:true`; server chỉ chấp nhận `STORY_EVENT` đã phát hành chưa vô hiệu hóa.
- Backend dùng giao dịch và khóa duy nhất `(uid, story_id, item_id)`. Lần đầu máy chủ trả `alreadyOwned:false`. Từ lần hai trả `alreadyOwned:true`; giao diện hiển thị trạng thái, không ghi thêm dòng.
- Sau khi thử hai lần, mở Cyber Phone → Bảo Tàng Ký Ức. Dự kiến item giả xuất hiện **một lần**, dù đã gửi yêu cầu cấp hai lần. Kho đồ thường, xu, EXP, NPC và các độc giả khác không thay đổi.
- Nếu tài khoản Firebase đổi lúc chờ JWT, nút từ chối giao dịch thay vì gửi UID cũ.

## Lưu ý

- Đây là giao diện admin hỗ trợ test, **không phải tính năng thưởng cho độc giả**.
- Bản thử hiện dùng chung sổ `DUDU_COLLECTIBLES` staging đang phục vụ account thật. Kỷ vật được cấp cho admin sẽ **tồn tại trong Bảo Tàng**; không nên bấm nếu không muốn lưu món giả. Không có chức năng xóa vĩnh viễn an toàn trong đợt này.
- Điều kiện F, `STORY_EVENT`, tên `kiểm thử` được áp trên **giao diện test**; API `/admin/grant` vẫn là công cụ quản trị đã có từ Đợt 4A và được bảo vệ bởi server Firebase admin claim. Đừng dùng API admin để cấp kỷ vật khác nếu chưa có kế hoạch.
- AI `AI_ENABLED=false`, `COLLECTIBLE_SELF_CLAIM_ENABLED=false` phải giữ nguyên. Không bật phần thưởng theo chương.
- Chưa có kiểm thử DO end-to-end thật trong CI. `tests/collectibles-selfgrant.test.cjs` dùng fake Firebase/fetch, `tests/browser-smoke.cjs` chạy Sandbox không ghi thật; chỉ thao tác có chủ đích trên localhost với Auth thật mới kiểm tra được lượt cấp thực.
- Muốn thử bản mới tại localhost: tải ZIP mới của **nhánh tính năng**, giải nén vào thư mục mới và chạy host từ thư mục chứa `index.html` như trước. **Không** redeploy Cloudflare Worker.
