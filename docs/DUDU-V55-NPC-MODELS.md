# DUDU Studio V55 — So sánh 7 model NPC Gemini (Spark + Cloudflare)

## Triển khai
GitHub `main` có giao diện chọn model ở **Điện thoại → Liên lạc**, số lượt còn lại và nhãn model dưới câu trả lời AI. **Deploy GitHub Pages không thay thế deploy Cloudflare Worker**.
- Cloudflare Worker `dudu-ai-staging`, đúng account đã dùng trong ảnh.
- Dùng file `cloudflare/wrangler.npc-ai-v54.toml`: chỉ `AI_ENABLED=true`, các tính năng thử nghiệm vẫn OFF.
- Chỉ thêm/vẫn giữ **GEMINI_API_KEY là Cloudflare Secret**; không nhập khóa vào trang web hoặc GitHub.
- Đứng trong thư mục `cloudflare`, đăng nhập bằng `npx wrangler login`, kiểm tra `npx wrangler whoami`, triển khai `npx wrangler deploy --config wrangler.npc-ai-v54.toml`. Nếu chưa thiết lập Secret, dùng lệnh `npx wrangler secret put GEMINI_API_KEY --config wrangler.npc-ai-v54.toml` rồi nhập vào prompt riêng.
- Xác nhận `/health` trả về tên dịch vụ `dudu-ai`, `enabled:true`. Nếu trả về dịch vụ khác, STOP, không ghi đè Worker.
- Kết nối trực tiếp Cloudflare không khả dụng qua GitHub connector này: **chưa deploy Worker** và chưa xác nhận khóa Gemini hoạt động.

## Model có thể chọn
| Model ID | Mục đích |
| --- | --- |
| `gemini-3.5-flash-lite` | Cơ bản, phản hồi nhanh |
| `gemini-3.1-flash-lite` | Lite thế hệ cũ |
| `gemini-3.6-flash` | So sánh nhập vai |
| `gemini-3.8-flash` | Flash mới |
| `gemini-3-flash-preview` | Preview cũ |
| `gemini-2.5-flash-lite` | Di sản, có thể hạn chế truy cập |
| `gemini-2.5-flash` | Di sản, có thể hạn chế truy cập |

Chỉ model trong allowlist này được chấp nhận. Tất cả model chia sẻ bộ đếm Worker: **120 lượt/ngày/UID, 250 lượt toàn hệ thống/ngày, tối thiểu 5 giây giữa hai lượt**, và một yêu cầu đang chạy mỗi UID. Giới hạn Google API theo model/project có thể thấp hơn.

## Cách so sánh phản hồi
1. Mở một NPC đã mở khóa qua tiến độ đọc.
2. Chọn một model ở thanh **AI** trong app Liên lạc.
3. Gửi cùng một câu hỏi, ví dụ: "Nếu tôi rời thế giới này, cậu có nhớ tôi không?"
4. Chọn model tiếp theo và gửi lại đúng câu. Tên model được lưu dưới phản hồi.
5. Nút `Lượt` hiển thị lượt còn lại theo ngày UTC; nếu API trả lỗi (hết quota, không được dùng model, Worker chưa bật), không bịa phản hồi giả hoặc cố vòng qua hạn mức.

## Giới hạn miễn phí
- Firebase Spark không bị nâng gói.
- **Gemini Developer API là hệ thống thanh toán riêng**, có hạn mức từng model, không vì sử dụng một người mà không thể tính phí.
- Chỉ kích hoạt với project API thực sự thuộc Free Tier nếu muốn chắc chắn không bị tính tiền. Kiểm tra định mức và việc có billing trong Google AI Studio trước khi triển khai.
- Cloudflare Workers có giới hạn sử dụng riêng, kể cả với 120 lượt Gemini.
- Các mô hình Pro, hình ảnh, audio/live và mô hình không nằm trong allowlist **không có trong NPC chat**.
- `wrangler.toml` cơ sở vẫn `AI_ENABLED=false` để rollback. Tránh tự động deploy khi push main.
