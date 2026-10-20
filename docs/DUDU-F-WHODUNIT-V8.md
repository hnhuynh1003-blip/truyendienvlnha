# DUDU F — Casefile V8 · Cách kể truyện phá án ngắn nhưng có bước ngoặt
Ngày 20/10/2026 · `main` · **pilot_only / released:false / rewardsEnabled:false**

## Phản hồi được duyệt

V7 có đúng hiện vật, giải thích, thu hồi và đoàn xe nhưng mắc lỗi cấu trúc: **cao trào nhận diện người gây án nằm ở giữa**, sau đó kéo dài thành một loạt việc vận chuyển, kiểm kê, ký giấy không hấp dẫn và không có thưởng thật. Người chơi cần mục tiêu ngay đầu truyện, nhiều nghi phạm có bằng chứng đáng ngờ, manh mối quyết định, *tìm thấy vật bị mất trước khi kết luận*, và kết thúc gần như ngay khi chỉ ra đúng người cùng nguyên nhân.

## Quy tắc biên tập mới (ưu tiên hơn V7)

1. Với F phá án, DUDU giao **một mục tiêu rõ và ngắn**: tìm vật bị mất, xác định ai thực hiện và vì sao. Không ép DUDU luôn đóng vai người hướng dẫn ở các thể loại khác.
2. Mỗi nghi phạm phải có **ít nhất một dấu hiệu hữu hình, cơ hội hoặc mâu thuẫn** gây nghi ngờ; không đưa người chơi tới thủ phạm bằng miêu tả thiên vị.
3. Manh mối phải có cấp độ: *dấu nghi vấn / vật chứng then chốt / dữ kiện kiểm chứng động cơ*. Nghi phạm khả nghi không đồng nghĩa có tội; không coi tích lũy N manh mối là điều kiện thắng.
4. Cho người chơi tự chọn hướng đi. Những thông tin đã có mới mở các hành động liên quan; không phát lời giải qua NPC / mô tả / tên nút bị khóa.
5. **Tìm được vật chứng chính trước khi buộc tội chính xác**. Ít nhất hai cách nối vật chứng với nghi phạm để câu chuyện không chỉ có một thứ tự.
6. Đỉnh điểm là *đưa chứng cứ → chọn người → lý giải động cơ → phản ứng của nhân vật*. Kết thúc trong 0–1 cảnh sau khi xác định đúng; **không nối chuỗi nhiệm vụ mới sau cao trào**.
7. Đoạn kết là payoff: lời giải hợp lý hóa dấu giả, trả danh dự nhân vật và hoàn tất mục tiêu. Người chơi thấy trạng thái **ĐÃ GIẢI ÁN (BẢN THỬ)**, không biến phần thưởng giả lập thành Xu, EXP hay vật phẩm thật.
8. Các thế giới F **không có nghĩa vụ chung thể loại phá án**. F02 hiện đại có thể là lựa chọn quan hệ/định đoạt trách nhiệm, F03 tu tiên là trao đổi – cơ duyên – hậu quả, F khác có thể sinh tồn hoặc giải cứu. Mỗi truyện cần có mục tiêu, vòng tương tác, thời điểm cao trào và payoff riêng.

## Phiên bản đã ghi lên GitHub

- File nhập giữ `js/dudu-pilot-f-v2b.js`; kịch bản chuyển thành `scenarioId=pilot-quan-dao-casefile-v8`, `scenarioVersion=9`, `missionId=dudu-m-an-f01` giữ nguyên.
- **27 scenes / 9 kết thúc** (scenes là các điểm người chơi có thể truy cập, không phải 27 chương liên tiếp). Hai tuyến thắng ngắn khoảng **16–18 thao tác có lựa chọn** thay vì phải hoàn thành 48 cảnh theo hướng thu hồi V7.
- Chưởng quầy có chìa và dấu mực vừa sửa, A Liên có sáp đỏ và qua bếp, Lục Tam có dây buộc quân nhu và lời khai thiếu rõ ràng.
- Dấu than từ kho hoặc lời chứng A Liên có thể mở hướng kiểm tra khu bếp, nơi túi thuốc **đã được trả về nhưng giấu dưới than**. Túi chứa **phiếu cấp cứu không ghi tên người mang** và nút dây quân nhu. Vậy **người chơi phải tìm túi trước khi buộc tội theo chứng cứ quyết định**.
- Có hai tuyến chứng minh độc lập: `medicine_bundle + care_receipt + key_log` hoặc `medicine_bundle + care_receipt + military_knot + guard_cord`. Lấy riêng nút dây trong túi mà không quan sát dây lính không đủ nối người với vật.
- Bước ngoặt sau suy luận: Lục Tam mượn chìa, mang thuốc cấp cứu rồi trả túi chưa dùng, giấu trong thùng than vì sợ sai phạm; chưởng quầy sửa giờ sổ do lo trách nhiệm, A Liên dính sáp khi giữ đèn lồng. Vật chứng và động cơ giải thích những chi tiết gây nghi ngờ trước đó.
- Có hai cách kết luận đúng (trách nhiệm / xem xét hoàn cảnh), các ngả đoán sai và bỏ cuộc. **Không có minigame vận chuyển, lựa đường, kiểm kê sau khi tìm ra nghi phạm.**
- `js/dudu-pilot-world-v2b.js` bổ sung các clue và fact cho V8. Phần World Truth vẫn nằm client phục vụ thử nghiệm, **không bảo mật**.
- UI dùng namespace lưu riêng `dudu:pilot-f-casefile-v8:`, static cache `play-v8`. **Không tự nhập save V7** vì cách kể chuyện và graph đã thay đổi. Người chơi thử lại từ đầu, còn session cũ không bị ghi đè.
- Tuyệt đối không sửa Firebase, Firestore, backend, danh sách truyện, Liên Lạc NPC, khế ước, EXP, Xu hay quà thật.

## Kiểm thử

```bash
node tests/dudu-core-foundation-v1.cjs
node tests/dudu-pilot-visibility-v1.cjs
node tests/dudu-pilot-photo-v2a.cjs
node tests/dudu-core-v2b.cjs
```

Kiểm thử V8 bao gồm: ba nghi phạm có dấu nghi, suy luận sớm không thắng bằng đoán mò, tìm túi thuốc trước kết luận, hai tuyến chứng cứ độc lập, sai động cơ bị phản bác, không cần gom mọi vật chứng, kết thúc ngay sau cao trào, session riêng, tắt reward thật.

**Đã chạy 4/4 bộ kiểm thử bằng V8 JavaScript mock Node với nguồn GitHub**. Chưa thực thi Node checkout, smoke test Github Pages/Chrome Android/Safari iOS hoặc khảo sát độc giả thật. Không báo production QA PASS trước khi thử trực tiếp.

## Tiếp tục

1. Thử V8 trên điện thoại, đánh giá nhịp 10–15 phút và cảm giác bước ngoặt.
2. Nếu sai số trình tự, thoại lộ lời giải hoặc cảnh vẫn dài: sửa UX trước, không tăng scene count.
3. Khi nghiệm thu, thiết kế F02/F03 bằng vòng gameplay phù hợp thể loại; reward/đánh giá thật chỉ đưa vào sau khi có pipeline xác thực server và chủ dự án duyệt.
