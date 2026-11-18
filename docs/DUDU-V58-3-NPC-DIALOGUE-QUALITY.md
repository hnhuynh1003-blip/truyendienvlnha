# DUDU V58.3 — Ưu tiên chất lượng Liên lạc, chưa triển khai World AI

Ngày: 19/10/2026. Phạm vi thử nghiệm: cùng một adapter hội thoại cho AU và độc giả. Không thay đổi sản phẩm đọc truyện, Firebase Rules, Cloudflare billing hoặc ký ức cũ.

## Chẩn đoán đã kiểm tra trực tiếp trong mã nguồn
- Browser `DuduNpcContextV5610.compose` đã giữ tối đa 12 lượt đối thoại đúng vai; Firebase UID / storyId / roleId / NPC ID được khoanh vùng trước khi gửi lên Worker.
- Worker Gemini V56.11 cố ý gộp lịch sử thành một lượt `user` có trích dẫn để né lỗi thoughtSignature/HTTP 400.
- Worker V58.2 **đã áp dụng cách gộp tương tự cho GLM/Gemma**, khiến mô hình khó phân biệt người chơi và NPC, và đôi lúc trả lời tin cũ hoặc nhầm tên. Đây là lỗi kiến trúc cần sửa trước khi thử model mới.
- V58.3 chỉ dành cho Workers AI: gửi tối đa 9 lượt `user/assistant` xen kẽ bằng API messages, giữ câu hỏi cuối cùng, bỏ các cặp cũ nếu quá 9.000 ký tự; không tự tạo ký ức, không gọi thêm AI. Gemini giữ adapter hiện tại.

## Tiêu chí chất lượng trò chuyện trước khi làm xuyên thế giới
1. **Đúng câu hỏi mới nhất:** một câu trả lời phải nhắc trực tiếp điều được hỏi hoặc nói rõ chưa có thông tin.
2. **Liên kết 3–4 lượt:** nhớ tên hoặc câu đã trao đổi; không nhắc lại câu thoại cũ như tin mới.
3. **Phân biệt nhân vật:** tên, trạng thái nhập vai và ký ức phải tách theo UID / truyện / hồ sơ A-B-C / NPC; không nhầm người qua đường thành nhân vật chính.
4. **Không sửa nguyên tác:** tình tiết, bí mật, tình cảm và sự kiện chưa mở không thành sự thật chỉ vì AI suy đoán.
5. **Thể hiện tính cách:** giọng nhắn theo hồ sơ tác giả; không vô cớ xúc phạm người chơi, không dùng phản hồi rập khuôn.
6. **Hạn mức:** cùng một lượt AI; không tự tạo thêm lượt đánh giá bằng AI, không làm tăng chi phí trả phí.

Trước khi phát hành, thử bộ đối thoại có câu hỏi nối tiếp và đại từ mơ hồ trên cả GLM và Gemma, bằng AU và độc giả. Mức đạt mục tiêu: tối thiểu 80% câu trả lời đúng trọng tâm; không nhầm danh tính hoặc spoiler trong các tình huống thử cố định. Đánh giá thực tế phải do người kiểm thử xem, unit test không đo được chất lượng ngôn ngữ.

## “AI học từ hội thoại” có ba mức khác nhau

**Mức A — Ngữ cảnh trong từng lượt (đang cải thiện).** Trích đúng lịch sử hiện tại và ký ức địa phương đã được tạo; không thay đổi trọng số model.

**Mức B — Bộ ví dụ tốt/xấu để cải thiện DUDU AI.** Bắt đầu với dữ liệu **giả lập** do tác giả tự tạo, có nhãn cho câu hỏi, NPC, bối cảnh, câu trả lời mục tiêu và lỗi (lạc đề, quên tên, xúc phạm, spoiler, sai vai). Dùng đánh giá offline và chỉnh hướng dẫn hệ thống. Không lưu hội thoại thật ở server tại V58.3.

**Mức C — Thu thập mẫu thật/tinh chỉnh model sau này.** Chỉ sau khi có giao diện **đồng ý riêng, mặc định TẮT** để người dùng chọn từng đoạn cần chia sẻ. Phải công khai mục đích sử dụng, nơi lưu, thời hạn lưu, ai được truy cập, quyền thu hồi/xóa. Bỏ UID thật, bí mật cá nhân, tên người dùng, thông tin truyện chưa công bố; ẩn danh tự động không được xem là đủ, cần tác giả duyệt trước khi vào tập dữ liệu. Không dùng trao đổi riêng của độc giả làm dữ liệu huấn luyện model bên thứ ba theo mặc định.

Nếu người dùng không đồng ý, DUDU vẫn cho trò chuyện bình thường như trước. Nội dung chỉ được “học” ở các mức phù hợp; không tuyên bố Gemini/GLM được tinh chỉnh hoặc cập nhật trọng số nếu chưa chạy quá trình huấn luyện thật có căn cứ pháp lý và kỹ thuật.

## Trạng thái triển khai
- Thử nghiệm V58.3 chỉ trên PR, **chưa merge main và chưa deploy Worker**. V58.2 ở production không đổi.
- Nhánh ý tưởng World AI V59 dừng ở bước chuẩn bị, không có tính năng World nào được triển khai.
- Mọi mở rộng luồng góp ý/chia sẻ dữ liệu thực phải được chốt trải nghiệm quyền riêng tư trước khi viết phần gửi/lưu server.
