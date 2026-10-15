# DUDU Studio 2.0 — Đợt 4C: Xem trước và phê duyệt phát hành kỷ vật

**15/10/2026. Trạng thái:** Đã viết quy trình duyệt trên nhánh `feat/identity-npc-editor-v2` và chạy kiểm thử giả lập. Chưa merge `fixapp`, chưa deploy Cloudflare, chưa kiểm thử với hai UID thật.

## Quy trình dành cho tác giả

1. Mở **Edit Truyện** hoặc **Edit Chương** rồi chọn một vật phẩm **🔒 Vật phẩm bí mật** đã lưu thành công trong kho Cloudflare (nếu vault được bật trên staging sau này).
2. Nhấn **Duyệt phát hành** trong danh sách bí mật. Frontend gọi `POST /v1/collectibles/admin/draft/preview` với `{storyId,itemId}`. Server xác minh Firebase JWT và `admin:true`, trả đúng bản thảo đang lưu: tên, mô tả, chương, NPC, phương thức nhận, và `updatedAt`.
3. Trình duyệt chỉ hiển thị preview cho tác giả, không thêm thông tin vào `novel.specialItems`, `studio_data/main_library`, localStorage hoặc kho vật phẩm người chơi.
4. Khi tác giả nhấn **Xác nhận phát hành** và xác nhận lại trong hộp thoại, frontend gửi:
   ```json
   {"storyId":"story-1","itemId":"author-item-...",
    "expectedUpdatedAt":1792051200000,
    "confirmPublicRelease":true,"confirmRevealToOwner":true}
   ```
5. Máy chủ **đọc lại bản thảo trong SQLite và kiểm tra version bằng giao dịch**. Không lấy tên, mô tả, độ hiếm hay điều kiện nhận từ payload phát hành. Nếu bản thảo đã bị sửa, archive, không tìm thấy hoặc vẫn là `COLLECTION_ONLY`, từ chối. Dữ liệu riêng của vật phẩm chưa được trả về cho độc giả.
6. Phát hành chỉ tạo một **release rule**; **không tự cấp kỷ vật**, không tự tăng EXP/xu/tình cảm. Kỷ vật chỉ hiển thị trong Bảo Tàng khi UID sở hữu được ghi ở sổ server.
7. **Lưu trữ** vật phẩm bí mật sau khi phát hành sẽ đánh dấu draft archived và release disabled trong một giao dịch; **không xóa các bản ghi ownership**. Khi sửa draft mà chưa phê duyệt lại, bản release cũ không tự thay đổi.

## Các lớp bảo vệ

- Các route `/v1/collectibles/admin/*` yêu cầu token Firebase hợp lệ cùng custom claim `admin:true`; không dựa vào role do người dùng ghi vào profile.
- `COLLECTIBLES_ENABLED="false"`, `COLLECTIBLE_SELF_CLAIM_ENABLED="false"`, `AI_ENABLED="false"` trong cấu hình trên GitHub. Worker đã deploy trước đó chưa có các thay đổi này, vì không có lệnh deploy mới.
- `CHAPTER_EVENT` chưa được nhận tự động: mở trang, cuộn, chờ 90 giây, hoặc đọc lại không đủ chứng minh đã đọc. Không bật self-claim cho đến khi thiết kế quyền lợi có thể kiểm chứng.
- Chỉ món trong **kho bí mật server** mới đi theo nút preview/duyệt ở Đợt 4C. Vật phẩm tác giả lưu trong thư viện công khai ở Đợt 3 vẫn là **metadata công khai** và **chưa có chức năng đưa vào release ledger**; cần bước chuyển đổi sau, có kiểm tra spoiler và bảo toàn ID.
- Không có API công khai liệt kê private drafts hoặc release chưa sở hữu. Admin preview chỉ đi qua API xác thực.
- Chỉ admin mới được cấp thủ công kỷ vật `STORY_EVENT` cho UID khác ở API nền đã chuẩn bị; chưa có UI cấp thưởng tự do. Các kỷ vật `CHAPTER_EVENT` không thể nhận qua nút tự claim khi công tắc tắt.

## Kiểm thử tự động đã bổ sung

- Kiểm tra `normalizedDraftApproval`: xác nhận đủ hai lần, ID hợp lệ, `expectedUpdatedAt` là số nguyên hợp lệ.
- Đọc quyền và server code: `publishDraft` dùng bản thảo SQL, kiểm tra revision trong transaction, không còn route phát hành từ vật phẩm client tự dựng.
- Test Chromium mô phỏng: tác giả nhấn Duyệt, thấy preview riêng; xác nhận tạo đúng payload; **không** rò tên bí mật ra `novels`/localStorage/Firestore mock; không cộng item vào inventory.
- Test archive: phải disable release và không DELETE ownership.
- GitHub CI kiểm tra syntax, Node unit tests, browser smoke và Wrangler dry-run. **Chưa tương đương kiểm thử thật với Cloudflare SQL/Firestore Auth.**

## Chặng kiểm thử staging cần thực hiện sau khi tác giả cho phép (chưa thực hiện)

1. Chuẩn bị bản sao staging/back-up cần thiết. Chỉ **deploy Worker trên staging** sau khi tác giả duyệt; dùng `AI_ENABLED=false` và **`COLLECTIBLE_SELF_CLAIM_ENABLED=false`**.
2. Chỉ bật tạm `COLLECTIBLES_ENABLED=true` khi đánh giá usage Durable Object Free và xác nhận backend không ảnh hưởng dữ liệu cũ. **Không nhập spoiler nhạy cảm thật trong lần chạy đầu**; thử tên/desc giả.
3. Firebase UID tác giả (admin): lưu draft → preview → sửa → thử publish revision cũ (phải fail) → preview lại → approve → xem trạng thái.
4. Firebase UID độc giả: không được gọi /admin/draft/* hoặc /admin/publish; `/mine` chỉ thấy item thực sự sở hữu; không được tự phát `CHAPTER_EVENT` dù chờ timer.
5. Admin grant `STORY_EVENT` cho tài khoản thử 1, không grant tài khoản thử 2; xác nhận **không rò UID** và không nhân đôi quyền sở hữu khi gửi lặp.
6. Lưu trữ item đã grant → dừng cấp mới nhưng không xóa item của người sở hữu; thử logout/đổi tài khoản/network retry.
7. Rollback: tắt `COLLECTIBLES_ENABLED` nếu phát hiện sai quyền/chi phí; giữ sổ sở hữu, không xóa dữ liệu. Chỉ cân nhắc merge khi kiểm thử thật và xác nhận save cũ.

## Chưa làm

- Giao diện Admin phát kỷ vật theo người chơi/sự kiện (ngoài thử nghiệm API).
- Xác thực quyền sở hữu/hoàn thành đọc theo điều kiện mà máy chủ có thể kiểm chứng.
- Cơ chế đồng bộ quyền sở hữu vào kinh tế game hiện tại, nếu sau này cần.
- Phát hành kỷ vật từ item **công khai** (không phải private draft), cần thiết kế chuyển đổi rõ ràng.
