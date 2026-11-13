# DUDU Studio — F Interactive Discovery V4 · 20/10/2026

> **Trạng thái**: đã triển khai code trên `main` cho **phó bản thử nghiệm Quan Đạo**. Không phải nhiệm vụ thật; `pilot_only`, `released:false`, `rewardsEnabled:false`. Không đánh đồng test logic với QA trình duyệt đã hoàn thành.

## 1. Vấn đề được phản ánh từ trải nghiệm người chơi

Ở Narrative V3, văn xuôi đã dài hơn nhưng phần đại sảnh hiển thị ngay các nút buộc tội A Liên, yêu cầu Lục Tam chịu trách nhiệm và hòa giải (mặc dù một số bị khóa). Người chơi nhìn tên nút là biết trước hướng kết luận; còn NPC tiết lộ quá nhanh, biến trò chơi thành đọc văn dài rồi bấm nhận bằng chứng. Người chơi mong tự **xuyên vào câu chuyện**, đi tới địa điểm, lựa chọn ai để hỏi/quan sát gì, suy luận về những điều đã biết và trình bày kết luận của chính mình. Hai ảnh chụp tham khảo gợi ý một UI mobile cinematic, lời thoại và lựa chọn ngắn, tương phản rõ, nhưng không sao chép nhận diện thương hiệu/giao diện quảng cáo.

## 2. Thiết kế đã triển khai

- `js/dudu-pilot-f-v2b.js` **giữ tên file vì tính tương thích**, nhưng đã trở thành `scenarioId=pilot-quan-dao-investigation-v4`, `scenarioVersion=4`, **27 scene / 68 lựa chọn authored / 5 endings**. Số scene là số điểm truy cập có điều kiện, không phải 27 đoạn bắt buộc đọc liên tục.
- Mở đầu giới thiệu **trải nghiệm bước qua cánh cửa Quan Đạo trong Vạn Giới**, cảm giác mưa, đường đèo và những con người ở đây, không tự tuyên bố hợp đồng/thẻ nhiệm vụ thật. Người chơi có thể giúp A Liên hoặc đi thẳng vào quán, trò chuyện trước biến cố, chọn can dự hoặc rời đi.
- Đại sảnh thành **nút di chuyển**: đến chưởng quầy, bếp gặp A Liên, gặp người lính, quan sát hành lang; **lối vào kho chỉ hiện khi được cho phép**. Kho có lựa chọn riêng xem hòm, xem giá thuốc, quay về. Các NPC có cảnh hỏi sâu khác nhau; chỉ khi bấm hỏi và ghi chép mới có chứng cứ.
- Các lựa chọn suy luận **không hề được đưa ra ngay khi đến quán**. Mục *Ngồi lại và tự suy luận* chỉ hiển thị khi người chơi đã lấy `key_log`, `broken_seal` và **ít nhất một** lời chứng trong `maid_statement` hoặc `guard_statement`. Người chơi được phép điều tra nhân chứng theo thứ tự khác nhau.
- Tại nơi suy luận, người chơi **tự chọn giả thuyết** về A Liên, chưởng quầy hoặc Lục Tam. Với hướng Lục Tam, phải chọn căn cứ và chủ động đối chất. Chỉ dựa vào một bóng áo lính dẫn đến nhắc nhở chưa đủ chứng minh, không tự thắng; chỉ khi khớp sổ chìa + dấu niêm phong + lời khai, đối chất thành công mới mở lời thú nhận và bước kiểm tra biên nhận.
- Nút **kết luận/đối thoại hậu quả** chỉ hiển thị sau khi biên nhận đã được kiểm tra; hiện không dùng nhãn “đáp án đúng” ở lựa chọn ban đầu. Người chơi có thể kết luận sai hoặc rời đi, có hậu quả kể chuyện; hai hướng thành công dẫn đến hai cách xử lý khác nhau.
- `js/dudu-story-engine-v2b.js`: bổ sung quy tắc `visibleIfEvidence`, `visibleAnyEvidence`, `visibleIfFlags`, `hiddenIfFlags`; cả `view` **và** `decide` kiểm visibility (không bypass qua ID ẩn). `js/dudu-world-model-v2b.js` kiểm tên clue dùng trong điều kiện hiển thị.
- `js/dudu-pilot-world-v2b.js`: lời giới thiệu NPC chưa biết không lộ người mở hòm; quote liên quan đến thủ phạm chỉ xuất hiện sau đối chất. **World Truth vẫn đóng trong JS client**, không phải bí mật có bảo mật; sản phẩm cần chuyển sự thật và nghiệm thu vào server có quyền.
- `js/dudu-pilot-ui-v1.js` / CSS: giao diện ưu tiên bối cảnh ảnh và lời thoại; ngắt đoạn ngắn; nút có kiểu hành động và A/B/C để dễ nhìn; mục *Sổ tay* dạng mở/đóng chứa **chỉ manh mối người chơi đã thu thập**, không phát tán manh mối ẩn; reset/di chuyển quay lên đầu khung. Layout responsive hướng tới điện thoại.
- `index.html`, `dudu-pilot.html`, `site-shell-v60.js`: query cache `play-v4`; đường vào vẫn qua `dudu-pilot.html?v=play-v4`. Save dùng `dudu:pilot-f-investigation-v4:<uid-or-guest>`; không dùng lại session V3 hoặc tạo giả chứng cứ đã thu.
- **Không** thay backend, Firestore Rules, nhiệm vụ sản xuất, kinh tế, AI CORE, Liên Lạc NPC, EPUB, bookmark, auth hoặc đặc quyền tác giả.

## 3. Mẫu tương tác cho truyện F mới

```
Nhập giới / tình huống người chơi
    ↓
Chạm mặt nhân vật, đời sống trước biến cố
    ↓
Biến cố có căn nguyên trong thế giới
    ↓
Người chơi CHỌN: đi đâu / hỏi ai / xem vật gì
    ↓
Thu nhận thông tin đúng với hành động và tri thức NPC
    ↓
Tự cân nhắc phương án, định hướng lựa chọn
    ↓
Hậu quả diễn ra trong thế giới, không chỉ “đúng/sai”
```

Đây chỉ là **mẫu vòng tương tác**, không phải cấm các thể loại khác. F hiện đại có thể tập trung quan hệ hoặc hòa giải, F tu tiên có thể là cơ duyên, nông vụ, giao dịch và lựa chọn đạo đức; **không bắt mọi F đi điều tra hoặc chứng minh thủ phạm**. Với mỗi F, quyết định đầu tiên đáng làm có thể đến rất sớm, không ép người chơi đọc văn xuôi dài liên tục. Không nhét spoiler vào tên lựa chọn bị khóa, hint, NPC intro hay tên scene hiển thị. **Số chữ do nhu cầu kể chuyện quyết định, số lựa chọn do tình huống quyết định.**

## 4. QA + giới hạn

Chạy:
```bash
node tests/dudu-core-foundation-v1.cjs
node tests/dudu-pilot-visibility-v1.cjs
node tests/dudu-pilot-photo-v2a.cjs
node tests/dudu-core-v2b.cjs
```

Bộ test V4 bảo vệ: mở đầu không nói vụ mất thuốc, truy cập địa điểm phải hợp lệ, sổ tay không có clue chưa ghi, không hiện suy luận/kết luận trước ngưỡng, **hai cách thu lời chứng khác nhau**, không thể gọi trực tiếp ID ẩn, sai căn cứ không tự nhận thắng, lựa chọn lời giải của người chơi, thư/hợp đồng/Xu vẫn khóa, save version độc lập, world adjacency đúng, di động không che khuất controls (cần QA browser thực).

**Đã test**: bốn bộ test JavaScript chạy thành công bằng V8 mô phỏng Node với nguồn lấy trực tiếp từ GitHub. **Chưa test**: Node checkout thực, GitHub Pages deployment runtime, ảnh hiển thị trên Chrome Android / Safari iOS, kiểm tra viewport 320–430px với thiết bị thật. Không thông báo production QA PASS khi chưa kiểm chứng.

## 5. Điểm tiếp tục

1. QA bản V4 trên GitHub Pages và Android/iOS; sửa lỗi người chơi gửi screenshot cụ thể.
2. Nâng truyện F01 về chiều sâu nếu cần, thêm cảnh/triggers mang ý nghĩa tương tác (không tăng số chữ vô ích).
3. Dùng engine/context để phát triển F02, F03 theo chủ đề **khác nhau thật sự**, có thể hoàn toàn không có án mất đồ. Giữ ID seed; không bật nhiệm vụ/thưởng thật trước backend xác minh.
