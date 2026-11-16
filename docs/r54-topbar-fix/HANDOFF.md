# Tu Tiên — keep header, tighten HUD, enlarge discovery action

Owner đính chính: không ẩn header Tu Tiên. Giữ nút Back và X của Cyber Phone; chỉ bỏ X bên trong phó bản, kéo HUD sát dưới header và làm nút Thăm dò lớn hơn.

## Thay đổi
- Bỏ các rule ẩn header/status strip từ bản trước. Không xóa header, title hoặc route host.
- Bỏ button exploration-close khỏi markup và event UI tương ứng; Back hiện hữu vẫn đóng overlay theo callback cũ. Nút X host vẫn đóng Cyber Phone bình thường.
- Stage không có padding trên; HUD trải theo chiều ngang content, giảm alpha gap của slice trên. Đo HUD top bằng header bottom (0px gap).
- Nút Thăm dò cao78px; nine-slice dùng action_blank.svg gốc để phần artwork thực cũng lớn lên. Chữ và phí là hai dòng flex trong vùng giữa, không bị méo hoặc tràn cạnh.
- Đổi version URL entry/skin/bridge/iframe/CSS/controller để không trộn markup mới với module có nút X cũ từ cache.

## QA
- Node129 PASS,0FAIL: combat/resource/search/bag/current-view regression.
- Browser1112 checks PASS,62states:320x700,375x812,390x844,430x932,760x1100 và desktop1280x900.
- Kiểm tra header vẫn hiển thị, không còn X trong iframe, Back host bấm được, HUD full content width và top gap0px. Label/phí nằm trong vùng giữa của artwork CTA, tách dòng không đè nhau.
- Nhật ký modal, Túi Càn Khôn, result/ba khu, reload và close/reopen giữ discovery/cost; không console errors hoặc request ngoài.
- Không chạy lại toàn bộ suite1694case trong lượt UI này; engine/model/resource/storage không đổi. Không coi kết quả lịch sử là test mới.
- Không Android vật lý. Chỉ Chrome viewport trong Cyber Phone website Sandbox.

## Files
css/tutien-integ-t0.css; index.html; js/tutien-integ-t0.js; js/tutien-vis-t1.mjs; js/tutien-collection-preview.mjs; prototypes/tutien-combat-s/collection/{index.html,collection.mjs,r3e.css}; tests/browser-{r54-hud-bag,hud-bag-avatar,hud-bag-recovery}.cjs.
Các test avatar/recovery chỉ cập nhật selector lối thoát về Back host hiện hữu, không xóa assertion nghiệp vụ.

Backup: tools/local-backups/r54-topbar-before. Baseline main40e3f127118fb4f8c16ce4400a544854d6de2a14. Bảo toàn untracked ngoài scope. Không sửa gameplay, save, Firebase/Kho/Ví.

Ảnh: after-phone-1280.png và after-phone-320.png. Bản local http://127.0.0.1:4180/?sandbox=1. Commit/push bản sửa UI theo lượt phát hành Owner đã yêu cầu; SHA và Pages được xác minh sau lệnh thật.
