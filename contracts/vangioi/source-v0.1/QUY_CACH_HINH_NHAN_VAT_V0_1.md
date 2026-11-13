# VẠN GIỚI — Quy cách ảnh nhân vật, biểu cảm và thời điểm xuất hiện

**Phụ lục thiết kế V0.1 — chờ Du duyệt; chưa triển khai lên v71.11.** Tài liệu này bổ sung hình nhân vật cho trải nghiệm **đọc/chơi truyện trong VẠN GIỚI**. Thiên Mệnh chỉ là app hệ thống đi cùng người chơi, không phải lớp vẽ nhân vật của World Creator.

## 1. Mục tiêu: ngắm nhân vật đẹp, không biến truyện thành màn hình đông người

- Nhân vật chính, người quan trọng trong cốt truyện, người chơi muốn ngắm có thể có chân dung, minh họa toàn thân, nhiều biểu cảm, tư thế và trang phục; vẻ đẹp được quyết định bởi *story bible và phong cách của tác giả*, không bắt mọi nhân vật cùng một khuôn mặt AI.
- Người già phải ra tuổi già: cấu trúc gương mặt, tư thế, tóc, da, trang phục và đời sống hợp lý; bảo vệ, lao công, chủ quán, người giao hàng, binh lính, tu sĩ... phải có dấu hiệu nghề nghiệp, tuổi tác và hoàn cảnh đáng tin. Không lấy một mẫu thiếu niên đẹp rồi thay tên thành "ông cụ".
- Một truyện có thể có hàng chục/hàng trăm người trong `cast`, nhưng chỉ một tập con có art, và số người hiện **tại một khoảnh khắc** thường thấp hơn rất nhiều. Nhân vật chỉ được nhắc tên không phải có ảnh; nhân vật có ảnh không phải là `npc` hội thoại.
- **Không có quota số nhân vật được vẽ, số pose, số biểu cảm, ảnh CG hay lần xuất hiện theo bậc F–S.** Tác giả chọn theo độ dài, sự kiện, nhu cầu cảm xúc và kinh phí. Đánh giá bằng đúng nhân vật, đúng tình huống và độ phủ khoảnh khắc có ý nghĩa.

## 2. Tách bốn việc trước đây rất dễ nhập nhằng

| Lớp | Dùng để làm gì? | Có bắt buộc tạo NPC không? |
|---|---|---|
| `cast` | Nhân vật tồn tại trong truyện: chính, phụ, phản diện, cameo, qua lời kể... | **Không** |
| `characterVisuals` | Hồ sơ tạo hình của một nhân vật: các đặc điểm cố định, trang phục, biểu cảm và các ảnh/biến thể | **Không** |
| `characterAppearances` | Chỉ dẫn **khi nào** một hình được vẽ trong `viewId`, ở đâu, hiện/ẩn theo biến cố nào | **Không** |
| `npcs` | Actor người chơi thực sự có thể nói chuyện, giao dịch, theo dõi quan hệ hoặc gọi AI | Chỉ khi có tương tác |

Thư viện hình có các loại asset: `characterPortrait` (chân dung), `characterSprite` (nhân vật tách nền để đặt lên cảnh), `characterIllustration` (minh họa riêng), `characterSilhouette` (bóng/ẩn danh), `characterAvatar` (ảnh thẻ trong thông tin/liên lạc). `npcPortrait` của mẫu cũ còn được chấp nhận để tương thích; khi biên tập mới, ưu tiên liên kết qua **`characterId`** để không buộc ảnh vào AI hay NPC.

## 3. Ba cách kể chuyện bằng hình nhân vật

1. **Chân dung khi đọc thoại (`portrait`).** Khi người chơi chạm "Nói chuyện", mở ô thoại có gương mặt ông lái đò; nét mặt đổi nhẹ theo câu nói; đóng thoại thì chân dung ẩn. Hợp mobile và các thế giới ít ảnh.
2. **Nhân vật đứng trong khung cảnh (`sprite`).** Nền nhà trọ vẫn là `sceneBackground`; nhân vật PNG/WebP có alpha được xếp lên ở vị trí trái/giữa/phải, thay đổi khi họ đến, rời đi, bị thương, che mặt, thay áo. Không cần nhét họ cố định vào ảnh nền. Nhiều người có thể cùng hiện khi kịch bản đòi hỏi nhưng không che cửa, vật phẩm hay vùng đọc truyện.
3. **Tranh sự kiện (`illustration`/CG).** Một bức vẽ hoàn chỉnh cho lần gặp gỡ, cứu người, tranh chấp, hồi tưởng hoặc cảnh tình cảm quan trọng; có thể vẽ **hai hoặc nhiều nhân vật chung một bố cục**. Trường hợp đó dùng `view.kind=illustration` và `view.depictedCharacterIds` để khai ai trong tranh; không xếp hai bản sao ảnh cùng bức CG lên nền.

`silhouette` là một cách thể hiện bí ẩn, không phải cớ để thiếu hình. Nhân vật có thể chỉ xuất hiện qua bóng trước khi người chơi đủ điều kiện biết danh tính. `avatar` được dùng ở thẻ hồ sơ hoặc Liên Lạc (khi đã mở), không đồng nghĩa NPC được bật AI.

## 4. Bảng chỉ đạo nghệ thuật mỗi nhân vật

Tác giả điền một lần `characterVisuals` liên kết `characterId`:

- **Đặc điểm không được trôi (`fixedTraits`):** độ tuổi *thể hiện trên hình*, ngoại hình, tóc, da, dáng người, nét nhận biết, dị tật/sẹo nếu lore có; không tự trẻ hóa ông bà, đồng phục sai nghề, sai thời đại.
- **Nhận diện (`identityNotes`):** một nhân vật vẫn phải được nhận ra qua các pose/góc nhìn khác nhau; cặp đôi trong hai hình không được biến thành hai người khác nhau.
- **Độ ưu tiên (`visualPriority`):** `signature` (nhân vật quan trọng/ấn tượng), `supporting`, `cameo`, `ambient`, `offscreen`. Đây là nhóm quản lý công sức hình ảnh, **không phải hạn ngạch**. Nhân vật qua lời kể có thể không có `characterVisuals`.
- **Biến thể (`variants`):** mỗi `variantId` trỏ tới một `assetId` có format, `expression`, `pose`, `outfitTag`, `timelineTag`. Ví dụ cùng một bà chủ quán có ảnh ngồi bán hàng, mỉm cười, bàng hoàng, và áo khác khi lũ tràn qua bến. Không sinh biến thể vì chỉ đổi câu thoại không quan trọng.
- **Nguồn và duyệt ảnh:** lưu tác giả/chủ sở hữu, giấy phép, trạng thái duyệt, ghi chú nguồn, crop; tác giả có thể tự tải hình gốc. Mô hình AI chỉ gợi ý tạo ảnh/biểu cảm mới trong draft; **không** tự suy diễn sửa ngoại hình canon, không dùng ảnh chưa được phép phát hành.

Điểm cốt lõi: **"đẹp" là chất lượng tạo hình có chủ đích**. Nhân vật trẻ đẹp, tiên nhân thanh lãnh, bà lão hiền hậu, bác bảo vệ mệt mỏi hay kẻ phản diện đáng sợ đều có vẻ hấp dẫn riêng khi đúng mô tả, chứ không nhất thiết cùng mang mặt người mẫu.

## 5. Khi nào hình hiện? — sự kiện điều khiển, không spam

Mỗi lần hiện có `appearanceId`, `characterId`, `viewId`, `variantId` và quy tắc:

| `showOn` | Tình huống | `hideOn` thường dùng |
|---|---|---|
| `dialogue_start` | Lần gặp, đối thoại, lựa chọn quan trọng, tiết lộ | `dialogue_end` |
| `scene_enter` | Nhân vật thực sự đang tham gia phân đoạn khi bước vào | `view_exit` |
| `event_flag` | Hình chỉ hiện sau cờ sự kiện hợp lệ: người ấy xuất hiện, hồi tưởng, lộ thân phận, trúng độc... | `flag_change`, `event_end` hoặc `view_exit` |

`requiredFlags` và `forbiddenFlags` bổ sung điều kiện nhân quả; `triggerRef` cho biết nút thoại hoặc cờ kích hoạt. Trình cảnh chỉ đọc trạng thái Engine xác nhận. **Mặc định không có bản ghi appearance = không hiện hình nhân vật**, dù ở nơi ấy có NPC. AI NPC có thể nói, nhưng không được ngẫu nhiên bật hình, thay pose, đổi trang phục hoặc cho nhân vật biến mất ngoài kịch bản/allowlist.

Ví dụ ở Quan Đạo: vào nhà trọ ban đầu chỉ thấy sảnh và khách vãng lai nếu ảnh nền muốn có; khi gõ quầy nói chuyện mới hiện sprite ông chủ. Khi nghe tiếng động phía hành lang, bà lao công có thể xuất hiện trong cảnh đúng lúc, rồi biến mất khi người chơi rời hành lang. Nếu NPC chưa thật sự bước vào thì **không** hiện sprite, dù tên họ có trong dàn diễn viên.

## 6. Tránh phá ba kiểu nhập vai người chơi

- `cast_possession`: nếu người chơi nhập vào nhân vật X, không để sprite NPC X đứng đối diện như người thứ hai. Các appearance dạng **sprite bên ngoài** của X mặc định bị chặn bằng `suppressWhenPossessed=true`; ảnh gương, hồi tưởng, hình người chơi ở góc máy thứ ba chỉ xuất hiện khi tác giả khai rõ ngữ cảnh và không biến thành NPC có ý chí độc lập.
- `system_cover` và `native_extra`: ngoại hình người chơi có thể do hệ thống/slot đã xác định hoặc cho người chơi chọn; không tự gán một ảnh nhân vật chính sẵn có vào thân phận lạ. Nếu chưa có ảnh đại diện phù hợp, mô tả bằng chữ hoặc góc nhìn thứ nhất là hợp lệ.
- Một ảnh minh họa được xem **không làm phát sinh actor hoặc mở khóa `npcId`**; việc giao tiếp, có thể kết bạn, hoặc biết tên nhân vật vẫn phụ thuộc vào luật và trạng thái truyện.

## 7. Ví dụ JSON cho một người lớn tuổi

Đây chỉ là **đoạn bổ sung trong JSON world**, không phải thế giới độc lập:

```json
{
  "characterVisuals": [{
    "characterId": "char-lai-do",
    "visualPriority": "supporting",
    "identityNotes": "Ông lái đò gần bảy mươi, nửa mặt có vết rám nắng; không vẽ như thiếu niên nhuộm tóc trắng.",
    "fixedTraits": ["nam cao tuổi", "mặt nhiều nếp nhăn", "vai hơi khom", "tay chai do chèo đò"],
    "variants": [{
      "variantId": "look-lai-do-binh-tinh",
      "assetId": "asset-sprite-lai-do",
      "format": "sprite",
      "expression": "điềm tĩnh",
      "pose": "cầm mái chèo",
      "outfitTag": "ao-vai-cu"
    }]
  }],
  "characterAppearances": [{
    "appearanceId": "appearance-lai-do-hoi-chuyen",
    "characterId": "char-lai-do",
    "viewId": "view-toan-ben",
    "variantId": "look-lai-do-binh-tinh",
    "displayMode": "sprite",
    "showOn": "dialogue_start",
    "triggerRef": "dlg-lai-mo-dau",
    "hideOn": "dialogue_end",
    "position": {"anchor": "right", "x": 0.8, "y": 0.85, "scale": 0.9, "layer": 3},
    "suppressWhenPossessed": true,
    "fallbackText": "Ông lái đò chống mái chèo, chậm rãi quay về phía bạn."
  }]
}
```

Nếu tác giả chỉ muốn *chân dung* khi nói, chuyển sang `format=portrait`, `displayMode=portrait`, liên kết asset chân dung tương ứng. Không cần cả chân dung lẫn sprite khi chỉ một cái phục vụ truyện.

## 8. Editor VẠN GIỚI và QA

1. Chọn nhân vật từ `cast` → nhập mô tả ngoại hình/tuổi/nghề/điểm nhận dạng → chọn mức ưu tiên hình.
2. Tải ảnh từng kiểu (portrait/sprite/CG/ẩn danh/avatar), gắn vào `variants`, gắn tâm crop/safe zone; xem cạnh ảnh nền để tránh sai phong cách, màu sáng và tỷ lệ người.
3. Mở **timeline cảnh**: tại mỗi `view`, kéo character vào một lần xuất hiện, đặt trigger, biểu cảm/pose, vị trí; có nút **ẩn sau thoại/sự kiện**; hình không tự xuất hiện vì NPC có mặt trong dữ liệu.
4. Xem trước điện thoại 320/375/390/430 px và desktop; lớp nhân vật không che chữ, lựa chọn, bản đồ, đồ nhặt, chứng cứ và đường đi. Có chế độ giảm chuyển động; ảnh chậm/lỗi phải có fallback chữ mà không mất nhiệm vụ.
5. Kiểm tra lúc nhập vai cast, các nhân vật già/nghề nghiệp, trang phục theo thời gian, nhân vật bí ẩn, quyền ảnh, sửa bản phát hành và trạng thái hiển thị sau reload. Mỗi sự kiện cần hình có art được duyệt; người qua đường không cần ảnh riêng chỉ để đạt đủ số lượng.

**Kiểm tra tự động tối thiểu:** `characterId` trong Visual và Appearance phải tồn tại trong `cast`; `variantId` thuộc đúng nhân vật; `assetId` tồn tại và đúng loại; `viewId` tồn tại; trigger thoại tham chiếu tới lời thoại có thật; không để hai appearance cùng ID; không có sprite nhân vật bị người chơi nhập vai nhưng vẫn bắt hiển thị như NPC. **Nghiệm thu thẩm mỹ, cảm xúc và đúng mô tả là đánh giá biên tập bằng mắt, không thể thay bằng JSON validator.**
