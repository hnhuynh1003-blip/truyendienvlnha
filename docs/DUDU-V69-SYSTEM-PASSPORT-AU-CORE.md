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
