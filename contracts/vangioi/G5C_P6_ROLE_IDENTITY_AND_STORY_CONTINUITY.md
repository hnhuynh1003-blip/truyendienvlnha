# G5C-P6 — Mở đầu thân phận, mạch truyện và kiểm thử góc nhìn nhân vật

**Ngày:** 28/10/2026. **Nền GitHub:** `478124cca193b69dd9758c0061fe2f9e36dd42d6` (G5C-P5). **Phạm vi:** Cải thiện **sandbox author→roleplay** Tầng Mây 9, không thay Creator/Thiên Mệnh production.

## 1. Lỗi đã được chủ dự án phát hiện khi chơi P5

- Nhi nhập vai người giao bưu kiện nhưng trong cùng cảnh lại có lựa chọn **“Gặp Nhi”**. Đây là lỗi nhập vai chính mình; không được xem là hành vi hợp lệ.
- Ảnh, văn gốc và lời cảnh được xếp kế nhau nhưng **không có nguyên nhân/hệ quả**, chỉ trích phần đầu chương rồi đưa các nút dẫn tới nơi khác. Người chơi không hiểu vì sao có mặt ở đó, biết gì, đi đâu hoặc chọn việc gì.
- Mặc dù có 4 entry profile, bản P5 chỉ áp `entryNotes` làm một nhãn phụ, trong khi **narration, dialogue, choice labels** vẫn dùng chung; thử với Nhi/K-07 lộ rõ bất nhất.
- Chưa có phần tiếp nhận thân phận trước cảnh đầu. Thiếu bối cảnh và ký ức riêng, không phải chỉ thiếu họa tiết HUD tương lai.

## 2. Ranh giới chức năng của P6

1. `vangioi-author-roleplay-offline` giữ nguyên G4A/G4B transitions và chặn ghi thưởng. Mở rộng **tương thích ngược** script thử qua trường *tùy chọn*: `entryBriefings` (mỗi entryId một bản giới thiệu), `page.context` (vì sao cảnh tồn tại), `page.roleScenes` (narration/dialogue/choiceLabels riêng từng entryId), `returnNarration` (đổi văn khi quay lại địa điểm). Đếm số lần thăm cảnh bằng `G4B events` đã kiểm replay, không tin bộ đếm do client tự khai; cấm phát lại sự kiện mở đầu khi đã rời rồi quay về. Tất cả khóa và độ dài được kiểm; không cho đổi ruleId, tạo role/choice, set flag, cấp thưởng hoặc làm thẩm quyền server.
2. Nguồn tác giả `tangMayScript(world)` định nghĩa bốn hồ sơ mở đầu (bối cảnh, ký ức, sự kiện kích hoạt, mục tiêu, giới hạn), mạch dẫn của đủ 11 cảnh, và góc nhìn riêng tại các cảnh có nguy cơ trùng nhân vật/không hợp lý.
3. Trong UI Vạn Giới, tác giả được chọn **góc nhìn đang viết** để sửa lời cảnh/hội thoại, câu chữ của từng lựa chọn và lời dẫn khi quay lại. **Không được sửa `ruleId`/điều kiện/đích đến bằng ô văn bản**. Chỉnh văn bản chung không tự ghi đè bản lời riêng; muốn sửa Nhi phải chọn Nhi. Cho sửa mạch cảnh và phần mở đầu theo vai trong tab RAM; nút kiểm thử dựng lại script và gọi QA thực.
4. Sau khi chọn vai, trình chơi phải hiển thị **màn hình tiếp nhận thân phận** trước phiên nhập vai. Hiển thị trí nhớ, sự kiện kích hoạt, mục tiêu và giới hạn; chỉ khi người chơi xác nhận mới khởi động G4B session. Trong cảnh hiện nguyên nhân/hệ quả và các manh mối phiên thử. Trích dẫn nguồn chuyển thể trong `<details>` đóng mặc định, không cắt ngang lời kể.
5. Màn hình tiếp nhận thân phận trong author sandbox **không phải cấp quyền tại Thiên Mệnh** và không biến dữ liệu client thành auth. World có thể thuộc bất kỳ thể loại nào; bộ truyện sci-fi này chỉ minh họa giao diện hệ thống, không ép thế giới khác có công nghệ năm 2187.

## 3. Điều kiện phải đúng khi QA

- Nhi nhìn thấy lời của **bà bán cháo**, không có lựa chọn gặp chính mình. Người đóng Lam có thể nói chuyện với Nhi như một nhân vật khác. Không tự spawn NPC của người đang bị nhập vai.
- Sau khi Nhi hỏi nhân chứng và trở về cầu tàu, màn hình kể **Nhi quay lại** với băng, không lặp lại cảnh đồng hồ nhảy 1:17 như thể thời gian reset.
- K-07 tới quầy tiếp nhận ngoài cửa kho, không vào phần hồ sơ khi chưa có dấu vết công khai. Lam/Khải có lý do nghề nghiệp cho startScene, không bị dịch chuyển ngẫu nhiên.
- Tác giả sửa phần mở đầu Nhi và narration dành cho Nhi thì phiên Nhi dùng đúng thay đổi. K-07 vẫn dùng bản riêng của K-07, không bị rò biên tập nhầm.
- P4 không có `entryBriefings` hoặc `roleScenes` vẫn được engine load; không sửa route cũ, không ép migration.
- Nhân vật, Canon và quyền cấp thưởng vẫn do hợp đồng/server kiểm tra riêng. Những `flags` trong RAM là vết đi qua cảnh, **không phải proof hoàn tất nhiệm vụ**.
- Chromium CI phải kiểm chuỗi: viết lại phần mở đầu → chọn vai → nhận thân phận → đọc cảnh đúng vai → chọn theo chứng cứ → ba kết cục what-if, ảnh, mobile 320–1280px. Smoke và Pages phải SUCCESS đúng commit P6.

## 4. Trạng thái còn giới hạn

Đây vẫn là **bản thử tác giả có truyện và đoạn diễn biến đã soạn**, chưa phải công cụ AI tự biến mọi chương thành các tuyến hoàn chỉnh, chưa có lưu nháp authenticated, chưa hỗ trợ sinh thêm cảnh/nhân vật từ giao diện và chưa liên thông backend production. Phát hành world, Canon, quyền auth, tiền/vật phẩm/NPC AI vẫn khóa.

**Rollback:** revert thay đổi sandbox/engine projection/fixture/HTML/CSS/asset bundle/test/docs P6. Không có migration hoặc dữ liệu server để phục hồi.
