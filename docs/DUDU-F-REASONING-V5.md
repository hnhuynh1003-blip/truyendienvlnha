# DUDU Studio — F Reasoning V5 · Điều tra không cưỡng ép / không lặp thoại

Ngày 20/10/2026. Phạm vi: phó bản **Đêm mưa ở Quan Đạo** dạng **pilot**, trên nhánh `main`. Không có nhiệm vụ server hay thưởng thật.

## Phản hồi và nguyên nhân lỗi V4

1. Sổ tay có 5 manh mối được hiểu như mục tiêu phải gom đủ; điều kiện mở suy luận dựa vào tập chứng cứ cố định (`key_log` + `broken_seal` + ít nhất một lời khai). Người chơi cần được suy luận sớm, tự chọn cách kiểm tra và mức độ chắc chắn, không đi săn số lượng manh mối.
2. Nút kết thúc hòa giải từng chuyển thẳng sang đoạn “Lục Tam nhận tội” khi người chơi nhấn mời họp, rút gọn quá mức tính nhân quả. **Một cuộc họp không phải phép ép buộc NPC thú nhận.**
3. Engine `view()` gọi `model.npcView(world,npcId,state)` mỗi khi render cảnh có NPC, lấy lời gần nhất dựa trên *tổng chứng cứ/flags của người chơi*, không dựa vào lời thực sự phát ra ở cảnh hiện tại. Do đó khi qua cảnh khác, câu thoại được tự thêm/lặp; đôi lúc bật ra thông tin sớm hơn kịch bản dự định.

## Sửa đổi đã triển khai — V5

- `js/dudu-pilot-f-v2b.js` giữ tên file import, nhưng đã đổi thành `scenarioId=pilot-quan-dao-reasoning-v5`, `scenarioVersion=5`; `missionId=dudu-m-an-f01` không đổi.
- Đại sảnh luôn có lựa chọn **ngồi lại suy nghĩ** sau biến cố; kể cả lúc mới biết rất ít người chơi vẫn đưa ra được *giả thuyết*. Mở suy luận không phụ thuộc việc gom hết 5 manh mối. Khi chưa có sổ chìa + niêm phong, hành động đối chất bằng hai chứng cứ đó không được hiển thị. Sau khi có hai chứng cứ độc lập có thể hỏi thẳng Lục Tam **không bắt buộc** thu lời A Liên hoặc lời khai ban đầu của anh.
- Lục Tam **không tự nhận trước tập thể**. Người chơi phải tự đối chất riêng bằng các dấu vết, nghe điều anh nói, đọc biên nhận, chọn **đối chiếu ngày giờ và số thuốc** (chỉ tin dấu mực không đạt), rồi tự chọn hướng giải quyết.
- Khi mời các bên ngồi xuống: hệ thống chỉ mở cảnh `hearing`. Chọn “yêu cầu người có lỗi tự nhận” dẫn đến cảnh **im lặng**, không phải kết thúc. Muốn giải quyết phải xuất trình biên nhận đã kiểm chứng và hỏi Lục Tam; nếu hòa giải cần chủ động nghe A Liên và ghi nhận tiếng nói của cô. Đường lập biên bản riêng với chưởng quầy độc lập; không buộc phải hội đủ 5 chứng cứ để đạt một ending phù hợp.
- `js/dudu-story-engine-v2b.js`: ẩn các action chưa đạt điều kiện chứng cứ và flags ngay từ `view()`, ngoài việc chặn `decide()`, để nút khóa không tự hé lộ đáp án. Hỗ trợ `visibleAnyFlags` cho kịch bản mở rộng.
- **Thoại cảnh chính xác**: Chỉ hiển thị khung thoại NPC khi scene có `npcId` + `speech` định nghĩa rõ. Engine không tự chiếu “câu mới nhất” theo global flags vào scene trước/sau. Các scene `keeper`, `maid`, `maid_memory`, `guard`, `guard_memory`, `guard_truth`, `hearing_witness`, `hearing_proof` có lời được biên tập theo thời điểm; các cảnh không có speech không được hiện quote cũ.
- `js/dudu-world-model-v2b.js` kiểm `speech` hợp lệ và NPC có tồn tại. Hàm `npcView` của World Model giữ cho các hệ thống riêng nhưng **không còn được UI pilot render tự động**.
- `js/dudu-pilot-ui-v1.js` dùng namespace `dudu:pilot-f-reasoning-v5:`, không dùng save V4 hoặc giả định quá trình đối chất cũ. Sổ tay bỏ con số như thanh tiến độ/ngưỡng thành công; vẫn cho xem thông tin đã tự thu thập. `index.html`, `dudu-pilot.html`, `site-shell-v60.js` chuyển query `play-v5`.

## Bất biến phát triển truyện F/E/D nâng cao

- `evidence` là **điều người chơi đã quan sát/ghi nhận**, không tự nó khẳng định cách diễn giải. Cần phân biệt giả thuyết người chơi, lời kể NPC, đối chiếu xác thực, lời thú nhận riêng, lời xác nhận công khai, phương án xử lý và hậu quả.
- Không hardcode “đủ N manh mối = mở lời giải”. Mỗi kết cục cần điều kiện nhân quả riêng; có thể đạt bằng tập chứng cứ độc lập khác nhau nếu kịch bản cho phép. Phía giao diện không tiết lộ lời giải qua nút bị khóa.
- **Không có hành động hội họp/đối thoại nào tự ép NPC thú nhận** nếu thiếu cảnh tranh luận/đối chất phù hợp với tri thức, động cơ và trạng thái quan hệ.
- Thoại NPC thuộc **cảnh và thời điểm** hoặc một event hợp lệ, không thuộc một bảng trạng thái chung sẽ bị tự phát lại khi render.
- Ở các E/D thật, cần thêm bằng chứng mâu thuẫn, thẩm tra nguồn độc lập, khả năng NPC từ chối/trả lời sai và hậu quả khách quan; **quyền quyết định sự thật/nghiệm thu thật phải nằm server**, không tin source hoặc flags từ trình duyệt.

## QA đã thực hiện và chưa thực hiện

Bốn bộ kiểm thử nguồn/logic đã **PASS trong V8 với mock Node fs/assert** dựa trên tệp fetch từ Github:
`tests/dudu-core-foundation-v1.cjs`, `tests/dudu-pilot-visibility-v1.cjs`, `tests/dudu-pilot-photo-v2a.cjs`, `tests/dudu-core-v2b.cjs`.

V5 test bảo vệ các trường hợp: suy luận 0/2 manh mối, 3 manh mối đủ con đường chính (không 5), sai khi chỉ tin con dấu, mời họp không phát sinh lời thú nhận, buộc phải trình chứng cứ, nghe A Liên trước hòa giải, tuyến lập biên bản riêng, quay lại cảnh NPC cũ mà không lặp/lộ thoại, ID phiên riêng, bậc/phần thưởng vẫn khóa.

**Chưa xác minh**: thực thi test qua Node trong checkout thật, giao diện trên GitHub Pages sau deploy, QA thiết bị thật và accessibility trên browser. Không đánh dấu production pass.

## Link thử và rollback

- Bản thử: `https://hnhuynh1003-blip.github.io/truyendienvlnha/dudu-pilot.html?v=play-v5`
- Baseline trước V5: commit `7f47f33c2c61900d6ca8f04c3bfa3b7f63af199a`; nếu phải sửa/rollback nên revert các commit V5 liên quan theo thứ tự thay vì reset repository.
- Đợt tiếp: QA giao diện, UX lời thoại người thật và thử nghiệm F02/F03 theo thiết kế không ép phá án. Giữ `status=pilot_only`, `released=false`, `rewardsEnabled=false`, không sửa auth/Firestore Rules/AI endpoint/XP/Xu/EPUB.
