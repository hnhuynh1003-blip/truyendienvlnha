# DUDU STUDIO — VẠN GIỚI
## Quy chuẩn sáng tác, kiểm duyệt và phát hành tiểu thế giới V0.1

**Ngày:** 25/10/2026  
**Trạng thái:** BẢN THIẾT KẾ CHỜ DUYỆT; đã điều chỉnh phân loại nhân vật, 3 kiểu nhập vai, ranh giới ứng dụng và mô hình bản đồ/cảnh theo phản hồi của Du ngày 25/10/2026; không phải lệnh triển khai hoặc dữ liệu production.  
**Phạm vi:** mọi tiểu thế giới độc lập và cốt truyện dài chia arc thuộc các bậc F, E, D, C, B, A, S; tác giả nội bộ và bên ngoài; NPC kịch bản và NPC AI được cấp phép.

### Quy ước quyết định

- **[GIỮ]**: kế thừa yêu cầu đã có của Du hoặc phụ lục DUDU CORE V1.2-A.
- **[ĐỀ XUẤT]**: giải pháp mới được đưa ra để thảo luận, chưa tự động thành Canon.
- **[CHƯA CHỐT]**: tham số cần Du phê duyệt hoặc phải kiểm tra code/runtime v71.11.

### Nguồn đối chiếu

- `DUDU_CORE_V1_2_PHU_LUC_BACKGROUND_SCENE_IDENTITY_CHO_DUYET.md`, 19/10/2026: tách `genre -> world -> place -> scene`, nhận diện hình ảnh, thí điểm 3F+2E, quyền Engine/AI và QA.
- Các quyết định trước của dự án: sáu nhóm thể loại; cấp F/E/D/C/B/A/S; ba F đánh giá và hộ chiếu; Liên Lạc DUDU, Hệ Thống Xuyên Truyện, Chủ Thần có chức năng riêng; nhiệm vụ riêng theo tiểu thế giới; Engine quyết định trạng thái và phần thưởng.
- Yêu cầu 25/10/2026: tác giả viết truyện trước, có thể tự chọn ảnh, NPC đa phần là kịch bản, đôi khi NPC AI để kết bạn, có khám phá/nhặt/mua đồ, mở quy trình cho nhiều tác giả.

**Điểm chưa thể xác nhận:** không có repo/runtime v71.11 hoặc prompt lõi đầy đủ trong tài liệu đính kèm. Không giả định các trường dữ liệu bên dưới đã tồn tại trong Firebase/backend.

---

## I. Triết lý nội dung và phạm vi thế giới

1. **[GIỮ]** Sáu nhóm **Cổ đại, Hiện đại, Niên đại, Tương lai, Tu tiên, Mạt thế** là nhóm thể loại, **không phải sáu phó bản**. Mỗi nhóm có thể chứa không giới hạn tiểu thế giới được phê duyệt. Một nhóm không bắt buộc phải có F hay E để đủ chỉ tiêu.
2. **[GIỮ]** Bậc F/E/D/C/B/A/S biểu thị yêu cầu trải nghiệm, độ khó, rủi ro và quyền truy cập; không đồng nhất với thể loại, độ dài hay mức kinh dị. Chọn `genreId`, `worldRank`, `dangerLevel`, `contentTags` riêng.
3. **[GIỮ]** Cốt truyện hoàn chỉnh phải có trước khi chuyển thành gameplay. Một phó bản không chỉ gồm màn mở đầu và một lựa chọn A/B. Người chơi được tương tác với địa điểm, NPC, sự kiện và vật phẩm mà câu chuyện cho phép.
4. **[GIỮ]** Nhiệm vụ phụ và ẩn phụ thuộc câu chuyện; tác giả được tạo 0 hoặc nhiều nhiệm vụ, không cần điền cho đủ số lượng.
5. **[GIỮ]** Không ép NPC AI và **không đồng nhất mọi nhân vật trong truyện với NPC game**. Nhân vật chính, phụ, phản diện, pháo hôi, người qua đường, người chỉ xuất hiện qua lời kể có thể tồn tại trong Story Bible mà không cần một actor tương tác. Chỉ NPC đã được duyệt mới có tính năng kết bạn/liên lạc AI; sự xuất hiện có thể có xác suất do Engine kiểm soát.
6. **[GIỮ]** Không tự sinh nhiệm vụ, kết quả, EXP, vật phẩm hay chuyển cảnh theo lời AI. Chỉ Engine/backend áp dụng thay đổi từ dữ liệu đã duyệt.
7. **[ĐỀ XUẤT]** Có thể xuất bản thế giới theo từng `storyArc`/`episode`, mỗi lần phát hành có đầy đủ điểm bắt đầu, lưu trạng thái và điều kiện kết thúc. Truyện dài không bắt phải vẽ hoàn thiện toàn thế giới trước.
8. **[ĐỀ XUẤT]** Các thế giới quỷ dị, quy tắc sinh tồn và trò chơi giáng lâm là *motif/tag* thuộc những thể loại hiện có; không tự động tạo thể loại thứ bảy hay biến trò chơi dung hợp Trái Đất thành Canon chung.
9. **[GIỮ THEO DU]** **VẠN GIỚI** là nơi chứa thư viện thế giới/truyện, bản đồ, nội dung và công cụ dành cho tác giả. **Thiên Mệnh** là ứng dụng hệ thống của người chơi (chỉ số, nhiệm vụ được giao, Nhật ký, Kho và tiến trình). Hai giao diện sử dụng chung luật Engine và tham chiếu world/mission nhưng không nhập vai trò UI vào nhau.

## II. Bảng chuẩn nội dung theo bậc — cần duyệt

Các số dưới đây là **gợi ý quy mô/độ phức tạp** cho một bản phát hành/arc playable, không phải luật ràng buộc độ dài truyện. **Bỏ chỉ tiêu cứng về tổng nhân vật, số NPC, số địa điểm và số ảnh**: tác giả quyết định theo kịch bản. Biên tập viên kiểm tra tính nhất quán, khả năng khám phá và hình ảnh tại những nơi có sự kiện quan trọng.

| Bậc | Nhiệm vụ chính dự kiến trong arc | Địa điểm/cảnh/ảnh | NPC AI bắt buộc / ngân sách đề xuất | Nhập vai theo bậc (chỉ gợi ý) | Thời lượng tham khảo |
|---|---:|---|---|---|---|
| **F** | 1 | Theo truyện, không giới hạn | 0 / tối đa 1 | Thường 1 profile rõ ràng | 10–30 phút |
| **E** | 1 | Theo truyện, không giới hạn | 0 / tối đa 1 | Thường 1 profile; có thể mở thêm | 20–60 phút |
| **D** | 2 | Theo truyện, không giới hạn | 0 / tối đa 2 | Có thể 1–2 profile | 40–90 phút |
| **C** | 2 | Theo truyện, không giới hạn | 0 / tối đa 3 | Có thể 1–2 profile | 1–3 giờ |
| **B** | 3 | Theo truyện, không giới hạn | 0 / tối đa 4 | Có thể 1–3 profile | 2–6 giờ |
| **A** | 4 | Theo truyện, không giới hạn | 0 / tối đa 6 | Có thể 1–3 profile | Nhiều phiên |
| **S** | 5 | Theo truyện, không giới hạn | 0 / tối đa 8 | Có thể 1–3 profile | Nhiều arc/phiên |

**Quy tắc bổ sung:**

**Địa điểm/nhân vật có trong hồ sơ không đồng nghĩa người chơi phải đi/gặp.** `playRequirements` chỉ khai danh sách nơi và NPC *thực sự bắt buộc* để hoàn thành tuyến chính; các danh sách có thể rỗng khi kịch bản hợp lý (ví dụ chỉ cần ở một phòng và giải câu đố tại chỗ). Không ép người chơi phải ghé đủ X nơi theo bậc. Mọi ID được khai phải có thật, còn các nhánh thay thế do playtest/logic engine kiểm tra.

- **Nhiệm vụ chính** là các cột mốc buộc hoàn thành để đạt một kết cục hợp lệ, không đồng nghĩa số lần bấm vào bảng nhiệm vụ. Có thể có nhiều mục tiêu trong một nhiệm vụ.
- **Phụ/ẩn:** `0..N` ở mọi bậc; có thể mở nhờ khám phá, quan hệ, đồ vật, điều kiện thời gian hoặc lựa chọn. Không được tự tạo reward không được duyệt.
- **Cảnh nền:** mọi world playable có `worldCover` và ít nhất một `sceneBackground` gắn `placeId/sceneId`; mỗi **cảnh/điểm nhìn trọng yếu** có hình nhận diện phù hợp hoặc dùng lại art có chủ đích. Một địa điểm có thể có nhiều scene, nhiều góc nhìn, nhiều ảnh và biến thể. Không áp quota ảnh F/E/D/...; không dùng một nền đứng im cho hành lang, kho, sân trước nếu điều đó gây sai bối cảnh câu chuyện.
- **Vật phẩm:** ít nhất một tương tác thu nhận (`pickup`, mua/đổi hoặc quà sự kiện) trong truyện dành cho người chơi mới. Phó bản phòng kín, điều tra thuần suy luận hoặc các tình huống đặc biệt có thể xin ngoại lệ có giải trình.
- **Cửa hàng:** không bắt thế giới nào cũng có người bán (đảo hoang, phòng kín, thế giới quỷ dị). Nếu có giao dịch phải có bảng giá, tồn, điều kiện, cách thanh toán, xử lý hết hàng.
- **NPC AI:** số bên trái dấu `/` là bắt buộc (**0 ở mọi bậc**), bên phải là ngân sách gợi ý, không phải quyền bật tự động. Tác giả có thể đề nghị vượt ngân sách và cần xét duyệt vận hành.
- **Ngoại lệ:** phó bản một phòng không cần ngoại lệ *chỉ vì có ít địa điểm*. Chỉ cần giải trình nếu có điều kiện riêng khác của gameplay chưa đạt; checker không đánh rớt do số ảnh/địa điểm ít hoặc nhiều.
- **Bậc không chỉ đo số lượng:** đánh giá độc lập các yếu tố `narrativeComplexity`, `ruleComplexity`, `decisionImpact`, `failureRisk`, `worldPersistence`. Thêm NPC rỗng không nâng được bậc.
- **[CHƯA CHỐT]** Cân bằng EXP, tiền, tỷ lệ drop, mức phạt, giới hạn bậc theo level; không gán số thật trước khi đọc economy/runtime.

### Cổng tân thủ

- **[GIỮ]** Ba nhiệm vụ F đánh giá có trước quyền hộ chiếu/khế ước/du hành tự do theo tiến trình đã thống nhất.
- **[ĐỀ XUẤT]** Xem ba nhiệm vụ đó như `trialInstance`, mở qua luồng đánh giá, không vô tình mở quyền chọn phó bản tự do khi chưa có hộ chiếu.
- **[ĐỀ XUẤT]** Ở ba F đầu, thất bại cần thông tin phản hồi và cách thử lại hợp lý; không đặt mất vĩnh viễn tài khoản, đồ vật hay nhân vật nếu Canon chưa cho phép.

## III. Hồ sơ sáng tác bắt buộc của một world

### A. Định danh, quyền và phân loại

`worldId` bất biến; `contentVersion`; `schemaVersion`; `title`; `authorId`; `ownerId`; quyền đóng góp; `genreId`; `worldRank`; `dangerLevel` riêng; `contentTags`; ngôn ngữ; độ tuổi/cảnh báo; trạng thái `draft/review/approved/staged/published/retired`; nguồn và quyền sử dụng nội dung/ảnh.

Tác giả được đổi tên hiển thị khi sửa bản nháp nhưng không tự tái sử dụng `worldId` của nội dung khác. Bản đã xuất bản phải giữ snapshot/version để save cũ không trỏ sang truyện đã thay đổi.

### B. Story Bible — phải hoàn thành trước dữ liệu game

1. **Logline:** một câu cho biết người chơi bước vào chuyện gì.
2. **Bối cảnh:** niên đại, địa lý, luật vật lý/siêu nhiên, giai tầng, văn hóa, ngôn ngữ, đời sống, điều cấm.
3. **Vai trò người chơi:** người từ ngoài đến hay nhập vào thân phận có sẵn; biết gì/chưa biết gì; có thể/cấm làm gì.
4. **Cốt truyện:** mở đầu, sự kiện kích hoạt, các mốc phát triển, bước ngoặt, cao trào, kết cục.
5. **Sự thật của thế giới:** bí mật dành cho tác giả/Engine, phân biệt với lời đồn hoặc lời NPC có thể sai.
6. **Luật chơi theo truyện:** quy tắc quỷ dị, giới hạn thời gian, tài nguyên, quan hệ, chiến đấu/suy luận nếu có; mỗi luật quan trọng phải có dấu hiệu nhận biết công bằng.
7. **Phân nhánh và kết thúc:** các kết thúc thành công/thất bại/trung gian; điều kiện đạt; biến đổi sau lựa chọn.
8. **Khả năng chơi lại:** phân nhánh nội dung, phần thưởng được nhận một lần hay lặp, xử lý các vật phẩm đã dùng.

### C. World Visual Bible

`worldCover` (nhận diện world), `placeRegistry`, `sceneRegistry`, `assetRegistry`, `visualIdentity` (bảng màu, landmark, ánh sáng, kiến trúc, cảm xúc), safe zone/crop mobile và quyền sử dụng hình. Không trộn bìa thể loại với background gameplay; không vẽ sẵn stat, lời thoại, EXP hay item thay đổi lên ảnh.

### D. Địa điểm và cảnh

**[ĐỀ XUẤT MỞ RỘNG]** Giữ nguyên `placeId`/`sceneId` của lõi V1.2-A nhưng thêm cấp bản đồ, góc nhìn và điểm tương tác:

| Lớp | ID | Ý nghĩa | Ví dụ tại nhà trọ Quan Đạo |
|---|---|---|---|
| Bản đồ/khu bản đồ | `mapId` | Tập hợp không gian, sơ đồ định hướng; có thể chỉ có 1 map cho cả truyện | Bản đồ nhà trọ và khu quanh quán |
| Địa điểm/tiểu khu có thể đến | `placeId` | Nơi người chơi thật sự vào/ra; có thể lồng `parentPlaceId` | Nhà trọ, cửa trước, hành lang, nhà kho, phòng khách |
| Cảnh/sự kiện tại một nơi | `sceneId` | Gắn trạng thái truyện, thời điểm, thời tiết, NPC, sự kiện và background mặc định | Hành lang trước/sau khi mở kho |
| Góc nhìn/khung hình | `viewId` | Một ảnh toàn cảnh, cận cảnh, nội thất hoặc góc camera ở scene; có thể nhiều ảnh một scene | Nhìn hành lang từ cửa; nhìn ổ khóa; bên trong kho |
| Điểm tương tác | `hotspotId` | Vùng/nút/chữ cho phép nhặt, xem, nói, mua, mở cửa hoặc di chuyển | Ngọn đèn, ổ khóa, túi đồ sau quầy |

Không bắt buộc tác giả chia nhỏ một cảnh đơn giản thành nhiều place nếu chỉ đổi góc nhìn. Nhưng khi nhân vật thật sự di chuyển giữa nơi có logic ra/vào riêng, cần `placeId` riêng hoặc quan hệ parent/child rõ ràng. Một **map duy nhất** hoàn toàn có thể chứa nhiều place, nhiều scene và hàng chục ảnh. Ngược lại, một place có thể có các view và scene variants không giới hạn về mặt sáng tác.

**Ví dụ đối chiếu:** Theo mốc Quan Đạo V8 đã ghi nhận trước đây, pilot có **27 scene, 3 địa điểm** với các background `gate`, `hall`, `store`. Đây là bằng chứng thiết kế rằng số bản đồ, địa điểm và scene không phải một-một. Chưa có mã nguồn V8/v71.11 hiện tại để xác nhận triển khai thật ở turn này.

- `transition` dùng scene/place/view đã có, điều kiện và hành động được Engine xác nhận. Chuyển **góc nhìn** trong cùng nơi khác chuyển **địa điểm**; không gây nhầm save hoặc tự trừ lượt di chuyển.
- Mọi view có thể gắn background asset riêng hoặc tái dùng ảnh, điểm trọng tâm/crop mobile, overlay NPC/vật phẩm; có fallback và mô tả văn bản.
- Mọi cảnh có thể khôi phục khi reload và không làm mất trạng thái vật phẩm/NPC/nhiệm vụ.
- **QA hình ảnh theo nội dung:** xem danh sách `plotBeats` và sự kiện, kiểm tra rằng nơi trọng yếu (trong xe, trên tàu, trường, nhà, công viên, kho, hành lang...) có khung hình phù hợp. Không phải có 10 ảnh vì rank E, mà vì truyện thực sự cần 10 nơi/góc nhìn khác nhau.

### E. NPC

- **Hai tầng bắt buộc phải phân biệt:** `cast` (dàn nhân vật văn học) và `npcs` (actor có tương tác trong game). Không tạo NPC chỉ để ghi nhận một cái tên được nhắc qua lời kể.
- `cast.characterId`, tên và `narrativeRole`: `protagonist` (chính), `supporting` (phụ), `antagonist` (phản diện), `cannon_fodder` (pháo hôi), `minor` (nhân vật nhỏ), `passerby` (qua đường), `cameo` (thoáng qua), `mentioned` (chỉ được nhắc), `group` (nhóm). Vai trò văn học không quyết định quyền tương tác.
- `cast.presence`: `onstage` (có xuất hiện), `offstage` (ảnh hưởng gián tiếp), `mention_only` (qua lời kể). Nhân vật chính không nhất thiết là NPC AI; người qua đường vẫn có thể đóng vai trò mấu chốt của nhiệm vụ.
- Chỉ những nhân vật có tương tác thật sự mới cần `npcId`, tham chiếu `characterId` nếu thuộc cast; cũng có thể là NPC quần chúng tạm thời không thuộc dàn nhân vật có tên.
- `interactionLevels`: `ambient` (câu ngắn/hoạt ảnh), `scripted` (hội thoại cây), `stateful` (đổi thoại theo event/quan hệ), `service` (mua bán/hướng dẫn), `ai_candidate` (đề nghị chat AI). Một actor có thể có nhiều khả năng; không tương tác thì để ở `cast`, không tạo `npcs`. `mode` chỉ chỉ ra kịch bản hay ứng viên AI.
- `dialoguePolicy`: `no_dialogue`, `barks`, `choice_tree`, `stateful_tree`, `service`, `ai_limited`; chỉ yêu cầu cây thoại khi loại tương tác thật sự cần. Không đòi một nhân vật xuất hiện thoáng qua phải có hội thoại dài.
- `npcId`, tính cách, mục tiêu, quá khứ và quan hệ đối với actor có tương tác; **ngoại hình/portrait nằm trong hồ sơ `characterVisuals` theo `characterId`** nếu nhân vật thuộc cast, không bị ràng buộc vào việc có AI hay không.
- `mode`: `scripted` hoặc `ai_candidate`. Tác giả **không có quyền tự đặt NPC production thành `ai_active`**.
- Với NPC kịch bản: các `dialogueNode`, lựa chọn, điều kiện, phản ứng/trạng thái, địa điểm xuất hiện, tác dụng lên nhiệm vụ.
- Với NPC đề xuất AI: persona, facts được biết, facts bị cấm, giọng nói, giới hạn quan hệ, `contactEligibility`, xử lý lỗi/AI offline và ngân sách. Chỉ backend cấp `aiEnabled` sau khi duyệt.
- `friendable` không đồng nghĩa `ai_candidate`: NPC kịch bản cũng có thể thành bạn nhưng chỉ hiện chat mẫu khi chưa có AI.
- NPC biết một phần thế giới theo sự kiện, không nhìn thấy bảng đáp án, tên thủ phạm hoặc inventory bí mật nếu kịch bản không cho.

### E1. Hình nhân vật xuất hiện trong truyện — [BỔ SUNG CHỜ DU DUYỆT]

- **Không trộn hình với NPC:** `cast` chứa nhân vật văn học, `characterVisuals` chứa hình và đặc điểm tạo hình, `characterAppearances` khai *lần xuất hiện trong cảnh*, `npcs` mới là actor tương tác. Nhân vật chỉ xuất hiện một lần vẫn có thể có ảnh đẹp; nhân vật được nhắc tên không cần tạo sprite/NPC.
- Mỗi hồ sơ ảnh có `fixedTraits` giữ tuổi, dáng, nét mặt, nghề nghiệp, trang phục đúng bối cảnh; `variants` gắn `assetId` theo biểu cảm, pose, thời kỳ, trang phục. Ông/bà già không trẻ hóa vô cớ, người lao động có tạo hình phù hợp, nhân vật chủ chốt được duyệt tính nhất quán giữa các ảnh.
- Hiển thị đa dạng: **portrait** cạnh hộp thoại, **sprite** trong cảnh, **illustration/CG** của sự kiện, **silhouette** khi cố ý giấu thân phận; avatar trong Liên Lạc không tự cấp quyền AI. Một tranh đôi/nhóm có thể là view minh họa với `depictedCharacterIds`, không bắt xếp chồng nhiều ảnh nhân vật.
- `appearanceId` tham chiếu `characterId + viewId + variantId`, có `showOn` (`scene_enter`, `dialogue_start`, `event_flag`), `hideOn`, điều kiện flag và vị trí lớp. **Không có appearance hợp lệ thì không tự bật hình**, kể cả NPC đang có mặt trong kịch bản. Chỉ hiện ở đoạn có giá trị thị giác/cảm xúc hoặc quyết định; tránh nhân vật đứng ì che nền và vật phẩm.
- Không quota số nhân vật có ảnh/pose theo F–S. Quan trọng là đúng story, không lỗi tương tác/crop, đúng quyền sở hữu và đủ art cho *các khoảnh khắc đã cam kết minh họa*. Khi người chơi nhập vào cast, sprite người ấy được ẩn để không có hai bản sao; ngoại lệ góc máy/hồi tưởng cần ngữ cảnh rõ.
- Chi tiết biểu mẫu, quy tắc bố cục và QA tại `QUY_CACH_HINH_NHAN_VAT_V0_1.md`. Đây là **hợp đồng authoring đang đề xuất**, chưa là render API của v71.11.

### E2. Ba kiểu nhập vai của người chơi — [GIỮ THEO YÊU CẦU MỚI]

Ba kiểu sau là **loại định danh người chơi khi vào thế giới**, khác với nhãn nhân vật chính/phụ/qua đường của tác giả:

| Mã dự kiến | Cách nhập vai | Dữ liệu tác giả cần khai | Nguy cơ cần kiểm tra |
|---|---|---|---|
| `cast_possession` | Nhập vào **một nhân vật đã có trong dàn diễn viên**: chính, phụ, phản diện, pháo hôi... | `castTargetId`, thân phận, quan hệ gốc, ký ức được biết, điểm xuất hiện, tác động lựa chọn | Không để bản sao NPC gốc đứng đối thoại với người chơi; NPC khác phản ứng đúng thân phận |
| `system_cover` | **Người qua đường mang thân phận ảo** do hệ thống cung cấp | hồ sơ giấy tờ/quan hệ che phủ, mức xác thực `verified/forged/unknown`, luật ai tin thân phận, nguồn chính quy/phi chính quy | Không mặc định hệ thống lậu luôn xấu; thân phận chính quy được xác thực theo luật và điều kiện của world |
| `native_extra` | **Nhân vật giáp đã tồn tại trong thế giới** nhưng không nằm trong danh sách nhân vật quan trọng mà độc giả biết | `nativeSlotId`, vị trí xã hội, ký ức/quan hệ địa phương, giới hạn quyền tác động | Không vô cớ sinh ra thân phận mới khiến sự kiện lịch sử/thời gian bị mâu thuẫn |

- `playerEntryProfiles` là các lựa chọn nhập vai **được world/arc hỗ trợ**, với `entryId`, `mode`, `startSceneId`, `initialKnownFacts`, `initialFlags`, `identityAssurance`, `castTargetId` hoặc `nativeSlotId` theo trường hợp.
- Ba kiểu là khả năng **nhập vai khi đi từ VẠN GIỚI vào truyện**, không phải chức năng editor của app Thiên Mệnh. **[GIỮ THEO DU]** Số lựa chọn phụ thuộc độ phức tạp/bậc *và quyền tác giả*. Tác giả có thể `fixed` bắt buộc một vai để bảo toàn cốt truyện hoặc `player_choice` cho chọn trong tập profile họ viết. Ngay cả thế giới cấp S cũng có thể bắt buộc một vai; F có thể cho nhiều vai nếu tác giả viết đủ nhánh và đạt QA.
- `entryPolicy` chứa `mode`, `forcedEntryId` khi cố định, ghi chú tác giả; bảng bậc chỉ gợi ý phạm vi biên tập và không tự thêm vai. Game Engine kiểm tra profile có quyền truy cập, hoàn cảnh/điều kiện vào, rồi mới áp vào world instance.
- Với `cast_possession`, Game Engine gán actor nhân vật cho người chơi trong `worldInstanceId`; NPC gốc tương ứng không được tự xuất hiện thành bản sao. Truyện phải có phản ứng vai: người yêu, kẻ thù, thân hữu, quyền lực, lời đồn và mục tiêu khác nhau theo profile.
- Với `system_cover`, thân phận chính quy hay giả mạo ảnh hưởng độ tin cậy trong world, **không** tự quyết định hệ thống tốt/xấu. Cơ chế phát/kiểm chứng giấy tờ do Engine điều khiển.
- Với `native_extra`, đây là một cư dân nền có dấu vết xã hội thực trong thế giới, **không** phải nhân vật vô danh được AI tùy tiện tạo sau khi người chơi đến.
- Về sau có thể tái sử dụng chung cốt truyện cho ba kiểu, nhưng các đoạn thoại, quyền truy cập, tri thức ban đầu và mục tiêu có thể khác. Tác giả cần kiểm thử từng profile có thể hoàn thành.

### F. Vật phẩm và kinh tế

Mỗi item có `itemId`, mô tả, loại (`quest`, `consumable`, `equipment`, `artifact`, `souvenir`, `evidence`, `currency`), nguồn nhận, điều kiện sử dụng, giới hạn số lượng, `transferPolicy` (`world_only`, `extractable`, `review_required`) và hồ sơ cấp phép. Đồ nhặt được trong phó bản ở `instanceInventory`; chỉ chuyển sang `globalInventory` qua bước kết toán của Engine.

**Cách hiện vật phẩm trong cảnh là lựa chọn trình bày, không bắt buộc vẽ icon cho mọi món:**

1. `text`: Trong lời kể có đoạn "Dưới bàn là chìa khóa", kèm nút **Xem/Nhặt**; text được gắn `hotspotId` hoặc action hợp lệ. Có hỗ trợ cho người đọc trên màn nhỏ.
2. `hotspot_overlay`: Biểu tượng/vùng chạm trên ảnh cảnh; chỉ hiện khi điều kiện khám phá cho phép. Không cần vẽ item vào background bất biến.
3. `item_card`: Cửa sổ cận cảnh có tên, mô tả và ảnh/icon nếu tác giả có; thích hợp báu vật/chứng cứ.
4. `dialogue_reward`: NPC trao đồ qua đoạn hội thoại đã duyệt, Engine kiểm tra điều kiện và trao một lần.

`hotspotId` gắn vào `viewId`/`sceneId`, có `presentation`, `action`, `targetId`, điều kiện xuất hiện, `uniquePickupId` (nếu nhặt). Văn bản hay ảnh chỉ là cách bày, **không phải sự kiện phát vật phẩm**; Engine xác thực nhặt trước khi cập nhật Kho trong phó bản. Không vẽ sẵn món đồ chỉ được phát hiện sau vào ảnh công khai nếu gây lộ bí mật.

Shop có `shopId`, `merchantNpcId` tùy chọn, nơi mở, đơn vị tiền, danh sách hàng, giá, stock, điều kiện mở và chính sách mua lại. Không có số dư âm, giá âm, drop vô hạn, trao thưởng lặp do reload.

### G. Nhiệm vụ

- `missionId` bất biến trong world/version; `kind` là `main`, `side` hoặc `hidden`.
- `requiredForCompletion` chỉ bật cho nhiệm vụ chính bắt buộc. Nhiệm vụ ẩn không được chặn tiến độ khi người chơi chưa biết nó tồn tại.
- `objectives` có điều kiện cụ thể và xác minh được, chỉ dùng operator/action đã được Engine cho phép.
- `unlocks`, `branchFlags`, `failConditions`, `completionConditions`, `rewards` và `replayPolicy` phải minh bạch cho editor/Engine; spoiler có thể ẩn với người chơi.
- Nhiệm vụ phải có đường tiếp cận hợp lệ; không yêu cầu item ở cảnh đã khóa vĩnh viễn hoặc vật phẩm đã bị tiêu hao mà không có cách xử lý.
- `playRequirements` cho biết những nơi và những NPC thực sự cần tham gia trong tuyến chính tối thiểu; không đếm các NPC phụ và địa điểm trang trí để tăng bậc.

### H. Kết quả và phần thưởng

Tác giả được **đề xuất** `rewardRequest` trong giới hạn ngân sách theo bậc; Engine/reviewer xác nhận `rewardGrant` theo dữ liệu đã duyệt và tính idempotent. Phần thưởng nhiệm vụ không tự sinh từ NPC/AI, không tính EXP chỉ từ text kể rằng đã chiến thắng. `endingId` lưu lý do và event dẫn tới kết quả.

## IV. Quy trình cho tác giả thủ công và tự động

| Bước | Tác giả/biên tập thực hiện | Dữ liệu kết quả | Cổng kiểm tra |
|---|---|---|---|
| 0. Tài khoản và quyền | Đăng ký vai tác giả; đồng ý điều kiện xuất bản | `authorId`, quyền, bản quyền | Không được publish hoặc grant thưởng trực tiếp |
| 1. Tạo truyện | Nhập ý tưởng, chương, lựa chọn, kết thúc | Story Bible | Cốt truyện có logic, không sao chép trái phép |
| 2. Chọn bậc/thể loại | Chọn một trong sáu genre, rank, độ nguy hiểm | Metadata | Đối chiếu hồ sơ bậc; không nhầm tag quỷ dị thành genre |
| 3. Xây world | Khai map/place/scene/view/hotspot, NPC, luật và nhánh | World/scene/NPC/asset registries | ID, độ phủ hình ảnh, đường chuyển cảnh, reachability |
| 4. Vật phẩm/kinh tế | Thêm loot, shop, dùng/đổi/mang đồ ra | Item/shop registries | Quyền sở hữu, số lượng, cân bằng |
| 5. Đặc tả nhiệm vụ | Chính/phụ/ẩn, trigger, kết thúc, thưởng đề xuất | Mission/event registries | Engine-only authority, không deadlock |
| 6. Tự đưa ảnh | Upload ảnh do tác giả sở hữu hoặc được cấp phép; gán `assetId` | Asset registry | License, spoiler, crop mobile, fallback |
| 7. Kiểm tra tự động | Schema, liên kết ID, quota, tham chiếu, vòng lặp thưởng | Report lỗi/cảnh báo | Lỗi chặn submit phải hết |
| 8. Duyệt nội dung | Đọc truyện, thử nhánh, cân bằng, kiểm tra AI và bản quyền | Review decisions | Người duyệt độc lập với người gửi |
| 9. Dựng thử | Import vào staging; chơi trên desktop/mobile | Build/QA logs | Không lỗi lưu tiến trình, không phát thưởng thật |
| 10. Phát hành | Publisher ký duyệt world/version | Immutable release | Backend mới chuyển `published` |
| 11. Theo dõi/sửa | Báo lỗi, vá nhỏ, version mới, rollback | Changelog/version | Không phá save và quyền sở hữu đã có |

**Cả hai luồng dùng chung một hợp đồng dữ liệu:**

- **Thủ công:** author editor/form điền trường -> export JSON -> validation -> review -> staging.
- **Tự động:** người dùng nhập văn bản/truyện -> AI đề xuất JSON theo schema + báo ô thiếu -> tác giả sửa/duyệt -> **cùng validation/review/staging**.
- Không có luồng “AI viết xong là phát hành”, “tác giả tự cộng EXP” hoặc “NPC hội thoại rồi tự chuyển world”.
- Không dùng `eval`, biểu thức JavaScript tự do, mã HTML/script trong logic truyện. Mọi điều kiện và tác động là lệnh khai báo nằm trong allowlist; văn bản/ảnh tải lên luôn là dữ liệu không đáng tin cho đến khi duyệt.

## V. Phân quyền và cộng tác tác giả

**[ĐỀ XUẤT]** Không tự dùng nhãn A/B/C cũ nếu chưa xác nhận nghĩa trong code. Hệ biên tập nên có quyền độc lập:

| Vai | Quyền |
|---|---|
| `author` | Tạo/sửa draft của mình, tải hình, gửi duyệt, xem feedback, thử bản nháp cục bộ |
| `collaborator` | Sửa phần được chủ world mời, không đổi chủ sở hữu hoặc xuất bản |
| `reviewer` | Đọc, ghi lỗi, yêu cầu sửa, đề nghị duyệt/từ chối; không tự cấp thưởng |
| `publisher` | Xác nhận nội dung/asset đã đạt, phát hành/thu hồi phiên bản theo workflow |
| `admin` | Quản lý quyền, kiểm tra khiếu nại, khóa nội dung có rủi ro và audit |

Phải có lịch sử chỉnh sửa, người đóng góp, điều khoản IP/giấy phép, giấy phép dùng hình/nhạc, cơ chế nhận báo cáo và gỡ nội dung xâm phạm. Nếu tác giả dùng truyện người khác, cần có quyền chuyển thể phù hợp; không nhận một tuyên bố “tự sáng tác” thay cho chứng cứ khi cần. Chi tiết bản quyền/điều khoản chia sẻ doanh thu phải được xác định riêng trước khi mở đăng ký ngoài cộng đồng.

## VI. Tiêu chí QA và lỗi phải chặn

### Cấu trúc

- ID và phiên bản ổn định; không trùng mission/NPC/item/map/place/scene/view/hotspot/asset.
- Có worldCover và tối thiểu 1 sceneBackground **đã duyệt trước publish**.
- Scene tham chiếu tới place/asset tồn tại, chuyển cảnh được xác thực; không rò spoiler trong ảnh bìa, alt text hay tên cảnh.
- Map/place/scene/view/hotspot có liên kết logic; một map có thể có nhiều place và nhiều view. Các cảnh trọng yếu được minh họa đủ, nhưng không có quota ảnh hay số nơi cố định theo bậc.
- Mọi hotspot `pickup` phải dẫn tới item thật và khóa nhặt một lần; text-only cũng phải có nút hành động, điều kiện và phản hồi cho người chơi.
- Có ít nhất 1 nhiệm vụ chính; số nội dung đối chiếu cấp, ngoại lệ có lý do được duyệt.

### Kịch bản

- Có mở đầu, nút thắt, kết quả; không dead end ngoài fail có chủ đích.
- Các lựa chọn quan trọng thay đổi flag, NPC, item, cảnh hoặc ending; không chỉ thay câu chữ.
- Kiểm tra từng `playerEntryProfile` được hỗ trợ: thân phận chính/phụ/pháo hôi/phản diện không bị phản ứng như người vô danh; `system_cover` có độ tin cậy đúng nguồn; `native_extra` có lịch sử tồn tại hợp lý. Không nhân bản NPC gốc khi player nhập vai cast.
- Nhiệm vụ phụ/ẩn không bắt phải hoàn thành để mở kết thúc nếu không được nêu là bắt buộc và duyệt.
- Truyện kinh dị có manh mối cho luật nguy hiểm; cấp thấp không dùng phạt không thể phục hồi chưa được duyệt.

### Economy và progression

- Nhặt đồ được xác nhận một lần theo `worldInstanceId + pickupId`; mua hàng kiểm tra tồn, giá, tiền; không âm tiền/nhân bản item.
- Kết toán nhiệm vụ có khóa chống cấp lại thưởng (idempotency key theo người chơi, world instance, mission, completion version).
- Vật phẩm `world_only` không vào kho toàn cục; `review_required` không tự chuyển sang `extractable`.
- EXP, tiền, item, cấp truy cập tuân thủ ngân sách và quyền người chơi; retry không phá tiến trình ngoài thiết kế.

### AI và quyền riêng tư

- Mỗi NPC AI phải có hồ sơ đã duyệt, giới hạn tri thức, bộ lọc dữ liệu người chơi, fallback scripted.
- AI chỉ đề xuất lời thoại; hành động có hậu quả phải qua handler được phép và backend xác minh.
- NPC AI không phát hiện thế giới khác, dữ liệu người chơi khác hoặc chân tướng chưa được mở.
- Liên Lạc DUDU chỉ hiển thị danh bạ sau khi sự kiện kết bạn được xác thực. Có cơ chế hủy liên lạc/báo cáo.

### Nội dung & vận hành

- Kiểm thử mobile (ít nhất 320/375/390/430 px), readability/crop, ánh sáng, overlay NPC.
- Asset có bản quyền và nguồn; không dùng ảnh watermark trái phép; hỗ trợ fallback.
- Lưu đúng scene, quest flags, inventory, NPC relationship khi reload; hỗ trợ migration/rollback khi update world.
- Có review nội dung, gắn nhãn kinh dị/bạo lực theo mức phù hợp, tránh phạt bất ngờ vượt nhãn.

## VII. Mô hình dữ liệu tối thiểu và đời sống một bản phát hành

`authorDraft` -> `submitted` -> `inReview` -> `approved` -> `staged` -> `published` -> `retired`.

- `authorDraft` có thể thiếu ảnh/field và có báo lỗi.
- `submitted` khóa snapshot để review; tác giả muốn sửa phải mở revision mới.
- `approved` không đồng nghĩa world chơi được nếu staging chưa đạt.
- `published` chỉ được tạo bằng workflow có quyền; gắn `releaseId`, schemaVersion, content hash và version.
- `retired` ngừng nhận lượt chơi mới, nhưng cần giữ dữ liệu phục vụ save/đền bù nếu người chơi đang trong world đó.

World metadata tối thiểu:

```
genreId -> worldId + contentVersion
            -> mapId -> placeId -> sceneId -> viewId -> hotspotId
                                   -> assetId
            -> characterId -> characterVisuals -> visualVariant -> assetId
                           -> characterAppearances -> viewId + trigger
            -> npcId (scripted/ai_candidate)
            -> itemId -> shopId
            -> missionId (main/side/hidden) -> event/flag -> endingId
```

Mọi ID được quản lý trong phạm vi world/version, trừ asset registry có thể dùng chung thông qua quyền rõ ràng. Save cần thêm `playerId`, `worldInstanceId` và trạng thái engine; không nên lưu save theo đường dẫn ảnh hay tiêu đề truyện.

## VIII. Hai mẫu prompt cho tác giả và biên tập tự động (chưa kết nối AI)

### Prompt 1 — Chuyển ý tưởng thành draft có cấu trúc

> Bạn là trợ lý biên tập cho World Creator tại tab VẠN GIỚI, không phải app Thiên Mệnh của người chơi. Đọc nguyên văn cốt truyện tác giả cung cấp. Chỉ đề xuất trường dữ liệu theo `world.schema.json`, không tự tuyên bố đã phát hành, không tự cấp EXP/item, không sửa lore chung. Tách `cast` (mọi nhân vật cần lưu để kể chuyện, kể cả người chỉ được nhắc) khỏi `npcs` (chỉ actor có tương tác); không ép nhân vật cameo/được nhắc thành NPC. Từ mô tả tác giả, lập `characterVisuals` cho những nhân vật cần hình, ghi `fixedTraits` (nhất là tuổi/nghề), các biến thể có `assetStatus=pending`; chỉ thêm `characterAppearances` ở khoảnh khắc đáng hiện người, kèm scene/view và trigger cụ thể. Không tự tạo art cho tất cả cast, không mặc định luôn hiển thị NPC hoặc tự gán ảnh ảnh hưởng canon. Xác định `playerEntryProfiles` trong ba kiểu `cast_possession`, `system_cover`, `native_extra` mà cốt truyện hỗ trợ; không tự giả định mỗi truyện hỗ trợ cả ba. Nếu còn thiếu nhân vật, kết thúc, luật, nhánh, hình ảnh hoặc quyền sử dụng, hãy đặt trạng thái `draft` và lập danh sách câu hỏi, không bịa để thông qua validator. Giữ thể loại, bậc, giọng văn và quyền sáng tạo của tác giả. Trả về (1) bản tóm tắt logic, (2) JSON draft, (3) danh sách thiếu/điểm mâu thuẫn, (4) câu hỏi để tác giả quyết định.

### Prompt 2 — Phản biện QA

> Kiểm tra draft VẠN GIỚI theo Quy chuẩn V0.1. Phân biệt lỗi chặn phát hành, cảnh báo và gợi ý biên tập. Kiểm tra mạch nhân-quả, đường hoàn thành main, điều kiện item/cửa hàng, tính nhất quán kiến thức NPC, lộ spoiler, NPC AI vượt quyền, asset không rõ giấy phép, khả năng abuse reward/nhân item. Đối chiếu hình nhân vật với mô tả (người già, nghề nghiệp, thời kỳ, trang phục), nhận diện gương mặt qua pose, thời điểm hiện/ẩn theo `characterAppearances`, đọc thoại trên mobile, che hotspot, CG đôi/nhóm và điều kiện spoiler; không bắt mọi cast có hình. Đặc biệt kiểm tra nhân vật trong `cast` không bị ép thành NPC, mỗi profile nhập vai có thể chơi được, và việc nhập vào vai có sẵn không làm sinh bản sao của chính nhân vật ấy. Không thay đổi truyện hoặc sửa dữ liệu sản xuất. Đề xuất ca kiểm thử cụ thể và yêu cầu tác giả phê duyệt mọi thay đổi sáng tạo.

## IX. Kế hoạch tích hợp tương lai — không thực thi ở V0.1

1. **G0:** Du phê duyệt quota bậc, định nghĩa grade/risk, vai tác giả, format quyền ảnh, reward budget.
2. **G1:** Backend dựng lưu bản nháp, phiên bản, permission và asset registry; tách draft/published.
3. **G2:** Editor trong **VẠN GIỚI**: Story Bible -> map/place/scene/view/hotspot -> cast/characterVisuals/characterAppearances -> NPC -> item/shop -> mission -> ending -> preview; không sửa UI ứng dụng hệ thống người chơi Thiên Mệnh.
4. **G3:** JSON Schema + semantic validator + mô phỏng reachability + mobile asset QA.
5. **G4:** Engine parser cho allowlisted condition/action; reward và save idempotent.
6. **G5:** Publish workflow, moderation, staged test, migrations và rollback.
7. **G6:** NPC AI được duyệt và Liên Lạc DUDU; generator AI chỉ tạo draft, không có quyền publish.
8. **G7:** Mở tài khoản tác giả ngoài cộng đồng sau khi quyền và bảo mật hoàn thiện.

**Quy tắc cuối:** mọi world mới phải có **cốt truyện → dữ liệu → kiểm tra → duyệt → staging → publish**, bất kể viết thủ công hay do AI hỗ trợ. Không tạo shortcut vượt cổng chỉ vì world cấp F.

