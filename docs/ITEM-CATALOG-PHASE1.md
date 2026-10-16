# DUDU Studio 2.0 — Đợt 1: Chuẩn hóa danh mục 70 vật phẩm

**Ngày chốt:** 15/10/2026. **Trạng thái:** Đã thêm danh mục và unit tests trên nhánh thử nghiệm; **CHƯA** thay cơ chế nhặt đồ, kho đồ hoặc save.

## Danh mục đã có trong mã

- `js/item-catalog-v2.js`: **25 COMMON** (phổ thông), **30 REALM** (sáu vị diện × năm món), **15 DUDU** (kỷ vật hệ thống).
- Mỗi vật phẩm có `id`/`itemId` cố định, `name`, `rank`, `type`, `icon`, `desc`/`description`, `scope`, `realmTag`, `acquisition.method`, `unique`, `maxOwned`, `giftable`, `tradeable`, `discardable`, `published`, `schemaVersion`. Để tương thích với UI cũ, `type` chỉ chứa `FOOD`, `WEAPON`, `ITEM`.
- Nhóm vị diện: `URBAN`, `APOCALYPSE`, `CULTIVATION`, `FANTASY`, `SCIFI`, `HORROR`. Tác giả sẽ gán thẻ vị diện ở chương/truyện trong **đợt tiếp theo**, không AI tự đoán.
- Các kỷ vật DUDU chỉ nhận bằng **MILESTONE/EVENT**, không rơi ngẫu nhiên; mặc định không giao dịch, tặng hoặc vứt, mỗi món chỉ một bản.
- **Không thay đổi ID vật phẩm cũ**: `f1`, `f2`, `e2`, `e3`, `d1`, `c1`, `b1`, `b2`, `s1`, `sss1`. Món `e1` (Mì Tôm Cay Dung Thành) có lookup tương thích riêng, không bị xóa. Mã `s1` được phân loại vào SCIFI ở dữ liệu mới, nhưng **không bị chuyển vị trí trong bảng rơi cũ** ở giai đoạn này.
- Kỷ vật `sss1` (Mã Nguồn SYS_ERR_0x000F89) có `originStoryId='truyen-dien-vl'` và `loreReviewRequired=true`. Trước khi cho phép nhận qua luật mới, tác giả cần xác nhận nó là di sản DUDU hay độc quyền truyện. Không tự quyết định canon.
- API nội bộ `byId(id)`, `list({scope,realmTag})`, `previewDropPool({realmTag,rank})`, `validate()` cho giai đoạn kiểm thử. **Chưa dùng `previewDropPool` trong gameplay**. Tag không hợp lệ trả `[]` (fail closed), không thay bằng món của vị diện khác.
- Tất cả là dữ liệu định nghĩa bất biến; danh sách chỉ được cập nhật cùng phiên bản code, Admin chỉ quản lý vật phẩm **theo truyện/chương** ở giai đoạn sau.

## Những thứ chưa thay đổi — bảo toàn save

- `MASTER_LOOT_TABLE`, `SHOP_CATALOG`, `rollLootDrop()`, `claimChapterLootDrop()`, nhiệm vụ, điểm tình cảm NPC và mọi hồ sơ/inventory của người chơi đều giữ nguyên. Không tự động phát 70 món cho người chơi.
- Danh mục định nghĩa mới chưa phải bằng chứng người chơi sở hữu vật phẩm nào.
- **Vấn đề vẫn tồn tại cho giai đoạn sau:** bảng roll cũ chọn phẩm `A/SS` nhưng không có vật phẩm tương ứng, fallback F; vật phẩm `sss1` vẫn có thể rơi qua bảng cũ cho đến khi thay cơ chế ở đợt 2; tiền/EXP/quà vẫn được client tự tính. Do đó **chưa phát hành bản này như hệ thống rơi đồ đã cân bằng**.

## Đợt 2 — Luật rơi đồ có nguồn gốc, triển khai sau

1. Chuẩn hóa hệ thống xác định nguồn loot: generic random dùng bảng COMMON + REALM (chỉ khi có thẻ vị diện tác giả đã chỉ định). Vật phẩm truyện/chương/NPC tuyệt đối không thuộc random generic.
2. Đảm bảo **không có rank rỗng** được tự đổi thành F. Nếu một phẩm không có món hợp lệ thì phân phối lại xác suất trên những phẩm có thể rơi, hoặc trả lỗi an toàn. Sửa lỗi farm nhờ truy cập chương lặp lại mà không tính là đã đọc.
3. Bảo toàn inventory/save cũ, không được đổi nguồn gốc bằng cách đoán dựa theo tên, test hai UID, nhiều truyện và sandbox. Cơ chế nhận và cộng tiền thật cần backend xác thực trước khi mở công khai.
4. Tiếp theo mới bổ sung biểu mẫu vật phẩm truyện/chương cho tác giả; không tạo công cụ thêm item chung.

**Các bài kiểm thử:** `node --test tests/item-catalog-v2.test.cjs` và smoke/browser suite hiện có. Chỉ merge nhánh khi chủ dự án duyệt và QA đạt.
