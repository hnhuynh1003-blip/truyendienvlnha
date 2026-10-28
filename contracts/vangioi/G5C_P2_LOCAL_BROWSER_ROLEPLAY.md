# G5C-P2 — Bến Sương: thử nhập vai bằng trình duyệt tại localhost

**Ngày:** 28/10/2026. **Baseline:** G5C-P `99af328901ad101bad9376981d0eec06d27c03bc`. **Phạm vi:** cổng chơi thử **chỉ trên máy chủ sở hữu** (`127.0.0.1`), không nối Vạn Giới Creator UI, Cloudflare Worker, GitHub Pages, Firebase, nguồn thật hoặc hệ thống thưởng. Đây là bản preview để Du đánh giá trải nghiệm nhập vai, không phải staging/production, G5D hay quyền phát hành world.

## 1. Tự mở chơi bằng trình duyệt

Trong thư mục repo đã tải về và có **Node.js + npm**:

```sh
npm install --prefix cloudflare --no-audit --no-fund
node tools/vangioi/author-roleplay-browser-server.mjs
```

Dòng lệnh sẽ in một URL dạng `http://127.0.0.1:<cổng>`; sao chép URL **được in ra** vào Chrome/Edge **trên cùng máy**. Đừng dùng URL cố định vì port được chọn trống tự động. Nhấn `Ctrl+C` trong terminal để đóng. Nếu đã có `cloudflare/node_modules`, không cần chạy `npm install` lại. Chỉ có `GET /`, `GET /api/catalog`, `POST /api/start`, `POST /api/choose` trên server Node local. **Không có đường chạy công khai trên GitHub Pages**, không thêm nút vào website chính.

Giao diện text-first: chọn hai thân phận (người tập việc / thanh tra tín hiệu), đọc câu chuyện, chọn cứu người hay giữ đèn, nhìn hậu quả, bấm *Thử thân phận khác* để chơi lại. NPC Bà Lan có lời thoại kịch bản; bản này chỉ minh họa hai mode trong ba mode Vạn Giới hỗ trợ, không ép các world khác có cùng NPC hoặc gameplay. Người dùng điện thoại **không** thể dùng `127.0.0.1` của điện thoại để truy cập server đang chạy trên máy tính; kiểm mobile hiện là **viewport simulation** qua Chromium, không phải QA thiết bị thật.

## 2. Kiến trúc và an toàn

- `tools/vangioi/author-roleplay-browser-server.mjs`: Node HTTP **chỉ bind 127.0.0.1**, port ngẫu nhiên; từ chối Host không khớp và POST có Origin không khớp, không CORS, JSON giới hạn 4 KiB, không nhận claims `publisherApproved`, reward, userId hoặc save từ client. Session token ngẫu nhiên chỉ là khóa Map trong RAM, **không phải token xác thực server/role**.
- `tools/vangioi/author-roleplay-browser-page.mjs`: HTML/CSS/JS inline với CSP nonce, no external images/fonts/scripts/API. Dữ liệu truyện được chèn bằng `textContent` để tránh thực thi HTML từ kịch bản. Giao diện có nhãn **chạy trên máy, không lưu**, nút lựa chọn thiết yếu và nút thử lại sau ending; hỗ trợ bố cục 320/375/390/430 px và desktop, các mức này được kiểm trong Chromium CI.
- Phía server sử dụng lại `lighthouseWorld/lighthouseEngineManifest/lighthousePlaytestScript` ở G5C-P, `prepareAuthorRoleplayOffline` (G3C + G4A + G4B). Không viết engine thứ hai, không dùng text người chơi để phát sinh luật, AI tự sửa Canon, NPC AI, reward/EXP/Xu/Kho hoặc quyền truy cập.
- API `POST /api/choose` khóa tuần tự **theo session RAM**, buộc eventId và `expectedRevision`. Khi mất phản hồi, trình duyệt giữ eventId cũ để gửi lại đúng sự kiện và nhận bản trạng thái cuối đã được G4B replay kiểm; gửi eventId cũ với action khác hoặc revision cũ sẽ bị chặn. Không được diễn giải điều này thành transaction CAS xuyên máy, lưu bền vững G4C hay idempotent reward.
- `view` gửi ra trình duyệt chỉ các trường câu chuyện công khai của bản thử, không gửi secretTruth hay nội dung nguồn ẩn. Các nhãn `fixtureOnly:true`, `worldPublished:false`, `missionCompleted:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`, `productionAuthorized:false`, `deviceVerified:false`, `rightsVerified:false` luôn false ở phần quyền. `narrativeEndingId` **không phải** proof ending/mission đã được server kiểm.
- Giữ giới hạn G5C-P: source hash `aa…`, asset hash `bb…` là placeholders chưa có bytes, bản quyền/rights và mobile images chưa được duyệt. Ở đây dùng nền gradient CSS, **không tải ảnh**. Tuyệt đối không dùng bản này làm candidate G5A/G5C có giấy phép hoặc proof phát hành.

## 3. Kiểm thử và hồi quy

- `cloudflare/tests/vangioi-author-roleplay-browser.test.mjs`: 11 test integration mở HTTP `127.0.0.1` thật: HTML/CSP, catalog hai vai, hai narrative endings, retry G4B, race hai lựa chọn cùng revision, forged metadata, Host/Origin, session biến mất sau restart, không import Worker/Creator.
- `tests/browser-vangioi-author-roleplay.cjs`: Chromium thật (Playwright) chạy local host, đọc hai vai và hai kết cục, kiểm không overflow ngang ở 320/375/390/430/1280 px, không page error hoặc request ngoài loopback. CI có step riêng trong `phase1-smoke.yml`; các bài browser hiện hữu vẫn chạy nguyên.
- Cần chạy Cloudflare tổng thể, app 104 test, Functions 2, Python 38, Wrangler dry-run và CI/Pages ở **commit SHA mới**. Pages deploy thành công không tạo ra link chơi thử trên web.

## 4. Chưa triển khai và đường tiếp theo

Không có tài khoản, nguồn/asset thật, quyền tác giả, ảnh thiết bị, lưu file/DB, dữ liệu người chơi, thưởng, multiplayer, gameplay theo arc, NPC AI, giao diện World Creator live, Thư viện, EPUB, Thiên Mệnh, Chủ Thần, Cloudflare production hay Firestore. **G5D–G5F chưa được thực hiện bởi đợt này.** Phần kế tiếp theo roadmap vẫn là G5D version/save/recovery fixture; browser demo giúp An Du phản hồi về trải nghiệm trước khi quyết định đầu tư gameplay.

**Rollback:** xóa/revert hai module local host/page, hai nhóm test, 1 step CI và đường dẫn docs; không có runtime route hoặc dữ liệu live phải di trú.
