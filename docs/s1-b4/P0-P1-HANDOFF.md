# DUDU STUDIO — S1-B4 P0/P1 · FUNCTION-FIRST / ART-LATER

Ngày: 2026-11-20 · nhánh đích: `main` · trực tiếp, không Sandbox branch/PR.

## Phạm vi thực hiện

- `js/item-profile-s1b4.js`: adapter **chỉ đọc** cho Shop/Kho; lấy tên, ID, phẩm, loại, mô tả từ `DuduItemCatalog` và `DuduEconomyCoreV43`, đọc `obtainedFrom`/instanceId từ bản ghi thực tế được truyền vào. Gắn nhãn rõ provenance và quyền sở hữu chỉ là **bản hiển thị phía client**, không bằng chứng xác nhận từ backend.
- `js/market-ui-v43.js`: mở hồ sơ item cùng nguồn với Kho; callback `onBuy`/giá/`saleIds` giữ nguyên. Đổi nhãn gian `OUTFITS` thành **Ngoại Hình**.
- `js/inventory-view-v42.js`: thêm các fact về ID instance, nguồn theo danh mục, dấu vết nhận, điều kiện dùng và trạng thái có trong Kho. Không viết lại popup hoặc thay đổi callback dùng/bán/khóa/vứt.
- `css/item-profile-s1b4.css`: card HTML/CSS có placeholder cho 320/355/390/430 px.
- `tests/item-profile-s1b4.test.cjs` và `tests/browser-item-profile-s1b4.cjs`: test contract/15 SKU, provenance, no entitlement, ảnh sẵn có và responsive.

## P1 — Appearance manifest

| appearanceId | assetId | trạng thái ảnh | trạng thái chức năng |
|---|---|---|---|
| `avatar-current-preview` | Chưa có sprite nguyên nhân vật | PLACEHOLDER | Chỉ xem thông tin, avatar editor legacy không đổi |
| `shop-thanh-van-preview` | `shop-r3/thanh-van` | EXISTING | Có ảnh minh họa cũ, chưa có slot trang bị/quyền chọn |
| `shop-van-nguyet-concept` | Chưa có | ART_PENDING | Concept cũ, không cấp vật phẩm |

Cả ba **preview-only**, không mua/chọn/lưu giao dịch, không cấp quyền sở hữu và không ghi Firebase/UID. Không sản xuất AI art hoặc trang phục theo từng layer.

## Hành trình vật phẩm đã xác minh theo mã nguồn

| Chặng | Mức xác minh |
|---|---|
| ID, định nghĩa, phẩm, mô tả từ `DuduItemCatalog` | PASS (mã nguồn/adapter) |
| 12 SKU Shop + 3 công cụ có quyền bán theo saleIds hiện hành | PASS (contract/unit, chưa đối soát giao dịch production) |
| Danh mục Shop → item profile | PASS (adapter/UI contract) |
| Kho → inspector → instanceId & provenance | PASS (adapter/UI contract), ownership chỉ là bản ghi client |
| Dùng/bán/khóa | Không thay callback; cần test end-to-end Firebase được xác thực |
| Sự kiện chương → Kho production có receipt tin cậy | BLOCKED nếu thiếu xác nhận máy chủ; chỉ hiển thị nguồn |
| Vườn Sương local → Kho production | BLOCKED (không bridge số lượng thu hoạch local) |
| Tu Tiên phó bản mock → reward production | BLOCKED (`tutien-integ-t0.js` còn MOCK ONLY) |
| Chọn/lưu ngoại hình nguyên nhân vật | BLOCKED: chưa có entitlement + persistence contract được duyệt |

## QA và giới hạn

Kiểm thử model thực bằng `DuduItemCatalog`, `DuduInventoryV42`, `DuduEconomyCoreV43` đã kiểm tra không sửa 15 saleIds, không mất instanceId và không giả sở hữu.

GitHub Actions trên `main` chạy kiểm thử:
- `node --test tests/item-profile-s1b4.test.cjs`
- `node --test tests/browser-item-profile-s1b4.cjs`
- Regression Shop/Kho và hệ thống khác theo workflow hiện có.

**Không suy luận CI PASS trước khi quan sát được kết quả chạy thực tế.**
Không truy cập local working tree của chủ dự án; mọi thay đổi chưa commit trên Windows vẫn do người dùng kiểm soát. Cần kiểm tra xung đột trước khi pull/reset local.

## Roadmap được ghi nhận — KHÔNG TRIỂN KHAI P2–P5

- Bỏ luyện đan/luyện khí ở kế hoạch gameplay mới, không xóa item/data legacy.
- Nhặt giống linh thảo → trồng tại Vườn Sương → thu hoạch → nhiệm vụ và đổi đan, chỉ khi xác minh backend.
- Công pháp, Võ kỹ, Trang bị, Lực Chiến, cộng EXP/Tu Vi và nâng bậc: công thức/tỷ lệ chờ OWNER duyệt.
- Không đưa harvest local vào Kho thật, không tự tạo reward/contract/migration.

## Production guard

Không thay Firebase Rules/schema, R2, Cloud Functions, Shop pricing, SKU IDs, saleIds, instance records, quyền avatar, gameplay, tài sản hoặc xuất bản AI art. Không coi preview là lựa chọn có hiệu lực hoặc là quyền sở hữu.
