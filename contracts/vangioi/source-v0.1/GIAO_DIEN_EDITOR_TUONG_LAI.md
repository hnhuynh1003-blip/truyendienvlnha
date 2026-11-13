# Thiên Mệnh — Đặc tả màn nhập truyện/thế giới cho tác giả

**V0.1 — ĐỀ XUẤT, CHƯA CODE.** Tài liệu thiết kế cho **World Creator trong VẠN GIỚI**, không phải tính năng đã hoạt động trong v71.11. Thiên Mệnh là app hệ thống người chơi, không phải editor thế giới.

## Mục tiêu trải nghiệm

Tác giả không cần hiểu JSON hay tự yêu cầu trợ lý viết lại mỗi lần. Họ có thể nhập cốt truyện có sẵn hoặc điền từng phần, tự tải ảnh, xem trước thế giới, kiểm tra thiếu sót rồi gửi duyệt. Các trường bên dưới ánh xạ vào `world.schema.json`; cùng một workflow chạy cho tác giả nội bộ/ngoài cộng đồng.

## Hai đường nhập liệu — một chuẩn dữ liệu

1. **Từ truyện có sẵn:** dán/upload bản thảo *được phép dùng* -> công cụ đề xuất tách logline, world rules, NPC, scenes, nhiệm vụ, items, endings -> tác giả kiểm tra từng trường, bổ sung chỗ thiếu, chủ động bấm chấp nhận -> tạo JSON draft.
2. **Tạo từ đầu:** chọn thể loại/bậc -> điền Story Bible -> tự tạo NPC, nơi chốn, nhiệm vụ, item/shop, nhánh kết thúc -> gán ảnh -> JSON draft.

Không cho AI diễn giải truyện thành reward grant, tự đặt quyền sở hữu hay tự duyệt ảnh. Chế độ import từ truyện đánh dấu mọi chi tiết còn suy đoán là `needsAuthorConfirmation` trước khi sang bước kiểm duyệt.

## Wizard tác giả (màn hình đề xuất)

| Màn | Nội dung tác giả nhập | Hỗ trợ tự động | Điều kiện để sang bước tiếp |
|---|---|---|---|
| 0. Quyền & hồ sơ | Tên tác giả, nguồn truyện, chủ sở hữu, cộng tác viên, điều khoản | Kiểm tra trường trống/định dạng | Draft có `authorId`; submit cần xác nhận quyền |
| 1. Cốt truyện | Logline, mở đầu, diễn biến, bí mật, luật, kết thúc | Gợi ý thiếu plot beat, timeline và mâu thuẫn | Có Story Bible tối thiểu |
| 2. Phân loại | Thể loại 1/6, bậc F–S, mức nguy hiểm, tag, độ dài | Hiện tiêu chí/quota, ví dụ và ngoại lệ | Không nhầm genre/rank/danger |
| 3. Bản đồ & cảnh | map/place/scene/view/hotspot, điều kiện chuyển, nhiều ảnh mỗi nơi | Hiện bản đồ, góc nhìn, điểm nhặt đồ/đi lại và các đường chưa kết nối | ID/cảnh khởi đầu hợp lệ, cảnh trọng yếu có nhận diện |
| 4. Dàn nhân vật | Nhân vật chính/phụ/phản diện/pháo hôi/giáp/qua đường/được nhắc đến; ai thực sự xuất hiện | Tách `cast` khỏi actor có tương tác, không ép mọi nhân vật thành NPC | Không có quota nhân vật cứng |
| 4a. Tạo hình nhân vật | Ngoại hình đúng mô tả, tuổi/nghề, chân dung, sprite, CG, biểu cảm, trang phục; đặt lần xuất hiện trên timeline `view` | Xem nhân vật thật trong cảnh, kiểm tra các ảnh cùng người, trigger hiện/ẩn, tràn màn hình | Không tự bật mọi nhân vật trong scene; chỉ dùng asset được duyệt |
| 4b. Kiểu nhập vai | Chọn profile `cast_possession`, `system_cover`, `native_extra` (một hoặc nhiều) | Kiểm tra thân phận, ký ức, quan hệ, cảnh bắt đầu, nhân vật được nhập | Mỗi profile phải có đường chơi hợp lệ |
| 4c. NPC tương tác | Chỉ tạo actor cho nhân vật cần tương tác, chọn barks/thoại nhánh/stateful/shop/AI | Kiểm tra dialog link, tri thức vượt quyền, trùng actor người chơi | AI chỉ là đề nghị; thoại fallback khi cần |
| 5. Đồ & cửa hàng | Item ID, nơi nhặt, phương pháp thu nhận, shop, giá/tồn, luật mang ra | Báo nguồn item không tồn tại, reward lặp, giá âm | Tham chiếu vật phẩm/tiền hợp lệ |
| 6. Nhiệm vụ | Main/side/hidden, objectives, trigger, fail, reward *đề xuất* | Kiểm tra required main, target refs, flags, reachability cảnh | Không có error chặn submit |
| 7. Tự tải hình | Cover, cảnh, biến thể, chân dung, icon; quyền ảnh; crop desktop/mobile | Kiểm tra thiếu ảnh, trùng, spoiler, crop an toàn | Submit cần khai nguồn; publish cần duyệt asset |
| 8. Kiểm thử | Chơi thử từ đầu, các nhánh, kết thúc, kho/EXP giả lập | Danh sách lỗi/error/warning/đường không tới được | Reviewer QA sau submit |
| 9. Gửi duyệt | Diff, quyền, lịch sử, phiên bản, cảnh báo | Khóa snapshot gửi duyệt và mã version | Chỉ reviewer/publisher xử lý bước sau |

## Các hành động UI phải có

- **Lưu bản nháp**, **Nhân bản world**, **Nhập JSON**, **Xuất JSON**, **Tải ảnh**, **Thay ảnh**, **Xem trước**, **Kiểm tra**, **Gửi duyệt**.
- Tự lưu revision cùng thông tin người sửa; có nút so sánh bản trước và hoàn tác revision, không ghi đè bản đã phát hành.
- Cho phép tác giả điền dở: nội dung trống/ảnh pending được giữ trong draft, chỉ báo lỗi ở cổng submit/publish tương ứng.
- Dashboard hiển thị `cast 35 nhân vật`, `có hình 8`, `NPC tương tác 4`, `1 map / 8 place / 27 scene / 31 view`, `main 1/2`, `NPC AI 1/2 đề nghị` (ví dụ bậc D). Không biến số ảnh/place/NPC thành quota cứng hay tiêu chuẩn chất lượng duy nhất.
- Có form **Ngoại lệ bậc** để giải thích một-phòng/ít-NPC. Tác giả không thể tự bấm “đã duyệt ngoại lệ”.
- Nhãn trạng thái `draft/submitted/inReview/approved/staged/published/retired` và lý do trả về.

## Upload hình do tác giả chọn

1. Tác giả chọn file ảnh cho `worldCover`, cảnh, góc nhìn, biến thể, chân dung/sprite/CG/avatar nhân vật, item. Một place/scene có thể chứa nhiều ảnh.
2. Upload đưa vào vùng **asset pending**; máy chủ cấp `assetId` và liên kết tới chủ sở hữu, không dùng filename làm ID ổn định.
3. Tác giả gán ảnh vào scene/place/`characterVisuals`/item; chọn điểm trọng tâm và xem crop 320/375/390/430 px + desktop. Chọn `characterId`, ngoại hình cố định, các biểu cảm và trang phục; không ràng buộc bắt buộc `npcId`.
4. Biên tập kiểm tra giấy phép, quyền hình, tính đúng bối cảnh, watermark/spoiler và khả năng truy cập; không hợp lệ thì yêu cầu đổi ảnh.
5. Khi thay ảnh ở phiên bản sau, đổi asset version nhưng không đổi `worldId/placeId/sceneId`; save không được hỏng.
6. Ảnh pending hay bị từ chối có fallback chỉ dành cho editor. World không đủ art đã duyệt không được xuất bản mới.

Đối với đồ vật, editor có lựa chọn **"Chỉ hiển thị bằng chữ"**, **"Điểm chạm trên ảnh"**, **"Thẻ vật phẩm"**, hoặc **"NPC trao"**. Không ép tác giả tải icon riêng cho mọi chiếc chìa khóa, lá thư, viên đá hay vật dụng nhỏ. Tất cả vẫn gắn `itemId/hotspotId` và điều kiện Engine.

**Trong trình cảnh có một tab "Diễn viên & khung hình":** chọn nhân vật từ `cast`, tải ảnh thuộc `variants`, đặt vị trí/scale/độ sâu; chọn chỉ hiện khi vào cảnh, bắt đầu một đoạn thoại, hoặc một cờ sự kiện; chọn lúc ẩn. Mặc định khi chưa khai lần xuất hiện thì **không hiện ảnh người**, dù người đó có hồ sơ NPC. Với cảnh tranh đôi/nhóm, chọn ảnh CG cho `view` và `depictedCharacterIds` để không xếp chồng ảnh trùng. QA kiểm tra khuôn mặt nhất quán, tuổi/đồng phục đúng, không che hotspot/chữ, không lộ danh tính sớm và không tạo bản sao khi nhập vai. Xem `QUY_CACH_HINH_NHAN_VAT_V0_1.md`.

## NPC AI được yêu cầu, không phải bật bằng tác giả

- Trước khi bật AI phải xác định NPC có là một actor thật trong thế giới hay chỉ là một nhân vật được nhắc đến. `cast` có thể rất dài; chỉ một tập con cần `npcs`.
- Các thoại ngắn như người bán hàng chào khách, người qua đường bàn tán có thể dùng `barks`; NPC then chốt dùng `choice_tree` hoặc `stateful_tree`; cửa hàng dùng `service`. Nhân vật được nhắc tên không cần thoại hay actor.
- `scripted`: mọi NPC có thể dùng trước, không tốn mô hình hội thoại.
- `ai_candidate`: tác giả gửi persona, kiến thức, cấm tiết lộ, điều kiện làm bạn, phạm vi chat; chỉ `reviewer/publisher + backend` xét duyệt bật sau.
- Có thể **random sự kiện gặp NPC đủ điều kiện** theo seed/engine để tạo cảm giác hên xui; không random quyền AI hoặc tri thức NPC.
- Liên Lạc DUDU chỉ mở liên hệ khi `friendshipFlag` đã được Engine xác nhận. Nếu AI chưa sẵn sàng, dùng scripted fallback.

## Chọn ba kiểu nhập vai trong Editor

- **Nhập nhân vật trong truyện:** tác giả đánh dấu `cast.playableAsCast`, chọn vai chính/phụ/pháo hôi/phản diện. Editor ghi rõ quan hệ, ký ức ban đầu và actor gốc phải nhường chỗ cho người chơi trong world instance.
- **Người qua đường với danh tính ảo:** tác giả nhập tên vỏ bọc, tài liệu/quan hệ, trạng thái `verified/forged/unknown`; nguồn chính quy hay lậu được xử lý theo luật hệ thống. Không bắt buộc nhân vật này có tên trong dàn diễn viên gốc.
- **Nhân vật giáp có sẵn:** tác giả khai slot cư dân nền và dấu vết xã hội (nghề, nơi ở, người quen); không được AI sinh tùy tiện sau khi nhiệm vụ đã bắt đầu.

**[ĐÃ CẬP NHẬT THEO DU]** Editor cho tác giả chọn `entryPolicy.fixed` (bắt buộc một vai cụ thể theo cốt truyện) hoặc `entryPolicy.player_choice` (cho chọn trong các profile đã viết). Bậc F–S là gợi ý phạm vi kiểm duyệt/độ phức tạp, không tự mở hoặc ép ba kiểu. Trước khi publish, cần kiểm tra mọi profile được hỗ trợ không phá cốt truyện hoặc tạo bản sao NPC.

## Tự động hóa an toàn

- Một workflow có thể gọi AI để *gợi ý bản nháp*: tách chapter, NPC, locations, dialogue, tags, consistency issues và gợi ý hình ảnh. Mọi output chưa xác nhận được gắn provenance và chỉ là draft.
- Điều kiện nhiệm vụ phải được biểu diễn bằng allowlist (`flag`, `counter`, `inventoryHas`, `sceneReached`...), không nhận code tùy ý hoặc “AI tự hiểu là đạt”.
- Một simulation runner trong staging giả lập đường chơi và báo dead end, phần thưởng lặp, thiếu vật phẩm, NPC không có scene hoặc cửa hàng không thể mua.
- Trình duyệt tác giả không giữ bí mật phát thưởng; việc cấp EXP/item, chuyển cảnh và liên lạc NPC thực vẫn do backend được ủy quyền.

## Phần cần quyết định trước khi xây UI thật

- Hạ tầng tác giả: ai có quyền mở editor, có cần đăng ký/duyệt tác giả trước hay không.
- Hệ lưu ảnh, giới hạn dung lượng, loại file và kiểm tra nội dung.
- Mô hình chia sẻ bản quyền, công khai tên tác giả, sửa/gỡ tác phẩm, tranh chấp.
- Chi phí và quota AI NPC, thời gian tồn tại các liên hệ sau khi world kết thúc.
- Ngân sách EXP/tiền/drop theo rank từ game backend; không có trong tài liệu hiện có.
- Migration giữa JSON V0.1 và data contract thật của v71.11 sau khi audit code.

