# DUDU V44.1 — 90 vật phẩm đa thế giới, Sổ Sưu Tập và nhặt đồ đa dạng

**Ngày:** 17/10/2026 · **Triển khai:** `main`, Github Pages Sandbox `?sandbox=1&v=44-1`. Không triển khai Cloudflare Worker mới. Đấu giá chỉ giữ giao diện ký gửi hiện có, không mở mua bán thật. **Không tạo hình vật phẩm trong đợt này.**

## Danh mục bất biến và tương thích

- 70 ID hiện tại giữ nguyên; thêm `world-items-v44-1.js` gồm 90 ID mới, mỗi thế giới **15**; tổng catalog = **25 COMMON + 120 REALM + 15 DUDU = 160**.
- Sáu thế giới `URBAN, APOCALYPSE, CULTIVATION, FANTASY, SCIFI, HORROR` mỗi thế giới có **20** món (5 cũ + 15 mới). Mỗi 15 món mới có F:4, E:4, D:3, C:2, B:1, A:1.
- 13 món F/E/D/C mới/thế giới thuộc `RANDOM`; hai món B/A mới/thế giới là **`CHAPTER_EVENT` chưa được phát hành/cấp thưởng**, không đưa vào pool ngẫu nhiên và không tự động mint tại đọc chương.
- Mỗi record mới có tên, mô tả, icon emoji, thế giới, phẩm cấp, phương thức nhận và vai trò `MATERIAL/TOOL/STORY_PROP`. Đồ xếp TOOL **chưa có hành động dùng** khi chưa có cơ chế; không giả nút sử dụng. Những món được định nghĩa FOOD vẫn chỉ là đồ dữ liệu, không cấp hiệu ứng tiêu hao.
- Catalog cũ vẫn gồm đủ 70 món nguyên bản; `legacy e1` đọc được; không chuẩn hóa/xóa instance trong profile. `validate()` và `validateCatalog()` biết tới 160 món.

## Điều chỉnh rơi đồ

- `DuduLootRules.pick({realmTag,seenIds})` chọn phẩm cấp bằng trọng số gốc `BASE_WEIGHTS` (F 5000, E 3000, D 1200, C 500, B 200, A 70, S 25, SS 4, SSS 1). KHÔNG tăng tỉ lệ cấp hiếm vì mở rộng catalog.
- Tại **chương có `realmTag` do tác giả gắn rõ**, khi một phẩm cấp chứa cả COMMON và REALM, chọn nguồn REALM với xác suất **65%**, COMMON **35%**. Nếu cấp đó không có món cùng thế giới, dùng nguồn phù hợp còn lại; không tạo vật phẩm giả.
- Trong nhóm đã chọn, mỗi loại **chưa từng thu thập** có trọng số chọn gấp **3 lần** loại đã thấy, không khóa hẳn loại cũ. `lootSeenV441` là danh sách loại đã gặp trên profile Sandbox; với phiên bản cũ bổ sung tạm từ món đang trong Kho. Tránh lặp nhàm chán, không bảo đảm chắc chắn món mới trong bất cứ số lượt cụ thể.
- Nút nhặt **toàn cục trên Điện thoại** không có worldTag vẫn chỉ lấy COMMON; không tự suy đoán thể loại truyện từ nội dung hay tên.
- Giữ nguyên hồi chiêu Điện thoại 2 phút, điều kiện từng chương/ngày và giới hạn kho 500 vật phẩm. Rơi đồ và EXP/Xu vẫn là cơ chế **Sandbox trên trình duyệt**, không thành chứng cứ sở hữu máy chủ.

## Sổ Sưu Tập Thế Giới

- Nút `📚` nhỏ ngay trên thanh Kho gọn V44.0.1; mặc định **đóng**, không chen đồ xuống màn hình khi mở Kho.
- Khi mở: 6 nhóm, số loại `đã thấy/20`, xem 20 ô mỗi thế giới. Đồ chưa gặp chỉ hiện `？`; không lộ tên/miêu tả phần thưởng sự kiện chưa gặp.
- Dữ liệu phát hiện `collectionV441.found` lưu theo ID canonical trong **Sandbox local profile**, đồng bộ cùng thao tác lưu hiện có. Món đã nhặt vẫn hiện là từng phát hiện sau khi bán, tặng hoặc sử dụng; không xóa tiến độ phát hiện.
- Chỉ đếm từ món hiện còn trong Kho ở thời điểm chuyển sang V44.1 hoặc phát hiện sau đó; **không thể khôi phục lịch sử đã bán/vứt trước bản cập nhật nếu không có log**. Sổ không tạo thành tựu mới hay thưởng Xu; không phải quyền sở hữu máy chủ.
- Responsive 320px, 3 thẻ thế giới/hàng, 5 ô icon/hàng, giới hạn chữ và nút rõ ràng. Giao diện dạng drawer, không đặt một trang chữ dài trước lưới vật phẩm.

## Kiểm thử và kiểm soát rủi ro

- Unit test kiểm đủ 90 ID không trùng, 20 món/realm, nguồn rơi, rank có điều kiện, phân loại, 70 legacy còn nguyên, chỉ số phát hiện đi qua bán/tặng, không spill giữa hai thế giới, không grant/Firestore request.
- Browser smoke mở Sổ ẩn/mở, hiển thị 6 thế giới × 20 món, nhận diện món cũ, giữ lịch sử khi món bị xóa khỏi Kho, đóng lại và xác nhận không phát sinh ghi Firestore.
- Kiểm tra không lỗi việc gift/market/coupon/quest/nonce/loot của V43 và khả năng lưu profile Sandbox trước khi bật UI trên main.

## Chưa bao gồm trong V44.1
Ảnh vật phẩm cao cấp, hiệu ứng consumable/tool mới, công thức chế tạo, mở khóa thật quà sự kiện chương B/A, giao dịch chuyển UID tác giả, hộp thư tác giả, bình luận tặng quà, đấu giá người chơi thật.
