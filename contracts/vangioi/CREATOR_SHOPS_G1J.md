# VẠN GIỚI G1J — Cửa hàng và kiểm liên kết mua bán trong kịch bản

Ngày 26/10/2026. Nền `4ab2a6b` (G1I, CI/Pages SUCCESS). Creator ở **Vạn Giới → Tạo / nhập thế giới**; Chủ Thần tiếp tục là khu riêng của chủ dự án và AI điều phối. Đây là soạn dữ liệu nháp, chưa có giao dịch hoặc world gameplay production.

## Biểu mẫu mới

Mục **Cửa hàng** thêm/sửa tên, địa điểm, NPC bán hàng tùy chọn, đơn vị tiền và bảng hàng. Dropdown tiền chỉ lấy item category=currency; không tự đổi category của một vật phẩm. Mỗi mặt hàng có itemId, giá và số lượng dạng số nguyên không âm, giữ các giới hạn safe integer của schema chung. Giá 0 được phép, quantity 0 nghĩa là số hàng khai bằng 0, không tự suy ra vô hạn.

Chọn item trong bảng hàng không cho thêm trùng qua form. Nút **Khai cách nhận qua cửa hàng** thêm acquisitionMethods `{type:'shop',shopId}` vào đúng item nếu chưa có, không tạo bản lặp và không xóa các nguồn pickup/quest/starting đã khai. Đây là thao tác authoring rõ ràng, không mua item hay ghi số dư. Ở Vật phẩm, dropdown cửa hàng nguồn lấy các shop đã có mặt hàng tương ứng.

Xóa shop bị chặn khi còn item/hotspot hoặc ID tham chiếu khác. Thay/xóa dòng bán cuối cùng của item bị chặn khi item còn khai cách nhận qua shop đó; tác giả đổi cách nhận trước. Nếu JSON import có hai dòng trùng, có thể bỏ/thay một dòng mà vẫn giữ dòng bán còn lại và liên kết acquisition hợp lệ. Không xóa dây chuyền, không tự sửa đồ trong kho người chơi.

Các UI/link cũ tiếp tục dùng được: hotspot action shop trỏ shopId; objective purchase trỏ itemId; cửa hàng liên kết địa điểm/NPC; item currency vẫn là nội dung riêng của world. Không đồng nhất tiền trong world với Xu/DUDU balance hoặc cho mang ra ngoài chỉ vì transferPolicy đề nghị.

## Kiểm tra chung phiên bản semantic-2

`CONTENT_VALIDATOR_VERSION` tăng từ `world-content-1-semantic-1` lên **world-content-1-semantic-2**. Schema world-content-1 và nguồn V0.1 không đổi. Browser bundle tái tạo từ cùng module semantic với adapter server; không có logic cấp quyền client.

Lỗi kỹ thuật chặn chuẩn bị hồ sơ gửi duyệt:

- Cùng một itemId lặp trong stock của một shop, kể cả có giá khác nhau: duplicate-shop-stock.
- Item khai cách nhận tại shop tồn tại nhưng stock không có item đó: shop-acquisition-stock-mismatch.
- Các quy tắc cũ vẫn giữ: currencyItemId thuộc item currency, mọi ID phải tồn tại, giá/số lượng đúng kiểu và không âm/không vượt safe integer.

Nhắc xem xét kịch bản, không tự kết luận lỗi gameplay:

- Có món được bán nhưng item chưa khai cách nhận qua cửa hàng.
- Quantity 0; tổng lượng bán được khai ở các nguồn mua thấp hơn requiredCount của objective purchase.
- Objective mua chưa có nguồn mua được khai đầy đủ.
- Shop có giá dương nhưng item tiền chưa có acquisition method.

Các nhắc trên không mô phỏng số dư, vị trí thực, điều kiện mở, bổ sung hàng theo event, mua lại hay luật kinh tế; có thể cần engine/biên tập giải thích. Chúng không tự tăng hàng/tiền hoặc chặn mọi truyện theo một khuôn. Không thêm quota shop/giá theo rank. Không coi có nguồn tiền là chứng minh người chơi đủ tiền.

**Lưu nháp** vẫn dùng schema partial, giữ được công việc thiếu trường/đang sửa liên kết; sai numeric/schema không lưu. **Kiểm tra hồ sơ** và default content gate dùng đầy đủ schema+semantic. Nút gửi duyệt vẫn chưa kết nối backend. Snapshot cũ giữ validatorVersion/hash và dữ liệu bất biến; không rewrite/migrate hoặc tái công nhận snapshot cũ dưới phiên bản mới. Cổng publish tương lai phải đánh giá policy đang áp dụng.

## Báo cáo trên giao diện

Report nay hiển thị cả warnings, gồm các cảnh báo reachability/engine từ G1D trước đây chưa được hiển thị. Phần lỗi và phần cần xem xét có nhãn rõ, path để tìm mục, không xuất story prose/NPC knowledge/private values. Giới hạn hiển thị 35 lỗi/20 nhắc đầu là giới hạn UI, không phải quota tác giả. Cấu trúc PASS luôn kèm giải thích chưa xác minh nguồn/ảnh, chưa gửi duyệt; warnings không phải chứng nhận playable.

## QA và giới hạn

- 481 test ứng dụng hiện có và 354 test Worker/helper PASS cục bộ. Mười test G1J kiểm graph shop/purchase hợp lệ, duplicate stock, acquisition-stock mismatch, warnings reviewable, zero stock/free price, currency category/source, numeric boundaries, thiếu target/không lộ prose và default server validator dừng trước registry khi semantic sai.
- Browser Creator main với Firebase giả/IndexedDB thật/chặn ghi mạng giữ G1G–G1I; thêm `tests/fixtures/creator-shops.cjs` tạo tiền/item/shop bằng form, nối pickup/shop/purchase/NPC/place, kiểm khai nguồn không lặp, giá âm bị chặn lưu, số hàng thiếu chỉ nhắc, đổi/xóa liên kết có bảo vệ, sửa duplicate import, save/export/reopen và layout 320–1280px. Các test System/auth kiểm riêng.
- Có ảnh QA shop bằng dữ liệu giả. Chưa QA Android/iOS hoặc phiên AU production, engine mua bán, đồng bộ Firestore/Worker, cấp entitlement hoặc quyền art thật. CI/Pages kiểm theo SHA GitHub của đợt này.

Không có route/binding/migration/deploy Worker hoặc API giao dịch. Không sửa Rules, auth, NPC chat, Thiên Mệnh, EPUB, save/kho/EXP/pool/AI/Canon; không mở WORLD_PLAY/48 seed hoặc phát thưởng. Local image preview vẫn chỉ trong phiên theo G1I.

Tiếp: thiết kế adapter/kết nối backend và quy trình review có quyền thật, chuẩn bị kiểm thử cục bộ trước khi xin phép triển khai cụ thể. Những luật kinh tế/điều kiện sâu chưa có trong schema cần contract riêng, không tự nhét field hoặc đổi Canon.

Rollback: revert commit G1J và URL cache version. Nháp vẫn world-content-1, không có database schema migration hoặc dữ liệu backend cần phục hồi; giữ nguyên dữ liệu local của tác giả.
