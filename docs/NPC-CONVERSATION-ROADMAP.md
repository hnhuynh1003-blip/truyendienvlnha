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

**Phụ thuộc vào chủ dự án cấu hình Cloudflare:** triển khai Worker riêng, lưu Gemini key trong Secrets, xác minh Firebase ID token phía Worker, kiểm soát CORS/App Check hoặc biện pháp chống lạm dụng tương đương, quota theo UID và toàn hệ thống trong kho lưu trữ an toàn. Đảm bảo quota không thể bị vượt khi gọi song song. Cấu hình model còn hỗ trợ hạn mức miễn phí; test lỗi 429/503.

> Thư mục `functions/` trước đó là **bản thiết kế Firebase Blaze**, hiện **chưa triển khai** và không hoạt động trên Spark. Trước khi bật live cần thay frontend adapter qua Worker, không chạy song song hai backend AI.

**Ngân sách:** dù Cloudflare Workers Free có hạn mức yêu cầu, token Gemini vẫn có quota độc lập. Giữ kill switch để ngắt AI khi hết giới hạn, không đưa key vào mã frontend, kiểm thử sai/giả mạo token.

## Đợt 4 — Kiểm thử phát hành

- Độc giả, Admin, khách chưa đăng nhập; Cloudflare CORS + JWT xác thực thật.
- Không rò key, không gửi lời thoại lỗi thành lời NPC, không lộ ký ức người dùng khác.
- Quota chống spam, khả năng phục hồi chat, token usage đo được.
- Test trình duyệt desktop/mobile, bản ghi nhớ và sự kiện NPC. Chỉ merge sau khi có duyệt riêng.

**Nguyên tắc không đổi:** chất lượng nhập vai và dữ liệu cá nhân > tiết kiệm token bằng mọi giá. Không nhét thêm nút/token bar vào Cyber Phone trong các đợt này.
