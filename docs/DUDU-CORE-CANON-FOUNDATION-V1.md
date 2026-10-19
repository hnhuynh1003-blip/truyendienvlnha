# DUDU CORE — Canon Foundation V1 · 19/10/2026

> **Trạng thái:** Đợt 1 CORE Foundation đã được chủ dự án chốt TRIỂN KHAI. Tài liệu này xác định các quy tắc nền dùng khi phát triển; không đồng nghĩa toàn bộ V1.1/V1.2 đã được bật thành gameplay sản xuất. Những con số cân bằng hoặc hành vi tương lai chưa chốt được giữ ngoài tiến trình thật.

## 0. Nguồn quyết định & nguyên tắc kế thừa

- Nguồn: lịch sử “Kiểm tra lỗi liên lạc”; văn bản về Thăng cấp & Quyền hạn Xuyên giới; ba tài liệu thiết kế `DUDU_CORE_V1_1...`, `DUDU_CORE_V1_2...`, `DUDU_CORE_V1_2_PHU_LUC_BACKGROUND...` (nguồn trong cuộc trò chuyện dự án); mã nguồn V63–V67 trên `main`.
- Cấu trúc đã thống nhất: **Chủ thần CORE** điều phối nhưng không toàn tri/toàn năng; các **hệ thống con** và ký chủ có nguồn gốc, hợp đồng, năng lực và ký ức riêng. Chính quy không mặc định tốt; phi chính quy không mặc định xấu.
- Không ép độc giả tham gia nhiệm vụ: đọc EPUB, truyện cũ, bookmark, Liên lạc NPC, Cyber Phone và quyền tác giả phải giữ nguyên.
- **Sáu thể loại lớn** là `ancient`, `modern`, `era`, `future`, `cultivation`, `apocalypse`; không phải sáu phó bản hoặc sáu tác phẩm. V66 có 48 mission *seed* chưa xuất bản: 30 F, 18 E; giữ nguyên `missionId`.
- Cấp hệ thống chính quy: **F → E → D → C → B → A → S**. Cấp nhiệm vụ (F/E sơ cấp), độ nguy hiểm thế giới, năng lực ký chủ, quyền xuyên giới và cấp hệ thống **là các trục độc lập**, không đồng nhất.
- Ba nhiệm vụ F **khác nhau**, có hoàn thành được máy chủ xác minh, để đánh giá khí vận, **sắc đẹp, thể lực, nhanh nhẹn, tinh thần, may mắn** là giai đoạn khảo hạch chung cho ký chủ bất kể hệ thống chính quy/phi chính quy. Đây là chỉ số nhân vật hư cấu; không suy diễn đặc điểm ngoài đời thật.
- F/E/D/C không tự chọn điểm đến; B được đề nghị **một trong sáu thể loại**, không chọn thế giới hoặc truyện cụ thể; A được đề nghị tiểu thế giới đủ điều kiện; S có thể đề nghị tuyến truyện được cấp phép, không vượt luật hệ thống. Phân phối thật phải do máy chủ.
- Nhập vai theo từng thế giới: `main`, `passerby`, `free`. Không chồng với UID/Entity ID.
- Hai hợp đồng khác nhau: `coreRecognition` (Chủ thần công nhận hệ thống) và `hostSystemPact` (hệ thống đồng hành với ký chủ). `originType=regular|irregular|unknown`. Phi chính quy có thể giả mạo giấy công nhận nhưng máy chủ không đổi nguồn thật.
- Ký ức hệ thống, ký ức ký chủ và ký ức theo từng thế giới/NPC là các miền khác nhau. Khi reset hệ thống con, không tự xóa tài khoản, truyện, bookmark hoặc dữ liệu riêng tư.
- Một phi chính quy có thể khai cấp thật/cấp giả khác nhau, hút EXP, gian lận mức phí tăng cấp, làm giả giao diện, che giấu dấu vết và bỏ trốn; **sổ cái thật là nguồn máy chủ**. Khi tố cáo phải có phát hiện, chứng cứ, điều tra/truy vết và kết quả hữu hạn, không tự thành công.
- Không ép game một khuôn mẫu. Nhiệm vụ F là **truyện ngắn có biến cố, lựa chọn, hệ quả, kết thúc**; E có thể gồm điều tra nhiều NPC/lời khai và suy luận, đàm phán, sinh tồn hoặc quan hệ. Đúng đáp án nhờ đoán mò không đủ thành công nếu nhiệm vụ yêu cầu chứng cứ; cho phép đường lập luận tương đương.
- **Ít nhất một ảnh nền xác định tiểu thế giới**; scene/place có IDs riêng, thay ảnh khi di chuyển/biến cố. F thường 1–3 ảnh, E theo các địa điểm thật, không bắt 3–5 ảnh nếu toàn bộ chuyện là phòng kín.

## 1. Phân lớp để không phát sinh cơ chế chồng nhau

| Lớp | Dữ liệu | Ai được quyền ghi chính thức? |
|---|---|---|
| CORE Registry | loại/cấp hệ thống, trạng thái công nhận | máy chủ có kiểm quyền, chưa mở |
| Contracts | khế ước và bản điều khoản | máy chủ sau khi có sự đồng ý, chưa mở |
| Host Identity | UID, Entity ID, thẻ, thuộc tính, khí vận | máy chủ, chưa mở |
| Progression | `systemXP`, `hostMasteryXP`, `accessMerit` | ledger máy chủ, chưa mở |
| World Registry | `genreId`, `smallWorldId`, `missionId`, `scenarioVersion` | xuất bản được duyệt; V66 hiện preview |
| Narrative State | `placeId`, `sceneId`, event flags, chứng cứ, quan hệ, kết thúc | pilot chạy cục bộ; production cần máy chủ |
| AI/NPC | lời thoại, kiến thức riêng, tính cách/động cơ, trích xuất ý định | AI không có quyền phán quyết kết quả |
| Scene Assets | cover, ảnh nền, biến thể, quyền sử dụng | tác giả/biên tập viên, kiểm soát khi phát hành |

Bộ máy luật thuần túy có thể chạy và test không có AI. AI dùng để diễn đạt và suy luận hỗ trợ, không có quyền thay đổi `World Truth` (sự thật tiên định). DUDU CORE cần nghiệm thu quy tắc; hệ thống con chỉ được dùng các công cụ theo mức công nhận.

## 2. Đợt 1 đã triển khai trên main — giới hạn có chủ ý

### Luật read-only
`js/dudu-core-rules-v1.js`:
- `systemRanks`, `missionTiers` (chỉ F/E cho *pilot*), `genreIds`.
- `accessFor(rank)` và `canRequest(...)` kiểm **phạm vi được đưa yêu cầu**, không chấp thuận vào chơi hoặc cấp vé.
- `assessmentSummary(verifiedMissions)`: chỉ đếm **3 mission F khác ID**, `verified===true`, `status===completed`.
- `canSignPact/canGrantReward/canAssignRealMission` luôn `false`.

### Bộ máy cốt truyện F
`js/dudu-story-engine-v1.js`:
- Phân tích scenario có version, namespace, địa điểm, ảnh nền, cảnh, choices và endings.
- Từng lựa chọn có thể đổi cảnh, thu thập chứng cứ một lần, thay đổi chỉ số quan hệ hư cấu, đi tới kết cục hoặc bị khóa nếu thiếu chứng cứ.
- `begin/view/decide/restore/serialize` dùng dữ liệu thuần, không gọi Firebase, Worker, AI, kho, ví, EXP.
- `step` và log hữu hạn; `decide` không nhận lệnh sau khi kết thúc, không tính điểm thưởng. Trạng thái thử cục bộ không phải kết quả được Chủ thần ký xác nhận.

### Truyện thử F duy nhất
- `js/dudu-pilot-f-v1.js`: **Đêm mưa ở Quan Đạo**, gắn với `dudu-m-an-f01` (seed "Quán trọ Quan Đạo" của V66).
- Địa điểm và ảnh vẽ vector gốc: `assets/worlds/quan-dao-gate.svg`, `assets/worlds/quan-dao-hall.svg`.
- NPC **Hà chưởng quầy, Lục Tam, A Liên** có lời thoại theo kịch bản, không giả vờ là NPC AI biết mọi thứ.
- Hai kết thúc thành công khác nhau (`exposed`, `peace`); ít nhất hai kết thúc thất bại (`wrong`, `withdraw`). Kết luận chính đòi hỏi chứng cứ, không chỉ bấm đại.
- `js/dudu-pilot-ui-v1.js`, `css/dudu-pilot-v1.css` thêm lối vào **Chơi thử ↗** trong trang Vạn Giới, tách biệt 48 thẻ seed khóa. Hộp thoại responsive; `sessionStorage` chỉ lưu trạng thái pilot theo tài khoản/guest trên cùng trình duyệt, không phải Firestore.
- `status=pilot_only`, `released=false`, `rewardsEnabled=false`: bản thử **không công nhận ba F khảo hạch**, không ghi XP/Xu/kho/vật phẩm và không ký hợp đồng.
- 2 ảnh là **vector prototype** độc lập, chưa phải mỹ thuật cao cấp hoàn thiện.

### Chưa triển khai
- Khảo hạch thật, cấp thẻ thực thể/khế ước, AI CORE, World Truth mở rộng, multi-NPC hội thoại tự do, cấp E, phó bản sản xuất, gian lận EXP trong cốt truyện, kho 3 lớp, chúc phúc/nguyền rủa, backend ledger, quyền chọn thế giới và thử nghiệm di động thực tế.

## 3. Quy tắc an toàn & triển khai tiếp

1. Chỉ hợp nhất Canon mới theo phiên bản; không tự ý kích hoạt `story.available` của 48 seed V66.
2. Mọi quyền vào chơi/nhận quà nâng cấp thật yêu cầu Firebase identity đã xác thực, quyền tham gia, hợp đồng, trạng thái công bố, máy chủ thẩm định và giao dịch idempotent.
3. Bảo vệ người đọc khách, EPUB, bookmark, NPC chat, Xu/vật phẩm legacy và roles. Không biến hiển thị "Chơi thử" thành nhiệm vụ đã nhận.
4. Kịch bản E phải có **World Truth**, điều kiện suy luận theo từng kịch bản và chứng cứ; không lấy đúng tên thủ phạm = tự động thắng.
5. Mốc EXP, ô kho, phần thưởng và quy tắc thẻ tạm/chính thức còn thuộc vùng cân bằng/chưa chốt. Không hardcode mốc làm thay đổi trạng thái thật.
6. Nền F phải diễn đạt đúng địa điểm và giao tiếp; mở rộng bối cảnh cần kiểm hồ sơ quyền asset. Không sử dụng ảnh NPC/truyện chưa được phép.
7. **Mặc định chat riêng tư không làm dữ liệu huấn luyện.** Bộ đánh giá mô phỏng/được cho phép được ưu tiên.
8. Dựng và chạy `node tests/dudu-core-foundation-v1.cjs`, giữ các test V66/V67 và browser smoke trên nhiều viewport. Phân biệt kiểm thử mô phỏng khỏi trình duyệt thật.

## 4. QA và rollback

- Baseline main trước Đợt 1: `383fbd76f2d97e0ab7c32af48d72287db5acb4e4`.
- Trình chơi là mô phỏng đóng; bất kỳ kết quả `success` chỉ hợp lệ ở pilot UI, **không** phải ghi nhận vào tiến độ.
- Kiểm thử thiết kế: F↔E là hai khái niệm độc lập; tối thiểu 3 nhiệm vụ F khác nhau, đã xác minh; B chọn genre nhưng không chọn phó bản, A có thể *đề nghị* phó bản; thiếu chứng cứ phải bị từ chối; các nhánh thành công/thất bại; lưu/khôi phục và không trùng thưởng.
- Có thể hoàn nguyên phạm vi code Đợt 1 bằng cách revert các commit thêm `dudu-core-rules-v1.js`, `dudu-story-engine-v1.js`, `dudu-pilot-f-v1.js`, `dudu-pilot-ui-v1.js`, `dudu-pilot-v1.css`, 2 SVG và thay đổi các tag script/style ở `index.html`. Không được reset Firestore để rollback.

## 5. Phụ thuộc sau Đợt 1

Đợt 2: nâng trình chơi mobile, điều hướng/scene, model NPC World Bible/tri thức/quan hệ và mô phỏng kiểm thử sâu. Đợt 3: viết ba F khác cấu trúc, từng cái có ảnh, kết thúc/thất bại. Đợt 4: hai E khác loại (1 điều tra chứng cứ, 1 chiến lược). Đợt 5: DUDU CORE AI trợ giúp/giải thích dựa luật và bằng chứng, Worker purpose riêng/quota; chỉ sau đó mới mở hợp đồng/ledger thật; theo dõi phía server và mở Vạn Giới. Việc triển khai phải gom theo đợt lớn có QA/rollback, làm trên `main` sau phê duyệt.
