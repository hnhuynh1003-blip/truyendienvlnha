# Card art priority — 16/11/2026

Bố cục hàng mua bên dưới trong tài liệu này là phiên bản lịch sử. [CARD V3](CARD_V3.md) thay bằng cấu trúc information compact, art 68×68 và giá/Mua nằm bên phải.

Baseline: `41e4bbb4bd608fd1693ac6ad36a030e3e8878013`, main khớp origin/main sau fetch. Bản sửa chỉ layout Shop và cache/test liên quan; không sửa catalog, giá, giao dịch, Kho hoặc file Tu Tiên.

Card chuyển sang một hàng ngang trên Cyber Phone: art bên trái 72×72px cố định bằng width/height/min/max, text bên phải, giá và Mua ở hàng riêng phía dưới. Ảnh dùng object-fit contain, không crop. Tên clamp tối đa hai dòng; phẩm và mô tả tối đa một dòng có ellipsis. Mô tả đầy đủ vẫn nằm trong popup. Dùng chung khung FRM-01 hiện có, không thay asset.

Đã kiểm tra trực tiếp Bánh Quy Khô (`common-biscuit`), Nước Uống Đóng Chai (`common-bottled-water`), Lon Cà Phê Đen (`e2`) và Đèn Pin Cũ (`common-flashlight`). Tên/note dài là nội dung fixture trình duyệt để kiểm tra layout, không ghi vào production catalog.

QA:

- `browser-shop-card-art-r3.cjs`: PASS 320/355/390/430px; xác minh art 72×72, ảnh decode và nằm trọn trong box, object-fit contain, text không chồng art, hàng mua dưới art, clamp tên/note, không overflow, popup giữ mô tả đầy đủ. Chế độ before chỉ chụp/ghi hình học baseline; không gọi baseline là đạt tiêu chí art mới.
- `browser-shop-r3.cjs`: PASS bốn kích thước, bao gồm popup/focus/Escape, UID switch, spoiler, 15 SKU, khóa hàng chưa bán, rapid click và readOnly wallet.
- 63 regression Shop/Kho/kinh tế/T0/cache PASS. `git diff --check` PASS.
- Không mua/bán bằng Xu thật. External requests bị chặn trong local browser QA. Các thay đổi Tu Tiên có sẵn được giữ ngoài staging.

Ảnh cận cảnh dùng trang/CSS/catalog thật trong local preview; chỉ ẩn header/banner/filter và các món khác để đóng khung bốn card:

| Rộng | Trước | Sau | Tên dài |
|---|---|---|---|
| 320px | [Trước](qa/card-art/before-320.png) | [Sau](qa/card-art/after-320.png) | [Tên dài](qa/card-art/long-name-320.png) |
| 390px | [Trước](qa/card-art/before-390.png) | [Sau](qa/card-art/after-390.png) | [Tên dài](qa/card-art/long-name-390.png) |

Bằng chứng số đo: [before](qa/card-art/before-geometry.json), [after](qa/card-art/after-geometry.json). Mã cache Shop: `shop-r3-s1b3-3`. Commit/push và Pages được xác minh trong báo cáo bàn giao sau khi gate đạt.
