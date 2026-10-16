# DUDU V27 R4 — Rà soát giao diện, phương án hình nền và tiền kiểm ảnh chân dung

**Ngày:** 16/10/2026 · **Bản:** Sandbox R4, stacked trên V27 R3 · **Trạng thái:** nhánh thử nghiệm, không merge / không deploy, chưa tạo thêm ảnh.

## A. Hình nền Cyber Phone — ba phương án phát triển
| Phương án | Giao diện & lưu trữ | Ưu điểm | Điều kiện / quyết định |
| --- | --- | --- | --- |
| **A — Bộ nền mặc định** (đã dựng prototype R4) | 4 nền CSS: DUDU đêm, Hoa anh đào, Ngân hà, Thanh ngọc; chọn ở **Cài Đặt → Hình nền điện thoại**, lưu localStorage riêng mỗi tài khoản | Cực nhẹ, không cần mạng hay image CDN, đủ xem hành vi chọn/chuyển tài khoản | Có sẵn trên nhánh R4; chưa hình minh họa thật |
| **B — Bộ hình nền minh họa anime** (đề xuất phát triển sau khi chốt phong cách) | 6–8 background dọc WebP tối ưu (9:16), thư viện hình nền điện thoại, tùy chọn bóng mờ/darken để giữ tương phản | Thẩm mỹ cao, đồng bộ thế giới NPC, chọn nhanh | Cần duyệt art direction và xác nhận ảnh trước; ảnh nên ở asset riêng không nhúng base64 vào HTML |
| **C — Tự tải hình nền** (giai đoạn sau) | Tải ảnh từ máy lên local IndexedDB, cắt ảnh 9:16, nén, preview/đặt lại theo tài khoản | Cá nhân hóa, có thể chọn ảnh NPC làm hình nền sau này | Cần thêm quyền/giới hạn dung lượng, xử lý ảnh rộng/cao, lỗi quota, xóa ảnh, fallback trên iOS. Chưa thực hiện |

**Đề xuất:** giữ tính năng **A** vận hành ngay trong Sandbox, sau đó thêm **B**, chỉ thực hiện **C** khi đã ổn định hệ thống ảnh đại diện. `setTheme` ảnh hưởng chủ đề đọc và không đồng nghĩa wallpaper: hai chức năng phải độc lập.

### R4 đã thực hiện
- Thêm `js/phone-wallpaper-v27-r4.js`: chỉ nhận 4 preset ID whitelist, key localStorage dạng `dudu-sandbox:phone-wallpaper:v27-r4:<account>`. Không đưa dữ liệu hình ảnh/định danh vào Firestore.
- Thêm `css/phone-wallpaper-v27-r4.css`: nền trang chính và vỏ màn Cyber Phone; các ô nội dung có lớp phủ tối để văn bản đọc được.
- Thêm lựa chọn có mẫu xem trước và trạng thái `aria-pressed` trong Cài Đặt. Mở lại hoặc đổi tài khoản sẽ đọc lại nền đúng account; lưu thất bại hiện thông báo, không tự upload.
- Không sử dụng ảnh thật trong nền CSS, không tải từ URL người dùng và không liên quan ảnh NPC.

## B. Kiểm kê tình trạng ảnh
1. Danh mục NPC hiện có **60 chân dung nữ + 12 chân dung nam** (72 ID hiện diện trong `DuduNpcPortraitLibrary.CATALOG`), thêm **12 ID nam cũ và 24 ID trung tính legacy** vẫn có thể đọc để bảo toàn save. Những ID này **là SVG minh họa mẫu**, không tương đương 72 ảnh anime chất lượng cao.
2. `js/npc-anime-candidates-v14.js` và `assets/npc/concepts/female-anime-candidates-v15.webp` đã có **4 concept nữ** trong atlas/sprite. Concept phải qua duyệt phong cách/chân dung trước khi dùng làm chính thức.
3. NPC cho phép `portraitAnimeId`, `portraitPresetId`, `portraitUploadId`, `portraitPath`. R7 hiện whitelist ảnh đóng gói dạng **`assets/npc/<slug>.(png|jpg|jpeg|webp)`**, không chấp nhận link ngoài hoặc đường dẫn lồng thư mục trong `portraitPath`.
4. Avatar người chơi hỗ trợ hình chữ cái, anime preset, vector, ảnh tải lên máy (IndexedDB) và **6 khung dùng được, 3 khung chờ xác minh**. Đồng bộ R2/backend cấp thưởng chưa bật; không hứa ảnh được đồng bộ giữa hai thiết bị.
5. Đã rà soát upload avatar: async lưu ảnh xong sau khi đóng editor/chuyển tài khoản có nguy cơ để ảnh mồ côi IndexedDB. R4 bổ sung dọn dẹp theo owner+scope+id trong trường hợp đã mất quyền hiển thị khi callback hoàn tất; không xóa ảnh tài khoản khác.

## C. Chốt tiêu chuẩn ảnh trước khi tạo
- **Phong cách đề nghị:** 2D anime premium, ánh sáng mềm, chi tiết tóc/mắt/trang phục rõ, không chibi quá nhỏ, ít vật thể đè chân dung; thẩm mỹ đồng nhất nhưng ngoại hình không bị trùng lặp.
- **Đợt mẫu duyệt:** 4 NPC nữ (bốn tính cách: dịu dàng, bí ẩn, hoạt bát, điềm tĩnh), 1 NPC nam và 2 avatar người chơi (nam/nữ). Trước khi làm hàng loạt, duyệt cách lên màu, góc nhìn, tỷ lệ đầu/vai và khung.
- **Ảnh sản xuất:** chân dung gốc minh họa nên ở tỉ lệ 3:4 hoặc 4:5 (dùng crop/contain theo UI); xuất bản WebP nén có thể thêm preview nhỏ, fallback giữ ID. Một NPC sử dụng cùng một canonical NPC ID ở Liên Lạc, Nhân Vật và viewer; không dùng tên làm key vì có thể trùng hoặc đổi.
- **Ảnh người chơi:** riêng nhóm `playerAvatar`, không dùng một hình NPC đã gắn vào cốt truyện làm avatar mặc định. Trên mobile phải khớp khung avatar tròn/vuông, không cắt phần mắt/mặt.
- **Mở rộng:** sau khi mẫu đạt, có thể làm theo nhóm 12 NPC/lần, ưu tiên nữ; số **12 nam** là giới hạn danh mục đề nghị, không tự xóa ID legacy hay chuyển dữ liệu cũ.
- Không phát sinh bất kỳ ảnh nào trong R4; mọi art chính thức chờ duyệt style & thứ tự ưu tiên.

## D. Các vấn đề cần chặn trước khi lên production
| Mức | Kiểm tra | Hướng xử lý |
| --- | --- | --- |
| P0 | Không gộp production khi các PR V23–V27 còn Draft xếp chồng, backend award/R2 chưa kích hoạt | Rà migration/scope và chỉ merge sau QA từng tầng |
| P1 | Ảnh NPC trong account/đọc truyện: callback tải bất đồng bộ phải ràng buộc user, story, NPC và token | Test đổi tài khoản nhanh khi đang mở chân dung / chọn hình / mất mạng |
| P1 | Ảnh thật thay SVG, fallback IndexedDB và asset path | Kiểm tra file thật 404, dung lượng, ảnh sai ID và câu chuyện không có ảnh |
| P1 | Đổi wallpaper: không ảnh hưởng theme đọc, không tràn màn 320px, không tự ghi dữ liệu người chơi | Kiểm thử localStorage disabled, tài khoản A/B, CSS text contrast |
| P1 | iOS Safari: cố định cuộn ở modal ảnh, focus/khoá tương tác, viewport dynamic safe area | Kiểm tra thiết bị thật hoặc browser engine phù hợp; CI Chromium chưa thay thế iOS |
| P2 | Kho đồ R3: lưới 4/3 cột, vật phẩm trùng tên nhưng khác instance, trạng thái khóa, thao tác vứt | Các test đang có nhưng vẫn cần đánh giá thị giác đa thiết bị |
| P2 | Kênh Liên Lạc: nickname dài, giọng nói/ảnh upload fail, rò dữ liệu cross-story | Test chuỗi rất dài và 2 tài khoản độc lập |
| P2 | Ảnh có quyền tác giả/nguồn gốc: cấp phép dùng lại/AI art nhất quán, tối ưu WebP | Kèm checklist asset và thông tin nguồn cho mỗi phiên bản |

## E. Tiêu chí nghiệm thu R4
- Mặc định `midnight`; chọn 1 trong 4 mẫu, đóng/mở Cyber Phone vẫn giữ lựa chọn.
- Tài khoản A chọn `sakura`, tài khoản B chọn `jade` không dùng chung màu; đổi về A khôi phục hình nền cũ.
- Không ghi Firestore, không sửa `userProfile`, không cập nhật NPC hoặc xu khi chỉ đổi wallpaper.
- Trên 320–390px, nút chọn nền không tràn ngang; không ảnh hưởng Kho đồ, Liên lạc và dialog.
- Khi localStorage bị chặn, hiển thị mặc định và không crash.
- Các bài Node và Chromium toàn dự án phải pass trước khi đưa kết quả cho người dùng.

**Hạn chế:** ảnh còn lại vẫn là bản mẫu. Việc thêm nền ảnh động, tải hình nền và tạo các bộ avatar thật là các thay đổi lớn hơn, **chưa được triển khai hoặc duyệt**.
