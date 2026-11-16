# DUDU STUDIO — SHOP R3 / S1-B3

Ngày kiểm tra: 2026-11-16 (Asia/Saigon). Trạng thái: **PUBLISHED / VERIFIED (PHASE A)**. Commit `57e4aeaa765f867b8a6dc4d7b5860eb181fc2a35` đã push origin/main, remote SHA khớp. Pages build SUCCESS; Chrome kiểm tra Shop guest công khai 320/390px PASS, không giao dịch thật. Xem [báo cáo public](qa/published-report.json) và [retirement handoff](../vangioi-retirement/README.md).

## Baseline và nguồn

Làm trực tiếp trên `main` theo override của owner. HEAD baseline: `a8250ae0b34f700e6dfbe63168487f20b5d0b5d4`; HEAD sau PHASE A: `57e4aeaa765f867b8a6dc4d7b5860eb181fc2a35`. Fetch origin/main thành công; tại thời điểm fetch baseline hai phía bằng nhau. Working tree đã có nhiều thay đổi Tu Tiên không thuộc Shop; giữ nguyên và không stage chúng.

Đã đọc [Master Plan](https://docs.google.com/document/d/1w_X985RO2LIG4jYjC6rzurEJ6WITg4CbR4aKZrk9c40/edit), gồm Phụ lục XII/XIII. Lệnh triển khai/duyệt sử dụng tài nguyên mới nhất trong hội thoại của owner được ưu tiên hơn các gate cũ trong tài liệu.

Nguồn local đọc được tại `D:/Games/truyendienvl/ANH/New folder (2)`:

- `DUDU_SHOP_S1_B2_INTERACTIVE_FANTASY_V0129.html` (tên thực tế, khác tên ví dụ trong brief).
- BG-01 WebP 1080×1920.
- BNR-01 HANDOFF V01 ZIP.
- FRM-01 HANDOFF V01 ZIP.

Không tìm thấy FINAL_PACK_TRACKER trong workspace. Không có minh họa Vân Nguyệt độc lập đã duyệt trong gói cung cấp. Không lấy hình concept nhúng trong prototype làm asset production.

## Phần tích hợp local

Renderer `DuduMarketUIV43.render` vẫn là renderer Shop cũ. Không tạo app, catalog, ví hoặc Kho mới. Callback `onBuy`, `onBulkSell`, saleIds và core được tái sử dụng.

| Nhóm UI | Nguồn kỹ thuật | Quyền giao dịch |
|---|---|---|
| Vật Phẩm | COMMON + TOOLS | Giữ điều kiện readOnly, saleIds, giá, số dư, hạn mức cũ |
| Tu Tiên | REALM / CULTIVATION | Chỉ xem trước |
| Ngoại Trang | Hai mẫu trưng bày, không có itemId production | Chỉ xem trước |
| Sưu Tầm | REALM / DUDU / STORY qua ba tab nguồn | Không mua/cấp; STORY qua index chống spoiler hiện hữu |
| Bán Nhanh | SELL | Chỉ hiện khi personalMode và có onBulkSell |

Các enum COMMON, SELL, REALM, DUDU, STORY, TOOLS giữ nguyên trong core. Tất cả 12 SKU COMMON và 3 công cụ Personal vẫn được cho mua theo saleIds từ economy-live-v52; Phiếu Ưu Đãi vẫn khóa trên Personal. Không đổi ID, giá, loại, phẩm hay quyền mua.

Nền tím than/lam, banner nền và nhân vật riêng, card/combo FRM-01 9-slice (slice 110), nút và chữ HTML/CSS. Bỏ link CSS Neon R3.1-R cũ để tránh ghi đè khung mới; file cũ giữ nguyên. Tìm kiếm metadata công khai, lọc phẩm và sắp tên/giá. Card hai cột khi đủ chỗ, một cột dưới 235px vùng nội dung thực.

Chạm ảnh mở popup riêng của Shop: X, Escape, chạm nền, focus về ảnh, khóa cuộn nền, giữ focus trong dialog, background phone inert. Popup đóng khi render lại, đổi UID hoặc trigger bị tháo. Ảnh item tiếp tục dùng fallback của item-visuals-v13; nhân vật lỗi tải được ẩn để chữ và nút còn hoạt động. Nút mua độc lập, khóa khi callback đang chờ và bắt lỗi callback. Không thay popup Kho.

Header dùng title và ví hiện có của Cyber Phone; bỏ số 50 cứng trong markup, không thêm số dư demo. Không dựng dung lượng Kho khi contract renderer chưa cung cấp count/cap được xác nhận cho mọi mode.

Combo giữ ba thẻ và cuộn ngang từ bố cục prototype. Nội dung/giá chờ duyệt, mọi nút bị vô hiệu hóa; không sao chép danh sách vật phẩm demo vào production catalog. Chưa có bundle contract để bật mua.

## Ngoại trang và backlog

Đạo Bào Thanh Vân dùng BNR-01 để trưng bày. Đạo Bào Vân Nguyệt dùng ký hiệu và thông báo chưa có minh họa riêng; không đổi màu ảnh Thanh Vân rồi giả làm asset mới. Cả hai không có giá thật, nút mua, entitlement, UID write, inventory write, trạng thái đang mặc hay nhãn đã sở hữu. Không đổi model Tu Tiên.

CHARACTER-MODULAR PILOT-01 đến PILOT-04 vẫn là thử nghiệm, **chưa production**. Ngoại trang chỉ thẩm mỹ, không cộng HP/ATK/DEF/SPD/QI/Lực Chiến.

12 ứng viên DESIGN_DRAFT: Hồi Thể Đan; Tụ Linh Đan; An Mạch Đan; Tụ Khí Quyết; Bộ Pháp; Mộc Kiếm; Hộ Giáp; Đạo Bào Thanh Vân; Đạo Bào Vân Nguyệt; Giấy Phù; Linh Mực; Nền Hồ Sơ. Đây là backlog mở, không phải danh mục phát hành. Không có itemId mới, giá, saleIds, công dụng hay quyền sử dụng được tạo từ danh sách này.

## Bốn mùa của cùng Shop

`DuduMarketUIV43.themes` chứa spring/Xuân — Hoa Nguyệt, summer/Hạ — Thanh Trúc, autumn/Thu — Kim Phong, winter/Đông — Hàn Nguyệt. Tham số `theme` chọn cấu hình màu nhấn, nền banner và nhân vật; mặc định spring, key không hợp lệ fallback spring. Các mùa dùng chung asset đã cung cấp và cùng một FRM-01, không giả định đã có art riêng cho mùa khác.

Chưa có scheduler hoặc vòng stock. Chu kỳ ưu tiên 7 ngày/mùa vẫn là đề xuất, 1/3 ngày chỉ để thử; chưa chốt lịch vận hành. Không dùng đồng hồ client để quyết định giao dịch/quyền sở hữu. Không làm mới stock, hạn mức, saleIds hoặc dữ liệu người chơi.

Để thêm hàng theo mùa: duyệt gameplay, ID/giá/quyền bán và asset trước; tích hợp vào catalog/transaction contract hiện hữu ở một đợt riêng có QA. Theme UI chỉ lựa chọn phần trình bày, không tự cấp quyền bán.

## Asset

`assets/shop-r3/manifest.json` ghi bytes/SHA-256 của năm WebP thực dùng: shop-bg, banner-bg, thanh-van, card-frame, combo-frame. Bản manifest nguồn BNR/FRM được lưu nguyên trong thư mục tài liệu; các file này vẫn ghi DRAFT-REVIEW ở thời điểm xuất gói. Việc cho phép dùng trong UI-FIRST được ghi nhận theo yêu cầu owner trong hội thoại, không sửa ngược trạng thái của manifest nguồn.

Không nhập master PNG, ảnh mockup/review, poster có nút/giá, ITEM-01/02 draft, ITEM-03 vector draft, BUNDLE-01 draft hoặc các lớp CHARACTER-MODULAR PILOT vào website.

## QA và gate phát hành

50 test trong 10 suite liên quan Shop/Kho/kinh tế PASS: personal-shop-clean-layout-c2, personal-spark-items-v1, economy-core-v43, inventory-view-v42, story-market-v43, personal-spark-items-integration-v1, inventory-trade-v43-9, functional-items-v43-8, fun-bulk-sale-f34, shop-warehouse-art-c24a. Hai bài test layout/art được cập nhật theo cấu trúc nhóm mới và mã cache mới, giữ kiểm tra sprite/archived/contract.

`tests/browser-shop-r3.cjs`: PASS trên Chrome local tại 320/355/390/430px. Kiểm tra 5 nhóm khi có callback SELL, 15 SKU bật mua và coupon khóa, tìm kiếm/lọc/sắp xếp, popup/focus/X/Escape/chạm ngoài, rapid click gọi callback một lần, Tu Tiên/ngoại trang không bán, ba nguồn Sưu Tầm, SELL hiện hữu, readOnly/saleIds rỗng khóa mua, không horizontal overflow và không đổi Xu/Kho. Ảnh before được dựng từ ba file baseline bằng git show; after dùng workspace hiện tại. Website thật trong local preview, external requests bị chặn; các thao tác mua dùng callback giả lập rõ ràng trong test, không giao dịch Xu thật.

**KNOWN_BASELINE_FAIL / ARCHIVED_FEATURE / NOT_SHOP_RELEASE_GATE:** `tests/browser-vangioi-online-playtest.cjs`. Lần đầu thiếu Chromium mặc định; chạy lại bằng Chrome có sẵn vẫn timeout khi chờ nhân vật An. Trang `playtests/ben-suong/index.html` tại baseline đã có app.js với type `application/x-dudu-archive`, không thực thi. Test cũ đòi playtest hoạt động, không phù hợp trạng thái archive hiện tại. Owner xác nhận loại lỗi này khỏi gate Shop ngày 16/11/2026. PHASE A không sửa/xóa test hoặc bật lại Bến Sương; việc retirement thuộc PHASE B.

Xác minh PHASE A mới: **52/52 PASS** (50 test trên + 2 test features-t0). Browser Shop PASS tại bốn kích thước; bổ sung kiểm tra đóng popup khi đổi UID và không xuất metadata STORY của chương chưa đọc. Diff index.html chỉ có title Shop, placeholder số dư, mã cache Shop và bỏ link CSS Shop Neon cũ. Không có hunk Tu Tiên trong phạm vi staging.

Giới hạn: chưa xác minh giao dịch Firebase trên tài khoản thật, race nhiều tab online, đổi UID trong transaction thật, offline/reload receipt ở backend hoặc giao diện GitHub Pages sau phát hành. Các bảo vệ giao dịch hiện hữu được giữ nguyên và regression unit dùng fixture; không gọi đó là QA production online.

`git diff --check`: PASS. Không thay Firebase Rules/schema/Functions/migration, module kinh tế, giá hoặc nguồn Xu. Push PHASE A đã kích hoạt `pages build and deployment`, run `43891378903` hoàn thành SUCCESS. Website công khai đã kiểm tra guest ở 320/390px; toàn bộ nút mua khóa với guest và ảnh banner tải được.

Ảnh: [before 320](qa/before-320.png), [after 320](qa/after-320.png), [before 390](qa/before-390.png), [after 390](qa/after-390.png).

## File thay đổi thuộc đợt này

- `index.html`
- `js/market-ui-v43.js`
- `css/market-v43.css`
- `tests/personal-shop-clean-layout-c2.test.cjs`
- `tests/shop-warehouse-art-c24a.test.cjs`
- `tests/browser-shop-r3.cjs`
- `assets/shop-r3/` (5 WebP + manifest)
- `docs/shop-r3/` (báo cáo, manifest nguồn, 4 ảnh QA)

## Tiếp theo

PHASE A commit/push chỉ file Shop trên main, xác minh remote SHA và Pages. PHASE B kiểm toán dependency và retirement Vạn Giới trong commit riêng theo lệnh owner; không khôi phục gameplay. Ngoại trang entitlement/model lớp, gameplay SKU mới, bundle thật và mùa tự xoay là các giai đoạn riêng chưa triển khai.
