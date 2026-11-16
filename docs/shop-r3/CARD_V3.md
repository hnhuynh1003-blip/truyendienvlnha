# SHOP R3 — CARD V3 · compact information architecture

Baseline main/origin: `743a9527fecc48f19fcc0914f608240a1ab206b8`, fetch xác nhận hai phía bằng nhau trước sửa. Đợt này chỉ sửa card Shop; không thiết kế lại banner/tab/combo và không khôi phục Vạn Giới.

## Cấu trúc

Card gồm đúng hai vùng: art trái 68×68px cố định và information phải. DOM giá/Mua được chuyển vào information, không còn hàng spanning toàn card. Tên tối đa hai dòng (13px/16px), phẩm một dòng (11px/14px), giá và Mua cùng một hàng liền dưới. Note và provenance dài ẩn khỏi danh sách; dữ liệu mô tả vẫn nguyên và popup giữ đầy đủ. Search vẫn dựa trên metadata công khai trước khi render.

Nút Mua có vùng chạm tối thiểu cao 44px. Card tự tăng chiều cao theo nội dung, không đặt height cố định; bốn món phổ thông đo được 100px, tên dài hai dòng có thể làm card cao hơn. Không margin auto hoặc space-between để đẩy giá khỏi thông tin. Khoảng cách card 7px; một cột, border 1px liền mạch thay border-image 10px. Combo vẫn giữ FRM-01; không thay khung Kho hay module khác.

## Audit item art

`DuduItemArtV13.visual()` trong `js/item-visuals-v13.js` tạo SVG data URL cho bốn SKU kiểm tra. Nền xanh nằm trong SVG: gradient từ `#245f55` tới `#101d35`, thêm các hình tròn dùng màu rarity. Vì vậy CSS background không thể loại bỏ nền xanh đã được vẽ bên trong ảnh.

Không sửa SVG, SHAPES, palette renderer chung, file ảnh hoặc src. Không dùng filter đổi màu, blur/crop, AI art hay sinh asset thay thế. Shop chỉ đặt ảnh nguyên vẹn trong nền xanh tím trầm, viền ngọc/vàng mảnh và bóng mềm; gỡ hiệu ứng filter/animation hiếm khỏi phần ảnh Shop. Màu phẩm cấp được giữ trong metadata và icon gốc. Các hệ Kho/Arcade vẫn dùng art và style cũ.

**ART FOLLOW-UP:** nếu muốn bỏ hoàn toàn nền xanh trong icon cần một đợt chỉnh art/vector riêng được duyệt, giữ nguyên hình dạng vật phẩm và tách nền. CARD V3 chưa tuyên bố đã xử lý phần nền nhúng này.

## QA

| Viewport | Cyber Phone thực | Vùng catalog thực | Art | Card của 4 món phổ thông |
|---|---|---|---|---|
| 320 | 320 | 302 | 68×68 | 100px |
| 355 | 355 | 337 | 68×68 | 100px |
| 390 | 390 | 372 | 68×68 | 100px |
| 430 | 430 | 412 | 68×68 | 100px |

`browser-shop-card-art-r3.cjs` PASS bốn kích thước: ảnh decode và nằm trong box, object-fit contain, text không chồng art, mọi card catalog có buy trong information, giá/nút cùng hàng, nút ≥44px, tên clamp, note hidden, không overflow và popup đủ mô tả. Bốn món thật: Bánh Quy Khô, Nước Uống Đóng Chai, Lon Cà Phê Đen, Đèn Pin Cũ.

Tên stress test dài hơn hai dòng chỉ được đặt vào DOM trong browser fixture, không sửa catalog hoặc dữ liệu production. Before dựng từ git show baseline để giữ bằng chứng đúng phiên bản. Ảnh close-up chỉ ẩn vùng xung quanh và các món khác để tập trung bốn card, không thay art/giá. Browser Shop tổng thể cũng PASS 320/355/390/430px, gồm 15 SKU Personal, coupon khóa, popup/Escape/focus/UID, spoiler STORY, SELL, rapid-click và ví readOnly. 63 test Shop/Kho/kinh tế/T0/cache PASS. `git diff --check` PASS.

Không có giao dịch Xu thật hoặc ghi dữ liệu backend. Popup Kho, giá, saleIds, itemId, callback mua/bán và dữ liệu UID không đổi. Thay đổi Tu Tiên đang có giữ nguyên, SHA-256 `js/tutien-vis-t1.mjs`: `7AE9916D66D68174FF0A49A5A44D5339B2B81A6AE35E0198FD53622A1F28075D`.

| Ảnh | Trước | CARD V3 | Tên dài trước | Tên dài CARD V3 |
|---|---|---|---|---|
| 320 | [Before](qa/card-v3/before-320.png) | [After](qa/card-v3/after-320.png) | [Before](qa/card-v3/before-long-name-320.png) | [After](qa/card-v3/after-long-name-320.png) |
| 390 | [Before](qa/card-v3/before-390.png) | [After](qa/card-v3/after-390.png) | [Before](qa/card-v3/before-long-name-390.png) | [After](qa/card-v3/after-long-name-390.png) |

Đo đạc đầy đủ: [before](qa/card-v3/before-geometry.json), [after](qa/card-v3/after-geometry.json). Mã cache `shop-r3-card-v3-1`. Verifier public kiểm tra cấu trúc V3 và ví guest, ghi ảnh/báo cáo vào `SHOP_QA_OUT`; trạng thái push/Pages xác minh sau commit trong bàn giao.
