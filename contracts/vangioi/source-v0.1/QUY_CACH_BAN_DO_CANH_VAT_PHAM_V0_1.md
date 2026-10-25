# VẠN GIỚI — Quy cách nhập bản đồ, cảnh và đồ vật cho tác giả

**Bổ sung V0.1 — chờ Du duyệt, chưa đưa vào v71.11.**

## 1. Không dùng số địa điểm làm thước đo bậc

Một tác phẩm có thể diễn ra trọn vẹn trong nhà trọ nhưng vẫn cần ảnh mặt tiền, sảnh, phòng khách, hành lang, kho, sân sau; hoặc chỉ dùng một ảnh chung nếu tác giả chủ ý làm phó bản phòng kín. Ngược lại, một truyện học đường/tu tiên dài có thể cần hàng chục đến hàng trăm cảnh. **Không có trần số lượng map, place, scene, view hay ảnh theo F/E/D/C/B/A/S.**

Bậc đánh giá luật, độ khó, sự kiện, nhánh, rủi ro và tác động; chất lượng ảnh/cảnh đánh giá bằng **độ phủ những phân đoạn trọng yếu**. Phải có ít nhất một `sceneBackground` và `worldCover` hợp lệ trước publish như phụ lục V1.2-A, nhưng đó là cổng tối thiểu chứ không phải định mức đủ cho mọi truyện.

## 2. Năm lớp vị trí

| Lớp | Ý nghĩa thực tế | Khi tác giả cần thêm |
|---|---|---|
| `mapId` | Bản đồ hay một cụm địa lý lớn (có thể chỉ một map) | Truyện có một hoặc nhiều khu định hướng riêng |
| `placeId` | Địa điểm/tiểu khu có thể đến, có thể lồng `parentPlaceId` | Nhân vật di chuyển thật, rời khỏi/đến nơi khác |
| `sceneId` | Một phân đoạn/trạng thái tại place; ánh sáng, NPC, sự kiện, quyền truy cập | Thời gian, thời tiết, sự kiện, trạng thái nhiệm vụ đổi |
| `viewId` | Góc nhìn/khung hình cụ thể (toàn cảnh, cận cảnh, nội thất, xe, toa tàu...) | Cần hình ảnh khác nhưng không nhất thiết phải rời place |
| `hotspotId` | Điểm tương tác: đọc, xem, nhặt, nói, mua, mở/cửa/di chuyển | Người chơi có hành động kiểm soát được tại view/scene |

Ví dụ: một người đứng trong hành lang và nhìn kỹ ổ khóa có thể chỉ đổi `viewId`; bước qua cửa vào kho thay `placeId + sceneId` nếu kho là địa điểm logic riêng. Trạng thái `sceneId` không nên thay khi người chơi chỉ phóng to ảnh.

## 3. Minh họa Quan Đạo

Theo thông tin dự án trước đây, **Quan Đạo V8** là pilot có 27 scene, 3 địa điểm, các nền `gate`, `hall`, `store` và đã có kiểm tra chuyển địa điểm/lưu. Đây là ghi nhận lịch sử, chưa kiểm chứng mã nguồn hiện tại trong gói này.

Mở rộng sáng tác đề nghị (không khẳng định đã có code):

- `map-quan-dao`: Nhà trọ và vùng ngay trước nhà trọ.
  - `place-gate`: Cổng/cửa trước → ảnh ngoại thất ban ngày/đêm, góc nhìn bảng hiệu, vết bùn, hotspot cửa.
  - `place-hall`: Sảnh → ảnh toàn cảnh, góc quầy tiếp tân, bàn khách, hotspot nói chuyện/đọc sổ.
  - `place-corridor`: Hành lang → ảnh nhìn từ đầu/cuối hành lang, vết kéo lê, hotspot cửa phòng.
  - `place-store`: Nhà kho → ảnh kho mở/đóng cửa, kệ hàng, đồ vật ẩn có điều kiện.

Tác giả có thể giữ ba place cũ rồi bổ sung view/subplace cần thiết, hoặc tái cấu trúc trên bản nháp mới. Không tự migrate save hay đổi ID production vì ví dụ thiết kế.

## 4. Truyện hiện đại và tu tiên

### Truyện hiện đại

Một arc có thể cần các khu `trường`, `nhà`, `công viên`, `trạm xe`, `xe buýt`, `toa tàu`, `quán cà phê`. Chúng có thể là nhiều map hoặc cùng một map tùy quy mô. Cảnh trong xe/tàu là place/view có quy tắc chuyển động và thời gian, không bị bắt dùng một background chung của "thành phố hiện đại".

### Truyện tu tiên

Một thế giới có thể gồm `tông môn`, `linh điền`, `đỉnh núi`, `động phủ`, `bí cảnh`, `thị trấn tu sĩ` và các nơi phụ. Bản đồ cho phép mở theo chương/arc; tác giả không phải có sẵn mọi ảnh chưa phát hành. Mỗi arc được publish phải có art đã duyệt cho những cảnh thực sự xuất hiện.

## 5. Đồ vật xuất hiện bằng chữ hay ảnh?

**Cả hai đều hợp lệ.** Mỗi vật phẩm có một `itemId` dữ liệu và một hoặc nhiều *cách hiển thị*:

1. **Text interactive:** Văn bản "Trong ngăn kéo có một chiếc chìa khóa rỉ sét" kèm nút **Xem** hoặc **Nhặt**. Không cần ảnh item; Engine kiểm tra `hotspotId`, điều kiện và khóa nhặt một lần.
2. **Hotspot ảnh:** Icon/vùng chạm trên cảnh; có thể có viền sáng nhẹ khi được phép tương tác. Chi tiết ẩn chỉ hiện sau khi có manh mối, không vẽ lộ trên ảnh nền mặc định.
3. **Ảnh cận cảnh/card:** Vật phẩm quan trọng, chứng cứ, báu vật có hình riêng; mở trong overlay nhưng chưa tự vào Kho nếu chưa bấm nhận và được xác minh.
4. **NPC trao đồ:** Hội thoại/tác động lựa chọn tạo yêu cầu trao vật phẩm, backend áp dụng một lần.
5. **Mua/đổi:** Shop/card thể hiện item, giá và tồn; vật phẩm có thể không cần icon riêng nếu mô tả đủ rõ.

`presentation` = `text | hotspot_overlay | item_card | dialogue_reward`; `action` = `inspect | pickup | talk | focus | move | shop | read`. `focus` chỉ đổi `viewId` (nhìn góc khác trong cùng scene), `move` dẫn sang scene khác sau khi Engine xác nhận. Các lệnh có hiệu lực qua hành động hợp lệ, không phụ thuộc AI mô tả hoặc trực tiếp biến chữ thành item.

**Ảnh nhân vật là lớp riêng:** background địa điểm không bị thay thế khi một người bắt đầu nói chuyện. `characterAppearances` có thể phủ sprite/portrait lên view đúng lúc; bức CG đã vẽ sẵn hai người dùng `view.kind=illustration` và liên kết `depictedCharacterIds`. Xem `QUY_CACH_HINH_NHAN_VAT_V0_1.md` để nhập tuổi, nghề, biểu cảm, thời điểm hiện/ẩn, tránh che điểm nhặt và chống nhân đôi khi người chơi nhập vào cast.

Ví dụ item thu nhận qua chữ trong nhà trọ:

```json
{
  "viewId": "view-duoi-ban",
  "sceneId": "scene-sanh-dem",
  "kind": "detail",
  "hotspots": [{
    "hotspotId": "hotspot-chia-khoa",
    "presentation": "text",
    "label": "Dưới gầm bàn có chiếc chìa khóa. Nhặt lên?",
    "action": "pickup",
    "targetId": "item-chia-khoa",
    "uniquePickupId": "pickup-chia-khoa-mot-lan"
  }]
}
```

Đây là đoạn minh họa, không phải một world JSON độc lập; cần khai item/scene/view tương ứng trong hồ sơ chính.

## 6. Form trong VẠN GIỚI dành cho tác giả

1. **Bản đồ:** Thêm map, chọn tên, mô tả, ảnh overview tùy chọn.
2. **Địa điểm:** Chọn map/parent, tên hiển thị, điều kiện mở/đóng, mức spoiler.
3. **Cảnh:** Chọn place, trạng thái (đêm/mưa/sau biến cố), sự kiện, NPC, background fallback.
4. **Góc nhìn:** Upload/chọn một hoặc nhiều ảnh cho scene, chọn wide/detail/interior; xem crop trên desktop/mobile.
5. **Điểm tương tác:** Chọn view rồi bấm **Thêm điểm**; chọn cách hiển thị bằng chữ/ảnh, action, target item/NPC/scene/shop, điều kiện xuất hiện, phản hồi.
6. **Kết nối:** Kéo liên kết giữa các scene/place hoặc đặt điều kiện; xem thử đường đi.
7. **Kiểm tra:** Báo scene thiếu art, hotspot trỏ item sai, ảnh rò spoiler, đường một chiều ngoài ý muốn, pickup lặp, crop làm mất manh mối.

## 7. Cổng nghiệm thu

- Không quota cứng về số map/place/view/asset theo cấp nhiệm vụ.
- Mọi scene được phát hành có background phù hợp hoặc fallback có chủ đích; mọi sự kiện cần quyết định ở một nơi phải có cách nhận diện nơi đó.
- Có điều hướng/định vị: người chơi biết đang ở đâu, đổi view hay đổi place, không bị dịch chuyển bởi lời kể AI.
- Mọi pickup có ID và hành động xác thực, hoạt động được khi hiển thị bằng chữ, không có icon, không còn ảnh hoặc ở mobile.
- Tác giả có thể thêm hàng trăm cảnh theo chapter mà không phải sửa schema/cấu trúc nhóm thể loại.
- Những nội dung chưa publish vẫn nằm trong draft; không mở khóa map, scene, chứng cứ hoặc thân phận trước điều kiện.

