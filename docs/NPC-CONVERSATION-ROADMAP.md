# DUDU Studio 2.0 — Lộ trình hội thoại NPC (triển khai từng đợt)

> Mục tiêu: NPC có tính cách, ký ức và phản ứng nhất quán. Tối ưu Gemini ở phía sau; không làm người chơi thấy chatbot hoặc bộ đếm token. Mọi thay đổi **trên nhánh `feat/identity-npc-editor-v2`**, không merge `fixapp` khi chưa kiểm tra người thật.

## Đợt 1 — Tự nhiên trước, miễn phí khi thích hợp

**Triển khai trong nhánh thử nghiệm:**

- Chỉ sử dụng lời thoại miễn phí cho câu giao tiếp **độc lập, ngắn và rõ nghĩa**.
- Dựa trên tính cách NPC; không giả vờ biết bí mật truyện, trạng thái hay ký ức chưa có.
- Nếu NPC ở trạng thái nhạy cảm (mất kết nối, bị thương, truy đuổi...) hoặc có hội thoại AI đang tiếp diễn, **không chen lời thoại mẫu**.
- Chặn lặp câu chào liên tục; hội thoại cụ thể/chi tiết đi qua AI.
- Thông báo lỗi mạng nằm ngoài bong bóng NPC; người chơi có thể thử lại **không gửi trùng tin nhắn** khi backend khả dụng.
- Giữ nguyên dữ liệu lịch sử chat theo tài khoản + truyện + nhân vật; không cộng xu, EXP, thân mật khi chào hỏi.
- Kiểm thử unit + Chromium cho kịch bản/AI fallback/quyền tác giả/sandbox.

**Giới hạn:** chưa kích hoạt Gemini thật vì Firebase của tác giả vẫn dùng Spark. Câu hỏi cần AI phải đợi máy chủ bảo mật được triển khai; không được tự bịa câu trả lời về nhân vật.

## Đợt 2 — Ký ức có ngữ cảnh, giảm token mà không quên chuyện

**Đã triển khai phần 2.1 — truy xuất lịch sử chat cũ tại thiết bị, không cần gọi thêm Gemini:**

- `js/story-memory.js` lấy nhiều nhất **hai cặp tin user/NPC cũ** thực sự liên quan đến câu hỏi hiện tại, theo từ khóa và độ gần đây. Mỗi tin hồi tưởng được rút xuống tối đa 220 ký tự.
- Lấy dữ liệu từ `chatHistories[storyId + '::' + npcId]` đã được tải riêng theo UID của tài khoản hiện tại; không tạo ký ức hoặc nguồn dữ liệu giả.
- Không kéo câu chào kịch bản, tin lỗi hoặc thông tin không liên quan vào phần hồi tưởng. Khi không tìm được thông tin phù hợp, chỉ gửi lịch sử gần đây.
- Toàn bộ lịch sử cũ vẫn được giữ nguyên. Tối đa 4 tin hồi tưởng + 8 tin gần đây = 12 tin (phù hợp giới hạn API backend thử nghiệm).

**Đã triển khai phần 2.2 — Sổ ký ức sự kiện cục bộ có nguồn và quan hệ:**

- `js/npc-memory-v2.js` lưu **riêng theo UID / storyId / npcId** với khoá cục bộ phiên bản hóa, và `sandbox` tách biệt hoàn toàn dữ liệu thật. Dữ liệu mới hoàn toàn **bổ sung**, không xoá hoặc đổi cấu trúc save cũ.
- **Ba tầng nguồn:** (1) hồ sơ chính thức `novel.characters[]` do tác giả tạo; (2) trạng thái quan hệ và mức thân mật sẵn có trong `userProfile.storyStates`; (3) nhật ký tương tác người chơi–NPC và tặng quà, có nhãn nguồn và mức độ tin cậy.
- Sự kiện chat gồm **đúng lời người chơi đã gửi / phản hồi NPC đã tạo**; lời người chơi chỉ là lời kể, **không thể biến thành thiết lập chính thức của truyện**. Quà được gắn nhãn `game-local`, **chưa xác minh bởi máy chủ**. Không tự bịa sự kiện, không tự tăng cấp, EXP, thân mật, xu.
- Tối đa **40 sự kiện đã ghi/NPC trên thiết bị**, tối đa 240 ký tự lời người chơi, 260 ký tự câu trả lời cho mỗi sự kiện; loại bỏ bản ghi lâu nhất khi vượt hạn mức. Chỉ chọn tối đa **2 sự kiện liên quan** cho một câu hỏi; phần tóm tắt sự kiện được giới hạn 460 ký tự, không tốn thêm lượt Gemini.
- Các ghi chú sự kiện đặt trong **ngữ cảnh người dùng không đáng tin**, không ghép vào chỉ dẫn hệ thống hoặc cho phép ghi đè hồ sơ tác giả. Lịch sử gần nhất (tối đa 8 lượt) và tối đa 1 cặp hội thoại liên quan trước đó giúp không vượt 12 tin của adapter.
- Xóa trò chuyện được xác nhận sẽ xóa cả sổ ký ức riêng của NPC, và ngăn phản hồi AI đến muộn tái tạo dữ liệu đã xóa. Kiểm thử cục bộ + Chromium: cách ly tài khoản/truyện/NPC, nguồn, tăng trưởng, xóa, thử lại.
- **Giới hạn cần nói rõ:** Đây là bộ nhớ dài hạn trong **cùng thiết bị/trình duyệt**, không phải đồng bộ nhiều thiết bị, lưu vĩnh viễn hay ngân hàng ký ức vô hạn. Nó phụ thuộc `localStorage` (có thể bị xóa, có quota). Bản ghi không được máy chủ xác minh; hệ thống kinh tế/quà tặng còn cần xử lý an toàn về sau.

**Phần tiếp theo sau 2.2, chưa triển khai:** Đồng bộ bộ nhớ giữa thiết bị, mở khóa ký ức dựa trên quest/chapter do backend xác minh, tóm tắt theo tầng không suy đoán, và cơ chế xuất/sao lưu dữ liệu khi phát hành thực tế.

## Đợt 3 — Gemini qua Cloudflare Workers Free (không cần Firebase Blaze)

**Đã hoàn thành phần code và kiểm thử ngoại tuyến; CHƯA triển khai tài khoản Cloudflare:**

- Worker riêng tại `cloudflare/`, với `wrangler.toml` cấu hình SQLite Durable Object dùng được trên Workers Free; giới hạn đồng thời bằng transaction SQL trong một Durable Object chung.
- Kiểm tra chữ ký RSA của Firebase ID token với JWKS Google, audience `truyendienvl`, issuer, expiration, `auth_time`; độc giả không được dùng API hỗ trợ tác giả.
- Gateway kiểm soát CORS, giới hạn input/output, bảo vệ Gemini key trong Cloudflare Secret, chống spam theo UID, hạn mức 25/người/ngày và 200/toàn hệ thống/ngày.
- Bài kiểm thử tạo JWT thật trong CI để thử token hợp lệ, giả mạo chữ ký, sai issuer/audience và hết hạn. Wrangler bundle chạy ở chế độ `--dry-run`, **không đăng nhập/deploy Cloudflare**.
- `js/ai-proxy.js` đã chuyển sang Cloudflare HTTP. `WORKER_URL` đã điền đường dẫn staging công khai do chủ dự án xác nhận truy cập được; Worker `AI_ENABLED = "false"`. Tại thời điểm này UI vẫn dùng hội thoại kịch bản cho câu chào và báo gián đoạn nếu cần AI.
- Hướng dẫn an toàn: `cloudflare/README.md`. **Bước tiếp theo cần chủ tài khoản tự mở Cloudflare và triển khai Worker tắt AI** để lấy URL công khai. Không chia sẻ Gemini key, email hoặc tài khoản.
- Firebase vẫn là Spark; `functions/` là kiến trúc Blaze **không triển khai**. Không chạy đồng thời hai backend.

**Chưa hoàn thành và không được tuyên bố đã sẵn sàng công khai:** chạy thử Cloudflare thật với Firebase ID token của người dùng, Turnstile/App Check hoặc giải pháp chống lạm dụng bổ sung khi cần, nhập key vào Secrets, kiểm tra hạn mức Gemini thực tế, audit token usage, triển khai site beta riêng và phê duyệt bật `AI_ENABLED`. CORS không ngăn được client tự tạo request ngoài trình duyệt; xác thực chữ ký và quota mới là ranh giới chính.

**Ngân sách:** Cloudflare Workers Free và Gemini miễn phí là hai hệ thống hạn mức độc lập; Worker chỉ chặn quá hạn mức **do DUDU tự đặt**, không bảo đảm không vượt bất kỳ hạn mức dịch vụ Gemini nào.

## Đợt 4 — Kiểm thử phát hành

- Độc giả, Admin, khách chưa đăng nhập; Cloudflare CORS + JWT xác thực thật.
- Không rò key, không gửi lời thoại lỗi thành lời NPC, không lộ ký ức người dùng khác.
- Quota chống spam, khả năng phục hồi chat, token usage đo được.
- Test trình duyệt desktop/mobile, bản ghi nhớ và sự kiện NPC. Chỉ merge sau khi có duyệt riêng.

**Nguyên tắc không đổi:** chất lượng nhập vai và dữ liệu cá nhân > tiết kiệm token bằng mọi giá. Không nhét thêm nút/token bar vào Cyber Phone trong các đợt này.


## Quy tắc thiết kế mới: Truyện dẫn dắt, NPC giữ chân (đã thống nhất ngày 15/10/2026)

**Định hướng đã chốt, KHÔNG tự ý đổi luật game cho tới khi đợt riêng được kiểm tra:**

- Lối chơi cốt lõi: mở truyện → theo dõi diễn biến → gặp nhân vật → tùy chọn liên kết linh hồn → giữ liên lạc với **NPC yêu thích**, kể cả khi chưa đọc chương mới.
- Không bắt độc giả chat với hàng loạt NPC; không có nhiệm vụ/ngày dạng "chat đủ 10 nhân vật"; không ép đổi NPC để đủ điểm.
- Trò chuyện với NPC mở khóa được duy trì lâu dài; không khóa cuộc trò chuyện chỉ vì hết chỉ tiêu đọc hàng ngày. Hạn mức kỹ thuật Gemini phía máy chủ có thể áp dụng khi API quota cạn, nhưng **không phải điểm năng lượng xã hội** trong game.
- Người chơi đọc chương mới sẽ khám phá tình tiết/nhân vật/bí mật mới. Những sự kiện mới có thể mở thêm **chủ đề, ký ức xác thực, lựa chọn** khi trò chuyện với người cũ, chứ không khóa quyền chat đã mở.
- Đặc biệt tránh **spoiler**: prompt NPC phải được lọc theo `storyId`, `chapterProgress`, NPC đã gặp và quyền tiết lộ của tác giả. Việc chứa `char.note` toàn bộ hoặc biết sự kiện chương sau là rủi ro; hiện **chưa triển khai lọc spoiler**. Chưa triển khai cũng không được tuyên bố NPC luôn bảo vệ bí mật truyện.
- Chỉ ghi nhận hoàn thành chương khi sự kiện đọc thực sự đáng tin; không sử dụng chỉ số cuộn/nhấp nút đơn lẻ để cấp lợi ích kinh tế. Trình duyệt không phải backend chống gian lận.
- KPI đánh giá: tỷ lệ người quay lại đọc, số chương hoàn thành, mức quan tâm NPC được mở khóa, sự tự nhiên/không lộ spoiler, không chỉ số cuộc trò chuyện.

**Lộ trình nhỏ, để tránh xung đột:** (1) chọn model staging và kiểm thử; (2) đo hội thoại NPC yêu thích với 1–2 nhân vật; (3) thiết kế chống spoiler theo chương; (4) tính năng tương tác bám theo sự kiện đọc; (5) mở beta sau khi bảo mật chi phí và kiểm thử. Không làm tất cả cùng lúc.

**Chọn model ở nhánh thử nghiệm:** `cloudflare/wrangler.toml` và `cloudflare/src/index.mjs` đã chuẩn bị đổi sang `gemini-3.5-flash-lite` theo quota 500/ngày mà tác giả thấy trong Google AI Studio. `gemini-3.1-flash-lite` là model đối chứng trong vòng thử sau; `gemini-3.8-flash` để dành trường hợp đặc biệt nếu thực sự có lợi. Không dùng fallback tự động khi chưa có đo lường, và **không giả định quota của một model cộng dồn sang model khác**.

**Ranh giới vận hành:** Worker đã được tạo ở `dudu-ai-staging.dudu-studio-ai.workers.dev`, key được chủ dự án lưu trong Cloudflare Secret, nhưng môi trường đã deploy vẫn dùng model cũ và `AI_ENABLED=false`. Thay đổi GitHub chưa tự cập nhật Worker: cần tải bản nhánh mới rồi chạy `npx wrangler deploy` riêng khi sẵn sàng. Không bật AI cho khách trước khi chạy thử đăng nhập/quota thật.
