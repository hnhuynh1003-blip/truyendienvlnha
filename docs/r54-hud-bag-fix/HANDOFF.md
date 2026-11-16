# Tu Tiên — HUD layer & dungeon bag correction

## Scope / release
Owner duyệt sửa lớp thẻ nhân vật, bỏ chữ thừa của Túi Phó Bản và commit/push phần Tu Tiên–Phó Bản lên main. Baseline main:7656456922ad10d59d6cc2028e96bf233152c8c4. Nhiều module Thăm Dò/asset của các lượt trước vẫn untracked; release này kèm dependency runtime cần thiết để website không chỉ nhận CSS mà thiếu engine/ảnh.

## Root cause
SVG HUD có viewBox1024x190 và lề alpha nội bộ; img trong hộp rộng/cao khác tỷ lệ giữ vùng artwork riêng. Lớp backdrop trước đó lại dùng inset khác, còn DOM của thanh chỉ số theo toàn hộp cha. Do đó DOM không tràn nhưng đường viền/vùng kính nhìn thấy không bao đúng chỉ số, đặc biệt ở760px như ảnh Owner.

Đã dùng nguyên asset R5.4 dưới dạng nine-slice border-image trên chính hộp HUD, bỏ img letterbox đang chồng và bỏ màu backplate thứ hai. Avatar, tên/cấp, hai thanh và đồng hồ cùng nằm trong content box. Không sửa asset gốc hoặc dùng số QA. Kiểm tra cả320/375/390/430,760 và desktop1280.

## Túi Phó Bản
- Bỏ prose kỹ thuật MOCK_ONLY/UI_ONLY/không nối Kho, status và hướng dẫn chạm ô thường trực.
- Giữ title, số ô sử dụng/sức chứa thực từ view, vật phẩm/số lượng, trạng thái khóa/chọn và thao tác đóng.
- Chọn ô mới hiển thị tên/trạng thái tương ứng. Không tạo đồ, không đổi9ô mock đã được Owner duyệt và không triển khai nâng cấp.
- Environment/owner/run/receipt vẫn ở dữ liệu, không bị xóa cùng văn bản trình bày.

## Files
Sửa hiện tại: prototypes/tutien-combat-s/collection/r3e.css và qiankun-run-bag.mjs.
Entry/cache: index.html chỉ đổi2 version URL; js/tutien-integ-t0.js chỉ đổi version module skin; stylesheet collection có version mới. Tránh browser giữ bản cũ sau phát hành.
Kèm runtime đã duyệt: collection modules, js/tutien-{vis-t1,character-view,collection-preview,dungeon-stamina}, CSS riêng, asset R3E/R5.4 và icon túi R3D, badge Nội Thương, fallback artwork R4.
Không đưa backup, LayerKit ZIP/master, QA avatar, collection-r2f draft asset hoặc thay đổi Shop/Vạn Giới vào commit. Không sửa Firebase/Rules/backend/kinh tế thật.
Chỉ chuẩn hóa dòng trống EOF trong model.mjs khi đưa file mới vào Git; không thay luật/công thức.

## QA
- Node129 PASS,0FAIL.
- Browser UI1124 checks PASS,62states,3730quan hệ hộp/chữ,max overflow0px,0JS errors,0external requests. 6viewport gồm4 kích thước mobile yêu cầu,760 và desktop1280.
- Account avatar86 checks PASS, live atlas switch/reload/fallback/regen.
- UI-only bag fixture39 checks PASS,3ô mở/1ô nâng cấp/5ô khóa vẫn đúng,focus/backdrop/cleanup hoạt động,không sửa save.
- Gameplay1694 checks,36cases PASS: lực/nhịp/điểm nứt/lưới/bẫy/RNG/cost/rollback/reload/loot.
-87static local references của staged runtime resolve vào Git index; không phụ thuộc file local bị quên stage. Cú pháp stagedJS và git diff --cached --check PASS.
- Không tuyên bố đã kiểm thử Android vật lý hoặc giao dịch Firebase thật.

Commands:
node --test tests/r54-result-view.test.mjs tests/character-hud-force.test.mjs tests/collection-r3e-recovery.test.mjs tests/collection-resources.test.mjs tests/collection-r3e.test.mjs tests/collection-trip-bag.test.mjs tests/collection-r3d.test.mjs tests/collection-r2f.test.mjs tools/tutien-integ-t0/qiankun-vis-t2.test.mjs prototypes/tutien-combat-s/tests/*.test.mjs
node tests/browser-r54-hud-bag.cjs
node tests/browser-hud-bag-avatar.cjs
node tests/browser-hud-bag-fixture.cjs
node tests/browser-hud-bag-recovery.cjs
Chrome/Playwright đã có; Windows dùng Chrome cài sẵn, Linux dùng browser của Playwright; có thể đặt CHROME_PATH. Chỉ server loopback, Sandbox, context mới, chặn request ngoài. Không cài package.

## Review images
- after-portal-320.png / after-portal-760.png: HUD không còn lớp backplate độc lập.
- account-after-mineral-390.png: avatar tài khoản trong HUD.
- after-bag-herb-760.png: nội dung túi đã gọn.
- after-journal-390.png: Nhật ký vẫn là popup, cổng không có thẻ ngẫu nhiên.

Local preview: http://127.0.0.1:4180/?sandbox=1
Published URL sau Pages build: https://hnhuynh1003-blip.github.io/truyendienvlnha/
Commit chỉ scope Tu Tiên–Phó Bản; giữ nguyên các file local khác ngoài staging. Push main bình thường, không force, không reset/merge hoặc thay dữ liệu production. SHA/push/Pages được báo sau lệnh thực tế.
