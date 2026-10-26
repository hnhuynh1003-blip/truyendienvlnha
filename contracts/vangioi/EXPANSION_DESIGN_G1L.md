# VẠN GIỚI — Vật phẩm, gameplay tùy chọn và truyện dài theo arc

Ngày 26/10/2026. Căn cứ: yêu cầu bổ sung của chủ dự án sau G1K, master prompt, V0.1 và phụ lục Background & Scene Identity. Đây là **thiết kế mở rộng**, chưa phải schema/runtime hoặc chính sách kinh tế đã kích hoạt.

## 1. Đối chiếu quyết định và tương thích

| Điểm cũ / hiện trạng | Chỉ dẫn mới / xử lý |
|---|---|
| V0.1 gợi ý tối thiểu một tương tác thu nhận cho tân thủ, có ngoại lệ | Gameplay chọn theo truyện; không bắt truyện chỉ đối thoại phải thêm item/shop/sinh tồn. Chưa sửa schema cũ; rà lại điều kiện tương tác ở bản contract kế tiếp. |
| `items`, acquisition, shop stock và rewardRequest trong world-content-1 | Đây là khai báo của tác giả, không phải item được công nhận hoặc quyền cấp thật. Giữ nguyên ID và validator semantic-2. |
| Pilot V8 dùng mảng evidence và log, chưa có inventory vật thể | medicine_bundle đang đại diện bằng chứng về túi đã thu nhận; sửa lặp dựa trạng thái đó, không giả tạo Kho Thiên Mệnh. |
| storySource đã pin storyId/storyVersion/hash qua registry | Tái sử dụng, không bắt tác giả tải lại truyện đã đăng. Adapter Thư viện có quyền thật và công cụ lấy đoạn theo chương chưa triển khai. |
| cast / npcs / characterVisuals / characterAppearances đã tách | Tiếp tục giữ; chỉ tạo NPC/ảnh tương tác cho phần cần chơi, không biến mọi nhân vật văn học thành NPC. |
| F–S và thể loại | Không dùng rank làm preset gameplay, số chương, NPC, ảnh hoặc sức mạnh item. Ngoại lệ thời đại/sức mạnh phải có lý do và phạm vi được xét. |

Không thêm field chưa được hỗ trợ vào JSON world-content-1. Unknown field hiện bị validator từ chối; không nới additionalProperties hoặc tự migrate save để nhét tính năng tương lai. Thứ tự sau G1K: review/policy → tài liệu này → sửa QA Quan Đạo → từng đợt được xác định riêng.

## 2. Quy chuẩn vật phẩm đề xuất

Tác giả chọn định nghĩa chuẩn đã có version hoặc đề xuất định nghĩa riêng có lý do. Catalog chuẩn, màn chọn và quy trình duyệt item riêng **chưa có**; không đưa catalog giả vào UI hoặc tự cấp vật phẩm thật từ nhãn chuẩn.

| Lớp dữ liệu | Danh tính đề xuất | Trạng thái / authority |
|---|---|---|
| Định nghĩa vật phẩm | itemDefinitionId + definitionVersion | Tên/loại/tính chất, xuất xứ, policy version; draft/proposed/reviewed theo server |
| Cơ hội nhận | acquisitionGroupId + các tuyến action/hotspot/NPC | Nhiều tuyến chung một cơ hội; không dùng choiceId riêng làm danh tính vật thể |
| Vật thể trong lượt chơi | worldInstanceId + continuityId + entityId | Chưa phát hiện → phát hiện → thu nhận → sử dụng/chuyển giao; vị trí/chủ giữ/số lượng do Engine |
| Ghi nhận sổ tay | clueId + nguồn sự kiện | Quan sát/lời khai/bản sao chứng cứ; không tự là vật thể sở hữu hoặc vật phẩm chuyển Kho |
| Hành trang trong world | instance + entityId/stackId | Thu nhận một lần theo chính sách; tiêu hao không khiến cơ hội cũ xuất hiện lại |
| Kho Thiên Mệnh | exportReceiptId + đích UID | Backend xác minh policy xuyên giới, quyền và hoàn tất chuyển; chưa triển khai |

Mã vật phẩm trong content hiện có không được tự coi là entityId toàn hệ thống. Một loại thuốc có thể có nhiều gói hợp lệ; duy nhất theo **vật thể/cơ hội/instance**, không cấm mọi itemDefinition cùng loại. Quest reset hay lượt chơi mới chỉ tái tạo theo policy đã duyệt, không dựa việc người dùng bấm lại.

### Quy tắc thu nhận và giao dịch

1. Engine kiểm điều kiện tuyến, vị trí, thời gian, quyền giữ, trạng thái entity/cơ hội và số lượng.
2. Với nhiều tuyến tới cùng túi: action nào tới trước cũng claim cùng entity/cơ hội. Khi đã nhận, ẩn thao tác nhặt mới và thay bằng kiểm tra vật chứng đã giữ; không xóa đường suy luận hoặc nội dung sổ tay đã biết.
3. Backend tương lai phải transaction: kiểm revision → chuyển entity → ledger sự kiện → cập nhật inventory → receipt. RequestId xử lý retry cùng request; unique acquisitionGroup/entity claim xử lý hai request khác nhau qua hai tuyến. Chỉ requestId không đủ chống nhận trùng.
4. Sổ tay lưu nguồn bằng chứng kể cả vật thể đã giao/nộp/tiêu hao theo luật truyện. Kiểm tra lại không sinh acquisition, tăng stock hoặc thưởng.
5. Mua/bán/đổi cần policy giá/tiền/khối lượng/số lượng/trade permissions, tồn kho server và transaction đôi bên; không dùng nháp stock làm ngân sách thật. Chưa bật shop giao dịch thật.
6. Chuyển xuyên giới mặc định chưa được phép khi chưa có policy được duyệt. Nếu đủ quyền tương lai: reserve vật thể → xác minh đích UID/policy → commit xuất/nhập cùng receipt; retry, timeout, thu hồi, một vật thể bị hai tiến trình giữ phải có kết quả nhất quán. Không xóa vật phẩm nguồn trước khi bảo đảm giao nhận.

### Hồ sơ kiểm duyệt item

| Trục | Tác giả đề nghị | Cách xét / giới hạn |
|---|---|---|
| Thời đại và nguồn gốc | Xuất xứ, đường vật phẩm tới world, nguồn truyện/chương | Sai niên đại là cảnh báo cần giải thích; cổ đại có máy tương lai có thể hợp truyện |
| Sức mạnh | Tác dụng, điều kiện kích hoạt, tiêu hao, phản tác dụng | Không suy ra sức mạnh từ world rank; bảo vật mạnh có thể chỉ quan sát/niêm phong/không dùng |
| Số lượng | Có bao nhiêu vật thể/stack, nguồn bổ sung, có hồi phục không | Số nguyên/bounds theo chính sách; không để tác giả tự vô hạn hóa stock hoặc phần thưởng |
| Giao dịch | Ai được giữ, dùng, bán/đổi, điều kiện và giá đề nghị | Quyền có thể khác nhau: được giữ chưa chắc được dùng/chuyển/bán |
| Xuyên giới | Bound to world/arc/instance, có thể xuất hay không | Bản duyệt server xác định; request của tác giả không tự cấp quyền |
| Chứng cứ / riêng tư | Dữ kiện nào được biết và lúc nào | Không rò lời giải bằng tên/alt/thumbnail; sổ tay chỉ phần đã biết |

Ngoại lệ cần rationale + source pin + phạm vi tác dụng + reviewer quyết định + policy version, lưu cùng release. Không áp luật tự động “đồ tương lai sai ở cổ đại” hoặc “đồ mạnh sai ở F”. Chưa chốt giá, damage, tỷ lệ drop, giới hạn stack hoặc hệ số đổi Xu/EXP; không bịa số để mở kinh tế.

## 3. Gameplay theo mô-đun — thiết kế chưa triển khai

| Mô-đun tùy chọn | Dữ liệu hiện có tái sử dụng | Mở rộng tối thiểu cần xét sau |
|---|---|---|
| Tương tác cốt truyện | NPC/dialogue, lựa chọn, flags, events, endings | Quan hệ/hậu quả được Engine xác nhận |
| Điều tra–khám phá | Scene/view/hotspot, objectives, items | Entity acquisition, clue provenance, câu đố versioned |
| Sinh tồn | Flags/events và mục tiêu hiện có | Đồng hồ logic, resource meters, environment/risk và actions có chi phí/đánh đổi |
| Phát triển nhân vật | RewardRequest và items đề nghị | Kỹ năng/tu luyện/chế tạo/trao đổi theo policy, không tự cấp chỉ số thật |
| Xung đột | Dialogue/choice/events/endings | Encounter có lựa chọn chiến đấu/chạy/đàm phán/chiến thuật, kết quả xác định và kiểm thử |

Một arc chỉ đối thoại/lựa chọn có thể chọn duy nhất mô-đun cốt truyện. Sinh tồn có thể là giữ ấm qua đêm, chia nước, chọn đường an toàn, dành thời gian cứu người thay vì tìm lương thực; không nhất thiết có chiến đấu/crafting. Chỉ thêm cơ chế khi tạo quyết định có ý nghĩa cho truyện.

Phương án tương thích: manifest capability versioned bên cạnh release tương lai, ví dụ `narrative@1`, `exploration@1`; đây là ký hiệu thiết kế, không phải JSON field hiện được phép. Engine load kiểm tập capability hỗ trợ; gặp mô-đun bắt buộc chưa hỗ trợ phải chặn play với lý do, không âm thầm bỏ luật/chi phí. Old content thiếu manifest dùng engine/contract hiện hữu, không suy ra cơ chế mới theo rank. Dữ liệu thêm đi qua schema version mới hoặc sidecar riêng được duyệt, pin/hash vào release; không mutate snapshot cũ.

UI tương lai có nhóm “Cơ chế của arc”, chỉ mở bảng tùy chọn khi tác giả chọn mô-đun; trường nâng cao thu gọn và có mặc định an toàn. Không bật checkbox nếu chưa có Engine thực thi. Duyệt nội dung không thay staging/playtest trên các tổ hợp mô-đun được hỗ trợ.

## 4. Chuyển thể truyện dài theo arc — thiết kế chưa triển khai

Liên kết nguồn bằng `storyId + storyVersion + contentHash` hiện có. Arc đề xuất thêm sidecar: arcId/scenarioId, khoảng chapterId ổn định, source version/hash, đầu/cuối chặng, cast cần dùng, scene/nhiệm vụ cần chơi, prerequisite và continuity/timeline. Số chương hiển thị chỉ là label, không làm khóa định danh. Một arc có thể tham chiếu nhiều đoạn nhưng chỉ cần nội dung đã nằm trong scope quyền và bản pin.

Hai chế độ trong Vạn Giới:

- **Thủ công:** chọn/tạo nguồn, chọn phạm vi arc, viết mở đầu–mục tiêu–kết cục, thêm cảnh/NPC/ảnh theo nhu cầu. Khai nội dung tối thiểu trước, trường nâng cao mở sau; không nhập toàn bộ hàng trăm cast hoặc ngàn scene.
- **Hỗ trợ từ truyện có sẵn:** chọn nguồn đã đăng có quyền, pin phiên bản và khoảng chương, công cụ đề xuất Story Bible/cast/scene cho arc. Mỗi đề xuất có vị trí nguồn, độ chắc chắn/điểm cần kiểm tra; AU xác nhận trước nhập nháp. Chưa có AI parser, nút thật hoặc lời hứa trích xuất chính xác tự động.

Tác phẩm gốc vẫn đọc bình thường. Cast văn học có thể tham chiếu ổn định xuyên arc, NPC tương tác chỉ tạo khi cần; characterVisuals và characterAppearances chỉ quản lý hình và điều kiện hiện, không làm nhân bản nhân vật đang bị nhập vai.

Source bản mới không tự thay source của arc/release cũ: tạo đề xuất diff → AU kiểm phạm vi bị ảnh hưởng → nháp revision mới → duyệt lại. Mở arc mới không ghi đè worldInstance/lượt chơi đã xong. Series/timeline/continuity chỉ là link được kiểm soát, chưa làm bộ máy nhân quả vô hạn. Không gửi nguyên truyện dài vào mỗi lần gọi AI; tương lai dùng jobs theo đoạn, ngân sách, checkpoint, provenance và fallback thủ công, cần duyệt AI/chi phí riêng.

## 5. Các đợt tiếp theo sau sửa Quan Đạo

| Đợt đề xuất | Hoàn thành dự kiến | Chưa bao gồm |
|---|---|---|
| Catalog/policy vật phẩm | Contract versioned, đề xuất riêng, scope world/instance, validator và QA ngoại lệ | Kho/kinh tế/phần thưởng thật |
| Arc & thao tác tác giả gọn | Source picker có quyền + range/arc, fields cơ bản/nâng cao, diff source pin | AI tự chuyển thể, tự duyệt/phát hành |
| Engine acquisition | State/event/receipt chống lặp qua nhiều tuyến và save/restore cục bộ trước | Migration save hoặc phát item thật chưa duyệt |
| Gameplay nhỏ theo truyện | Chọn một mô-đun cần thiết cho một pilot, có fail/fallback/QA | Toàn bộ survival/combat/crafting cùng lúc |
| Host/staging backend | Storage topology, issuer quyền, limits, migration/rollback và smoke thực | Production cần duyệt riêng |

Tiêu chí chung: không đổi auth/Thiên Mệnh/Kho/EXP/AI/Canon hoặc mở 48 seed; quyền tác giả ở Vạn Giới, tiến trình người chơi ở Thiên Mệnh, Chủ Thần riêng chủ dự án và AI điều phối. Đọc hồ sơ PASS/approve không phải WORLD_PLAY.
