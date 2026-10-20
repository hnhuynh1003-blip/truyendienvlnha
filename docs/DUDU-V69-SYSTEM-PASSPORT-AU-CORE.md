# DUDU V69 — ba ứng dụng tách biệt: Đồng hành / Hệ Thống Xuyên Truyện / Chủ Thần AU
Ngày 20/10/2026 · Nguồn sự thật: GitHub `main`

## Quyết định kiến trúc (ưu tiên chỉ dẫn mới của chủ dự án)

**Không nhập Chủ Thần và các hệ thống con vào Liên Lạc DUDU.** Ba vai trò ứng dụng:

1. **Liên Lạc → DUDU đồng hành**: người bạn hướng dẫn đọc truyện, onboarding, trò chuyện thông thường. NPC chat ở Liên Lạc dùng router NPC riêng (Gemini, GLM, Gemma khi được kích hoạt). Claude/GPT là ý tưởng hoặc adapter tương lai, không tuyên bố là nhà cung cấp miễn phí đã triển khai. Giữ bộ nhớ DUDU V43 và NPC V56 nguyên vẹn. Khôi phục `js/companion-ui-v43.js` và CSS Messenger V67.2 về bản trước thử nghiệm ghép vai sai, loại bỏ selector/chế độ DeepSeek khỏi chat. 
2. **Cyber Phone → Hệ Thống Xuyên Truyện** (người chơi): app và popup riêng cho thông tin ký chủ, thuộc tính, hệ thống con đi theo, kỹ năng, cấp, EXP, thành tựu xuyên giới, nhiệm vụ đã hoàn tất, số lần xuyên, phần thưởng, vật phẩm, trạng thái. **Chưa được mở hệ thống chỉ vì đăng nhập hoặc nhắn tin với DUDU.** 
3. **Cyber Phone → Chủ Thần AU** (chỉ AU): workspace độc lập soạn luật, chuẩn dữ liệu, điều kiện kích hoạt, quy tắc bảo hộ, xử lý sự kiện và hình phạt. AU có thể ghi **bản nháp luật trên thiết bị**. Không trao cho UI hoặc model quyền áp dụng hình phạt thật hay đọc dữ liệu tài khoản khác. Ở phía client chỉ ẩn và chặn UI theo `canEditStories()` và `DuduAuth.isAdmin()`; dữ liệu nhạy cảm/quyền thật sau này phải được kiểm tra bởi backend Firebase/Worker.

### Vòng đời game được xác định rõ

**Nhiệm vụ mở đầu → máy chủ xác minh → Thẻ thông hành → người chơi tự nguyện ký khế ước → hệ thống con thức tỉnh → xuyên truyện, năng lực và nâng cấp.**

- Nhiệm vụ mở đầu cấp thẻ là bước **trước khế ước**, độc lập với ba nhiệm vụ F khảo hạch sau khi vào thế giới.
- Chỉ `questReceipt` hợp lệ do server phát hành và gắn UID mới có thể cấp Thẻ thông hành; trạng thái `claimed` của V43.7 không đủ. Thẻ không thể tạo từ AI, client, địa chỉ URL, localStorage hoặc tin nhắn.
- `coreRecognition` (Chủ Thần công nhận hệ thống con) và `hostSystemPact` (ký chủ ký với hệ thống) khác nhau; phi chính quy/chính quy có khả năng và động cơ riêng. Hệ thống và NPC không mặc định chia sẻ ký ức/toàn bộ World Truth.
- Hệ thống cấp F→E→D→C→B→A→S, cấp nhiệm vụ, Lv nhân vật đọc truyện, `systemEXP`, `hostMasteryEXP` và quyền xuyên giới là những trục khác nhau. Không đổi điều kiện ba F verified distinct hay quy tắc quyền chọn giới theo rank của Foundation V1.
- Tám thuộc tính: **Khí vận (fortune), May mắn (luck), Nhanh nhẹn (agility), Sức mạnh (strength), Nhan sắc (appearance), Trí tuệ (intelligence), Thể lực (stamina), Tinh thần (spirit)**. Giữ nguyên thuộc tính cũ, `strength/intelligence` là bổ sung cho yêu cầu mới cần chốt phương án cân bằng. Engine phải kiểm chứng điều kiện ngưỡng khi mở lựa chọn, nhiệm vụ ẩn và vật phẩm. Các ví dụ trong mã chỉ để thiết kế, không tiết lộ World Truth bí mật và không sinh vật phẩm.
- Thưởng, XP, vật phẩm, tước quyền, phạt, đánh giá hành vi, protection tools đều phải được xét bằng bản ghi server, evidence/audit, ruleVersion, phạm vi và khả năng kháng nghị. AI chỉ gợi ý/diễn giải, không thực thi.

## Mã triển khai trên `main`

- `js/dudu-transmigration-v69.js`: định nghĩa thuộc tính, trạng thái *unavailable/not_launched*, parser điều kiện để tác giả mô phỏng, phác thảo rules sáu miền và kiểm tra schema nháp. Tất cả quyền có tác động luôn trả `false`.
- `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`: app người chơi, popup bảng trạng thái, nút bị khóa `Ký khế ước`, nút vào `Nhiệm vụ`; app AU private view, bản nháp rule `localStorage` được phân tách AU. Không lưu thay đổi vào Firestore; không gọi AI hoặc grant.
- `index.html`: hai mount `phone-app-system`, `phone-app-core-console` với launcher độc lập. `openPhoneApp('core-console')` chặn sớm nếu không phải AU; launcher ẩn và `syncAccess()` trên lần mở phone/thay đổi tài khoản. Quest app có `dudu-v69-passport-quest` trước danh sách quest V43.7 và báo rõ hiện chưa có nhiệm vụ phát thẻ thật.
- `js/phone-app-contract-v67.js`: từ 12 lên 14 app, giữ nguyên 12 app cũ.
- `cloudflare/src/dudu-hive-v68.mjs`: giữ adapter Hive/DeepSeek phí thử cho CORE và hệ thống con; **không còn provider DUDU đồng hành**. `/v1/dudu-ai/**` yêu cầu signed `admin:true` từ Firebase cộng UID thử và 2 cờ Hive bật thủ công. Hiện cả hai cờ vẫn `false`; không gửi yêu cầu trả phí, không kết nối game. Không đặt Secret trong GitHub.
- `tests/dudu-transmigration-v69.test.cjs`: kiểm tra quyền truy cập, tách app/chat, dữ liệu không giả lập thành thật, eight stats, điều kiện chỉ mô phỏng và nháp AU vô hiệu lực. Các test manifest/Chromium được nâng 14 apps.

## Trạng thái chính xác

**Đã có giao diện và luật dạng khung.** Chưa có service cấp passport, số liệu signed, hệ thống con gắn tài khoản, session xuyên truyện có quyền thật, nâng cấp hệ thống, ẩn nhiệm vụ theo stat thật, loot ledger, xử phạt hoặc AI Chủ Thần có tool. Không dùng thông tin local `userProfile.level/exp` làm System Rank; chỉ đưa ra Lv hồ sơ đọc truyện dưới nhãn khác khi Firebase sẵn sàng. Dấu `—` nghĩa **không thể xác minh**, không phải 0.

Tuyệt đối không đánh đồng source+unit tests với browser QA thực tế, Cloudflare deploy hay Hive live. Không đổi Firestore Rules/UID/EPUB/NPC/Readers/AI bill trong đợt V69.

## Bước tiếp theo: dịch vụ thẻ và tiến trình

Thiết kế endpoint read-only `GET /v1/system/me`, `GET /v1/quest/passport/status`, rồi server idempotent phát thẻ từ nguồn nhiệm vụ chính thức, và màn consent phiên bản khế ước. AU rule draft cần quy trình duyệt-phát hành với chứng cứ, phân quyền và rollback, không nối thẳng UI vào quyền phạt.


## V70 — Tối ưu giao diện, khóa hiển thị bằng mã thẻ, Chủ Thần prompt-first (20/10/2026)

Quyết định mới được ưu tiên hơn các bản mockup V69:

- **Độc giả và người chơi chưa được cấp thẻ:** vào app Hệ Thống chỉ thấy màn xác nhận **Mã Thẻ thông hành**, không có DOM hồ sơ chỉ số, ID hệ thống, thanh EXP hay popup sau nó. Khi chưa có dịch vụ server, mã thật không thể nhập để mở production.
- **Bản thử giao diện:** vào trang với \`?sandbox=1\`, đăng nhập tài khoản **Sandbox** rồi nhập \`DUDU-THU-2026\`. Mã công khai, cố ý không phải bí mật. \`js/dudu-system-gate-v70.js\` kiểm tra đúng chế độ Sandbox + UID sandbox, lưu trạng thái **chỉ trong sessionStorage theo tài khoản**. Có thể tắt/xóa trạng thái demo; khi chuyển tài khoản, các dữ liệu không được nối lẫn. Mã demo không hợp lệ ở chế độ Reader Firebase/live, không tạo bất kỳ \`questReceipt\`, \`passport\`, \`pact\`, \`systemIdentity\`, \`rewards\`, \`EXP\`, quyền vào thế giới hay Firestore write nào.
- **Sau khi nhập mã thử:** một màn hình gọn gồm **Tên ký chủ + ID ký chủ hiển thị** (mã \`KC-XXXXXXXX\` từ tài khoản Sandbox, không phải UID/bằng chứng của server), **Hệ thống con với displayId riêng** \`SYS-F-7A41\`, mô phỏng thiên hướng quan sát/cẩn trọng, rank/EXP mô phỏng, hai nút chức năng Chỉ số/Nhật ký, khế ước và xuyên truyện bị khóa. Popup tám thuộc tính là mock có số mẫu phục vụ kiểm tra bố cục, không phải số liệu thật. Nhật ký/thành tựu/vật phẩm chỉ nằm trong details gập.
- **Danh tính hệ thống con:** \`displayId\` là mã trước mặt người chơi, có thể bị giả mạo; \`systemInternalId\`, \`issuerSeal\`, \`canonicalOrigin\` và bằng chứng nguồn gốc chỉ thuộc phía máy chủ. Chính quy/phi chính quy không thể suy ra bằng prefix/tên/mã public hoặc lời AI. Mã giả có thể giống hệt mã thật; chỉ backend đối chiếu registry, seal/UID và điều kiện quyền. Client của bản thử giữ \`isRegular:null,isCounterfeit:null,identity:'CHƯA XÁC THỰC'\`. Khi có backend mới thiết kế versioned read-only projection riêng theo UID.
- **AU Chủ Thần:** loại bỏ form chọn phương thức phạt/giữ để thay bằng **một prompt chỉ thị cho DeepSeek** và khung phản hồi. \`js/dudu-core-ai-v70.js\` là frontend authenticated adapter, gửi qua \`GET /v1/dudu-ai/status\` và \`POST /v1/dudu-ai/chat\` đã có (model \`core\`), chỉ cho Firebase AU được xác thực. Tuyến Worker vẫn đòi UID thử, Firebase admin claim, \`DUDU_HIVE_ENABLED\`, \`DUDU_HIVE_TEST_APPROVED\` cùng Secret Hive, và vẫn OFF trong cấu hình. Tối đa 20 lượt test tổng cộng bởi Durable Object, có thể tiêu phí khi bật. Phản hồi AI là kế hoạch **không tự thi hành**; chưa có signed command/event tool, audit log hay hệ thống hình phạt.
- **Định hướng vận hành tự động của Chủ Thần, không buộc AU xét từng lần:** AU nhập policy bằng prompt, backend chuẩn hóa thành ruleVersion với phạm vi và giới hạn, sau đó engine có thể áp dụng **hành động hợp lệ được định nghĩa sẵn** tự động khi nhận sự kiện đã xác minh. Với các hậu quả lớn (khóa tài khoản, tước tài sản/EXP, truy cập nội dung riêng tư), phải có hạn mức, giải trình, nhật ký, khả năng đảo ngược/kháng nghị và kiểm soát quyền. DeepSeek không được tự nâng quyền hoặc thực thi tùy ý bằng lời văn. Đợt V70 không triển khai backend enforcement, không quảng cáo là AI đã hoạt động.
- Luồng chính thức giữ nguyên: nhiệm vụ mở đầu được server nghiệm thu → server phát mã thẻ thực cho UID → nhập/xác minh một lần với nonce chống replay → người chơi đồng ý khế ước → hệ thống con thật được chỉ định → World Engine xử lý stats/hidden quest/loot/progression. Demo UI V70 không thay thế bước nào.

Nguồn mã cập nhật tại chỗ: \`js/dudu-system-app-v69.js\`, \`css/dudu-system-app-v69.css\`, \`js/dudu-system-gate-v70.js\`, \`js/dudu-core-ai-v70.js\`, \`cloudflare/src/dudu-hive-v68.mjs\`, tests và tag của \`index.html\`. **Không tạo bản sao website hoặc nhánh riêng.**
