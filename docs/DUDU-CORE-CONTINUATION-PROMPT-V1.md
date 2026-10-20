# DUDU STUDIO — MASTER CONTINUATION PROMPT · CORE FOUNDATION V1 · 19/10/2026

> **Dán toàn bộ văn bản này vào cuộc trò chuyện mới khi cần tiếp tục DUDU Studio.**
> Đây là hồ sơ bàn giao theo trạng thái mã nguồn ở thời điểm Đợt 1 CORE Foundation, không thay thế việc đọc commit `main` mới nhất. Không gọi những module chưa triển khai là đã phát hành.

## 1. Phạm vi & thói quen làm việc

Bạn đang phát triển web đọc truyện và thế giới tương tác DUDU Studio ở GitHub `hnhuynh1003-blip/truyendienvlnha`, branch `main`, Pages `https://hnhuynh1003-blip.github.io/truyendienvlnha/`. Firebase project `truyendienvl`; Cloudflare AI Worker staging dùng cho NPC/author, không mặc nhiên dành cho DUDU CORE. Chủ dự án muốn mỗi đợt triển khai lớn trực tiếp `main`, kiểm thử, rollback, không hỏi duyệt mỗi nút/file/commit. Không bật backend, billing, đổi Firestore Rules, xóa dữ liệu hoặc kinh tế thật nếu chưa được duyệt.

Đừng thay thế thư viện đọc, EPUB, auth, bookmark, người đọc khách, Cyber Phone, NPC chat, nhập vai A/B/C, tác giả, vật phẩm legacy. Xuyên giới là tính năng tự nguyện. Không dùng dữ liệu chat cá nhân để huấn luyện khi chưa có opt-in.

## 2. CANON ĐÃ THỐNG NHẤT

- DUDU CORE là Chủ thần trung tâm quản lý luật/hợp đồng/điều phối/nghiệm thu nhưng không toàn tri toàn năng. DUDU-01/DUDU-02... là hệ thống con có danh tính và quan hệ ký chủ, ký ức/cá tính/khả năng riêng. DUDU trong Messenger chỉ là kênh giao tiếp, không phải toàn bộ Chủ thần.
- Có hệ thống `regular` (chính quy), `irregular` (phi chính quy) và `unknown`. Chính quy có `coreRecognition` và người chơi có thể ký `hostSystemPact`. Phi chính quy có thể giả giấy, giả cấp, hút khí vận/EXP, kê chênh phí tăng cấp, chạy trốn; chứng cứ/điều tra/truy vết không đảm bảo bắt thành công. Hệ thống chính quy chưa chắc tốt, phi chính quy chưa chắc xấu.
- **Bậc hệ thống: F → E → D → C → B → A → S**. Không được bỏ E. Đây KHÔNG phải cấp nhiệm vụ F/E, không phải cấp người chơi hay cấp truyện.
- Phân biệt `systemXP`, `hostMasteryXP`, `accessMerit`; không tái sử dụng level/Xu sandbox làm XP hệ thống verified.
- Mọi ký chủ sau khi tham gia giai đoạn khảo hạch cần **ít nhất 3 nhiệm vụ F có ID khác nhau, được máy chủ xác minh** để đánh giá thuộc tính nhân vật hư cấu **sắc đẹp, thể lực, nhanh nhẹn, tinh thần, may mắn** và khí vận riêng. Kịch bản F là truyện ngắn đa nhánh có biến cố, kết quả thật về mặt kể chuyện, không bấm nhanh lấy điểm.
- F/E/D/C không tự chọn thế giới, B chỉ chọn 1 trong sáu `genre`, A có thể đề nghị `smallWorld` đủ điều kiện; S có thể đề nghị tuyến truyện đích danh được cấp phép. Máy chủ phải xét quyền nhập cụ thể. 6 genre: Cổ đại, Hiện đại, Niên đại, Tương lai, Tu tiên, Mạt thế.
- E là truyện phức tạp hơn **nhưng không nhất thiết là phá án**. Điều tra E có World Truth, nhiều lời khai, đối chiếu nhân chứng/bằng chứng/lập luận; đoán trúng tên hung thủ mà thiếu chứng minh không đạt. E cũng có thể đàm phán, quan hệ, chiến lược, sinh tồn.
- Mỗi tiểu thế giới tối thiểu **một background hình ảnh**, với place/scene có IDs riêng, đổi cảnh hợp lý. Không dùng một background cho toàn bộ thể loại lớn. Số ảnh F/E theo kịch bản, E phòng kín một nơi hợp lệ.
- Chủ thần và luật máy chủ nghiệm thu hậu quả, không cho AI tùy ý cấp Xu/EXP/vật phẩm/khế ước, đổi đáp án, biết bí mật khi chưa đủ quyền. Ký ức UID/Entity ID/NPC/thế giới/role độc lập.
- Ngưỡng EXP, thẻ tạm/chính thức, số ô kho, loot/chúc phúc/nguyền rủa còn vùng chưa khóa sản xuất; không hardcode như luật đã duyệt.

## 3. TRẠNG THÁI MÃ NGUỒN

- **Baseline trước Đợt 1**: `383fbd76f2d97e0ab7c32af48d72287db5acb4e4`. Trước mỗi việc hãy lấy SHA mới nhất của `main`.
- V66: `js/world-taxonomy-v66.js` có 6 genre, 48 seed (30 F+18 E) CHƯA xuất bản. `js/world-blueprint-v66.js` là JSON author draft offline schema 2. Đừng nhầm 48 seed thành 48 thế giới chơi thật hoặc sửa ID.
- V67.3: `js/dudu-system-steward-v67-3.js` chỉ hướng dẫn read-only/scripted, không phải AI Chủ thần. NPC AI `js/ai-proxy.js` là pipeline riêng, chưa có quyền server dành cho DUDU CORE.
- **Đợt 1 CORE Foundation trên main** đã thêm:
  - `docs/DUDU-CORE-CANON-FOUNDATION-V1.md` — bản luật và phạm vi thực tế.
  - `js/dudu-core-rules-v1.js` — bậc, điều kiện 3F, scope đề nghị world; không quyền thật.
  - `js/dudu-story-engine-v1.js` — scene/choice/evidence/outcome, bộ chạy deterministic thuần, lưu/khôi phục pilot.
  - `js/dudu-pilot-f-v1.js` — **Đêm mưa ở Quan Đạo**, ID cũ `dudu-m-an-f01`, hai kết thúc thành công và hai thất bại, cần chứng cứ.
  - `assets/worlds/quan-dao-gate.svg`, `assets/worlds/quan-dao-hall.svg` — 2 ảnh nền vector gốc ở 2 địa điểm.
  - `js/dudu-pilot-ui-v1.js` và `css/dudu-pilot-v1.css` — lối vào Chơi thử trên Vạn Giới, demo responsive, sessionStorage riêng UID/guest theo từng tab.
  - `tests/dudu-core-foundation-v1.cjs` — test schema, bậc, lựa chọn, bằng chứng, đa kết quả, hình, restore, khóa phần thưởng.
  - `index.html` — include các module sau `world-experience-v66.js`.
- Trạng thái **pilot_only**, `released:false`, `rewardsEnabled:false`; không hợp đồng/thẻ/XP/Xu thật, không công nhận vào bộ ba F khảo hạch. Trước khi báo "đã lên live", phải xác minh triển khai GitHub Pages riêng. Kiểm tra smoke mobile/desktop khi có môi trường thật, không coi test JS mô phỏng là test trình duyệt.

## 4. PHỤ THUỘC VÀ ƯU TIÊN TIẾP THEO

1. Đóng gói QA/browser của Đợt 1, sửa lỗi khi người chơi thử nhánh/trở lại và cảnh quan trên 320–430 px, desktop; đảm bảo thoát/reload đúng.
2. **Đợt 2** — world scene renderer/NPC World Bible/quan hệ/tri thức có cấu trúc, truyện đa dạng, phân biệt thông tin sự thật vs niềm tin NPC; phát triển mục tiêu theo kịch bản. Chưa cần gọi AI thật để quyết định kết cục.
3. **Đợt 3** — hoàn thiện 3 F khảo hạch khác tình tiết (diễn giải hậu quả, thích nghi, quan hệ/cơ duyên), mỗi tiểu thế giới có background riêng và kết thúc được nghiệm thu. Không lặp mô-típ.
4. **Đợt 4** — 2 E khác nhau (1 tra án chứng cứ nhiều NPC, 1 chiến lược/quan hệ). Kiểm thử đúng đáp án nhưng thiếu chứng cứ, suy luận đồng nghĩa, lời khai giả và bí mật chưa biết.
5. **Đợt 5** — DUDU CORE AI với purpose/quota server độc lập và tool read-only; DUDU tư vấn không toàn tri, quyền cứu trợ có mức, kiểm tra hành vi hệ thống con.
6. Sau những cổng trên mới đề xuất backend khế ước/Entity ID/EXP/kho/đặc quyền, xác thực nhiệm vụ và ledger; triển khai hệ thống phi chính quy nâng cao và mở rộng Vạn Giới theo từng đợt đã duyệt.

## 5. CHECKLIST MỖI LẦN TIẾP NỐI

- Đọc source + docs từ commit mới nhất; ghi nhận baseline và rollback.
- Phân biệt **ĐÃ CÓ CODE / ĐÃ QA / ĐÃ DEPLOY / ĐANG THIẾT KẾ** rõ ràng.
- Dùng 6 thể loại lớn, 7 bậc hệ thống có E; không nhầm F mission là F system.
- Không lén kích hoạt ghi xu, rewards, pact, assignment từ client/pilot; không tạo UI giả hoàn thành.
- Kết hợp background và cảnh trước khi viết thêm nội dung.
- Hoàn tất 1 đợt lớn có test, cập nhật handoff này cùng Canon, báo commit + giới hạn; không hỏi duyệt từng bước.

## 6. CẬP NHẬT SAU VISUAL V2A — KIỂM KÊ 20/10/2026

> **Mục đích:** điểm bàn giao mới sau khi cuộc trò chuyện triển khai bị xóa nhầm. Đây là kiểm kê mã nguồn thực trên `main` ở SHA `2f4fba687309c891cdb8e1d9d154d4306d391371`, không phải lệnh tự động phát hành tính năng. Nếu `main` đã thay đổi, đọc commit mới nhất trước khi triển khai.

### Đã xác minh trên GitHub

- Commit `b93a676` đã tạo hồ sơ bàn giao này; `6b6f7d3` đóng băng Canon Foundation V1; `648a30a` thêm kiểm tra hồi quy nút vào chơi.
- Pilot **Đêm mưa ở Quan Đạo** có `missionId=dudu-m-an-f01`, 3 NPC (Hà chưởng quầy, Lục Tam, A Liên), 2 địa điểm được ánh xạ `gate/hall`, các scene truyện, 2 kết thúc thành công + 2 thất bại, chứng cứ, khôi phục session, khóa thưởng thật. Đây là **1 pilot F**, chưa phải 1 trong 3 F khảo hạch đã nghiệm thu server.
- Có trang chơi thử riêng `dudu-pilot.html`, cùng lối vào ổn định trong Vạn Giới. Hai điểm vào được kiểm tra bằng test nguồn `tests/dudu-pilot-visibility-v1.cjs`; chưa thể kết luận smoke test trình duyệt thực đã qua.
- Commit `b676782` bổ sung `docs/DUDU-CORE-BACKGROUND-STYLE-V2A.md`, `photo` vào `js/dudu-pilot-f-v1.js`, cơ chế tải WebP với SVG fallback trong UI. Commit **`2f4fba6`** đã tải lên **3 file WebP**: `quan-dao-gate-cinematic.webp`, `quan-dao-hall-cinematic.webp`, `quan-dao-store-cinematic.webp`.
- Chỉ **gate/hall** đang được gắn WebP trong dữ liệu pilot. **store** là ảnh dự phòng, CHƯA có `placeId=store`; scene `store` hiện dùng `placeId=hall` (không được mô tả là đã có cảnh kho độc lập).
- Kiểm tra qua connector: SHA mới nhất tại thời điểm kiểm kê là `2f4fba6`, không thấy combined status hoặc workflow run cho commit đó. **Không được đồng nhất đã push = đã deploy/QA browser thành công.**
- Website đọc truyện, EPUB, auth, NPC chat, Cyber Phone, bookmark, quyền tác giả và dữ liệu cũ không bị module pilot thay thế. Kiểm kê này chưa kiểm chứng từng thao tác runtime trên Pages/Firebase.

### Ranh giới Canon và bản đề xuất

- `docs/DUDU-CORE-CANON-FOUNDATION-V1.md` là phạm vi Foundation đã chốt. Sáu genre không phải sáu thế giới playable; 48 seed V66 (30 F + 18 E) **không** phải nhiệm vụ đã phát hành.
- Tệp riêng `DUDU_CORE_V1_2_PHU_LUC_BACKGROUND_SCENE_IDENTITY_CHO_DUYET.md` ngày 19/10/2026 thống nhất **định hướng**: mỗi tiểu thế giới chơi được có background địa điểm. Các chi tiết `genre → world → place → scene`, World Visual Bible/schema/ảnh F-E, và quy trình G0–G7 vẫn được dán nhãn **chờ duyệt khi khóa canon**; không tự tuyên bố mọi schema đã được phê chuẩn.
- Luật bất biến: `F → E → D → C → B → A → S` là **bậc hệ thống**, không phải cấp nhiệm vụ; 3 F khác ID **được máy chủ xác minh** là điều kiện khảo hạch; CORE không toàn tri; người chơi tự nguyện nhập vai A/B/C; AI/NPC không quyết định thưởng hoặc World Truth.

### Hướng tiếp tục, sắp xếp theo phụ thuộc

1. **QA Visual V2A + hồi quy pilot (trước khi thay đổi gameplay)**: chạy `node tests/dudu-core-foundation-v1.cjs`, `node tests/dudu-pilot-visibility-v1.cjs`, `node tests/dudu-pilot-photo-v2a.cjs`; truy cập `dudu-pilot.html` và `#/worlds` trên bản đã deploy; xác nhận 2 WebP gate/hall hiển thị đúng, fallback hoạt động, nút mở truyện, đóng/mở, đổi nhánh, reload, không trùng CTA. Test responsive 320/375/390/430 px, desktop, Android/iOS. Không được ghi QA pass nếu chưa thực sự chạy.
2. **Thiết kế/duyệt V2B World & NPC Bible**: `World Truth`, nơi chốn/scene, luật đổi địa điểm, NPC knowledge/beliefs/intent, quan hệ và chứng cứ. Chuyển nhà kho thành một `placeId` riêng **chỉ khi kịch bản có hành động chuyển địa điểm thật**; ảnh store không tự mở khóa vì file đã tồn tại.
3. **Triển khai V2B theo đợt lớn sau chốt phạm vi**: nâng chiều sâu phó bản F Quan Đạo (không cho bấm mò để có kết luận thuyết phục), phân nhánh khác nhau có hậu quả, NPC không biết bí mật chưa học được; kiểm thử engine, UI mobile và migration session theo `scenarioVersion`. Không dùng AI sinh kết quả nhiệm vụ thật.
4. **Pilot nội dung**: ba truyện F đa dạng độc lập rồi hai E khác cấu trúc (điều tra có chứng cứ và chiến lược/quan hệ). Mỗi tiểu thế giới có visual identity; 48 seed vẫn khóa.
5. **Sau QA nội dung** mới phát triển AI DUDU CORE với purpose/quota backend độc lập, rồi xem xét hợp đồng/ledger/xác minh nhiệm vụ/EXP/kinh tế thật sau duyệt riêng.

### Hạn chế và hướng quay lại

- Không tự bật reward/contract/khảo hạch thật, không thay Firestore Rules, billing, hệ thống Liên Lạc hay thư viện truyện khi chỉ kiểm thử pilot.
- Không coi test tĩnh hoặc WebP có trên GitHub là bằng chứng ảnh đang hiển thị đúng trên Pages; kiểm tra pipeline triển khai riêng.
- Điểm so sánh trước Visual V2A: `648a30aad84fee6e89b58db329d50f0602a8700b`; ngay trước đợt upload ảnh: `b67678238e00ef6573d0bce808d994eae2b803bb`. Ưu tiên revert commit tương ứng thay vì reset cả repository.
- Giữ nguyên lịch sử các mục 1–5 phía trên làm bối cảnh thời điểm Foundation V1; mục 6 này là tình trạng mới hơn.

## 7. ĐÃ TRIỂN KHAI V2B — WORLD BIBLE / NPC KNOWLEDGE / SCENE PILOT (20/10/2026)

> Phần này mới hơn mục 6. Mục 6 là tình trạng **trước** V2B, không được tiếp tục coi `store` chưa có `placeId` sau khi V2B hoàn thành. Đọc thêm `docs/DUDU-CORE-WORLD-BIBLE-V2B.md` để biết phạm vi và hướng phát triển F.

### Đã thêm mã nguồn và tích hợp bản chơi thử trên `main`

- `js/dudu-world-model-v2b.js`: World Bible validation, kiểm đường nối địa điểm, giới hạn thông tin NPC theo `knows`/`factId` và điều kiện tiết lộ; chỉ xuất lời thoại người chơi được nghe.
- `js/dudu-pilot-world-v2b.js`: World Bible Quan Đạo với ba nơi `gate/hall/store`; NPC Hà chưởng quầy, Lục Tam, A Liên có tri thức, động cơ và lời thoại theo trạng thái riêng. Dữ liệu cốt truyện gửi client **không phải bí mật bảo mật thật**.
- `js/dudu-story-engine-v2b.js`: adapter deterministic kế thừa V1, kiểm bằng chứng, flag, adjacency và scene, không cho tự đi kho khi chưa xin phép, không cho kết luận khi chưa đủ điều kiện.
- `js/dudu-pilot-f-v2b.js`: `scenarioId=pilot-quan-dao-v2b`, giữ `missionId=dudu-m-an-f01`; 8 scene, 3 địa điểm, 4 kết thúc (2 thành công/2 thất bại), đối chất riêng mới mở lời thú nhận, chuyển kho gắn logic điều hướng.
- `assets/worlds/quan-dao-store.svg`: cảnh fallback độc lập cho kho; đã có 3 WebP cinematic tương ứng gate/hall/store trong GitHub. UI sử dụng cảnh WebP khi tải được, fallback SVG khi lỗi.
- `js/dudu-pilot-ui-v1.js` và cả hai lối vào `index.html` / `dudu-pilot.html` sử dụng V2B nếu đủ module; UI có nhãn giai đoạn, NPC quote, tên manh mối, giải thích các choice bị khóa; fallback được giữ cho V1. Save V2B ở `dudu:pilot-f-v2b:<uid>`, không ghi đè phiên V1.
- `tests/dudu-core-v2b.cjs`: bộ hồi quy mới; đã cập nhật `tests/dudu-pilot-visibility-v1.cjs` về `v=2b`.
- Chỉ thay đổi static client pilot/docs/tests. **Không chạm Firebase, Cloudflare, quyền Firestore, Xu, EXP, khế ước, hồ sơ hay EPUB.**

### Trạng thái QA và giới hạn công bố

- Đã kiểm tra trực tiếp nguồn trên GitHub, xác minh ba tệp WebP có thật; đã thực thi V2B engine/state cùng các tuyến thành công/thất bại trong môi trường JavaScript độc lập (V8); test V2B/visibility và baseline kiểm tra theo mô phỏng nguồn.
- **Chưa** xác nhận Node tests trên checkout máy người dùng hoặc smoke test thực tế trên Pages/Android/iOS, nên không báo `production QA PASS` hoặc cấp quyền dùng thật. Nếu GitHub Pages không hiển thị, cần kiểm tra deploy/cache và log network trước khi sửa gameplay.
- `status=pilot_only`, `released=false`, `rewardsEnabled=false`. Trạng thái thử trong `sessionStorage` không có tính pháp lý đối với khảo hạch 3 F.

### Tiếp tục phát triển lại truyện ngắn F

- Ưu tiên viết lại **3 nhiệm vụ F khác ID** có phong cách khác nhau, dựa trên seed V66 nhưng **không tự công bố**:
  1. `dudu-m-an-f01` Quán trọ Quan Đạo — nâng từ pilot thành truyện ngắn nhiều tuyến/hậu quả thật về mặt kể chuyện.
  2. `dudu-m-mo-f02` Căn Hộ Tầng Mười — thể loại hiện đại, xung đột cộng đồng/quan hệ, không sao chép công thức điều tra.
  3. `dudu-m-cu-f02` Linh Điền Sau Núi — tu tiên/cơ duyên, lựa chọn tài nguyên và nhân tình, không lấy phá án làm trung tâm.
- **Các tựa trên là bộ ba đề cử để thiết kế tiếp, chưa phải bộ ba đã phát hành hoặc đã nghiệm thu server.** Mỗi F phải có World Bible/Scene Identity riêng, >=1 background đạt chuẩn, nhân vật có giới hạn thông tin, 2+ lựa chọn ý nghĩa/nhánh kết thúc, hệ quả được engine xác định và kiểm thử mobile.
- Không bắt buộc cùng số cảnh, cùng loại nhiệm vụ hoặc thời lượng. Dùng lời thoại ngắn gọn và kể bằng hành động, tránh văn bản quá dài trong UI; không ép người đọc truyện tham gia game.
- Sau khi người chơi thử xong và nghiệm thu 3 F trong pilot, mới xây pipeline đánh giá trên server có chống giả mạo, rồi cân nhắc quyền/trợ lực AI CORE.

## 8. NARRATIVE PASS — SỬA NHỊP TRUYỆN F NGÀY 20/10/2026

> **Bản mới hơn mục 7**. V2B ban đầu có engine/World Bible nhưng Quan Đạo quá ngắn và gượng ép: vừa đến quán đã mất thuốc, không có động cơ can dự, NPC chỉ là nguồn chứng cứ. Chủ dự án yêu cầu truyện F có cốt truyện tự nhiên, mở đầu/diễn biến/kết cục thực sự, **không giới hạn ngắn gọn máy móc**. Đọc `docs/DUDU-F-STORY-CRAFT-QUALITY-V1.md` trước khi viết hoặc sửa F.

- Đã sửa `js/dudu-pilot-f-v2b.js` (giữ tên file để không hỏng imports) sang `scenarioId=pilot-quan-dao-narrative-v3`, `scenarioVersion=3`, vẫn giữ `missionId=dudu-m-an-f01` và các cơ chế V2B.
- Mở đầu mới: `prologue` (đường đèo/mưa/lý do trú quán) → `arrival` (gặp A Liên, giúp phên tre tùy chọn) → `resting` (bữa tối, giới thiệu chưởng quầy & Lục Tam, sự kiện mất thuốc xuất hiện dần) → `hall` (người chơi tự cân nhắc can dự). Sau đó mới hỏi nhân vật, khám kho, đối chất. Tổng hiện có **10 scenes** và **4 endings**, bản văn xuôi có nhiều đoạn, không phải bản tóm tắt checklist.
- `js/dudu-story-engine-v2b.js` truyền `choice.reaction` và loại scene tới UI để phản ứng sau lựa chọn có ngữ cảnh; `js/dudu-pilot-ui-v1.js` trình bày văn xuôi theo đoạn xuống dòng kép, tăng khả năng đọc mobile, không đưa nút chọn vào giữa một câu đang kể. UI hiển thị kết truyện thay vì chỉ báo đạt/không đạt nhiệm vụ. `css/dudu-pilot-v1.css` được bổ sung style reader.
- `js/dudu-pilot-world-v2b.js`: lời thoại NPC có điều kiện; A Liên có phản hồi khác nếu người chơi giúp cô lúc mở đầu, không bịa ký ức ở tuyến khác.
- Trang `dudu-pilot.html`, thẻ Vạn Giới và assets tham chiếu phiên bản `story-3`; giới thiệu ngoài trang tránh tiết lộ ngay vụ mất thuốc. Namespace save mới `dudu:pilot-f-narrative-v3:` để không mạo nhận save V2B cũ đã trải qua prologue.
- Cập nhật `tests/dudu-core-v2b.cjs` và `tests/dudu-pilot-visibility-v1.cjs`. Bốn bộ kiểm thử Foundation V1 / Visibility / Visual V2A / V2B đã PASS khi thực thi bằng V8 mock dựa trên source GitHub ở phiên sửa này; **chưa xác thực Node trực tiếp hoặc smoke browser Pages/mobile**.
- Không sửa backend, Firestore Rules, EPUB, auth, Liên Lạc NPC, thưởng thật, kho, Xu, cấp bậc. `pilot_only`, `released:false`, `rewardsEnabled:false` vẫn khóa.

**Kế tiếp:** trước khi tạo 3 truyện F khảo hạch, dùng quy chuẩn chất lượng kể chuyện vừa lưu để viết đề cương đầy đủ cho từng F, có riêng nhân vật, động cơ, nhịp đời sống, biến cố, nhiều hậu quả, visual identity và QA logic; không copy tuyến điều tra Quan Đạo sang mọi F. Không đồng nhất 48 seeds V66 với nhiệm vụ đã phát hành.

## 9. F INTERACTIVE DISCOVERY V4 — NGƯỜI CHƠI TỰ ĐIỀU TRA (20/10/2026)

> **Điểm bàn giao mới nhất** sau mốc Narrative V3 ở mục 8. Đọc `docs/DUDU-F-INTERACTIVE-DISCOVERY-V4.md` và `docs/DUDU-F-STORY-CRAFT-QUALITY-V1.md` trước khi tiếp tục làm F.

Phản hồi kiểm thử UX: ở bản V3, lựa chọn buộc tội A Liên / yêu cầu Lục Tam chịu trách nhiệm / hòa giải đều lộ ngay lúc đến đại sảnh; NPC tiết lộ quá sớm; đọc nhiều đoạn văn nhưng ít được làm gì. Người chơi yêu cầu **xuyên vào thế giới**, tự đi từng nơi, hỏi người, kiểm tra vật, đưa ra giả thuyết và chọn chứng cứ để bảo vệ kết luận. Hai ảnh tham khảo từ trò chơi tương tác trên điện thoại cho thấy ưu tiên ảnh bối cảnh, lời thoại ngắn và nút hành động rõ, không sao chép UI của bên thứ ba.

### Đã triển khai trên main

- `js/dudu-pilot-f-v2b.js` hiện là **Quan Đạo Investigation V4** `scenarioId=pilot-quan-dao-investigation-v4`, `scenarioVersion=4`, giữ ID nhiệm vụ gốc `dudu-m-an-f01`. Có 27 scene phân nhánh (không phải 27 đoạn tuyến tính), 68 lựa chọn authored, 5 ending. Người chơi tự đi đại sảnh/hành lang/kho, trao đổi NPC, khám vật chứng và ghi nhận lời kể.
- Hành động vào kho ẩn tới lúc xin phép; hành động suy luận ẩn đến khi có sổ chìa, niêm phong và **một trong hai** lời chứng của A Liên/Lục Tam; các nút kết luận chỉ xuất hiện sau suy luận và kiểm chứng. Người chơi tự chọn nghi ai và căn cứ nào; đoán theo bóng áo lính không đạt. Tự do chọn trình tự khảo sát. Không tiết lộ tên thủ phạm qua CTA trước khi người chơi biết.
- `js/dudu-story-engine-v2b.js`: `visibleIfEvidence`, `visibleAnyEvidence`, `visibleIfFlags`, `hiddenIfFlags`, cùng kiểm tra tại `decide` chống gọi choice ẩn. `js/dudu-world-model-v2b.js` kiểm tra điều kiện dẫn chứng hợp lệ. `js/dudu-pilot-world-v2b.js` hãm thoại tiết lộ, chỉ nói theo biết/đã được đối chất.
- `js/dudu-pilot-ui-v1.js` và CSS: câu ngắn theo cảnh, sổ tay chứng cứ mở/đóng, nhãn A/B/C, phân kiểu quan sát/trò chuyện/di chuyển/suy luận, focus đọc mobile. Trang `dudu-pilot.html` và shell trỏ phiên bản `play-v4`; lưu tạm bằng `dudu:pilot-f-investigation-v4:` tách biệt V1/V2B/V3.
- **Không** mở bản đồ thế giới/48 seed thành nhiệm vụ thật. `pilot_only`, `released:false`, `rewardsEnabled:false`; không ghi XP/Xu/kho, hợp đồng, Firestore hay AI.
- Kiểm tra logic qua 4 bộ test JS trên môi trường V8 với nguồn fetch GitHub **PASS**, gồm đường người chơi chọn sai, chọn đúng, lời chứng thay thế và lựa chọn ẩn không gọi trực tiếp được. Chưa có trình duyệt thực, deployment log hoặc QA mobile xác nhận.

**Ưu tiên kế tiếp:** QA trong trình duyệt trên GitHub Pages rồi mới viết lại từng truyện F mới với nhịp tương tác riêng. Không rập khuôn F02/F03 thành 'mất đồ → tìm chìa → hỏi lính'. Viết thêm nội dung khi có động cơ, không ép văn phải ngắn. Lưu mốc rollback V4 ở các commit GitHub gần ngày 20/10/2026; baseline trước đợt V4 là `74902544d0b2b580bdf90bc9452b5cacfe229940`.

## 10. F REASONING V5 — SỬA LỖI SUY LUẬN, THÚ NHẬN VÀ LỜI THOẠI (20/10/2026)

> Đây là **trạng thái mới nhất**, thay cho các chi tiết V4 bị sửa ở mục 9. Đọc `docs/DUDU-F-REASONING-V5.md` để có lý do thiết kế và trường hợp kiểm thử.

Người chơi gửi ảnh thực tế V4 và phát hiện: cần đủ tổ hợp manh mối cố định mới được suy luận; mời mọi người ngồi lại khiến Lục Tam thú nhận tự động; NPC có câu đã kể xong nhưng khi sang cảnh sau vẫn tự xuất hiện lại hoặc chèn thêm thoại. Căn nguyên lời thoại: engine V2B gọi `model.npcView(npcId, globalState)` mỗi lần `view()`, dùng thông tin mới nhất thay vì câu phát ra ở đúng scene.

**Đã sửa trên `main`:**
- Quan Đạo chuyển `scenarioId=pilot-quan-dao-reasoning-v5`, `scenarioVersion=5`, giữ `missionId=dudu-m-an-f01`, file `js/dudu-pilot-f-v2b.js` và đường vào cũ để bảo toàn tích hợp. Có **36 scene** tương tác và **93 lựa chọn authored** nhưng không bắt người chơi qua hết.
- Suy luận mở ngay sau biến cố, kể cả khi **chưa có chứng cứ**: được tự hình thành giả thuyết nhưng không thể đối chất/thắng bằng dữ liệu chưa tìm được. Tuyến điều tra chính không bắt đủ cả 5; có đường dùng **2 chứng cứ độc lập** để hỏi riêng Lục Tam, sau đó tự kiểm tra biên nhận thành **chứng cứ thứ 3** để mở giai đoạn xử lý.
- Họp không phải nút thắng. Chỉ yêu cầu người có tội tự thú dẫn tới im lặng; người chơi phải công khai kiểm chứng, hỏi Lục Tam xác nhận và, nếu chọn hòa giải, cho A Liên tự trình bày. Có tuyến lập biên bản với chưởng quầy riêng.
- NPC thoại gắn thẳng `scene.speech` với `npcId` đúng cảnh; engine chỉ trả `npcDetails` khi speech được author chốt. Không được tự lấy quote mới nhất theo global evidence hoặc ghép quote vào scene khác. World Model có validation.
- Engine `view()` ẩn luôn lựa chọn chưa đạt chứng cứ/flag nếu không được cấu hình `showLocked`, giảm lộ đáp án qua nút khóa; `decide()` vẫn kiểm an toàn.
- UI sổ tay không hiển thị số manh mối như một điều kiện thắng. Phiên lưu riêng `dudu:pilot-f-reasoning-v5:`, cache `play-v5`.
- Bốn bộ test JS V1/visibility/Visual V2A/V5 qua môi trường V8 mock theo nguồn mới nhất. **Chưa có kiểm thử Node + GitHub Pages/mobile thật.**
- Tất cả `pilot_only`, `released=false`, `rewardsEnabled=false`. Không thay Firebase/EPUB/auth/NPC chat/XP/Xu/khế ước/backend.

**Tiếp theo:** thử thật trên trang `dudu-pilot.html?v=play-v5`; ưu tiên lỗi cảnh, thoại, các nhánh do độc giả thử. Sau QA mới dùng design này cho F02/F03; E và bậc cao hơn phải có World Truth backend, nguồn độc lập, tình huống NPC che giấu và quyền nghiệm thu server, không tự cho AI quyền phán xử.

## 11. DUDU F V6.1 — FAIR VERDICT (20/10/2026)

Điểm tiếp tục mới nhất: docs/DUDU-F-FAIR-VERDICT-V6-1.md. Quan Đạo V6.1 gồm 40 phân cảnh, 106 lựa chọn, 6 kết thúc, vẫn là bản pilot không phát thưởng. Thoại nhân vật gắn theo cảnh; phần kể không tiết lộ kết luận thay người chơi. Ba nhân vật bị nghi đều có quyền giải thích khi chưa có chứng cứ, không kết thúc ngay chỉ vì bị nêu nghi ngờ. Khi đối chiếu biên nhận thành công với Lục Tam, người chơi có thể trực tiếp chuyển sang lập biên bản hoặc đối thoại thay vì quay về bảng suy luận. Trang thử dùng dudu-pilot.html?v=play-v6-1, lưu riêng theo phiên bản. Bốn bộ test logic hồi quy PASS trong môi trường V8 mô phỏng; chưa kiểm tra thiết bị hoặc trình duyệt thực. Tiếp theo: QA trên Pages, rồi phát triển F02/F03 theo chuẩn suy luận công bằng. Giữ nguyên Firebase, EPUB, AI NPC và tất cả dữ liệu, phần thưởng chính thức.

## 12. HOTFIX V6.2 — KHÓA 100 THAO TÁC VÀ NHẦM TRẠNG THÁI CHỨNG CỨ

Điểm bàn giao mới nhất: đọc phụ lục V6.2 trong `docs/DUDU-F-FAIR-VERDICT-V6-1.md`. Người chơi đủ manh mối nhưng gặp chặn vì `state.step>=100`, UI không báo lỗi. Đã nới giới hạn 10.000 bước (log còn 100 bản ghi gần nhất), hiện thông báo lỗi, bổ sung chú thích phân biệt lời thú nhận riêng, biên nhận được xác minh với manh mối đã xem; sau khi xác minh đầy đủ có đường kết luận trực tiếp ở đại sảnh. Đã thử đủ cả 5 manh mối và hơn 240 bước di chuyển, vẫn giữ evidence và tiếp tục được. **Không đổi ID kịch bản V6.1/khóa phiên**, chỉ cập nhật query trang `play-v6-2` để bảo toàn save đang có. Bốn bộ test JavaScript PASS trong V8 với mô phỏng filesystem; chưa xác minh deploy GitHub Pages hoặc QA thiết bị thật. Tiếp tục F02/F03 sau khi người chơi thử thành công; pilot không cấp thưởng thật.

## 13. F DAWN RESCUE V7 — ĐIỀU TRA PHẢI GIẢI QUYẾT HẬU QUẢ

> Đây là mốc phát triển **mới hơn V6.2**, đọc `docs/DUDU-F-DAWN-RESCUE-V7.md` để thấy đầy đủ điều kiện, nhánh truyện và giới hạn.

Người chơi đã thử hết Quan Đạo và nhận ra kết thúc thiếu payoff: mất thuốc được coi là nghiêm trọng, nhưng khi Lục Tam nhận tội thì chỉ cần ký giấy, A Liên được minh oan, mọi manh mối trở nên vô nghĩa. **Đã tái thiết hậu quả V7**, không chỉ sửa văn.

- `js/dudu-pilot-f-v2b.js`: `scenarioId=pilot-quan-dao-dawn-rescue-v7`, `scenarioVersion=8`, giữ seed `missionId=dudu-m-an-f01`. **48 scene / 131 choice / 10 ending** đang ở dạng pilot, không phải 48 nhiệm vụ thật.
- Mở đầu xác định túi thuốc ký gửi cho **đoàn xe chở người bị thương** đến nhận trước bình minh. Lục Tam từng mang cả túi sang trạm gác cứu người; biên nhận chỉ chứng minh **2 cuộn băng + 1 lọ thuốc đã dùng**, trong khi bảng kê gốc có **6 cuộn + 2 lọ**. Người chơi cần xác minh lượng còn, thu hồi từ trạm gác bằng đường còn đi được, đếm thuốc và giao cho đoàn xe, không dừng ở lời thú nhận.
- Nhánh logic mới: `supply_audit → supply_count → route_plan → route_advice → courier_out → courier_in → handover → convoy_ready`. Không cho kết thúc success từ `formal_report`, `hearing_proof`, `hearing_resolution`. Chỉ `convoy_ready` có 2 lựa chọn kết thúc thành công, đòi `medicine_recovered`, `convoy_supplied` và điều kiện trách nhiệm/đối thoại.
- Có các hậu quả riêng: chỉ lập giấy nhận lỗi, chọn đường bị ngập, đưa túi đi không kiểm đếm, giao thuốc nhưng không minh oan. Không đồng nhất *kết tội đúng* với *hoàn thành nhiệm vụ*.
- World Bible thêm người dẫn đường Đinh Nhị và các sự thật về số thuốc, đường đi; câu thoại đúng scene, không tự cho người chơi biết lối an toàn trước khi hỏi.
- UI/Pages chuyển cache `play-v7` và dùng khóa phiên `dudu:pilot-f-dawn-rescue-v7:`; **không tự nâng cấp save V6.1** vì đồ thị truyện thay đổi, nhưng save cũ vẫn còn riêng. Người chơi sẽ bắt đầu lại **chỉ phần pilot** khi thử V7.
- Không chạm Firestore/auth/EPUB/Cyber Phone/Liên Lạc NPC/XP/Xu/khế ước; `pilot_only`, `released:false`, `rewardsEnabled:false`. Kiểm thử JS nguồn khác với QA Pages/mobile thật.

**Tiếp theo:** kiểm thử Pages thực, độ dài nhịp đọc, chất lượng cảm xúc và hậu quả nhánh V7. Sau nghiệm thu mới phát triển F02/F03 với xung đột đặc thù từng thế giới, không bê cơ chế mất thuốc sang bối cảnh khác.
