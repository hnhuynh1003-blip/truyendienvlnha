# G5C-P4 — Bến Sương: tranh cảnh, vai nhập và hành động theo kịch bản

**Ngày:** 28/10/2026. **Nền:** G5C-P3 static Pages `e85faa5260cc5a704e6bab186a618eb7c924fa75`. **Quyết định của An Du:** thử trực tiếp trên DUDU Studio, thêm tranh cảnh, nhân vật chính/phụ/người qua đường/thân phận ảo và bớt lặp đối thoại/lựa chọn. Đây là **đợt nhỏ sửa trải nghiệm của bản online test G5C**, không phải G5D, world released hay NPC AI.

## 1. Người dùng thử ở đâu

- Trong mục **VẠN GIỚI**, thẻ **Ngọn đèn cuối ở Bến Sương** mở `playtests/ben-suong/` (vẫn có thẻ Quan Đạo độc lập).
- URL GitHub Pages: `https://hnhuynh1003-blip.github.io/truyendienvlnha/playtests/ben-suong/`. Không tải repo, Node/ZIP hay đăng nhập.
- Ba cơ chế theo hợp đồng author: `cast_possession` (có hai vai: An nhân vật chính / Minh nhân vật phụ), `native_extra` (Hảo người qua đường đã tồn tại ở bến) và `system_cover` (người thanh tra mang danh phận ảo, chưa có giấy tờ xác thực). **Bốn lựa chọn vai không làm phát sinh cơ chế thứ tư**.
- An bắt đầu tại **tháp đèn** và có quyền giữ tín hiệu; Minh bắt đầu ở **cầu cảng**, được trực tiếp cứu người; Hảo bắt đầu tại **kho trú bão**, biết dây khô và người dân; thanh tra ở **cầu cảng** phải tìm bằng chứng dây neo rồi xin bà Lan cho phép vào tháp. Phân nhánh là G4A `flag_set`/`flag_unset` và event G4B có kiểm revision/eventId, không dựa vào danh xưng do client tự khai.
- Ba narrative endings: cứu người trên mạn thuyền, giữ hải đăng, dẫn dân trên bờ tới nơi trú. Lời thoại bà Lan khác nhau theo profile, không tạo NPC của An/Minh đối diện người chơi khi đang nhập vào họ.

## 2. Tranh và bản quyền demo

- Có tranh phong cảnh được tạo **mới** cho cầu cảng, phòng đèn và kho trú bão; bốn chân dung cho các vai; một chân dung bà Lan. Chỉ dùng ảnh WebP checked-in `playtests/ben-suong/assets/`, không gọi CDN hay nguồn ảnh bên thứ ba. Từng `asset.contentHash` trong world public là SHA-256 thực tế của WebP tương ứng; test xác minh lại bytes.
- World cover và scene background là hai **vai trò asset riêng** dù có thể tái dùng cùng bytes cầu cảng; `sceneId` trỏ tới đúng place/background. NPC Bà Lan được khai báo xuất hiện tại `view-lan` khi `node-lan` hội thoại kích hoạt (`dialogue_start`), ẩn khi kết thúc; UI chỉ mở chân dung NPC ở cảnh nói chuyện. G3B kiểm metadata/crop vẫn cần đánh giá trực tiếp bằng thiết bị thực tế trước mọi đề xuất phát hành.
- Tạo hình chỉ được cấp phạm vi **synthetic demo art**; chưa là giấy phép truyện của bên khác, chưa duyệt Canon, không làm cho asset/storySource test trở thành bằng chứng quyền phát hành.

## 3. Hành động nhập chữ có giới hạn

- Người chơi vẫn bấm các hành động có mô tả tác giả. Ô nhập chữ bổ sung nhận vài cụm ý định (ví dụ `hỏi bà Lan`, `kiểm tra dây`, `xem sổ`) và ánh xạ **chỉ tới lựa chọn đang khả dụng trong cảnh hiện tại**.
- Ý định không khớp, yêu cầu nhận EXP, bịa sức mạnh, ép NPC hoặc hành động ngoài kịch bản sẽ bị thông báo chưa hỗ trợ; **không tạo rule mới** và không đổi scene/flags/revision. Không có AI tự viết kết quả hoặc đối thoại vô hạn.
- Bản demo này là bài kiểm UX nhánh và quyền tiếp cận khác nhau; để roleplay thực sự tự do cần thiết kế, duyệt AI NPC cùng bộ nhớ/Canon và server authority ở đợt độc lập, chưa được phép bật.

## 4. Kiểm thử và trạng thái thực

- World authoring tuân `world-content-1`; G3C structural/reachability có **4/4 hồ sơ và 3 kết cục lý thuyết**. Test mới kiểm gates: thanh tra không có quyền tháp trước bằng chứng; vai phụ cứu trực tiếp; người qua đường lấy dây; An có quyền giữ đèn; các lựa chọn kết thúc có hậu quả và không thưởng.
- Engine dùng lại `prepareAuthorRoleplayOffline`, G4A/G4B. Unit test P4 xác minh literal asset bytes/hash, nguồn redaction, content pin, replay/idempotent local, forgery guard, role gating, links trong VẠN GIỚI và không import Worker/Creator.
- Chromium browser CI kiểm 4 tuyến, NPC/tranh tải thật từ local server dưới Pages prefix, ý định nhập chữ hợp lệ/không hợp lệ, overflow 320–1280 px và không gọi URL ngoài host. Build script vẫn tạo `demo-content.json` public đã redacted, pin lại manifest/script; CI `git diff --exit-code` chặn generated artifact cũ.
- **Mỗi commit phải kiểm riêng SHA, unit/regression, browser workflow và Pages deployment; mọi kết quả cũ không áp dụng cho commit mới.**

Giữ bất biến: `worldPublished:false`, `missionCompleted:false`, `endingVerified:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`, `productionAuthorized:false`, `rightsVerified:false`, `deviceVerified:false`. Không lưu server, tài khoản, Firebase, Cloudflare production, NPC AI, vật phẩm, Xu/EXP/Kho, giao dịch, 48 seed, thay Canon, Thiên Mệnh, Chủ Thần, Thư viện/EPUB hay reviewer/publisher rights.

**Rollback:** revert fixture P4, static page/assets, client/build script, test, thẻ link VẠN GIỚI và tài liệu P4. Không cần migration vì không có dữ liệu người chơi trên server.
