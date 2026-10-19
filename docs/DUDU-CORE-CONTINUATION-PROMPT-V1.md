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
