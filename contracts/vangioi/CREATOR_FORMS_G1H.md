# VẠN GIỚI G1H — Biểu mẫu nội dung và liên kết kịch bản

Ngày 26/10/2026. Nền `08537c8` (G1G.1, CI/Pages SUCCESS). Lối vào tiếp tục là **Vạn Giới → Tạo / nhập thế giới**. Chủ Thần là khu riêng của chủ dự án và AI điều phối, không chứa trình soạn truyện. Không thêm dependency từ Creator tới Core.

## Đã triển khai trong đợt này

| Mục | Biểu mẫu và liên kết |
|---|---|
| Thông tin | Bổ sung mức nguy hiểm, giữ bậc đề nghị và Story Bible; không tự xếp bậc theo số chương/NPC/cảnh. |
| Địa điểm & cảnh | Góc nhìn, loại góc nhìn/ảnh, tương tác chữ hoặc điểm ảnh và đích theo hành động. Scene-view có chỉ mục hai chiều; place-scene/map-place giữ ID ổn định. Không chạy engine hoặc biểu thức trigger. |
| Vai nhập | Cả cast_possession/system_cover/native_extra; cảnh vào, cảnh bắt đầu mỗi vai, chọn vai cố định hoặc người chơi chọn; nhân vật có thể nhập, tên/giấy tờ trong truyện, lịch sử bản địa, tri thức và cờ đầu. |
| Nhân vật & NPC | Vai trò/presence và playableAsCast; NPC mode, liên kết cast, introScene, tính cách, tri thức, friendable/lớp tương tác; node hội thoại, lựa chọn, nextNode cùng NPC và setFlag. |
| Vật phẩm | Category, mô tả, transferPolicy đề nghị, stackLimit; cách nhận từ đầu/nhặt/nhiệm vụ/shop/NPC/chế tạo. Nhặt chọn đúng hotspot pickup trỏ tới item và lấy place/view/uniquePickupId từ liên kết hiện tại. |
| Nhiệm vụ | Chính/phụ/ẩn, bắt buộc hoàn thành world chỉ cho main; tám verb objective với đúng danh sách đích, requiredCount; EXP/items đề nghị và replayPolicy. |
| Sự kiện & kết cục | Trigger/requiredFlags/setFlags và kết quả success/partial/failure; chưa đánh giá điều kiện hoặc thay trạng thái chơi. |

Không cần sửa JSON để dựng một hồ sơ cấu trúc cơ bản có vai nhập/NPC/vật phẩm/objectives/endings; một luồng browser đã làm đủ bằng form và đạt inspectContent hiện hành. Điều đó **không** chứng minh cốt truyện chơi được, license/source/asset đã xác minh, official rank hoặc quyền xuất bản. Nút gửi duyệt vẫn chưa kết nối.

`identityAssurance=verified` là tính hợp lệ của thân phận **trong truyện**, không phải UID/owner hay chữ ký backend. nativeSlotId là ID nội dung nháp được tạo khi tác giả chọn vai bản địa; không cấp danh tính người chơi. Không chuyển các vai legacy main/traveler/observer thành ba mode mới hoặc migrate save.

NPC ai_candidate chỉ ghi yêu cầu nội dung. Phải khai aiNpcRequested và có hội thoại scripted fallback để qua semantic checker; phần thưởng/biến đổi world bằng AI vẫn const false. Không gọi provider, tiêu token hay bật mode AI runtime khi tác giả chọn ô này. Friendable cũng là khai báo kịch bản, không tự kết bạn với tài khoản nào.

EXP/items/transferPolicy đều là đề nghị trong world-content-1, không ghi kho/EXP/reward hay quyền mang vật phẩm thật. Nhiệm vụ phụ/ẩn không được biến thành cổng bắt buộc hoàn thành world. Không đổi quy tắc khảo hạch hoặc điều kiện xuất bản truyện phái sinh.

## Giữ dữ liệu và sửa liên kết

IDs nội bộ của cast/NPC/entry/dialogue/item/objective/event/ending/view/hotspot được tạo một lần theo thao tác thêm và giữ khi sửa/save/export/reopen. Khi đổi verb objective hoặc action hotspot, đích cũ bị bỏ để tác giả chọn đúng loại mới, không đoán một ID thay thế. Chọn kiểu nhận vật phẩm mới thay hồ sơ cách nhận đó; các mục khác không bị đổi.

Khi liên kết pickup, công cụ sao chép các ID liên quan từ view/scene/hotspot tác giả đã chọn; không nhặt item, trừ kho hoặc thay trạng thái. Thay vị trí/hotspot sau đó vẫn cần kiểm tra lại; validator sẽ báo quan hệ không khớp, không tự sửa một world runtime.

Danh sách chọn giữ hiển thị ID chưa có trong danh sách thay vì làm như giá trị bị trống. Thông báo lỗi có hướng xử lý cho thân phận, NPC AI/fallback, nhiệm vụ bắt buộc và nguồn nhặt. Các lỗi không xuất Story Bible/tri thức/prose bí mật vào report.

Xóa mục còn được tham chiếu bị chặn, không xóa dây chuyền; chỉ mục reciprocal scene.viewIds/place.sceneIds/map.placeIds được cập nhật sau thao tác xóa hợp lệ. Dialogue node còn được nextNode/appearance dùng cũng bị chặn. Bộ dò ID cục bộ bảo thủ dựa trên tên trường Id/Ids, bỏ qua prose và record đang xóa. Nếu import dùng cùng chuỗi ID cho nhiều miền, có thể cần xử lý liên kết/ID qua JSON; đây không phải bộ phân tích đồ thị gameplay có kiểu hoàn chỉnh. Đổi asset ID/JSON nâng cao vẫn có thể tạo tham chiếu hỏng; kiểm tra hồ sơ sẽ phát hiện, không có publish tự động.

Nháp cũ không bị ghi lại khi mở. UI chuẩn bị các collection trống còn thiếu và default không-AI/playRequirements rỗng trong bộ nhớ, giữ toàn bộ trường/nội dung đã có và không đoán contentVersion còn thiếu. Chỉ lưu xuống IndexedDB khi tác giả bấm lưu. Không có migration backend, đổi định dạng/khóa DB, xóa nháp G1G hoặc chuyển dữ liệu tài khoản khác. Các dạng visualIdentity/characterVisuals/characterAppearances và trường chưa có form vẫn được giữ qua JSON/roundtrip.

Số được nhập dưới kiểu number, không ép boolean thành số, không âm thầm clamp. Type/minimum/safe-integer vẫn do schema partial/submit chung kiểm tra; sai số lượng bị chặn lưu và giữ bản trong phiên. Bản nháp thiếu trường vẫn có thể lưu, nhưng không thể PASS submit schema chỉ nhờ partial check.

## Kiểm thử và giới hạn

- 481 test ứng dụng hiện có và 339 test Worker/helper PASS cục bộ. Không đổi schema V0.1, schema content hoặc code server/registry/authority trong đợt này.
- Browser Creator main dùng Firebase giả, IndexedDB thật, không có API Core và chặn ghi mạng: giữ toàn bộ regression cũ; thêm `tests/fixtures/creator-structured.cjs` soạn đủ form từ nháp G1G thiếu trường, kiểm cả ba entry mode, cast/NPC/dialogue, pickup reciprocal identity, tám loại đích objective, mission main/side, numeric EXP/quantity, AI request/fallback, endings, guarded deletion và lỗi stackLimit=0.
- Export được đối chiếu ID/kiểu number/boolean, request rank/quyền false và secretTruth giữ nguyên; đóng/mở không tạo lại ID. Có kiểm 320/375/390/430/1280px, ảnh QA NPC giả ở mobile/desktop. Regression browser main System/auth kiểm riêng; CI chạy luồng Creator dài này trong main acceptance bắt buộc.
- Chưa QA Android/iOS thật hoặc production Firebase AU. Browser PASS không chứng minh backend, art thật hay gameplay đã phát hành.

Còn JSON nâng cao cho cửa hàng, cấu hình sprite/appearance/visual Bible/crop, điều kiện sâu và một số metadata phụ. Chưa asset/source picker thật, upload/CDN, pixel decode/scan, cloud sync, review workflow, backend route/binding/deployment/migration. Không phát WORLD_PLAY/48 seed hoặc đổi NPC chat/Thiên Mệnh/EPUB/save/kho/EXP/pool/AI/Canon.

Tiếp: công cụ art/visual/nguồn và kiểm tra kịch bản sâu hơn, sau đó kế hoạch kết nối backend có quyền thật. Không bật gửi duyệt hoặc production write khi chưa có triển khai đã được chủ dự án duyệt.

Rollback source: revert commit G1H và URL cache version. Giữ nguyên DB local; không tự xóa hay hạ phiên bản nội dung đã lưu. Nháp richer G1H vẫn theo world-content-1.
