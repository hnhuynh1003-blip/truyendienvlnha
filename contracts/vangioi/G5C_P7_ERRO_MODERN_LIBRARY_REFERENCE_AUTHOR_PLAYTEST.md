# G5C-P7 — Hệ Thống ERR...O: lát cắt chương 6–7 cho tác giả thử nhập vai

**28/10/2026.** Nguồn công khai: [Thư viện DUDU Studio](https://hnhuynh1003-blip.github.io/truyendienvlnha/index.html#/library), truyện **Hệ Thống ERR...O**, tác giả **Kẻ Lang Bạt** (24 chương tại thời điểm đọc). Duyệt chương **3–12** trong trình đọc công khai, lựa chọn **chương 6–7** làm một lát cắt thử kỹ thuật. **Không phải bản phát hành**, không cấp quyền tác giả, không cấp thưởng và không cho NPC AI.

## Phân đoạn Canon và lý do chọn

| Mốc | Chương | Dữ kiện nền không được viết lại |
| --- | --- | --- |
| Trước khi vào | 3–5 | Tử Du chuyển sinh, không nhìn rõ mặt người; sau việc xác nhận thân phận và căng thẳng Khương/Thẩm gia, em rời đi dưới sự giúp đỡ của Lục Thiển. |
| Lát cắt chơi | 6 | Trường Trung học số 3, lớp 7B ở thị trấn mỏ; gặp Hạ Tinh Dao, nửa củ khoai, rặng bạch đàn và đêm diễn văn nghệ. |
| Lát cắt chơi | 7 | Phòng VIP quán net, công việc công nghệ, Quỹ Vạn Yên/CryoTech và trách nhiệm pháp lý của Lục Thiển; ranh giới quan hệ không do người chơi viết lại. |
| Mốc về sau | 8–12 | Đại học, sức khỏe suy giảm, biến động của các gia tộc và đoạn kết của kiếp sống hiện đại: không đưa vào bản thử làm kết quả có thể tự thay đổi. |

**Một thế giới hiện đại theo nhiều giai đoạn đời người, không phải ba thế giới riêng.** Sáu nhóm thể loại trên giao diện khác với sáu thế giới. Chọn riêng chương 6–7 để tập trung vào tính liên tục và góc nhìn nhân vật.

## Các thân phận được kiểm

1. `entry-tu-du` — `cast_possession`, vai chính. Có ký ức chương 3–5 và đặc điểm **không nhận biết gương mặt**, mô tả qua giọng/mùi/âm thanh; ở cổng trường.
2. `entry-luc-thien` — `cast_possession`, vai phụ. Bắt đầu tại bàn hồ sơ ủy quyền; không bị chuyển vào lớp 7B và không ký/chi tiền thay người khác.
3. `entry-classmate` — `native_extra`, học sinh lớp 7B. Chỉ biết trường lớp và Hạ Tinh Dao, không biết bí mật huyết thống hoặc CryoTech.
4. `entry-cover` — `system_cover`, người phụ việc thư viện cộng đồng trong bản thử. Giấy tờ **chưa xác minh**; được vào khu vực khán giả công cộng nhưng **không vào lớp hoặc hồ sơ riêng của Lục Thiển**.

Chương gốc **không được chép vào kho GitHub**. `author-content.json` chỉ đóng gói hai **ghi chú chuyển thể mới**, thế giới thử, các mạch cảnh, hồ sơ vai và G4A/G4B manifest. Trình tác giả cho sửa ghi chú, mạch truyện, lời cảnh theo từng vai, câu lựa chọn, đoạn trở lại và hồ sơ mở đầu trong RAM rồi kiểm lại bằng engine thật; không có thao tác submit/publish/lưu Thư viện. Bảng lựa chọn ràng buộc `ruleId` đã khai báo, ý định tự do chỉ ánh xạ luật hợp lệ, không phải NPC AI.

## Ranh giới nguồn và quyền

`storySource.kind=original` trong gói kiểm thử chỉ nhận diện **bản ghi chú chuyển thể mới**; **không** tuyên bố đây là các chương gốc của thư viện. `sourceReference` chứa tên truyện, tác giả, URL và danh sách chương nhằm đối chiếu cho con người, với `verifiedLibrarySource=false` và `sourcePermitVerified=false`.

Theo `LIBRARY_SOURCE_G1Q.md`, tham chiếu Library production chỉ hợp lệ sau khi trusted host lấy snapshot nhất quán của `storyId`, `storyVersion`, `contentHash` cùng permit đã phê duyệt. Trang đọc công khai **không** cung cấp quyền ấy. Không được giả hash, tự cấp permit, đọc Firestore sản xuất hoặc tạo grant từ trình duyệt. Vì vậy demo public không được đưa lên world registry thật hay coi đã liên kết truyện production.

## QA và tiêu chí kiểm thử

- Hai ghi chú gắn chương 6–7, bốn mở đầu có ký ức và giới hạn riêng, chín cảnh, ba kết cục `what-if`.
- G3C/Creator QA hợp lệ, G4A transition/rule pin và G4B revision/replay; sửa lời vai trong RAM được, giả vai/choice thưởng thất bại.
- Thân phận ảo không được lách qua cửa trường hoặc vào hồ sơ tài chính bằng nhãn giả; bạn học không thấy ký ức Tử Du.
- Quay lại cổng trường phải dùng lời dẫn mới, không lặp ngày nhập học; không cho gặp chính bản thân mình như NPC.
- Không chứa Full Canon private, không EXP/Xu/items/reward, AI, save/release/publish/auth hay Firestore/Worker production.
- Giao diện đọc tiếng Việt với font sans rõ, ảnh cảnh/ảnh vai gốc dùng riêng cho bản thử; mobile 320px và desktop cần kiểm.

**Trang thử:** `playtests/he-thong-erro/` trên GitHub Pages sau khi commit và deploy thành công. **Rollback:** revert các fixture/UI/builder/asset/test/doc và thẻ vào Worlds; không có dữ liệu server cần xóa.
