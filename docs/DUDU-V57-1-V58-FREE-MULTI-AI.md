# DUDU Studio — V57.1 / V58 Multi-AI Free-Only (DRAFT; NO DEPLOY)

## Phạm vi

- Giữ EPUB V57, dữ liệu Firestore, hồ sơ V56 A/B/C, chat cũ và phân quyền nguyên vẹn.
- Mã nằm **chỉ** trên nhánh `feat/dudu-v57-1-v58-free-multi-ai`. KHÔNG merge `main`, KHÔNG triển khai Cloudflare, KHÔNG kích hoạt thanh toán nếu chưa có phê duyệt tiếp theo.
- Mục tiêu V57.1: ngăn gửi lịch sử chat sai chuẩn lên Gemini, phân loại HTTP 400 thành mã an toàn, và kiểm thử tự động payload dùng chung AU / độc giả.
- Mục tiêu V58 R1: backend Multi-AI Gemini + Workers AI có allowlist và một lần fallback tối đa. OpenAI/Claude/DeepSeek vẫn là **định hướng**, không có API connector trả phí và không được gọi.

## Chẩn đoán lỗi Gemini HTTP 400

Đã xác nhận bản Worker có `textOnlyNpcContents` (V56.11); lỗi 400 trên điện thoại vẫn còn. Nguyên nhân cụ thể của 400 **chưa được xác minh** vì không có quyền xem log Google và không có token Firebase của AU/độc giả.

V57.1:
1. Bỏ nhánh fallback `textOnlyNpcContents(...) || payload.contents`; chuẩn hóa thất bại thì báo lỗi cục bộ, không gửi multi-turn chưa chuẩn hóa.
2. Bổ sung các mã `gemini-invalid-parameters` và `gemini-model-request` ngoài `gemini-turn-format`, `gemini-content-format`, `gemini-context-limit`.
3. Tuyệt đối không log/hiển thị prompt, chi tiết upstream, API key, Firebase ID token.
4. Lỗi HTTP 400 **không** tự chuyển nhà cung cấp; phải xác định sửa payload trước.
5. Quy trình kiểm thử trên bản **chưa triển khai** chỉ là unit/regression, KHÔNG phải xác nhận AU và độc giả đã chat thành công.

## Router V58 R1

- Gemini giữ nguyên catalog 7 model và route tác giả `assist`.
- Workers AI có hai model *dự kiến thuộc Free plan*: `@cf/zai-org/glm-4.7-flash` và `@cf/google/gemma-4-26b-a4b-it`. Catalog riêng, không chọn tùy ý ID hoặc endpoint.
- Có thể fallback **một lần** từ Gemini khi quá tải / 429 / lỗi kết nối / không có model, và **chỉ** khi các cờ chấp thuận thủ công đã bật.
- **Mặc định Worker AI TẮT.** Tất cả các cờ `DUDU_WORKERS_AI_APPROVED=false`, `DUDU_WORKERS_ACCOUNT_FREE_VERIFIED=false`, `DUDU_AI_FALLBACK_ENABLED=false`, `DUDU_PAID_PROVIDERS_ENABLED=false`. `DUDU_AI_FREE_ONLY=true`.
- Để các cờ chỉ có thể được bật SAU KHI người vận hành kiểm tra tài khoản Cloudflare là **Workers Free, không có overage billing**, đã hiểu mức 10.000 Neurons/ngày và cho phép bằng một phê duyệt riêng. Cờ phần mềm KHÔNG tự chứng minh trạng thái thanh toán của Cloudflare.
- Không gọi OpenAI, Anthropic, DeepSeek API hoặc AI Gateway prepaid. Không đặt API key hoặc config bí mật trên Github/frontend.
- Luồng Firebase JWT / vai trò `assist` chỉ admin / Durable Object quota 120 UID/ngày và 250 toàn app/ngày không thay đổi. Lượt lỗi vẫn được tính như số lần thử để chặn spam; việc hoàn lại lượt lỗi cần thiết kế riêng.
- Giao diện chỉ hiển thị các Workers AI model khi `/v1/status` đã xác nhận chúng thực sự được kích hoạt, không dùng danh sách tự khai của browser.
- Chat/memory vẫn phân tách UID + truyện + roleId + NPC. Worker chỉ nhìn instruction/context từ client đã qua kiểm tra cấu trúc; đây chưa phải sandbox quyền đọc dữ liệu truyện ở server.

## Kiểm thử

- `node --test cloudflare/tests/*.test.mjs`
- `node --test tests/*.test.cjs`
- `node --check cloudflare/src/index.mjs`
- `node --check js/ai-proxy.js`
- `cd cloudflare && npm run build` (dry-run; không triển khai).
- Test 400 và fan-out fallback bằng mock, không dùng API key thật.

### Manual release gate (AU và độc giả riêng biệt)

1. Thực hiện trên **môi trường thử nghiệm có token riêng**, không phải trên main/production, chỉ sau khi được duyệt triển khai staging.
2. Đăng nhập bằng hai UID Firebase thật khác nhau (AU và độc giả); xác minh `/v1/status` cho cả hai.
3. Cả hai chọn vai B/cùng NPC đã mở khóa; gửi “Xin chào”, rồi gửi “Tôi không phải nhân vật chính”. Xác nhận reply đúng, tin nhắn không chảy qua người dùng khác.
4. Chọn vai A và C trong hai phiên khác nhau; xác nhận danh tính, ký ức và truyện không bị trộn. Không làm thay đổi lịch sử V55 và EPUB V57.
5. Khi cố tình tạo lỗi HTTP 400, không chuyển provider và không thay đổi lịch sử; khi lỗi nhà cung cấp 429, chỉ fallback nếu tài khoản Cloudflare Free đã được xác nhận và các cờ bật bằng phê duyệt riêng.
6. Rà quyền AU đọc/sửa và độc giả chỉ đọc, và phản hồi NPC theo tiến độ chương.
7. Trước khi bất kỳ merge/deploy nào: chủ dự án kiểm tra kết quả, secrets và ngân sách; cho phép từng bước rõ ràng.

## Việc còn lại

- Chẩn đoán nguyên nhân HTTP 400 từ log upstream đã lọc sau một test có kiểm soát; tuyệt đối không đoán “đã sửa”.
- Hoàn tất kiểm thử đăng nhập thực tế AU / độc giả khi có staging và chủ tài khoản xác nhận.
- Mở rộng V58.2: provider adapters mới **chỉ sau khi đánh giá được chi phí**, AI Director dùng điều kiện cốt truyện và kiểm thử bằng các nhánh truyện đã mở khóa.


## V58 R1.1 – 18/10/2026: ổn định router và giới hạn chi phí

- V57.1 đã gộp vào `main` tại PR #15. Tuy nhiên GitHub Actions deploy **chưa chạy được** vì thiếu `CLOUDFLARE_API_TOKEN` (và cần xác nhận `CLOUDFLARE_ACCOUNT_ID`) trong repository secrets. Không thể xác nhận Gemini HTTP 400 hết cho đến khi deploy và test AU/độc giả thật.
- Worker AI nhận `choices[0].message.content` (OpenAI-compatible) **hoặc** `response` dạng cũ; tuyệt đối không trả `reasoning` hoặc `tool_calls` lên ứng dụng Liên lạc. `usage` được chuẩn hóa.
- Fallback giới hạn một lần với `gemini-rate-limit`, `gemini-overloaded`, `model-unavailable`, `upstream-error` khi chủ dự án đã bật hợp lệ. Không fallback với `upstream-unavailable` (có thể là timeout sau 25 giây; trình duyệt chỉ chờ 32 giây), HTTP 400, lỗi xác thực hoặc hết ngân sách.
- Cloudflare Free cho Workers AI có 10.000 Neurons miễn phí/ngày; tài khoản Workers Paid có thể tính phí sau ngưỡng này. Phần mềm **không thể tự xác minh tài khoản đang Free**. Vì vậy mọi cờ Workers AI/fallback ở cấu hình chính vẫn là `false`; chưa bật cho người đọc.
- Đã đồng bộ nhánh V58 với commit `main` chứa PR #15; `main` không được merge V58 tự động.
- Bài kiểm thử mock chỉ kiểm tra giao thức và cấu trúc; không xác nhận dịch vụ AI thật hoạt động, không xác nhận Cloudflare billing.


## V58 R1.2 — 19/10/2026: Phương án Workers Free được người dùng xác nhận

Người quản lý dự án xác nhận tài khoản Cloudflare đang ở **Workers Free** và không có ý định đăng ký gói trả phí trong giai đoạn này. Đây là xác nhận từ người dùng, **không phải xác thực tự động qua Cloudflare Billing API**.

- Theo Cloudflare Workers AI pricing (cập nhật 01/10/2026), tài khoản Workers Free có 10.000 Neurons/ngày; quá hạn mức thì yêu cầu bị từ chối, không phát sinh trả phí. Ngày quota reset 00:00 UTC.
- Chỉ dùng hai model Free hiện được Cloudflare liệt kê: `@cf/zai-org/glm-4.7-flash`, `@cf/google/gemma-4-26b-a4b-it`. KHÔNG gọi model đòi Paid hoặc AI Gateway credits.
- Router V58 nhận diện mã lỗi `3036` (hết quota Free), `3040` (hết công suất), `5035` (bắt buộc Paid) và các lỗi 403/429; **không gọi model thứ hai để vượt giới hạn**. Không hiển thị raw upstream errors, token, UID hay prompt.
- DUDU Quota tại Durable Object vẫn là 120 lượt/UID/ngày và 250 lượt toàn hệ thống; các lượt thử thất bại được tính để chống spam. 10.000 Neurons/ngày là ngân sách **toàn Cloudflare**, không phải 10.000 lượt chat.
- Cờ `DUDU_WORKERS_AI_APPROVED`, `DUDU_WORKERS_ACCOUNT_FREE_VERIFIED`, `DUDU_AI_FALLBACK_ENABLED` vẫn **false trong cấu hình**. Người dùng xác nhận gói Free không đồng nghĩa với duyệt deploy / bật dự phòng trên website công khai.
- Trình tự: kiểm tra model trong Cloudflare Playground nếu cần → chạy dry-run và kiểm thử Firebase AU/độc giả trên Worker **preview độc lập** → đối chiếu chi phí/quota thực → xin phê duyệt rõ ràng trước khi tích hợp với production.
- Không phát hành `PR #14` lên main trong bước này.
