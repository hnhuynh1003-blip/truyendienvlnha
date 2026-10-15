# DUDU Studio 2.0 — Đợt 2: Rơi vật phẩm theo vị diện, không farm lại chương

**Chỉ trên nhánh thử nghiệm `feat/identity-npc-editor-v2`**, chưa merge vào `fixapp`, chưa thay Cloudflare Worker/Firebase production. Không chỉnh sửa hoặc xóa kho vật phẩm đang lưu của người chơi.

## Đã triển khai

1. `js/loot-rules-v2.js`: chọn phẩm bằng tỷ lệ cơ bản cũ (F=50%, E=30%, D=12%, C=5%, B=2%, A=0,7%, S=0,25%, SS=0,04%, SSS=0,01%) nhưng **chuẩn hóa trọng số trên những phẩm thực sự có đồ rơi hợp lệ**; không có cơ chế trúng SS rồi rơi nhầm F.
2. Bảng nhặt mới chỉ gồm `COMMON` và `REALM` đã được **tác giả chủ động gắn thẻ**. Không tự suy đoán bối cảnh dựa trên tên chương hoặc nội dung bằng AI. Tag không hợp lệ không đưa đồ từ vị diện khác. `DUDU` không được rơi ngẫu nhiên, cũng không tự sinh đồ riêng của truyện/NPC.
3. `Edit Chương` có chọn một trong sáu `realmTag`: URBAN, APOCALYPSE, CULTIVATION, FANTASY, SCIFI, HORROR; không chọn thì chỉ rơi COMMON. Đọc/mở sửa/lưu chương giữ được metadata đã có. Bảng rơi chung ở Cyber Phone **luôn là COMMON**, không kế thừa sai vị diện của chương vừa mở.
4. Nhặt tàn tích của chương tối đa một lần với khóa save cũ `storyId_chapterId`. Chỉ đánh dấu đã nhận sau khi chọn được phần thưởng hợp lệ; click lần hai không phát thêm món. Vật phẩm nhận có `instanceId` riêng và `obtainedFrom` (GLOBAL hoặc CHAPTER gồm storyId/chapterId).
5. Mở một chương chỉ nhận EXP +5 **một lần trong vòng đời hồ sơ**, kể cả mở lại hoặc biên tập lại. Tách `readRewards` trong profile, không xóa `lootedChapters` cũ. Đây là chặn spam mở trang, **chưa phải xác minh người chơi đã đọc hết chương**.
6. Nhiệm vụ đọc hằng ngày được tính **một lần mỗi chương trong một ngày UTC** qua `dailyReadLog`, để người đã đọc hết truyện vẫn có thể đọc lại sang ngày khác. Đọc lại trong cùng ngày không cộng thêm nhiệm vụ hoặc EXP. Không đặt điều kiện đọc bắt buộc để giữ quyền NPC đã mở khóa.
7. `readRewards` và `dailyReadLog` đi vào `profiles_v2/{uid}` cùng hồ sơ; những khóa không tồn tại trong save cũ được khởi tạo dần mà không xóa dữ liệu. Sandbox không ghi dữ liệu production.

## Những giới hạn cố ý chưa xử lý

- **Phía trình duyệt không phải bằng chứng đọc thật hoặc an toàn kinh tế**: người dùng vẫn có thể giả lập nút nhặt, đổi localStorage, thay dữ liệu XP/xu trong hồ sơ do client kiểm soát. Cần backend trusted cho phần thưởng và item ownership trước khi phát hành rộng.
- Nút `🔄 Reset` nhiệm vụ hàng ngày trong bản cũ hiện còn cho phép đặt lại tiến trình theo thao tác client; chưa có scheduler/chống lạm dụng server-side. Không coi nhiệm vụ và kinh tế đã cân bằng hoàn toàn.
- Ký tự/ngữ cảnh câu chuyện chưa được AI suy diễn để gắn tag tự động. Tác giả phải chọn trong Edit Chương, tránh trộn vật phẩm giữa các truyện.
- Quy tắc phát `DUDU` theo mốc thành tựu hoặc EVENT, vật phẩm riêng truyện/chương/NPC và màn quản trị tạo vật phẩm **sẽ làm ở các đợt sau**, tuyệt đối không phát bừa trong bảng random.
- `sss1` vẫn ở `MASTER_LOOT_TABLE` để đọc lại vật phẩm cũ, nhưng bảng random đã chuyển qua DuduItemCatalog; không còn phát `sss1` theo tỷ lệ random cũ. Lore nguồn gốc sẽ cần tác giả chốt.
- Nhiệm vụ đọc hiện đánh dấu theo thao tác mở chương lần đầu mỗi ngày, **không phải đo thời gian đọc, chống cuộn gian lận, hoặc bằng chứng hoàn thành**. Cần kế hoạch sản phẩm riêng tránh làm game phiền người đọc.

## Kiểm thử

- `node --test tests/item-catalog-v2.test.cjs tests/loot-rules-v2.test.cjs`.
- Smoke Chromium giả lập Firebase: mở lại chương, nhiệm vụ qua ngày UTC, tàn tích nhận một lần, cùng UID và khác UID, chương SCIFI chỉ rơi đúng SCIFI, dropdown tác giả được lưu, kho không chia sẻ tài khoản, không ghi Firestore trong sandbox.
- GitHub Actions smoke/browser + Cloudflare dry-run; **không phải kiểm thử production thật**.

## Bước tiếp theo — chưa thực hiện

**Đợt 3: Công cụ tác giả tạo vật phẩm độc quyền truyện/chương**. Dùng chung schema với `storyId`, `chapterId`, `npcId` do ứng dụng cấp/gán; chỉ Admin có quyền tạo/cập nhật bản định nghĩa. Không cho các món này vào bảng random mặc định. Thiết kế UI nhỏ gọn và kiểm thử save cũ trước khi merge.
