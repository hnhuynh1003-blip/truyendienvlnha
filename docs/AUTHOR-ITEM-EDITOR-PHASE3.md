# DUDU Studio 2.0 — Đợt 3: Công cụ vật phẩm truyện/chương

**15/10/2026 · nhánh thử nghiệm `feat/identity-npc-editor-v2` · chưa merge `fixapp` · chưa thay Worker/Firebase production.**

## Phạm vi đã thực hiện

1. Tạo `js/author-items-v1.js` — module xác thực và quản lý **định nghĩa** kỷ vật do tác giả tạo. Không gọi Gemini, không gọi Firestore, không cấp vật phẩm, EXP hoặc xu.
2. **Edit Truyện**: nhóm "Vật phẩm độc quyền truyện" → thêm / sửa / nhân bản / lưu trữ (archive, không xóa ID). Khi tạo truyện mới cần **lưu truyện trước** để có `storyId`.
3. **Edit Chương**: nhóm "Vật phẩm độc quyền chương" tương tự, tự gắn `chapterId` ổn định. Khi tạo chương mới cần **lưu chương trước**. Chương có thể gắn lại vật phẩm thuộc truyện bằng `storyItemIds` mà không nhân bản định nghĩa và không phát đồ.
4. **Form dùng chung**: tên, phẩm, loại ITEM/FOOD/WEAPON, icon, mô tả, NPC (select từ danh sách truyện, lưu ID), cách nhận dự kiến `COLLECTION_ONLY`/`STORY_EVENT`/`CHAPTER_EVENT`, bản duy nhất, cho phép tặng.
5. Vật phẩm có `itemId`/`id` mới `author-item-UUID` (không nhập tay); `storyId`, `chapterId`, `npcId`, `scope` (STORY/CHAPTER), `acquisition`, `schemaVersion`, `archived`. Sửa không đổi ID, không chuyển nguồn gốc, lưu trữ giữ metadata cũ.
6. **Quyền chỉnh sửa**: UI và hàm chỉ cho `canEditStories()`; Firebase `studio_data/main_library` vẫn chỉ cho custom claim `admin:true` ghi. Tài khoản khách không có quyền chỉnh sửa qua app.
7. Nếu chương di sản không có ID, khi tác giả lưu chương hệ thống gán ID ổn định và chuyển các cờ `lootedChapters`, `readRewards`, `dailyReadLog` của người chỉnh sửa sang khóa mới để tránh rơi/EXP lặp.
8. Danh mục 70 vật phẩm DUDU và hệ thống random COMMON/REALM từ Đợt 1–2 giữ riêng. Kỷ vật do tác giả tạo **KHÔNG** được thêm vào pool random và chưa trao thưởng cho ai.

## Ranh giới dữ liệu và cảnh báo quan trọng

**Thư viện `studio_data/main_library` đang đọc công khai.** Định nghĩa tác giả (`novel.specialItems`) nằm trong tài liệu công khai; dù chưa hiện trong giao diện độc giả, người dùng kỹ thuật vẫn đọc được bằng API. **Không nhập spoiler chưa xuất bản, bí mật NPC, chi tiết vật phẩm ẩn**. Form hiển thị cảnh báo. Để phát hành vật phẩm ẩn theo chương/sự kiện cần thiết kế bộ sưu tập công khai (metadata an toàn) tách kho luật/sự kiện chưa công khai ở backend được bảo vệ.

- `acquisition.method` là **khai báo dự kiến**, chưa là trigger phát đồ hoặc quyền sở hữu.
- Tùy chọn `giftable` mới là metadata, không làm NPC tự chấp nhận quà; tình cảm NPC vẫn thuộc lộ trình khác.
- Tính toàn vẹn kinh tế và điều kiện phát đồ cần backend đáng tin trước khi phát hành công khai (client tự sửa profile không an toàn).
- "Lưu trữ" giữ dữ liệu ID và cờ `archived`, **không** xóa vật phẩm khỏi kho người chơi.
- Chưa có nhập hàng loạt; thao tác nhân bản là cách tăng tốc tạo các vật phẩm gần giống. Nếu sau này cần nhập hàng loạt, phải có khâu kiểm tra và preview lỗi trước khi lưu.

## QA

- Node: `tests/author-items-v1.test.cjs` kiểm tra ID, scope, NPC/Chapter, chống phương thức RNG, validation, archive, sửa giữ ID.
- Chromium sandbox: tạo vật phẩm truyện trong Edit Truyện → gắn NPC → liên kết vào chương → tạo kỷ vật chương → nhân bản với ID mới → thử tài khoản đọc không được gọi màn quản trị → kiểm tra không phát item hoặc ghi Firestore production.
- Các bài smoke độc lập vẫn kiểm tra tài khoản, save cũ, tần suất AI, bảng rơi, thành tựu, chương thiếu ID.
- Chỉ là mock Firebase; chưa kiểm thử Firestore production.

## Kế hoạch giai đoạn tiếp theo (CHƯA LÀM)

- Cơ chế nhận kỷ vật theo chương/sự kiện với server authority (kèm guard spoiler/ẩn dữ liệu), kiểm tra 2 UID và rollback khi lỗi.
- Bảo Tàng Ký Ức (bộ sưu tập của người chơi) hiển thị những item được **server xác nhận sở hữu**, không coi catalog là vật phẩm của người chơi.
- Cân bằng NPC, quà tặng và tình cảm là đợt riêng cần duyệt trước khi can thiệp.
