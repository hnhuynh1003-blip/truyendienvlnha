# DUDU Studio — START HERE / Bàn giao sạch · 20/10/2026

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
