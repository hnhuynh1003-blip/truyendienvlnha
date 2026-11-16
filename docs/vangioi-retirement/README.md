# Vạn Giới permanent retirement — 16/11/2026

PHASE A phát hành trước PHASE B: commit Shop `57e4aeaa765f867b8a6dc4d7b5860eb181fc2a35`, từ baseline `a8250ae0b34f700e6dfbe63168487f20b5d0b5d4`. Push origin/main thành công và SHA remote khớp. [Pages build](https://github.com/hnhuynh1003-blip/truyendienvlnha/actions/runs/43891378903) SUCCESS. Shop công khai kiểm tra bằng Chrome guest tại 320/390px: PASS, ảnh banner decode được, không overflow, mọi nút mua guest bị khóa, không gửi request ghi. Bằng chứng: `../shop-r3/qa/published-report.json` và `published-320.png`, `published-390.png`. Không kiểm thử giao dịch Xu thật.

## Phạm vi đã dọn

Danh sách chính xác **73 file bị xóa** và inbound references trước khi xóa nằm trong [deleted-files.json](deleted-files.json). Không xóa theo từ khóa hoặc recursive delete. Chỉ xóa file đã tracked, xác minh absolute path trong repository, không chạm thay đổi local ngoài phạm vi.

- 13 file JS frontend-only: World Registry V63, Blueprint V65/V66, Experience V65/V66, Story Engine V1/V2B, Pilot UI/F V1/F V2B/World V2B, World Model V2B, Core Rules V1.
- 3 CSS gameplay: World Experience V65/V66 và Dudu Pilot V1.
- 6 asset Quan Đạo trong `assets/worlds/`.
- Các payload, bundle app, CSS và ảnh của Bến Sương, Tầng Mây 9, Hệ Thống Erro; giữ index.html tối giản cho URL cũ. `dudu-pilot.html` cũng thành thông báo ngừng hoạt động.
- Các test gameplay độc lập tương ứng, gồm browser Bến Sương, Quan Đạo, World Creator, tác giả/Tầng Mây/Erro; bốn suite Cloudflare chỉ chạy payload demo đã xóa. Không xóa test xác thực, receipt, quyền dữ liệu hoặc backend security.
- Ba script build demo đã nghỉ và workflow `vangioi-manual-paused.yml` có bước sửa worlds=true trong test checkout.

`index.html` bỏ các script archive và link CSS của giao diện đã nghỉ, cập nhật cache của khóa T0. Mọi script/CSS local còn active đều tồn tại. Không có script archive chờ được bật lại.

`features-t0.js` giữ `const worlds=false`, API frozen; `loadLegacy()` và `restoreArchive()` chỉ trả false. Không còn script injection, network hoặc ghi storage trong cơ chế này. `cultivation-t0.js` chỉ bỏ nút Thiên Mệnh cũ và biến busy của launcher này; giữ identity, avatar, UID, EXP và điều hướng Nhân vật/Nhiệm vụ/Kho/Ví. Không sửa model, chỉ số hoặc tiến trình Tu Tiên.

Các URL cũ trả thông báo ngừng hoạt động với link về trang chủ, không tải JS, ảnh, CSS gameplay hoặc database. Không bật lại Vạn Giới để làm test PASS.

## File giữ có lý do

| File/nhóm | Dependency được kiểm chứng |
|---|---|
| world-items-v44-1.js, world-collection-v44-1.js, item-catalog-v2.js, story-market-v43.js | Shop/Kho/REALM/Sưu Tập/truyện và itemId lịch sử còn hoạt động |
| world-taxonomy-v66.js | Test Steward read-only còn sử dụng danh mục 48 preview; không được tải vào main |
| vangioi-creator.js, vangioi-creator-validation.js, validation-entry.mjs, vangioi-arc-plan.js, vangioi-local-png.mjs và CSS creator | Contract/validator offline và các bài kiểm thử backend còn đọc nguồn; main không tải và không có loader tái kích hoạt |
| dudu-transmigration-v69.js, dudu-system-client-v71.js, dudu-system-app-v69.js, dudu-core-ai-v70.js, dudu-character-name-v71.js | Contract và test an toàn backend/manual workflow đang tham chiếu; bỏ hoàn toàn khỏi main và loadLegacy |
| contracts/vangioi/ (93 file), tools/vangioi còn lại, Cloudflare source/schema/fixtures | Validator, intake, quyền dữ liệu và backend đang có dependency; không xóa các cơ chế an toàn dữ liệu hoặc migration/schema để giảm số file |
| pilot-client-v45-1, pilot-lab-ui-v45-1, story-comments-pilot-v45-2 và CSS liên quan | Pilot AI/comment đọc truyện là hệ khác với gameplay Quan Đạo; không suy diễn từ chữ pilot |
| Arcade worlds, wallpaper worlds, thể loại truyện, NPC, Tu Tiên | Còn được website sử dụng, không thuộc retirement gameplay |

Nguồn lịch sử còn trong Git. Việc giữ contract/backend ở HEAD không phải khôi phục gameplay và không cho phép triển khai backend mới. Không thay Firebase, Rules, Cloud Functions, Worker config hoặc schema.

## Dữ liệu không xóa

IndexedDB `dudu-vangioi-creator-local-1`, bản thảo localStorage, dữ liệu Firebase/Firestore/Storage và trạng thái backend/UID có thể vẫn tồn tại ngoài repository. Đợt này không enumerate hoặc xóa dữ liệu trình duyệt/cloud. Không Clear Site Data, không reset profile, EXP, Tu Vi, Xu, Kho, receipt, lịch sử mua hoặc entitlement. Xóa dữ liệu thật cần kiểm kê và quyết định riêng.

## QA và giới hạn

- PHASE A: 52/52 test Shop + T0 PASS; browser Shop 320/355/390/430 PASS, thêm UID switch và spoiler.
- Sau cleanup: 50/50 regression Shop/Kho/kinh tế PASS. Browser Shop bốn kích thước PASS.
- Browser `browser-transition-t0.cjs`: PASS trên Chrome với Firebase mock; đăng nhập fixture, role không leo thang, cùng UID/EXP, Tu Tiên hiển thị, không tải legacy client/engine, bốn URL retirement. Điều chỉnh đúng kỳ vọng: không còn nút Thiên Mệnh và loadLegacy không tải script.
- Browser Library L2E: PASS phân trang 247 truyện fixture, 20/trang, reload, quay lại văn án và layout 320/390/768/1366. Thêm bước đóng modal tài khoản trong setup test; không sửa runtime Library.
- Browser Arcade Garden C446b: PASS desktop + bốn mobile widths.
- 33 test contract liên quan retirement/Library/companion/phone/SELL PASS; 4 regression permanent retirement PASS. Test mới tên `features-t0-retirement.test.cjs` thuộc domain cultivation để CI mặc định chạy.
- NPC/Gemini backend: 25/25 PASS. Steward read-only standalone PASS.
- Bộ domains trước cleanup: 1267 test, 1261 PASS / 6 FAIL. Ba lỗi cũ liên quan text Bán Nhanh/cache Shop/entry archive được cập nhật theo hành vi thực, không nới kiểm tra quyền hoặc số lượng item.
- Bộ domains cuối: **1266 test, 1263 PASS / 3 KNOWN_BASELINE_FAIL**. Ba lỗi: Casino slot cache URL, snapshot review Rules, cache URL Vạn Bảo. Đã chạy lại ba suite với index.html từ `git show a8250ae0:index.html`: cùng ba lỗi, 8/11 PASS. Các file Rules/review và runtime Casino/Vạn Bảo không đổi. Không tuyên bố toàn bộ suite xanh; không sửa Rules hoặc tính năng ngoài scope để ép PASS.
- Validator backend bổ sung cần AJV: cài đúng version package vào thư mục tạm, không đổi lockfile repository. 12 test logic validator PASS; bài reproduce bundle có lỗi đường dẫn Windows `/D:/...` từ test/build cũ, chưa xác minh reproduce bundle. File validator và build script giữ nguyên.
- `git diff --check` PASS. Mọi script/CSS local active trong main resolve đúng; không phát hiện tham chiếu runtime đến file gameplay đã xóa. Bằng chứng SHA-256 của `js/tutien-vis-t1.mjs` trước/sau: `7AE9916D66D68174FF0A49A5A44D5339B2B81A6AE35E0198FD53622A1F28075D`.

QA giao dịch online/đa tab trên Firebase thật không thực hiện; không có giao dịch Xu thật. Ba lỗi baseline và kiểm tra reproduce bundle Windows được ghi công khai, không gọi PASS giả. Gate cleanup xét không có regression mới ở các hệ đang dùng và các check retirement có mục tiêu PASS.

## Git và staging

Làm trực tiếp main, không PR/branch trung gian/reset/stash/force push. Commit Shop chỉ có 19 file Shop. Commit retirement chỉ gồm danh sách xóa đã audit, entry/khóa T0, các test cần đổi theo retirement, tài liệu/bằng chứng QA. Loại `js/tutien-vis-t1.mjs` và toàn bộ asset/module/prototype Tu Tiên untracked khỏi staging. Release SHA cuối và kết quả push/Pages được xác minh sau commit trong báo cáo bàn giao.
