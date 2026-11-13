# DUDU CORE — V2B World Bible / NPC Knowledge / Scene Pilot
Ngày: 20/10/2026 · Nhánh: `main` · Phạm vi: **pilot only, không có phần thưởng hoặc dữ liệu production**.

## 1. Phạm vi đã triển khai

- `js/dudu-world-model-v2b.js`: bộ kiểm tra cấu trúc World Bible, danh sách địa điểm/đường nối, NPC và chứng cứ; chỉ trả projection an toàn cho UI, không xuất nguyên bảng sự thật khi gọi API `npcView`.
- `js/dudu-pilot-world-v2b.js`: World Bible riêng của Quan Đạo, không áp chung toàn thể loại Cổ đại. Ba địa điểm `gate`, `hall`, `store`, ba NPC với động cơ, nhận thức, niềm tin và lời thoại kích hoạt theo chứng cứ/flags.
- `js/dudu-story-engine-v2b.js`: adapter trên Foundation V1; điều kiện `requires`, `requiresFlags`, `requiresNotFlags`, chặn chuyển cảnh trái adjacency, giữ `sceneId` qua serialize/restore; không viết Firebase, Worker, kinh tế hay account.
- `js/dudu-pilot-f-v2b.js`: bản Quan Đạo V2B với cùng `missionId=dudu-m-an-f01`, `scenarioId=pilot-quan-dao-v2b`. Tách kho thành địa điểm thật vì người chơi có hành động đi từ đại sảnh vào kho sau khi xin phép. Kết thúc: 2 thành công và 2 thất bại. Nhiệm vụ F này vẫn là demo, **không được tính khảo hạch**.
- `assets/worlds/quan-dao-store.svg` là fallback mới cho ảnh WebP nhà kho đã có sẵn; gate/hall/store có ảnh WebP và fallback SVG.
- `js/dudu-pilot-ui-v1.js`, `dudu-pilot.html`, `index.html`, CSS và thẻ tại Vạn Giới tải bản V2B theo phiên bản query `v=2b`; khi thiếu các module V2B sẽ giữ được đường fallback pilot V1. Tiến trình V2B dùng namespace sessionStorage mới và không ghi đè save V1.

## 2. Quy tắc tác giả khi viết các truyện F mới

**World Bible** phải có `worldId`, `genreId`, `defaultPlaceId` và `places` xác định; `placeId` chứa `publicName`, `background`, `photo`, `adjacent`. Cảnh truyện `sceneId` là trạng thái/khoảnh khắc thuộc một `placeId`, không phải ảnh đại diện chung cho cả sáu thể loại. Điểm nối địa điểm phải hai chiều trong model V2B; đổi địa điểm chỉ được thực hiện bởi choice/event xác thực trong engine.

**NPC Bible** dùng `npcId`, `name`, `role`, `homePlaceId`, `intro`, `motive`, `knows` (sự kiện tác giả định nghĩa), `beliefs` (có thể sai) và `lines` (lời thoại từng giai đoạn). Lời thoại mở thêm bằng `requiresEvidence` và/hoặc `requiresFlags`. Những lời NPC nói được xác định theo từng giai đoạn: người chơi có chứng cứ không tự động khiến NPC biết hoặc thú nhận; phải có hành động đối chất mới đặt flag phù hợp.

**World Truth** là sự thật cốt truyện do tác giả đặt; không đồng nghĩa lời NPC nào cũng đúng. `facts` hiện được đóng gói ở phía client nên *không phải bí mật có bảo mật thật*. Nếu về sau dùng nội dung bí mật/AI/tài khoản chính thức, World Truth và việc nghiệm thu phải chuyển sang backend có kiểm quyền.

**Clues**: mỗi chứng cứ có ID ổn định, nhãn công khai, địa điểm và nguồn; không lấy câu trả lời cuối cùng làm điều kiện thắng. Các lựa chọn kết thúc phải yêu cầu chứng cứ/điều kiện đúng với động cơ và hậu quả. `scenarioVersion` và `scenarioId` đổi khi sửa tình tiết không tương thích save; tuyệt đối không tự nâng cấp tiến trình cũ bằng cách mạo nhận đã thu thập chứng cứ.

**Mỹ thuật**: bản pilot sử dụng cảnh riêng theo địa điểm và fallback SVG. Cảnh không được lộ thủ phạm, bí mật hoặc nhét chữ nút game vào ảnh. UI hỗ trợ mobile và bấm lựa chọn không phụ thuộc ảnh; ảnh thiếu phải dùng fallback. Đảm bảo quyền sử dụng asset khi phát hành thế giới mới.

## 3. Mốc kiểm thử và hạn chế

Bộ test mới `tests/dudu-core-v2b.cjs` kiểm tra schema, 3 địa điểm, ảnh SVG/WebP, chứng cứ, chặn đoán mò, chặn vào kho chưa có quyền, NPC chưa thú nhận khi chưa đối chất, hai thành công, hai thất bại, save/restore, tương thích V1 và khóa phần thưởng. Chạy thêm:

```bash
node tests/dudu-core-foundation-v1.cjs
node tests/dudu-pilot-visibility-v1.cjs
node tests/dudu-pilot-photo-v2a.cjs
node tests/dudu-core-v2b.cjs
```

**Kết quả nguồn**: logic V2B và test V2B/visibility đã được thực thi bằng V8 với mock filesystem dựa trên file thực fetch từ GitHub. **Chưa thay thế cho chạy Node trực tiếp trong checkout thực**, và chưa có smoke test trình duyệt/Pages/Android/iOS đáng tin cậy. Không đánh dấu công bố nhiệm vụ thật.

**Cửa sổ kỹ thuật chưa chốt Canon production**: trường World Visual Bible, giao thức world/scene, quyền server và knowledge permissions của NPC/AI vẫn cần thiết kế cho bản chính thức. V2B ở đây là bản triển khai pilot đáp ứng hướng thiết kế, không phê chuẩn ngầm toàn bộ phụ lục V1.2-A.

## 4. Đợt tiếp: phát triển lại truyện F

Ưu tiên **chất lượng, không số lượng**. Đề cử bộ ba đa dạng dựa theo ID seed V66 đang giữ nguyên (chưa tự phát hành):

| ID V66 | Tên trong V66 | Hướng gameplay khi viết lại | Nhận diện bối cảnh |
|---|---|---|---|
| `dudu-m-an-f01` | Quán trọ Quan Đạo | Đối thoại, chứng cứ, hậu quả về trách nhiệm/lòng tốt; cải biên pilot thành truyện đủ chiều sâu | Quán trọ biên lộ, mưa đêm, kho thuốc |
| `dudu-m-mo-f02` | Căn Hộ Tầng Mười | Quan hệ cộng đồng, lựa chọn lòng tin, quyết định không chỉ đúng–sai | Chung cư hiện đại với các khu vực gắn sự kiện |
| `dudu-m-cu-f02` | Linh Điền Sau Núi | Cơ duyên, trao đổi, lựa chọn tài nguyên và hậu quả khác truyện phá án | Linh điền, sườn núi và không gian tu tiên |

Đây là **danh sách đề cử nội dung**, chưa phải quyết định phát hành 3 F thật. Không dùng 48 seed thành 48 phó bản có thể nhận. Mỗi F mới có World Bible riêng, ít nhất một ảnh nền đặc trưng, NPC có tri thức phù hợp, nhiều kết cục có ý nghĩa, đánh giá logic độc lập và UX mobile; phần thưởng, hạn ngạch, thẻ và ký kết vẫn không được cấp từ phía client.

## 5. Quy tắc an toàn giữ nguyên

Giữ nguyên EPUB, đăng nhập Firebase, độc giả khách, tác giả, Cyber Phone, Liên Lạc NPC, bookmark, nhập vai A/B/C, kho và Xu cũ. Không đổi Firestore Rules, backend, AI endpoint, tài khoản, số dư hay save thật. `DUDU CORE` không toàn tri, hệ thống phi chính quy không mặc nhiên xấu. Bậc hệ thống `F → E → D → C → B → A → S` khác cấp nhiệm vụ; tiến trình khảo hạch cần **ba F khác ID, được server xác minh**. Đánh giá pilot hiện chỉ diễn ra cục bộ.
