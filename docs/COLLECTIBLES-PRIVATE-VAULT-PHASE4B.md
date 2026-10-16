# DUDU Studio — Đợt 4B: Kho vật phẩm bí mật và khóa cơ chế tự nhận

**Ngày: 15/10/2026.** Chỉ trên nhánh `feat/identity-npc-editor-v2`, PR #1 vẫn draft. **Không merge `fixapp`; không triển khai Worker mới; không bật Gemini hay phát thưởng kỷ vật công khai.**

## Đã triển khai trong mã (staging-only)

1. **Khóa riêng tính năng tự nhận kỷ vật chương**: `COLLECTIBLE_SELF_CLAIM_ENABLED="false"` (độc lập với `COLLECTIBLES_ENABLED="false"` và `AI_ENABLED="false"`). `POST /v1/collectibles/begin` và `POST /v1/collectibles/claim` bị chặn dù sau này admin vault được bật. Mở chương/cuộn trang/đợi đủ 90 giây **không chứng minh đã đọc** và không là căn cứ phát kỷ vật hiếm.
2. **Kho bản thảo bí mật**: SQLite Durable Object `private_drafts`; các đường `POST /v1/collectibles/admin/draft/save`, `/list`, `/archive` yêu cầu Firebase ID token có chữ ký hợp lệ và custom claim `admin:true`. Không phải API công khai của độc giả, và không ghi vào `studio_data/main_library`. Các bản thảo được gán `storyId`, `chapterId` (nếu có), `npcId` và `itemId` cố định, không thể đổi truyện/chương khi sửa; lưu trữ giữ bản ghi để phục hồi/quản lý.
3. **Biểu mẫu tác giả** có tùy chọn **“🔒 Vật phẩm bí mật”**. Chọn tùy chọn này sẽ gọi API kho kín và **tuyệt đối không gọi `saveDB()` hoặc `DuduAuthorItems.addOrEdit()`**. Nếu `COLLECTIBLES_ENABLED` đang tắt, mất mạng, không có Firebase Auth hoặc không được quyền admin, giao diện giữ nguyên nội dung đã nhập và báo chưa lưu. **Không có cơ chế fallback** sang dữ liệu công khai hay localStorage.
4. **Danh sách bí mật** trong Edit Truyện/Edit Chương lấy từ API admin (khi vault về sau được bật), hỗ trợ sửa và lưu trữ bản thảo đã lưu. Người đọc vẫn chỉ thấy dữ liệu public đã được tác giả chọn lưu công khai.
5. **Biểu mẫu công khai cũ vẫn hoạt động**: tác giả có thể tạo vật phẩm thông thường của truyện/chương, nhưng **nội dung này đọc được từ Firestore công khai**. Không đưa twist/identity/đồ chưa công bố vào chế độ này.
6. **Kho đồ** (`userProfile.inventory`), XP, xu, độ thiện cảm NPC và tỷ lệ rơi ở Đợt 1–3 không thay đổi. **Chưa có thao tác chuyển bản thảo bí mật thành phần thưởng đã phát hành**; việc này phải có quy trình review, xác thực và quyết định của tác giả riêng.

## Giới hạn phải xử lý trước khi phát thưởng thật

- Quy tắc đọc: một tín hiệu từ trình duyệt luôn có thể bị giả lập; thời gian chờ chỉ chặn spam thô. Đợt này **chưa** chứng minh đọc thực tế và **không** tuyên bố chống gian lận hoàn toàn.
- Phương án an toàn ban đầu: tác giả có thể chủ động phát kỷ vật biểu tượng `STORY_EVENT` qua server theo sự kiện được quản lý; item quý theo chương **không phát tự động** chỉ nhờ mở/trả lời một câu hỏi. Nếu cần proof-of-reading có giá trị kinh tế cần thiết kế chống gian lận server-side riêng.
- Nếu tác giả **trước đó đã lưu spoiler vào vật phẩm công khai**, thêm kho riêng **không tự xóa/che các bản ghi cũ**. Cần rà soát, làm sạch dữ liệu công khai và cân nhắc cache/backup trước khi cho độc giả thấy.
- Hệ thống không tự chuyển hoặc sao chép `specialItems` công khai cũ vào kho kín; phải có thao tác review/migration riêng, bảo vệ quyền sở hữu cũ.
- Chưa kiểm thử Worker thật trên Cloudflare, Durable Object data/migration thực tế và hai Firebase UID production; cần kiểm thử staging sau khi người dùng duyệt kế hoạch bật vault **vẫn giữ self-claim off**.
- Firebase Firestore rules `profiles_v2/{uid}` hiện còn cho client tự sửa XP/xu/inventory cũ. Server ledger chỉ giữ kỷ vật đã xác nhận, **không bảo vệ được toàn bộ kinh tế game**.
- Data trong server vault chỉ bí mật đối với độc giả không có quyền; admin và bất kỳ code/quyền vận hành Cloudflare có thể truy cập. Đừng cho rằng mô tả bí mật đã được mã hóa đầu cuối.

## Đã/đang kiểm thử

- `cloudflare/tests/collectible-rules.test.mjs`: chấp nhận bản thảo chưa công bố với ID hợp lệ, chặn payload sai ID, RANDOM hay phương thức không phù hợp.
- `cloudflare/tests/collectibles-config.test.mjs`: công tắc đều OFF, admin claim, draft SQLite và đường server-only.
- `tests/browser-smoke.cjs`: secret save thất bại trong Sandbox không rơi sang `novels`/localStorage; giả lập server thành công không chỉnh Firestore/kho người chơi, danh sách private admin xuất hiện.
- `wrangler deploy --dry-run` chỉ đóng gói, **không triển khai** Worker.

## Đợt kế tiếp — cần duyệt trước khi phát hành

1. Thiết kế **quy trình xem trước → phê duyệt công bố → chọn sự kiện/mốc nhận** ở trang tác giả. Kỷ vật bí mật chỉ được chuyển ra dữ liệu công bố khi tác giả chủ động xác nhận.
2. Bổ sung xác thực điều kiện nhận server-side và anti-abuse cho **những sự kiện có thể kiểm chứng**. Nếu không thể chứng minh đọc thật thì không trao item có giá trị kinh tế chỉ dựa vào timer/scroll/quiz tĩnh.
3. Kiểm thử Worker staging thật với Firebase UID tác giả + độc giả, cả tình huống lỗi mạng/đổi tài khoản/nhận trùng, đo lưu lượng Cloudflare Free; khi ổn mới bàn kế hoạch merge.
