# DUDU Studio — Quan Đạo: Fair Verdict V6.1

Ngày 20/10/2026 · Nhánh `main` · Scope: **chỉ phó bản F pilot**.

## Phản hồi trải nghiệm cần sửa

Người chơi gửi ba ảnh trong nhánh Lục Tam:

- **Chuyện đoàn áp tải** nói thẳng kiểu diễn giải của tác giả: “Không có câu nào trong đó nói anh là người lấy túi thuốc”, khiến người đọc bị dẫn trước đáp án và mất cơ hội tự suy luận.
- **Canh hai ở trạm gác** có lời Lục Tam được kể bằng văn xuôi rồi lặp thêm trong khung hội thoại, gây cảm giác NPC nói hai lần.
- **Bất cân xứng kết luận:** A Liên / Hà chưởng quầy có hành động buộc tội rất sớm, còn khi người chơi đối chất đúng với Lục Tam thì bị buộc vòng qua đại sảnh → sổ suy luận → lựa chọn xử lý.

## Thay đổi đã ghi trên GitHub

- `js/dudu-pilot-f-v2b.js` giữ nguyên tên import, chuyển sang `scenarioId=pilot-quan-dao-fair-evidence-v6-1`, `scenarioVersion=7` để **cách ly save các kịch bản không tương thích**. `missionId=dudu-m-an-f01` không đổi. Nội dung hiện gồm **40 scene, 106 action, 6 endings**, không bắt buộc đi hết trong một lần chơi.
- Chỉnh **lời kể khách quan**, không tự mách lời giải, tránh câu phủ định gợi tội phạm hoặc suy diễn động cơ trước khi chính người chơi làm rõ. Cảnh `guard_duty` chuyển sang lời mô tả môi trường và `scene.speech` riêng; `guard_memory`, `maid_memory`, `guard_truth`, `hearing_witness`, `hearing_proof` cũng đã tách thoại khỏi mô tả, tránh lặp cùng nội dung giữa văn xuôi và ô nhân vật.
- **Đối xử như nhau với ba người bị nghi**: `claim_maid`, `claim_keeper`, `claim_guard` đều cho phép người chơi bày tỏ nghi ngờ khi còn thiếu căn cứ, nhưng sẽ dẫn tới các cảnh `challenge_maid`, `challenge_keeper`, `challenge_guard` với phản ứng của người trong quán; **không thể bắt giữ hoặc kết án ngay**. Người chơi được rút lời và tiếp tục điều tra; nếu cố ý khẳng định bất chấp thiếu căn cứ mới dẫn tới nhánh thất bại tương ứng.
- **Khi Lục Tam thú nhận riêng**: người chơi có thể tự kiểm tra biên nhận, hoặc mời chưởng quầy làm chứng và cùng kiểm tra. Lời thú nhận riêng chưa tự động đủ để công bố kết luận.
- **Sau khi biên nhận được kiểm tra**: tại `receipt_verified`, trực tiếp có `verified_formal_now → formal_report` để lập biên bản trách nhiệm, hoặc `verified_public_hearing → hearing` để đối thoại. Không bắt quay về `notes` hay `hub` chỉ để tìm nút kết luận. Đường quay lại suy luận vẫn là lựa chọn tùy ý.
- Cuộc họp không tự ép người có tội thú nhận. Bước kiểm chứng, lời nói trước tập thể và lời A Liên vẫn cần hành động riêng. Luật `visibleIfEvidence`/flags và `scene.speech` giữ nguyên để tránh lộ lời giải và thoại cũ.
- Trang `index.html`, `dudu-pilot.html`, `js/site-shell-v60.js` tham chiếu `play-v6-1`, UI lưu trong `dudu:pilot-f-fair-evidence-v6-1:<uid-or-guest>`. Không di chuyển save V5/V6 sang bản này.

## Nguyên tắc mở rộng E / D

1. Lời tường thuật chỉ mô tả điều nhân vật người chơi có thể quan sát; không thêm suy luận “đây không phải thủ phạm” hay “người này chắc đang giấu” chỉ để dẫn đường.
2. `speech` là lời NPC thực sự nói ở thời điểm hiện tại. Không lặp nguyên câu trong `scene.text`. Hành động trò chuyện/khai báo/đối chất là event tạo thông tin mới.
3. **Nghi ngờ → chất vấn → đưa chứng cứ → kiểm chứng nguồn → quyết định xử lý** là các hành vi khác nhau. Không coi `evidence.length` là số điểm phải gom đủ; có thể kết thúc bằng những đường điều tra ngắn nhưng hợp lý.
4. Mọi lời buộc tội thiếu căn cứ đối xử nhất quán với các NPC. Nó không tạo quyền bắt người, cũng không được dẫn tới một thắng lợi chính thức.
5. Khi đủ điều kiện, người chơi có thể đi tiếp từ **cảnh vừa xác minh**, thay vì bắt quay về một hub vô lý. NPC phải nhớ lời khai và hành động đã qua.
6. Ở các cấp cao hơn, cân nhắc bất đồng quan điểm, chứng cứ giả, cơ hội giải thích, động cơ phức tạp và hệ quả lâu dài; đây không phải lý do đưa quyền định đoạt sự thật cho AI hoặc client.

## Kiểm thử và hạn chế

Bộ test `tests/dudu-core-v2b.cjs` đã kiểm: nghi sớm cả 3 người không bắt giữ tự động, được rút lời, nhánh cố ý vu buộc thất bại; Lục Tam đủ chứng cứ đi thẳng tới xử lý; con dấu không đối chiếu thì không được coi là chứng cứ; lời thoại đúng cảnh; phiên lưu cũ bị cách ly; Foundation V1/Visual/entry an toàn.

**4/4 bộ kiểm thử đã PASS trong JavaScript V8 sử dụng source lấy trực tiếp từ GitHub và filesystem mô phỏng.** Chưa có chạy Node trực tiếp trên checkout, smoke test Chrome/Pages/Android/iOS, cũng chưa kiểm thử với độc giả thật. Không được ghi “đã QA production”.

Giữ nguyên `pilot_only`, `released:false`, `rewardsEnabled:false`. Không thay Firestore Rules, Firebase Auth, chương EPUB, Liên Lạc NPC, thế giới đã phát hành hay EXP/Xu thật.

**Chạy thử khi Pages cập nhật:** `https://hnhuynh1003-blip.github.io/truyendienvlnha/dudu-pilot.html?v=play-v6-1`.
