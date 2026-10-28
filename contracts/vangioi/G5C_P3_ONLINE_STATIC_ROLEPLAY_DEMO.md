# G5C-P3 — Bến Sương: mở thử nhập vai trực tiếp trên GitHub Pages

**Ngày:** 28/10/2026. **Nền:** G5C-P2 `56495bdcb6b178bbe18334df37e0e9c14d611bb2` (Smoke/Browser/Pages SUCCESS). **Phạm vi:** thử game **công khai dưới một đường link thử nghiệm riêng** theo quyết định của An Du. Không bắt người thử tải ZIP, cài Node, đăng nhập hoặc cấp role. Đây là *public static test page*, **không phải world published hay gameplay production**.

## 1. Link mở trực tiếp

**Dự kiến sau khi GitHub Pages deploy commit G5C-P3:**

`https://hnhuynh1003-blip.github.io/truyendienvlnha/playtests/ben-suong/`

Mở link trên PC hoặc điện thoại có kết nối Internet, chọn **Người tập việc địa phương** hoặc **Thanh tra tín hiệu**, chọn cứu người hoặc giữ đèn, xem kết cục, rồi thử thân phận khác. Không cần tải repo hoặc làm gì trong Terminal. Link là URL test riêng dưới `/playtests/`; trang chính không có nút phát hành/nhận thưởng hoặc route cho world thật. Cần xác minh HTTP 200 và sự hoạt động của JS sau Pages deploy trước khi đưa link cho Du.

## 2. Dùng lại engine và bảo vệ nguồn

`playtests/ben-suong/` gồm `index.html`, `style.css`, `demo-content.json`, `app.js` được biên dịch; hai file sau là **generated artifacts** có bước build/check định kỳ. `tools/vangioi/online-roleplay-entry.mjs` nhập **engine G5C-P G4A/G4B đang có**, không viết luật gameplay riêng. `tools/vangioi/build-online-playtest.mjs` tạo gói web từ fixture tác giả:

1. Giữ source role/NPC/scene/choice/ending đúng thế giới mẫu Bến Sương và các rule allowlist G4A.
2. **Thay `story.secretTruth` bằng thông điệp ẩn trong payload công khai**, sau đó tính lại `contentHash` G4A và script hash trên **bản đã redacted**. Không đưa `PRIVATE_DEMO_CANON` thật lên site, kể cả JS bundle.
3. Bundle chỉ import logic validator G3C/G4A/G4B. Tại bước build, module auth `jose`/Firebase JWT được chặn trong **bundle thử công khai**, không thay module auth production; không có API đăng nhập, database, issuer hoặc backend trong trang này.
4. HTML dùng CSP same-origin, không tải font/ảnh/JS từ bên thứ ba, không `innerHTML` cho văn bản kịch bản; nội dung hiển thị qua `textContent`. Không lấy dữ liệu world khác của tác giả.
5. Mọi session/event/replay/flag G4B là đối tượng **RAM trong tab trình duyệt**. Refresh/tab close mất tiến trình; client có thể sửa JS bằng DevTools nên nó **không là bằng chứng quyền/hoàn thành nhiệm vụ hoặc chống gian lận server**.

**Nguồn và ảnh:** `storySource.contentHash` (`aa…`) và các asset metadata hash (`bb…`) vẫn là *synthetic placeholders*, không chứng minh bản quyền/bytes. Trang dùng nền gradient CSS, không lấy ảnh bên ngoài hay tuyên bố đã QA raster mobile. Bản này chỉ dùng câu chuyện nguyên gốc do nhóm tạo cho thử, chưa mang nội dung Quan Đạo hay PR #22 Canon vào runtime.

## 3. QA / điều kiện dừng

- `cloudflare/tests/vangioi-author-roleplay-online-static.test.mjs`: payload public hash/engine pin, secret redaction, 2 vai/2 ending, retry G4B, không có cấp thưởng, no auth/bundle secrets, tách Worker/Creator live.
- `tests/browser-vangioi-online-playtest.cjs`: Playwright Chromium trên đường dẫn mô phỏng GitHub Pages có prefix `/truyendienvlnha/`, thử hai tuyến từ đầu tới cuối; viewport 320/375/390/430/1280 px, bắt pageerror và mọi network request ngoài origin.
- CI `phase1-smoke.yml` dựng lại `demo-content.json`/`app.js`, `git diff --exit-code` để từ chối artifact khác source, chạy tất cả Worker/app/Functions/Python regressions và browser tests. **Chỉ kết luận CI PASS khi workflow G5C-P3 đúng SHA hoàn tất.**
- Sau deploy cần kiểm riêng `index.html`, `app.js`, `style.css`, `demo-content.json` HTTP 200 và liên kết chơi hoạt động; **Pages SUCCESS không tự chứng minh browser gameplay tốt**.

Giới hạn bất biến: `fixtureOnly:true`, `worldPublished:false`, `missionCompleted:false`, `endingVerified:false`, `saveCommitted:false`, `rewardAuthorized:false`, `rewardCommitted:false`, `productionAuthorized:false`, `rightsVerified:false`, `deviceVerified:false`. Không tự bật 48 seed V66, NPC AI, item/Kho/EXP/Xu, giao dịch, Firestore Rules, thư viện/EPUB, Thiên Mệnh/Chủ Thần, World Creator live, reviewer/publisher, Canon hoặc server production. G5D–F **chưa triển khai**.

**Rollback:** revert trang thử `/playtests/ben-suong/`, hai module build/client, hai nhóm test và đường docs/CI. Trang GitHub Pages thử sẽ không còn đường HTML đó sau deploy rollback; không có save/player/DB phải migration.
