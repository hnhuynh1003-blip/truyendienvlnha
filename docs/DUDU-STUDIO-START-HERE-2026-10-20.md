# DUDU Studio — START HERE / Bàn giao sạch · 20/10/2026

## VẠN GIỚI Giai đoạn 1B — 26/10/2026

Điểm tiếp nối nền: `4ad5d73` (đợt 1A đã được cho phép cập nhật main; CI và Pages SUCCESS). Xem `contracts/vangioi/AUTHORING_BACKEND_G1B.md` trước khi nối World Creator.

Đợt 1B thêm `cloudflare/src/vangioi-authoring.mjs` và 37 test: xác thực Firebase + membership theo world, collaborator chỉ đọc/sửa mục được giao, chặn tự duyệt và quyền tự khai từ JSON; kế hoạch sửa nháp đúng revision, snapshot gửi duyệt được clone/freeze/hash và kiểm quyền lại sau await. Mọi kế hoạch ghi có `requiresAtomicCommit:true`: chưa có writer, chưa lưu/khóa bản nháp thật. Validator submit phải là backend callback bắt buộc, không dùng PASS offline làm quyền gửi/publish.

Module chưa import vào Worker live, chưa thêm route/DB/migration, không đổi auth/Thiên Mệnh/EPUB/NPC/kho/EXP/save/pool99-100/Canon/cờ AI. Tiếp theo là adapter lưu trữ và transaction/idempotency G1C; không mở 48 seed hoặc worldAccess chỉ vì policy tests PASS. CI và deploy cần kiểm theo commit GitHub tương ứng; source PASS khác live backend PASS.

## VẠN GIỚI Giai đoạn 1A — 26/10/2026

Đã đọc master prompt và gói World Authoring V0.1 do chủ dự án cung cấp, đối chiếu code nền tại `1f2fdb14074d99cd1a1542f334175c946c412f49`. Quy tắc làm việc main/không nhánh hoặc ZIP riêng vẫn giữ. Master prompt mới yêu cầu không phát hành production chưa phép; đợt này chuẩn bị và kiểm thử tại checkout main, chưa push hoặc deploy trong phiên triển khai.

Xem `contracts/vangioi/README.md`: lưu nguyên 10 file nguồn cùng hash; thêm `tools/vangioi/intake.py` chỉ đọc JSON và in báo cáo offline, schema bắt buộc, semantic checks, báo xung đột `period/era`, bậc tự khai và luồng trial. Không đổi Canon hoặc schema/runtime cũ. Normalized metadata chỉ là đề xuất, bậc chính thức=null, quyền vào world/publish/thưởng đều false. JSON status/assetStatus/ownershipDeclaration không xác thực backend.

QA: 22 test nguồn + 16 test intake PASS. Workflow smoke bổ sung chạy hai nhóm Python; chưa xác nhận CI remote. Chưa tạo Creator UI, database/migration, quyền AU, asset upload hoặc World Engine production. Giữ nguyên auth, Thiên Mệnh, EPUB, NPC, save, kho/EXP, pool99/100 và các cờ AI. Tiếp theo: contract backend draft/version/membership sau khi đối chiếu các quyết định còn mở; không dùng PASS offline để mở 48 seed hoặc khảo hạch.

> **Trang duy nhất nên đọc ĐẦU TIÊN trong cuộc trò chuyện ChatGPT mới.**
> Dành cho việc tiếp tục dự án sau khi lưu trữ/xóa các chat dài. Đây là **bản chỉ mục + mốc trạng thái**, không phải bản sao mọi cuộc trò chuyện; mã nguồn `main` và các hồ sơ chuyên đề dưới đây mới là căn cứ kiểm tra.
> Repository **PUBLIC**: tuyệt đối không đưa khóa API, token, UID người dùng, nội dung chat riêng tư hay dữ liệu tài khoản thực vào tài liệu/commit.

## 0. Nơi lấy trạng thái đúng

- GitHub: `hnhuynh1003-blip/truyendienvlnha`; nhánh chính `main`; web tĩnh `https://hnhuynh1003-blip.github.io/truyendienvlnha/`.
- Mốc kiểm kê tại thời điểm tạo bản này: `241552d46c3decdfa8d9130d2ec14ac3975c6952` (Quan Đạo V8, sửa ending đoán sai không lộ đáp án). **Không dùng SHA này thay cho việc fetch HEAD hiện tại.**
- Có 95 hồ sơ trong `docs/`, 113 tệp trong `js/`, 113 tệp trong `tests/` (số liệu ở thời điểm kiểm kê). Phần lớn quyết định đã có trong repo; GitHub **không giữ toàn văn lịch sử ChatGPT, tài liệu chưa commit, kết quả thiết bị thực hay dữ liệu backend cá nhân**.
- Bắt đầu đọc `docs/DUDU-CORE-CONTINUATION-PROMPT-V1.md` (14 mốc, mục 14 là mới nhất), `docs/DUDU-MASTER-DELIVERY-2026-10-19.md` (các đợt triển khai) rồi tài liệu chuyên đề theo việc định làm. **Không coi những mục mốc cũ là trạng thái code hiện tại.**

## 1. Sản phẩm và những quyết định không đổi

DUDU Studio là nền tảng **đọc truyện/EPUB + tương tác NPC qua Messenger + thế giới truyện tương tác**, không phải chỉ một game nhiệm vụ. Độc giả vẫn phải đọc truyện bình thường; gameplay xuyên giới là **tùy chọn**, không cản đọc. Hai luồng kiểm thử quan trọng là **AU (tác giả)** và **Reader (độc giả)**, desktop và điện thoại; không trộn dữ liệu UID/nhân vật/truyện, kể cả thử chế độ khách.

- Giao diện: phong cách **hệ thống Vạn Giới** có dấu ấn riêng, ít chữ trên thẻ, hành động không trùng lặp; chat NPC tối giản như Messenger, trả lời ngắn, đúng giọng, không kể hành động dài.
- Quy tắc thế giới: 6 thể loại **Cổ đại / Hiện đại / Niên đại / Tương lai / Tu tiên / Mạt thế**. Bậc **hệ thống** `F→E→D→C→B→A→S`, phân biệt với cấp **nhiệm vụ**, cấp người chơi và cấp truyện. 48 seed (30 F + 18 E) V66 đang **chưa phát hành**.
- DUDU CORE (Chủ thần) khác DUDU trò chuyện trong điện thoại và khác AI NPC. Hệ thống có chính quy/phi chính quy, khế ước ký chủ, cân bằng tri thức/hậu quả. Không để chatbot tự cấp vật phẩm/EXP/Xu, công bố nhiệm vụ, kết luận World Truth hay tự ký khế ước.
- Khảo hạch 3 nhiệm vụ F khác ID chỉ có giá trị **khi server xác minh**, chưa thể lấy kết quả pilot làm thật. Đừng đồng nhất localStorage với dữ liệu công nhận server.
- Người dùng chủ trương **triển khai từng đợt lớn có tính nhất quán, thường trực tiếp lên `main` cho web** và kiểm thử theo đợt; không chia thành hàng chục cuộc xác nhận nhỏ. Nhưng **không được** tự bật thanh toán, Worker AI trả phí, khóa API, backend production, sửa Firestore Rules, xóa dữ liệu, phát hành nhiệm vụ thật hoặc ghi thưởng thật khi chưa được duyệt rõ. Luôn ghi SHA, kiểm thử đã chạy, giới hạn QA và hướng rollback.
- Không dùng chat riêng của người chơi để huấn luyện khi chưa có opt-in hợp lệ.

## 2. Tình trạng theo phân hệ — Đọc mốc mới, không phỏng đoán

| Phân hệ | Source / tài liệu chính | Giới hạn cần nhớ |
|---|---|---|
| Trang chủ, cổng hệ thống, thư viện | `js/site-shell-v60.js`; `docs/DUDU-V60-HOMEPAGE-DEDUP.md`, `docs/DUDU-V60-SYSTEM-PORTAL.md` | Đã có hướng giảm lặp thẻ; không gọi nội dung ngoài giao diện đã kiểm là hoàn thành |
| Đọc sách / EPUB | `js/epub-production-v49.js`, `js/epub-text-v57.js`; `docs/DUDU-V57-EPUB-IMPORT.md` | V57 có import/resume, quyền phát hành; lưu chương đã đọc/incognito/mobile cần QA thực, không sửa Rules tùy tiện |
| NPC chat / Gemini-GLM / free Multi-AI | `js/ai-proxy.js`, `js/npc-auto-model-v56-11.js`; `docs/DUDU-V57-1-V58-FREE-MULTI-AI.md` | Tài liệu V58 trải nhiều mốc draft/merge; phải đối chiếu `main` + Worker thực. HTTP 400, fallback, DNS adblock điện thoại, mô hình miễn phí và AU/Reader không được tuyên bố đã ổn định nếu chưa test |
| Cyber Phone và DUDU chat | `js/dudu-messenger-v67-2.js`, `js/dudu-system-steward-v67-3.js`; `docs/DUDU-V67-APP-BASELINE-AUDIT.md`, `docs/DUDU-V67-3-STEWARD.md` | DUDU Steward hiện **scripted, read-only**, không phải AI độc lập và không có quyền thao tác nền |
| Vạn Giới / 6 loại / 48 seed / A-B-C | `js/world-taxonomy-v66.js`, `js/world-blueprint-v66.js`, `docs/DUDU-V66-SYSTEM-PACT-GENRES-MISSIONS.md` | Seed và atlas có thể hiển thị nhưng không phải world gameplay hay pact/reward đã mở server |
| CORE luật F và engine | `js/dudu-core-rules-v1.js`, `js/dudu-story-engine-v1.js`, `js/dudu-story-engine-v2b.js`; `docs/DUDU-CORE-CANON-FOUNDATION-V1.md` | Foundation + pilot deterministic, quyền verified backend tương lai |
| Truyện F01 Quan Đạo **mới nhất** | `js/dudu-pilot-f-v2b.js`, `js/dudu-pilot-world-v2b.js`; `docs/DUDU-F-WHODUNIT-V8.md` | **V8 / scenarioVersion 9**, 27 scene, 9 ending, pilot only, không thưởng, chưa QA thực trên thiết bị |

## 3. Quyết định sáng tác F mới nhất — V8 thay V7

Người dùng loại bỏ hướng F01 V7 vì vụ án được giải ở giữa rồi kéo dài thành nhiệm vụ kiểm kê/vận chuyển thuốc không hấp dẫn và không thưởng. **Quy chuẩn đang hiệu lực V8**:

1. DUDU đưa **mục tiêu ngắn đầu truyện** khi thể loại phù hợp.
2. Ba nghi phạm đều có cơ hội/dấu nghi cụ thể; các vật chứng sai hướng lành mạnh phải có cách giải thích ở hồi kết.
3. Cho người chơi tự đi, hỏi, kiểm tra; **tìm vật bị mất trước khi kết luận thủ phạm**.
4. Chỉ cần **bằng chứng then chốt hợp lý**, không gom đủ N loại theo checklist. Có hai đường đối chiếu khác nhau.
5. **Cao trào:** đối chất → chọn nghi phạm → lý giải đúng nguyên nhân. Giải xong **kết thúc gần như ngay** và hiển thị “ĐÃ GIẢI ÁN (BẢN THỬ)”, không thêm minigame sau đó.
6. F02/F03 cần **gameplay khác**: hiện đại có thể là quan hệ/xung đột đời sống, tu tiên có thể là cơ duyên/giao dịch/đánh đổi; không bắt tất cả truyện F đều phá án.

Link bản V8: `https://hnhuynh1003-blip.github.io/truyendienvlnha/dudu-pilot.html?v=play-v8`.
Pilot lưu riêng `dudu:pilot-f-casefile-v8:`; không tự nhập save V7. Test logic V8: 4 bộ hồi quy **PASS bằng V8 mock lấy source GitHub**, **chưa xác thực trình duyệt Pages/Android/iOS**.

## 4. Hạng mục còn tồn tại / không được giả định đã xong

- Test trực tiếp **Pages sau deploy**, giao diện 320/375/390/430px, desktop, đóng/mở, refresh, login/guest, quay lại scene, không lộ lời giải. Những test mock JS không thay thế browser smoke.
- NPC AI: xác minh HTTP 400 và model fallback bằng log đã lọc, AU và Reader riêng, laptop và phone có DNS ad-block; không kích hoạt nhà cung cấp có thể phát sinh phí.
- EPUB/bookmark: xác minh tiến độ chương và quyền Reader trên thiết bị thực; không khẳng định đã sửa chỉ nhờ source.
- 3 nhiệm vụ F khảo hạch thực, E thực, DUDU CORE generative AI/AI Director, khế ước có xác minh server, phần thưởng authoritative, training opt-in: **chưa phát hành**, cần xét quyền và thiết kế.
- Dữ liệu Firebase/Cloudflare deploy, cấu hình bí mật, billing, quyền access thật và feedback UX ở chat riêng **không thể tái hiện từ repo**. Tài liệu `.rules.review` trong `security/` là bản xem xét, không chứng minh Rules console đang chạy.

## 5. Cách làm việc ở cuộc chat mới

1. Dùng **GitHub connector** fetch HEAD của `main` và tài liệu này; kiểm tra source thật trước khi tuyên bố tiến độ. Không chỉ đọc tên file hoặc một tóm tắt cũ.
2. Chọn **một đợt lớn có giới hạn rõ** (ví dụ QA F01 V8 → phát triển F02/F03), xác định dữ liệu được phép chỉnh và các phần giữ nguyên.
3. Commit có mô tả, chạy tests liên quan, ghi SHA, phân biệt `source PASS` / `browser PASS` / `deployed` / `pending`.
4. Bổ sung tài liệu chuyên đề + dòng tiếp nối trong file này sau mỗi mốc đáng kể. Không lưu chat nguyên văn hoặc ảnh cá nhân trong repository công khai.

**Gợi ý prompt cho cuộc chat mới:**

“Tiếp tục DUDU Studio từ GitHub `hnhuynh1003-blip/truyendienvlnha`, nhánh `main`. Hãy đọc `docs/DUDU-STUDIO-START-HERE-2026-10-20.md`, kiểm tra HEAD + source hiện tại, sau đó đọc tài liệu chuyên đề mới nhất. Quan Đạo V8 vẫn pilot; giữ EPUB, NPC, auth, dữ liệu và billing. Tóm tắt trạng thái thực và đề xuất đợt tiếp theo, không giả định test mock là đã triển khai sản xuất.”


## V69 — Quyết định thay thế V68: ứng dụng Hệ Thống riêng + Chủ Thần AU (20/10/2026)

**Chỉ dẫn mới nhất của chủ dự án đã thay thế cách gộp bốn vai vào Liên Lạc.** Không dùng kênh DUDU Chủ Thần / hệ thống con bên trong chat bạn bè; mã `js/dudu-agent-v68.js` và test của phương án đó đã bị xóa, Messenger và CSS V67.2 được hoàn nguyên có chọn lọc. **Không tạo nhánh phụ hay ZIP riêng; mọi mã hiện hành tập trung trên GitHub `main`.**

Ba bề mặt độc lập:
- **Liên Lạc DUDU** = người bạn hướng dẫn đọc truyện, trò chuyện thường ngày; chat NPC qua AI router riêng. Giữ nguyên dữ liệu cũ. Không cấp luật/phần thưởng.
- **Ứng dụng Hệ Thống Xuyên Truyện** = dành cho người chơi, có popup tám chỉ số, các hàng thống kê ký chủ, hệ thống con, lịch sử xuyên, thưởng và vật phẩm; hiển thị **không xác minh** khi thiếu dữ liệu có chữ ký từ server. Chưa có thẻ → không ký khế ước, không xuyên giới hoặc tăng cấp.
- **Ứng dụng Chủ Thần AU** = chỉ có launcher/quyền mở khi đạt `canEditStories`, riêng production kiểm `DuduAuth.isAdmin()`. Có công cụ quy tắc nháp, đánh giá điều kiện chỉ số và chuẩn audit. Không trích xuất dữ liệu tài khoản khác và không áp đặt xử phạt thật.

**Luồng chuẩn mới:** `Nhiệm vụ mở đầu → xác minh server → Thẻ thông hành → ký khế ước với hệ thống con → hệ thống thức tỉnh → nhiệm vụ xuyên truyện và nâng cấp`. Ba F khảo hạch (phải là ba mission khác nhau được server nghiệm thu) nằm trong tiến trình game, **không tự trở thành nhiệm vụ phát thẻ trước khế ước**.

Mã: `js/dudu-transmigration-v69.js`, `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`, hai app mount mới trong `index.html` và kiểm thử V69. `js/phone-app-contract-v67.js` giờ liệt kê **14 ứng dụng** (12 cũ + 2 mới). `cloudflare/src/dudu-hive-v68.mjs` là adapter **tắt mặc định, chỉ AU được Firebase xác thực và UID thử** để thử Chủ Thần/hệ thống con sau này; không được tái gắn vào chat DUDU bình thường. Chưa gọi API Hive, chưa có công cụ backend phát thẻ, ghi rank, phạt, thu thập hoặc mở NPC/World Truth.

**Nguồn tiếp nối mới cần đọc trước nhất:** `docs/DUDU-V69-SYSTEM-PASSPORT-AU-CORE.md`. Thứ tự tiếp: sửa/kiểm thử toàn bộ CI → thiết kế dịch vụ Nhiệm vụ mở đầu và Thẻ thông hành có chữ ký server → khế ước có xác nhận → dữ liệu stats/rewards/progression và hệ thống con thật → AI Chủ Thần/hệ thống con có giới hạn thẩm quyền. Giữ nguyên canon luật, 48 seed chưa phát hành, EPUB, Firebase, NPC, ví/kho và xác thực hiện hữu.

## V70 — Hệ Thống tối giản, khóa trước hồ sơ, thẻ thử Sandbox và Chủ Thần bằng prompt (20/10/2026)

**Ưu tiên cao hơn thiết kế V69:** trang `Hệ Thống Xuyên Truyện` đối với người chưa được máy chủ cấp thẻ **chỉ có ô nhập mã Thẻ thông hành**, không render profile hay popup. Sandbox có mã trình diễn `DUDU-THU-2026` (chỉ dùng `?sandbox=1` cùng tài khoản Sandbox). Đây chỉ là quyền **xem mẫu giao diện**, không cho ký khế ước/xuyên thế giới/cấp thưởng/cấp EXP, không có server pass receipt thật. Đăng nhập Firebase bình thường không được dùng mã này để mở khóa.

Khi nhập đúng mã thử, app hiện gọn: tên ký chủ, ID ký chủ `KC-XXXXXXXX`, hệ thống con có ID công khai riêng `SYS-F-XXXXXXXX`, thiên hướng giả định, tiến trình demo, hai hành động nhỏ Chỉ số/Nhật ký. Popup chỉ số có 8 thuộc tính demo; không hiển thị phần lớn bảng dài V69. **Chính quy/phi chính quy không thể phân biệt bằng mã công khai**; backend cần kiểm chứng nguồn gốc bằng dữ liệu/issuer chứng thực không gửi cho browser.

Chủ Thần AU chuyển thành **một prompt → DeepSeek Core → phản hồi/kế hoạch** thay cho các biểu mẫu thủ công. Chỉ AU Firebase được máy chủ công nhận mới được gửi; ở `?sandbox=1` luôn từ chối gọi AI. Trong Worker, model Core chỉ được phản hồi văn bản và chịu hai cờ tắt Hive + giới hạn 20 lượt; chưa có công cụ trích xuất riêng tư/xử phạt tự động. Hướng đúng tương lai là AU xác lập chỉ thị, AI điều phối sự kiện, **bộ thực thi backend** tự đánh giá chứng cứ và áp dụng chính sách nằm trong phạm vi cho phép, có audit/khôi phục/kháng nghị. Không cho prompt AI tự nâng quyền.

Đã sửa trực tiếp `main`: `js/dudu-system-gate-v70.js`, `js/dudu-core-ai-v70.js`, cập nhật `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`, `index.html`, adapter `cloudflare/src/dudu-hive-v68.mjs` và kiểm thử. **Đọc chi tiết ở cuối `docs/DUDU-V69-SYSTEM-PASSPORT-AU-CORE.md`**. Không tạo ứng dụng lab phụ hoặc dữ liệu người chơi giả ngoài Sandbox.

## V71 — System thật trên main, không Sandbox, không lộ hệ thống lậu (21/10/2026)

**Thay thế màn V70 demo và các chỉ dẫn nhập mã `DUDU-THU-2026`.** Mã Sandbox đã bị loại khỏi giao diện đang chạy. Không thêm website riêng hoặc nhánh phụ. Trước thẻ thật: một màn nhập mã duy nhất. Sau thẻ: đăng ký tên ký chủ một lần, xem ID ký chủ do máy chủ cấp (bất biến), sau đó hệ thống ngẫu nhiên được phân phối từ kho 99.

**Registry thật:** `cloudflare/src/dudu-system-registry-v71.mjs` có Durable Object SQLite, 99 hệ thống DUDU-01..99, internal_id riêng, nguồn `regular/irregular`, thiên hướng và ký ức riêng đều **không nằm trong payload công khai**. Random assignment là giao dịch nguyên tử trên server sau khi đổi thẻ một lần cho đúng UID Firebase. Hệ thống phi chính quy có thể **công bố mã DUDU giống một mã chính quy khác**; máy chủ giữ `public_id` thật, `display_id` tự xưng và `internal_id` riêng. Trình duyệt không nhận bằng chứng để tự suy ra lai lịch. Chỉ trả system public ID, tên hiển thị, rank/level/EXP, không có origin, độ tin cậy hay private personality. Tám chỉ số ban đầu được tạo **ở máy chủ** và bảng popup đọc từ `GET /v1/system/me`, không suy từ mã ID hoặc lời AI.

**Luồng có hiệu lực server:** `POST /v1/system/owner/issue-test-pass` chỉ chấp nhận Firebase `admin:true` + `DUDU_SYSTEM_PILOT_UID` khớp + `DUDU_SYSTEM_PILOT_CARD_ENABLED=true` + xác nhận chính xác. Một thẻ ngẫu nhiên 128-bit, lưu hash SHA-256, 7 ngày, gắn một UID và chỉ đổi một lần. `POST /v1/system/redeem` phân hệ thống độc quyền; `POST /v1/system/register-name` đăng ký tên ký chủ 2-28 ký tự đúng **một lần**, không đổi ID; `POST /v1/system/consent-pact` đòi người chơi tích chọn chấp nhận `v71-pilot-1`. **Chưa có nhiệm vụ mở đầu thật phát thẻ tự động**, việc cấp thẻ hiện là thử nghiệm chỉ AU, không được phát công khai cho người chơi. Chưa có World Engine production, loot hoặc thưởng thật; hiện `worldAccess:false` ngay cả sau ký khế ước V71 pilot.

**Thất bại, thu hồi và reset:** registry có thủ tục internal `reclaimByRule` để trả hệ thống về kho, reset cấp/EXP/ký ức riêng và hủy host ID/hồ sơ xuyên truyện, **không ảnh hưởng tài khoản, truyện, NPC, bookmark, ví**. Thủ tục **không có public route hoặc auto-trigger**; chưa chọn ngưỡng thất bại, thời hạn kháng nghị và bằng chứng; tuyệt đối không kích hoạt xóa thật trước khi chốt chính sách và xây bộ phát sự kiện đã xác minh.

**Đổi tên nhân vật:** trong `Hồ Sơ Danh Tính` có nút `Đổi tên nhân vật` dùng `userProfile.name` cùng cách lưu profile cũ, hoàn toàn tách khỏi ký chủ hệ thống (đăng ký riêng một lần). Không đổi Firebase UID hoặc mã hệ thống.

**Giao diện:** `js/dudu-system-app-v69.js` đã thay bằng luồng live, `css/dudu-system-app-v69.css` thiết kế lại tối giản, `js/dudu-system-client-v71.js` lấy JWT và gọi Worker chung; thông tin private không có trong DOM hoặc prompt. Không nên dùng `js/dudu-system-gate-v70.js` (đã xóa).

**Triển khai thực tế:** GitHub Pages chỉ triển khai frontend. Cloudflare Worker cần deploy mã V71 + Durable Object migration `v6-dudu-system-registry-sqlite` và secret `DUDU_SYSTEM_PILOT_UID` theo đúng tài khoản AU, không commit secret hoặc UID thật. Hai wrangler files đã cấu hình binding; **thay đổi git không chứng minh Worker đang chạy đã được deploy**. AI Hive vẫn OFF và không cần key để chạy registry. Tuyến Core AU vẫn chỉ tạo đề xuất bằng DeepSeek nếu owner bật AI; không có quyền cưỡng chế/thi hành hình phạt.

Tiếp nối: kiểm tra CI UI + DO SQLite thật; triển khai Worker bằng quy trình được duyệt; chứng minh thẻ AU thật → bind đúng UID, cấp ngẫu nhiên, tên bất biến, provenance kín; rồi thiết kế nhiệm vụ cấp thẻ chính thức; sau đó bổ sung fail/reclaim event receipts server và AI personality riêng theo từng systemId.


## V71.1 — Sửa phân biệt trạng thái registry và cổng thẻ (21/10/2026)

- `js/dudu-system-app-v69.js`: chỉ hiện form nhập mã khi `GET /v1/system/me` trả về `stage:locked` từ registry đã xác thực. Nếu thiếu phiên Firebase, hiển thị yêu cầu đăng nhập. Nếu Worker/registry lỗi, hiển thị trạng thái không khả dụng và nút **Thử kết nối lại**; không đánh đồng lỗi dịch vụ với việc chưa cấp Thẻ thông hành.
- `tests/dudu-transmigration-v69.test.cjs`: bổ sung kiểm tra màn offline/khách không có form đổi thẻ, trong khi màn `locked` do server xác nhận vẫn có. Không thay đổi UID, thẻ thật, phân phối hệ thống, khế ước hay luật Chủ Thần.
- Trạng thái CI quan sát trước thay đổi: `smoke` trên `main` PASS, browser job FAIL do `tests/browser-auth-private.cjs` đợi trạng thái đăng nhập Firebase mock quá thời hạn; lỗi này cần được điều tra riêng, không được báo là browser QA PASS.
- **Không** gọi migration/deploy Worker bởi commit frontend này; V71 thực tế vẫn cần chạy workflow `dudu-v71-system-safe-deploy.yml` thủ công sau khi phê duyệt, secrets và các ràng buộc triển khai được xác minh. Chưa coi khả năng cấp thẻ AU là đã nghiệm thu production.

V71.1 CI note: `tests/browser-smoke.cjs` now expects a *guest/authentication gate without a redemption form*, rather than the obsolete V71 `dudu-v71-lock` demo-like screen. The corrected assertion continues to verify no System stats, no AU entry, no user-data writes.


## V71.2 — Quy trình phát triển trực tiếp trên main (21/10/2026)

**Quyết định mới của chủ dự án:** không phát triển V71 ở chế độ Sandbox rồi merge lại. Source, integration, tài liệu và nghiệm thu chính đều ở nhánh `main`. Không tạo nhánh hoặc website thử nghiệm riêng cho hệ thống xuyên truyện. Giao diện thực là GitHub Pages ở `/` (không tham số `?sandbox=1`). Mỗi đợt sửa `main` phải chạy kiểm thử main-mode và theo dõi cả Pages deployment.

- Thêm `tests/browser-main-system-v71.cjs`: Chromium chạy trang thực *production-mode* từ checkout `main`, lần lượt kiểm: khách bị chặn, reader Firebase không có quyền AU, thẻ sai thất bại, thẻ hợp lệ → ký chủ, đăng ký tên, consent khế ước, đủ tám chỉ số, logout xóa dữ liệu hệ thống cũ. Tất cả Firebase/Worker HTTP đều được chặn và cung cấp đáp ứng giả lập **ngay trong test browser**, tuyệt đối không tạo UID, thẻ, pact hay dữ liệu live. Đây là **integration browser trên main**, không phải chứng minh registry Cloudflare live.
- CI đổi thứ tự: **main V71 + main Firebase auth bắt buộc chạy đầu**, bộ sandbox legacy vẫn giữ để chống regress cho các chức năng lịch sử, nhưng không còn là con đường phát triển/nghiệm thu V71.
- Sửa `js/dudu-system-app-v69.js`: mỗi lần UID đổi hoặc logout, xóa ngay hồ sơ ký chủ/Popup đã render của UID trước; chỉ lấy lại dữ liệu khi client server xác thực phiên mới. Không chia sẻ thông tin người chơi giữa tài khoản.
- **Giới hạn quan trọng:** `main` (GitHub source/Pages) khác với việc tự ghi thử lên Cloudflare/Firebase production. Worker V71 migration, thẻ owner, dữ liệu người dùng, Rewards/EXP/XP và AI trả phí vẫn chỉ bật bằng thao tác có chủ ý sau khi xác minh quyền/secret và bước triển khai thủ công. Có thể duyệt giao diện/luồng trực tiếp trên Pages, nhưng không được tuyên bố thẻ live hoạt động khi Worker chưa chạy.


## V71.3 — Sửa màn khóa và giao diện Hệ Thống trên main (21/10/2026)

- Màn không kết nối trước đây gán `panel.className='dudu-v71-unavailable'`, làm mất class `dudu-v71-lock`; vì vậy biểu tượng/nhãn/nút dồn góc trên và phần còn lại của Cyber Phone trống. Đã sửa giữ nguyên class cơ sở và gắn modifier để màn lỗi vẫn căn giữa, được bố trí thành một giao thức Hệ Thống có ấn ký, vệt trang trí, thanh trạng thái và bảng thao tác.
- Sửa `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`: tái thiết kế cổng Thẻ thông hành và lỗi kết nối theo phong cách Vạn Giới, ưu tiên 320–430px; guest có đường đăng nhập, offline có thử kết nối lại. Không dựng hồ sơ ký chủ, chỉ số, nguồn chính quy/phi chính quy hoặc mã thẻ giả khi server không trả dữ liệu xác thực.
- `js/dudu-system-client-v71.js` phân biệt HTTP 404 (Worker chưa có route), HTTP 503 (registry chưa cấu hình), 401 (xác thực), timeout và lỗi đường truyền/CORS/DNS. Thông báo chỉ mô tả **khả năng** khi chưa có bằng chứng từ live Worker; không tuyên bố nguyên nhân duy nhất.
- Đổi cache query cho HTML/JS/CSS `main`, cập nhật unit test và workflow verify Published Pages. Chỉ frontend được thay; chưa chạy migration Cloudflare, chưa cấp thẻ, chưa tạo dữ liệu người chơi.


### V71.3 — Chẩn đoán Worker công khai (21/10/2026)

Đã chạy GitHub Actions `DUDU V71 Worker route diagnostic (read-only)`, run `39538816413` trực tiếp từ runner không có token/JWT và không ghi dữ liệu. Kết quả: `GET /health → HTTP 200`, `GET /v1/system/me → HTTP 404 error.code=not-found`, CORS allowed origin trả chính xác `https://hnhuynh1003-blip.github.io`. **Kết luận: Worker đang hoạt động nhưng bản được triển khai CHƯA chứa tuyến System V71.** Không gán lỗi này cho người dùng, mã thẻ hoặc Firebase, cũng không thể sửa chỉ bằng CSS/frontend/main Pages.

Bước xử lý có tác động production: rà soát secret `DUDU_SYSTEM_PILOT_UID`, binding hiện có và điều kiện an toàn; sau đó khi chủ dự án cho phép rõ ràng, chạy workflow thủ công `dudu-v71-system-safe-deploy.yml` với xác nhận `DEPLOY_DUDU_V71`. Workflow có preflight bảo toàn các binding/secret hiện hữu và triển khai migration SQLite; không bật phí AI. Sau khi deploy, chạy lại probe công khai (mong đợi `GET /v1/system/me → HTTP 401` khi thiếu JWT), rồi thử account AU thật có quyền; không lưu token, UID, mã thẻ vào repo/log. Đừng dùng kết quả browser mock thay cho kiểm thử backend thật.


## V71.4 — Tên ứng dụng và cổng triển khai production (21/10/2026)

- Đổi nhãn ứng dụng Cyber Phone từ «Hệ Thống Xuyên Truyện»/«Hệ Thống» sang **«✧ Thiên Mệnh»** (tiêu đề) / **«Thiên Mệnh»** (biểu tượng ứng dụng). Đây là đổi cách hiển thị; không đổi API path `/v1/system/*`, ID hệ thống, quy tắc khế ước hay phân quyền.
- V71 Worker cần migration SQLite trên Cloudflare **không cần DeepSeek API key**. Tuyến DeepSeek hiện có trong mã V68/V70 thực chất qua **TheHive AI** (`HIVE_API_KEY`, `https://api-cdn.thehive.ai/api/v3/chat/completions`), không sử dụng API key chính thức của DeepSeek; các cờ `DUDU_HIVE_ENABLED=false`, `DUDU_HIVE_TEST_APPROVED=false`, `DUDU_PAID_PROVIDERS_ENABLED=false` phải giữ OFF khi triển khai registry V71. Chưa cần đăng ký key/bật thanh toán cho ngân sách $0.95.
- Workflow `dudu-v71-system-safe-deploy.yml` vẫn **chỉ có workflow_dispatch** và bắt buộc xác nhận `DEPLOY_DUDU_V71` trên nhánh `main`; audit bindings, secret, vars, migration giữ nguyên. Bổ sung smoke GET `/v1/system/me` không token, **yêu cầu HTTP 401 + `error.code=unauthenticated` + CORS đúng origin** sau khi deploy (404/503 là FAIL). Không đưa token, UID hay code thẻ vào log. Nếu thiếu secret `DUDU_SYSTEM_PILOT_UID` thì preflight dừng an toàn.


### V71.4 Worker deploy preflight: missing flags vs drift (21/10/2026)

- GitHub Actions manual run `39541996239` thất bại ở bước so sánh `vars` (`STOP: existing Worker vars differ from approved config`), **không** chạy deploy hay migration. Bước chỉ đọc `39542340994` xác nhận secret AU và Gemini đều tồn tại, không có biến có giá trị khác nhau; chỉ vắng bốn biến mới trong Worker cũ: `DUDU_HIVE_ENABLED`, `DUDU_HIVE_TEST_APPROVED`, `DUDU_SYSTEM_LIVE_ENABLED`, `DUDU_SYSTEM_PILOT_CARD_ENABLED`.
- Đã sửa audit manual deploy để chấp nhận **chỉ** bốn biến thiếu với giá trị cho phép `false,false,true,true`; nếu biến đã có nhưng khác giá trị thì **STOP**, không ghi đè. Nếu thiếu biến ngoài danh sách hoặc Worker có biến lạ, vẫn **STOP**. Mục đích thêm bốn cờ an toàn khi triển khai V71 mà không thay đổi cấu hình AI/giao dịch cũ. Chỉ tài khoản AU có `admin:true` và UID khớp secret mới được yêu cầu thẻ thử.
- **Chưa chạy deploy production trong lần chỉnh mã này.** Sau khi CI PASS, phải kích hoạt workflow manual lần nữa trên HEAD mới rồi kiểm tra API không-token trả `401 unauthenticated` thay vì `404 not-found`.


### V71.5 — Worker đã deploy; chẩn đoán false-negative smoke (21/10/2026)

- **Lần deploy manual** GitHub Actions `39542756024`, commit `bf32c383`: các bước validation, dry run, bảo toàn bindings/secrets và `npx wrangler deploy --keep-vars` đều **PASS**; log xác nhận **Uploaded + Deployed dudu-ai-staging**. Job chung hiện **FAIL** do *health and System route smoke* gọi `GET /v1/system/me` **ngay sau deploy** và nhận HTTP 403, kỳ vọng 401. **Không được diễn giải FAIL job này là Worker chưa deploy.**
- Chẩn đoán độc lập không ghi dữ liệu `39543054483` vài phút sau: `/v1/system/me` trả đúng `HTTP 401 error.code=unauthenticated` cả khi không có Origin lẫn khi dùng Origin của GitHub Pages, CORS đúng. Điều này chứng minh tuyến V71 đã lên và yêu cầu xác thực, **chưa** chứng minh được user Firebase thật và Durable Object/Thẻ thông hành sau đăng nhập.
- Trong workflow manual đã sửa bước kiểm tra sau triển khai thành retry tối đa 12 lần, mỗi lần cách 5 giây, yêu cầu **đồng thời** HTTP 401 + error.code unauthenticated + CORS origin đúng; vẫn FAIL nếu không ổn định. Đây là sửa chất lượng kiểm thử sau triển khai, **không chạy migration lần nữa**. Không cần owner re-run deploy chỉ để chuyển một kết quả test cũ thành xanh.
- Bước nghiệm thu tiếp: đăng nhập tài khoản AU trên Pages, kiểm tra `DuduAuth.isReady()` và Firebase custom claim admin, gọi GET `/v1/system/me` bằng JWT qua client, xác minh duy nhất UID chủ secret, sau đó mới xét cấp thẻ pilot; không gửi UID, JWT, secret hoặc mã thẻ lên log/chat. Hive/DeepSeek vẫn tắt.


## V71.6 — Thiên Mệnh trực tiếp trên main (21/10/2026)

- Ổn định scroll: hàm `resetSystemScroll()` đặt scrollTop=0 cho màn System khi mở, khi bắt đầu load, khi quay lại từ Worker hoặc khi chuyển trạng thái guest/locked/name/linked. Tránh ảnh chụp màn khóa bị mất ấn ký và tiêu đề vì vị trí cuộn cũ sau lần mở trước.
- Thêm thẻ mục **Thẻ thử dành cho AU** bên trong cổng Thiên Mệnh chỉ khi Firebase auth đã ready và custom claim `admin:true` đã được frontend xác thực. Người dùng phải đánh dấu xác nhận trước khi nhấn nút, Worker tiếp tục yêu cầu **admin JWT + đúng `DUDU_SYSTEM_PILOT_UID` + body `ISSUE_MY_TEST_PASS`**. Mã chỉ hiển thị trong DOM của UID đúng; không lưu localStorage, không in log; copy cần người dùng chủ động bấm. Thẻ thử chỉ dùng một lần. Không cấp thẻ khi chạy test hoặc khi người dùng chưa bấm nút.
- Bỏ luồng tạo thẻ trực tiếp từ console Chủ Thần để tránh hai nút phát hành không thống nhất; thay bằng đường dẫn về Thiên Mệnh. Không bật AI trả phí hoặc thưởng/EXP.
- Cache buster `71-main-4` và `71-visual-4` để GitHub Pages không dùng giao diện cũ. Vẫn kiểm thử production-mode UI trên `main`, dùng mock network chỉ trong Chromium test; chưa thao tác cấp thẻ thật.

- Thêm hồi quy Chromium main-mode: cuộn giao diện rồi mở lại Thiên Mệnh phải trở về đầu, tránh mất tiêu đề. Clipboard chỉ báo sao chép thành công khi API thực sự hiện hữu và hoàn tất. Không có yêu cầu cấp thẻ thật từ bài test.
