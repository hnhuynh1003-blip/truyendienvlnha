# DUDU F — Quan Đạo · Dawn Rescue V7
Ngày 20/10/2026 · Nhánh `main` · Bản **pilot** không có phần thưởng / khảo hạch thật.

## Phản hồi thiết kế và nguyên nhân

Người chơi phê bình cả hai kết cục thành công trước V7: điều tra rất nhiều nhưng cuối cùng Lục Tam chỉ nhận trách nhiệm, A Liên được minh oan và mọi chuyện coi như xong. Vụ mất thuốc được giới thiệu cấp bách nhưng **không có hậu quả thực sự được giải quyết**. Đó là lỗi về *kịch tính và payoff*, không phải chỉ thiếu câu chữ.

**Luật mới:** *Tìm ra người lấy ≠ biết thuốc ở đâu ≠ xác minh lượng thuốc còn lại ≠ đưa về đúng lúc ≠ bàn giao cho người cần ≠ minh oan và trách nhiệm.* Mỗi bước cần vai trò nhân quả và hành động của người chơi. Không biến thử thách thành sưu tập đủ 5/5 manh mối.

## Nội dung V7

- Ngay trước biến cố, Hà chưởng quầy kể về **đoàn xe chở người bị thương** dự định nhận túi thuốc ký gửi để qua đèo lúc bình minh. Trời mưa khiến đường đi nguy hiểm. Việc túi biến mất trở thành nguy cơ thực tế, không chỉ thiệt hại tài sản.
- Sổ chìa và niêm phong giúp xác định người tiếp cận hòm; lời kể NPC giúp kiểm tra mốc thời gian và tránh nghi oan; bảng kê trong kho ghi **6 cuộn băng ép + 2 lọ thuốc cầm máu**. Biên nhận đã xác minh cho thấy **2 cuộn + 1 lọ** đã dùng cứu người ở trạm gác. Người chơi có thể suy luận còn **4 cuộn + 1 lọ**, cần tìm phần đó để đoàn xe không bị hoãn.
- Vấn đề đạo đức được giữ: Lục Tam lấy thuốc khi cứu người, nhưng không xin phép và giấu chuyện khiến A Liên bị nghi. Việc cứu người ở trạm gác không tự làm đủ thuốc cho đoàn xe sáng hôm sau.
- Sau khi chọn ghi biên bản hoặc hòa giải, **không kết thúc ngay**: phải kiểm kê, tìm đường đi, hỏi người khuân hàng **Đinh Nhị** (NPC Bible có tri thức lối sườn đá), chọn lối có thể đi, cử Lục Tam đi cùng người dẫn đường, chờ họ quay lại, **kiểm đếm túi thuốc**, và **bàn giao có người nhận**.
- Chọn đường cầu thấp có nguy cơ khiến đoàn xe bị hoãn; tin cả túi đã dùng hết hoặc chỉ lập giấy nhận lỗi đều là kết thúc chưa giải quyết được hậu quả. Nhận túi về nhưng bỏ qua kiểm chứng, hoặc cứu được đoàn xe mà không đính chính nỗi oan của A Liên, cũng có kết cục khác.
- Thành công cần có các flag `medicine_recovered` và `convoy_supplied` cùng tuyến giải trình (`formal_agreed` hoặc `mediation_agreed` + nói chuyện công khai). **Mọi choice dẫn đến ending success hiện chỉ nằm ở `convoy_ready`, không phải từ nút thú nhận hay họp.**
- Tổng mô hình hiện có **48 scenes**, **131 choices** authored và **10 endings** (không tuyến tính). Các nhánh thất bại không phải số lần thu được item, mà là hậu quả quyết định.

## Hệ thống / tương thích

- Giữ file import `js/dudu-pilot-f-v2b.js`, chuyển sang `scenarioId=pilot-quan-dao-dawn-rescue-v7`, `scenarioVersion=8`. Giữ `missionId=dudu-m-an-f01`, `status=pilot_only`, `released=false`, `rewardsEnabled=false`.
- World Bible `js/dudu-pilot-world-v2b.js` có thêm `stock_for_convoy`, `stock_used_at_post`, `ridge_safe_path` và NPC Đinh Nhị. Không tự để lời thoại NPC xuất hiện ở cảnh khác; `route_advice` là NPC có `speech` do scene xác định.
- Session mới `dudu:pilot-f-dawn-rescue-v7:`; session V6.1/V6.2 **vẫn nằm riêng nhưng không được nhập tự động** vì cốt truyện kết thúc và trạng thái chứng cứ đã khác. Đây là nâng cấp không tương thích, không đánh tráo một kết thúc cũ thành một kết thúc mới đã thu hồi thuốc.
- Website dùng cache key `play-v7`. Không thay cơ chế đăng nhập, Firestore rules, EXP/Xu, văn bản EPUB, Liên Lạc NPC, hóa đơn, khế ước hoặc server.
- Engine `verificationNote` ưu tiên tiến trình cứu trợ: đã kiểm lời thú nhận → tính thuốc chưa dùng → cử người thu hồi → nhận lại → bàn giao. Không trình bày 5 manh mối như một thanh tiến độ.

## Quality Gates

1. Người đọc hiểu tại sao mất thuốc là nghiêm trọng **trước khi** có kết luận thủ phạm; tình huống mưa đêm ảnh hưởng đường vận chuyển.
2. Không thể chiến thắng chỉ bằng chữ ký hoặc A Liên được minh oan. Các branch `report_guard_v2b`, `confirm_public_report`, `seek_mediation_v2b` phải chuyển tới `supply_audit`.
3. Người chơi không được biết lối an toàn **trước khi** hỏi người biết đường. Số thuốc cần lấy được suy ra từ bảng kê và biên nhận.
4. Có ít nhất hai tuyến kết thúc thành công mang sắc thái trách nhiệm/hòa giải; cả hai thực sự hoàn thành khâu thu hồi và giao thuốc.
5. Các nhánh không thu hồi, chọn cầu ngập, bỏ kiểm đếm, bỏ minh oan có hệ quả văn học khác nhau; không sinh EXP/thưởng thật.
6. QA test source gồm schema, 3 địa điểm, 4 bộ hồi quy, đường thành công/thất bại, 100+ thao tác, save isolation. **Không đồng nhất kiểm thử JS với smoke test Pages hoặc QA thiết bị thật.**

## Bước sau

Mời người chơi thử một vòng mới từ cổng quán đến sau bình minh và nhận xét riêng **tuyến đường, áp lực thời gian, lựa chọn kiểm đếm, cảm giác hậu quả**. Nếu thiếu kịch tính hoặc nhân vật vô cảm thì chỉnh cấu trúc và phân nhánh, không kéo dài độc thoại. Chuẩn này áp dụng cho F02/F03 nhưng **không bắt mọi thế giới phải làm án mất thuốc**.
