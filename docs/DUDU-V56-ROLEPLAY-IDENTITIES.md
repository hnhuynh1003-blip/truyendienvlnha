# DUDU Studio V56 — danh tính nhập vai riêng theo truyện

## Tình trạng
- Frontend only, triển khai qua GitHub Pages khi CI đỗ. Không cần deploy lại Cloudflare Worker V55 và không thay Firebase Rules / Blaze.
- Điện thoại → Liên lạc: thẻ **Vai của bạn** và **+ Tạo / Sửa**. Phải có một vai đang chọn trước khi gửi NPC AI.
- Chế độ A **Hóa thân nhân vật chính**: chỉ chọn nhân vật có `role` chính hoặc ID do tác giả ghi trong `novel.roleplayPolicy.mainCharacterIds`; không biến NPC bất kỳ thành chính diện. Nếu truyện không có nhân vật chính được xác định, chọn B/C hoặc tác giả đánh dấu nhân vật chính trong vai trò của nhân vật.
- Chế độ B **Người lạc giới/qua đường**: tên, cách xưng hô, tiểu sử người đọc tự cung cấp, AI không mặc định đã quen.
- Chế độ C **Người quan sát**: giao tiếp với NPC ngoài cốt truyện, không tự biến thành người trong truyện.
- Tối đa 6 vai / mỗi truyện / tài khoản. Có thể chuyển giữa các vai nhưng không chuyển đổi **loại** của vai cũ vì việc đó làm lẫn ký ức.
- Có chọn chân dung tùy theo vai: avatar tài khoản hiện tại, chữ viết tắt hoặc 4 chân dung anime đã có của DUDU. Không cung cấp thêm frame hoặc quyền cấp vật phẩm.

## Khu vực lưu trữ
- Hồ sơ: `dudu-v2:<encodeURIComponent(firebaseUid)>:<encodeURIComponent(storyId)>:roleplay-v56` (`dudu-sandbox-v2` trong Sandbox). Lưu trong `localStorage`, không đồng bộ qua thiết bị khác.
- Hội thoại mới: trong blob chat **hiện có theo UID**, khóa `<storyId>::role56:<roleId>::<npcId>`.
- Ký ức cục bộ mới: qua `DuduNpcMemory.open` với NPC ID tách theo `<npcId>~role56~<roleId>`. Không đụng dữ liệu gốc `uid/storyId/npcId`.
- Dữ liệu cũ V55 `<storyId>::<npcId>` và bộ nhớ cũ **giữ nguyên**. Không tự chuyển một lời thoại không có danh tính sang bất kỳ vai nào. Nút **Nhập bản sao hội thoại V55** chỉ hiện khi NPC đó có lịch sử cũ, vai hiện tại chưa có chat; cần người dùng xác nhận. Không sao chép ký ức V55, quà, kỷ vật, vật phẩm hoặc quyền NPC.
- Cùng một tài khoản, các vai dùng chung **tiến độ mở khóa truyện/NPC và kho đồ tài khoản**, KHÔNG thể nhận thưởng nhiều lần do tạo thêm vai.
- Chỉ số *quan hệ nhập vai* V56 cho từng vai/NPC là bộ đếm cục bộ độc lập (tối đa +3 thiện cảm và +1 tin tưởng/ngày do trả lời AI, không phát sinh quyền hoặc kỷ vật). Cơ chế quà tặng / trust có giao dịch lịch sử trên hồ sơ tài khoản vẫn giữ như V55; **chưa chuyển quà và settlement thành sổ giao dịch theo từng vai**. Đây là phần mở rộng cần đặc tả riêng nếu muốn chính thức hóa.

## AI và an toàn
- Prompt Gemini có tên, kiểu vai, cách xưng hô và tiểu sử được xác nhận, không được tự gán thân phận khác hoặc tự viết lại lore.
- AI chỉ gửi nếu xác định được vai hiện tại, Firebase UID và NPC đã mở khóa.
- Khi người dùng chuyển vai trong lúc AI đang trả lời, phản hồi được lưu về hội thoại của vai đã gửi, không vẽ lên hội thoại của vai khác. Ghi nhận quan hệ chỉ thuộc vai nguồn.
- Văn bản AI chỉ là nhập vai; không phải bằng chứng mốc truyện, không được cấp Xu, XP, vật phẩm, mở khóa NPC hay xác nhận mốc tác giả.
- Các giới hạn AI V55 `120/ngày/UID`, `250/ngày toàn hệ thống`, tối thiểu 5 giây giữa yêu cầu không thay đổi.
- Khóa/giới hạn Gemini vẫn ở Cloudflare Server; mọi yêu cầu phải đi qua Worker có JWT được xác minh.

## Kiểm thử và vận hành
- `tests/roleplay-v56.test.cjs`: A/B/C, phạm vi UID/truyện/Sandbox, nhập dữ liệu, bộ đếm quan hệ riêng, chặn đổi loại vai.
- Cập nhật bài kiểm thử Phase 1/Chromium tạo vai trước khi nhắn tin; giữ các ca kiểm thử quà/giỏ/sandbox đã có.
- Trang mở: `https://hnhuynh1003-blip.github.io/truyendienvlnha/?v=56`; trên Windows `Ctrl+F5` nếu gặp cache.
- Nếu tài khoản V55 cũ không thấy tin nhắn: chúng được cố tình giữ tại **chưa gán vai**; chọn NPC và chọn **Nhập bản sao hội thoại V55** nếu thực sự muốn dùng làm quá khứ vai mới.
- Nếu muốn xóa/reset hồ sơ người chơi, V54 sẽ sao lưu cả khóa local V56 thuộc UID trước khi xóa; không sửa thư viện truyện và bản EPUB.
