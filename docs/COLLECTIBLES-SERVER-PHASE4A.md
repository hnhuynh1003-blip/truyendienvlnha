# DUDU Studio 2.0 — Đợt 4A: Sổ kỷ vật có xác thực máy chủ

**Trạng thái 15/10/2026:** chỉ mã trên nhánh `feat/identity-npc-editor-v2`. **KHÔNG triển khai Cloudflare, KHÔNG merge `fixapp`, KHÔNG phát kỷ vật cho tài khoản thật.** Tham số `COLLECTIBLES_ENABLED="false"` được giữ riêng với `AI_ENABLED="false"`.

## Đã xây dựng

- `cloudflare/src/collectible-rules.mjs`: chuẩn hóa định nghĩa item do tác giả phát hành; từ chối ID không hợp lệ, nhóm thiếu chapterId, item ngẫu nhiên, data chưa xác nhận công bố.
- `cloudflare/src/collectibles.mjs`: sổ sở hữu `ownership(uid,story_id,item_id)` có khóa duy nhất trong SQLite Durable Object. Chạy giao dịch nguyên tử; cùng item/UID/truyện chỉ có một quyền sở hữu, kể cả yêu cầu đồng thời.
- `cloudflare/src/index.mjs` có endpoint sau, **tất cả đều khóa** khi `COLLECTIBLES_ENABLED=false`:
  - `GET /v1/collectibles/mine`: trả kỷ vật **được ghi trong sổ server** của người có Firebase ID token đã xác thực.
  - `POST /v1/collectibles/admin/publish`: cần verified custom claim `admin:true`, dữ liệu vật phẩm do tác giả xác nhận phát hành bằng `confirmPublicRelease:true`. Đây là **bước tác giả chủ động phê duyệt**; tạo vật phẩm trong Edit Truyện/Edit Chương không tự phát hành.
  - `POST /v1/collectibles/admin/disable`: tác giả dừng nhận item, không tịch thu quyền sở hữu đã cấp.
  - `POST /v1/collectibles/admin/grant`: tác giả ghi nhận quyền sở hữu item loại `STORY_EVENT` cho UID cụ thể. Không hỗ trợ random hoặc tự cấp theo nội dung chat.
  - `POST /v1/collectibles/begin`: ghi thời gian bắt đầu cho một cặp truyện/chương **đã được tác giả phát hành**, không hiển thị metadata vật phẩm.
  - `POST /v1/collectibles/claim`: kiểm tra đúng item đã công bố, đúng chương, elapsed time tối thiểu 90 giây và không sở hữu trước đó. **90 giây là ngưỡng tối thiểu chống spam, không phải chứng cứ đã đọc.**
- `js/collectibles-client.js`: chỉ truy vấn sổ server bằng Firebase ID token; chế độ `?sandbox=1` không gửi request.
- Cyber Phone → **Bảo Tàng Ký Ức**: giao diện chỉ đọc, hiển thị item của người dùng từ `/mine` (nếu bật sau này). Không coi `userProfile.inventory`, `localStorage` hoặc danh mục 70 món là bằng chứng sở hữu.
- Cloudflare Worker có thêm binding `DUDU_COLLECTIBLES` và migration SQLite mới, giữ nguyên binding `DUDU_QUOTA` cho AI. Build hiện tại là `wrangler deploy --dry-run`; **không** tự deploy.

## Cảnh báo nghiêm trọng và giới hạn vận hành

1. **Chưa có proof-of-reading đáng tin cậy.** Trình duyệt không thể chứng minh đã thực sự đọc hết chương. Bất kỳ người đăng nhập nào cũng có thể gửi /begin rồi đợi 90 giây /claim nếu item đã công bố; timer và khoá một-lần hạn chế spam nhưng không chứng minh đọc thật. Vì vậy **không bật `COLLECTIBLES_ENABLED` hoặc mở nút nhận trên UI**, đặc biệt cho đồ quý, cho tới khi chủ dự án chốt phương án điều kiện/sự kiện phù hợp.
2. **Dữ liệu truyện công khai:** `studio_data/main_library` vẫn public read; `novel.specialItems` được tác giả viết ở Đợt 3 có thể bị xem bằng Firestore API ngay cả khi UI ẩn. Chỉ lưu mô tả đã an toàn để công khai, không tạo plot twist/hidden secrets trong đó. DO không tự sinh spoiler mới nhưng cũng không thể che những dữ liệu đã lưu công khai. Để ẩn thật phải chuyển private author draft/private release manifest sang cơ sở dữ liệu chỉ admin có quyền đọc, trước khi đưa nội dung ẩn vào.
3. **Kho đồ và tiền/EXP cũ vẫn client-authoritative.** Quyền sở hữu kỷ vật DO tách riêng, không sửa/đồng bộ vào `profiles_v2.inventory`. Khi làm UI phần thưởng kinh tế, cần hạn chế Firestore rules chống ghi trực tiếp kho/EXP/xu; việc này có tác động ngược tới code cũ nên phải migrate cẩn thận.
4. **Admin publish chưa được nối vào giao diện**: chỉ có hợp đồng API và validate; chủ dự án chưa cần gọi bất kỳ lệnh cloud nào. Vật phẩm tác giả tạo vẫn chỉ là metadata; chưa có cơ chế tự publish/admin grant chính thức.
5. **Minh bạch chi phí:** cơ sở dữ liệu DO và request Cloudflare có hạn mức Free độc lập với Gemini/Firebase; bật riêng tính năng chỉ khi kiểm tra usage và chính sách Cloudflare.
6. Không xác minh tên người dùng nhập từ frontend cho /mine; Worker dùng UID lấy từ JWT kiểm chữ ký, issuer, audience. Các route admin kiểm tra **custom claim**, không dựa vào giao diện/tên admin.
7. Bảng `ownership` chỉ chứa định danh và thời điểm sở hữu; không lưu chat/NPC memories. Xóa hoặc archive item không làm mất quyền đã ghi.

## Bước tiếp theo (chưa thực hiện)

- Quyết định **định nghĩa chính xác sự kiện được xem là hợp lệ**: chương mới đọc lần đầu, một lựa chọn trong truyện, sự kiện do tác giả mở, hoặc chỉ xác nhận kỷ vật không có giá trị kinh tế; không dựa hoàn toàn trên mở trang/cuộn trang/timer.
- Thiết kế vùng bản thảo kỷ vật bí mật admin-only trước khi cho phép tác giả nhập spoiler.
- Thêm UI phê duyệt phát hành vật phẩm và test thực trên môi trường staging riêng, chưa áp dụng production; tối ưu quota và chống gọi quá mức.
- Test tích hợp thật với hai Firebase UID, Durable Object/SQLite, khi lỗi mạng/retry, và rollback `COLLECTIBLES_ENABLED=false`.
- Chỉ sau đó mới xét mở thu thập kỷ vật ở trang đọc. Game sưu tầm giữ trạng thái **thử nghiệm** cho đến thời điểm đó.
