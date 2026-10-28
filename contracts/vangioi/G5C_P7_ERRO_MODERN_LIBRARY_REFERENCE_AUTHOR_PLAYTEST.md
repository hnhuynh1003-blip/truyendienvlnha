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

## P7.1 — Sửa lỗi nhảy mốc thời gian sau phản hồi tác giả

Lỗi bản đầu: từ lời chỉ đường ở cổng trường có thể nhảy ngay tới quán net VIP01 hoặc đêm văn nghệ, rồi quay lại trường. Hệ quả là gộp tuổi **12, 15 và 17** thành một buổi, bỏ mất **hiệu phó, cô Tần Tuệ, chuỗi ngày học, buổi sữa/bánh mì mùa hạ, và quãng trưởng thành của Tinh Dao**. Sửa tại storyboard/manifest, không chỉ đổi nhãn lựa chọn:

| Thứ tự Canon (chuyển thể có giới hạn) | Giai đoạn | Cảnh |
| --- | --- | --- |
| 1 | 12 tuổi, đầu đông: đến trường, hiệu phó duyệt hồ sơ | `gate` → `admission` |
| 2 | 12 tuổi: Tần Tuệ dẫn vào 7B, một thời gian sau Tinh Dao chia khoai | `classroom` → `meal` |
| 3 | Một chiều mùa hạ sau thời gian học: cô Tần cho sữa và bánh | `teacher` |
| 4 | 15 tuổi: tình bạn lớn theo năm tháng, đi dọc triền đê | `walk` |
| 5 | 15 tuổi: đêm diễn gây quỹ, lời mời và lời từ chối đã định trong Canon | `rehearsal` → `farewell` |
| 6 | 17 tuổi: Tử Du ở VIP01, Lục Thiển mang canh và báo cáo | `netroom` → `contract` |
| 7 | 17 tuổi, cuối thu: khánh thành điểm trường thứ 100 và mưa ven sông | `ceremony` → `river` |
| 8 | Chỉ diễn giải phản ứng SAU lời từ chối Lục Thiển | 3 kết thúc mô phỏng |

Tổng **19 cảnh**, gồm 1 trạm tiếp nhận meta bên ngoài dòng thời gian, 2 cảnh nhánh ngoài cổng cho thân phận ảo và 1 kết thúc riêng cho học sinh bản địa. Trạm meta định tuyến từng vai tới thời điểm bắt đầu đúng Canon; không tính là ngày tháng hay quyền dịch chuyển trong world. Mọi cạnh trong đồ thị bắt buộc có thứ tự tăng; không có cạnh từ cổng tới quán net, từ lớp tới đêm diễn hay từ VIP01 quay về năm 12 tuổi. Chỉ Tử Du đi được từ hồi 15 tuổi tới 17 tuổi; học sinh bản địa dừng sau lễ diễn; thân phận ảo chưa xác minh chỉ tìm hiểu đường công cộng trong cùng ngày. Lục Thiển bắt đầu riêng ở tuổi 17. Giao diện hiển thị **nhãn thời gian** từng cảnh, đổi nút một hành động thành “Tiếp tục diễn biến” để không giả vờ đó là một lựa chọn phân nhánh.

Sự kiện từ chương gốc được đối chiếu trong trình đọc công khai, nhưng các câu dẫn và lời thoại bản chơi là lời biên soạn mới. Không có quyền thay đổi lời từ chối tình cảm, mốc tuổi, thành tựu tài chính hay việc đã ký trong Canon. Khi thử tương tác, chỉ phản ứng sau các mốc cố định được mô phỏng.

## Các thân phận được kiểm

1. `entry-tu-du` — `cast_possession`, vai chính. Có ký ức chương 3–5 và đặc điểm **không nhận biết gương mặt**, mô tả qua giọng/mùi/âm thanh; ở cổng trường.
2. `entry-luc-thien` — `cast_possession`, vai phụ. Bắt đầu tại bàn hồ sơ ủy quyền; không bị chuyển vào lớp 7B và không ký/chi tiền thay người khác.
3. `entry-classmate` — `native_extra`, học sinh lớp 7B. Chỉ biết trường lớp và Hạ Tinh Dao, không biết bí mật huyết thống hoặc CryoTech.
4. `entry-cover` — `system_cover`, người phụ việc thư viện cộng đồng trong bản thử. Giấy tờ **chưa xác minh**; chỉ đi tuyến đường công cộng quanh trường trong cùng ngày, **không vào lớp hoặc phòng VIP/hồ sơ riêng của Lục Thiển, không dịch chuyển tới đêm diễn ba năm sau**.

Chương gốc **không được chép vào kho GitHub**. `author-content.json` chỉ đóng gói hai **ghi chú chuyển thể mới**, thế giới thử, các mạch cảnh, hồ sơ vai và G4A/G4B manifest. Trình tác giả cho sửa ghi chú, mạch truyện, lời cảnh theo từng vai, câu lựa chọn, đoạn trở lại và hồ sơ mở đầu trong RAM rồi kiểm lại bằng engine thật; không có thao tác submit/publish/lưu Thư viện. Bảng lựa chọn ràng buộc `ruleId` đã khai báo, ý định tự do chỉ ánh xạ luật hợp lệ, không phải NPC AI.

## Ranh giới nguồn và quyền

`storySource.kind=original` trong gói kiểm thử chỉ nhận diện **bản ghi chú chuyển thể mới**; **không** tuyên bố đây là các chương gốc của thư viện. `sourceReference` chứa tên truyện, tác giả, URL và danh sách chương nhằm đối chiếu cho con người, với `verifiedLibrarySource=false` và `sourcePermitVerified=false`.

Theo `LIBRARY_SOURCE_G1Q.md`, tham chiếu Library production chỉ hợp lệ sau khi trusted host lấy snapshot nhất quán của `storyId`, `storyVersion`, `contentHash` cùng permit đã phê duyệt. Trang đọc công khai **không** cung cấp quyền ấy. Không được giả hash, tự cấp permit, đọc Firestore sản xuất hoặc tạo grant từ trình duyệt. Vì vậy demo public không được đưa lên world registry thật hay coi đã liên kết truyện production.

## QA và tiêu chí kiểm thử

- Hai ghi chú gắn chương 6–7, bốn mở đầu có ký ức và giới hạn riêng, **19 cảnh, năm điểm kết thúc theo thân phận**, trong đó ba kết thúc ở tuổi 17 chỉ mô phỏng phản ứng sau một lời từ chối có sẵn.
- G3C/Creator QA hợp lệ, G4A transition/rule pin và G4B revision/replay; sửa lời vai trong RAM được, giả vai/choice thưởng thất bại.
- Thân phận ảo không được lách qua cửa trường hoặc vào hồ sơ tài chính bằng nhãn giả; bạn học không thấy ký ức Tử Du.
- Không có đường quay về cổng trường từ mốc năm 17; không lặp ngày nhập học, không gặp chính bản thân mình như NPC và không nhảy tuổi mà không có chuyển cảnh nêu rõ.
- Không chứa Full Canon private, không EXP/Xu/items/reward, AI, save/release/publish/auth hay Firestore/Worker production.
- Giao diện đọc tiếng Việt với font sans rõ, ảnh cảnh/ảnh vai gốc dùng riêng cho bản thử; mobile 320px và desktop cần kiểm.

**Trang thử:** `playtests/he-thong-erro/` trên GitHub Pages sau khi commit và deploy thành công. **Rollback:** revert các fixture/UI/builder/asset/test/doc và thẻ vào Worlds; không có dữ liệu server cần xóa.
