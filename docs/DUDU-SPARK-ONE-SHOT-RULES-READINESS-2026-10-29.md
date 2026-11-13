# DUDU Studio — chốt các điểm nghẽn trước lần hợp nhất Firestore Rules

**Trạng thái:** tài liệu kiểm tra và kế hoạch triển khai; **chưa bật quyền và chưa sửa/deploy Firestore Rules**.
**Định hướng:** một chủ tài khoản và vài tài khoản riêng trên điện thoại, Firebase Spark/miễn phí, không Cloud Functions, không nạp tiền.

**Cập nhật 30/10:** Chủ dự án đã xác nhận màn hình Firestore `(default)` là **Standard**, không phải Enterprise. Standard (phiên bản database) dùng được cùng **Spark** (gói miễn phí); không cần chuyển Blaze để chỉnh Rules. Bản thử hợp nhất `firestore.rules` đã được tạo để kiểm tra cú pháp và mô phỏng quyền EPUB, profile, ví; **chưa gắn vào `firebase.json`, chưa triển khai thật**. Đây là bản bảo vệ dữ liệu và sửa EPUB, KHÔNG phải bản kích hoạt đổi Xu/giá truyện/giao dịch thật vì các adapter và quyền mở nội dung chưa hoàn tất.

**Bổ sung phương án cá nhân 30/10:** Chủ dự án quyết định chỉ chơi trên vài tài khoản của chính mình, chấp nhận **không có cơ chế chống gian lận game phức tạp**. Đã chuẩn bị `js/personal-spark-exchange-v1.js` thực hiện giao dịch trực tiếp trên **Firestore Standard/Spark**: lấy dữ liệu Xu trò chơi do trình duyệt khai, quy đổi 10:1, lưu biên nhận `profiles_v2/{uid}/arcade_receipts_v1/{requestId}` và cộng `profiles_v2.currency` bằng một giao dịch nguyên tử. Biên nhận có ID duy nhất; gửi lại cùng ID không cộng hai lần. Ở giao diện, lệnh chờ được lưu để thử lại nếu mạng rớt. Mẫu Rules tương ứng đã được bổ sung vào `firestore.rules` và kiểm tra bằng Emulator. **Nút chuyển còn khóa bằng `DUDU_SPARK_EXCHANGE_V1_READY` (mặc định false). Không có giao dịch thật hoặc dữ liệu sản xuất nào thay đổi trong đợt này.** Đổi Xu này là cơ chế tin cậy giữa vài tài khoản cá nhân, không phải nguồn vốn đảm bảo cho dịch vụ công khai.

**Bổ sung 29/10:** Cyber Phone đã có ứng dụng **Ví Xu** riêng hiển thị lại `userProfile.currency` để mua sắm, đối chiếu Xu Arcade ở local; không thêm ví hệ thống thứ hai và chưa chuyển Xu thật. Nhịp nhặt thử tại client vẫn là 15 phút ở Kho; chương có xác suất hiện **✦ Nhặt bảo** 25%, khi bấm có xác suất thành công 45%, đã thử là biến mất vĩnh viễn ở chương đó. Bảng công dụng vật phẩm/giới hạn trước Rules xem `DUDU-WALLET-LOOT-ITEM-ROADMAP-2026-10-29.md`.

**Quy đổi đã chuẩn bị trên giao diện:** `10 Xu Arcade = 1 Xu hệ thống`, tối thiểu 10 Xu Arcade/lần, mỗi lệnh là bội số 10 Xu Arcade, **không có trần 30 Xu/ngày**; chỉ phụ thuộc số dư. Người chơi tự nhập số lượng hoặc chọn mức nhanh 10/50/100/Tối đa. Module `js/personal-arcade-exchange-v1.js` chỉ trả báo giá dự kiến; chưa có ledger, **không phát/trừ tiền**. Nguồn Xu cần được xác nhận bởi cơ chế đáng tin trong lần Rules chung.

## 1. Các luồng đã có trong mã nguồn

| Nguồn | Mã nguồn chính | Hiện tại | Điều kiện để mở quyền thật |
|---|---|---|---|
| Arcade (Trạm Neon / Mỏ / Vườn) | `js/personal-arcade-core-v1.js`, `js/personal-arcade-ui-v1.js` | Xu riêng trong `localStorage` theo UID, có nâng cấp và nút **⇄ Đổi** mở popup; xác nhận chuyển vẫn khóa | Không tin số dư do trình duyệt tự khai; xác định tỷ lệ chuyển, hạn mức, lệnh chuyển không trùng và kiểm thử hai tab/thiết bị |
| Nhiệm vụ | `js/quest-engine-v43-7.js`, `index.html` (`advanceQuest`, `claimQuestReward`) | Engine thuần có chống claim trùng theo kỳ, nhưng luồng cũ `claimQuestReward` vẫn trực tiếp sửa `userProfile.currency`/EXP | Ghi nhận sự kiện hợp lệ một lần, kỳ ngày/tuần, không cho người chơi tự gán hoàn thành; thống nhất ví xác thực |
| DUDU FUN | `js/dudu-fun-rules-v43.js`, `js/dudu-fun-ui-v43.js` | Sản phẩm thật chỉ là trò chơi trên thiết bị; Sandbox có thưởng thử nghiệm, chuẩn bị giải trước khi lật kết quả | Tránh công nhận kết quả ngẫu nhiên do client tự tạo. Chốt nguồn xác thực và mức nhận/giới hạn; vé không bán bằng tiền thật |
| Nhặt đồ / Sưu tầm | `js/loot-rules-v2.js`, `index.html` (`rollLootDrop`), `js/inventory-model-v42.js`, `js/world-collection-v44-1.js` | Luồng cũ có thể tự đẩy vật phẩm và Xu vào profile. Không phải bằng chứng quyền sở hữu máy chủ | Đảm bảo một lượt nhặt có mã cố định, nguồn truyện/chương hoặc toàn cục, slot Kho tối đa, item instance duy nhất, không cho client tự chọn phần thưởng |
| Đọc/giá truyện | `js/library-*.js`, nhập EPUB V49, các công cụ L2D | Chưa chốt giá truyện/chương; các chương EPUB `published` hiện có đường đọc công khai | Đặt chính sách miễn phí/trả Xu theo truyện/chương; **khóa đọc nội dung ở Rules**, không chỉ che nút UI. Không làm lộ nội dung trả Xu qua bản sao/đường đọc khác |

## 2. Rào chắn quan trọng cần xử lý trước Rules

1. Rules người dùng cung cấp cho `profiles_v2/{uid}` đang cho phép chủ UID `read, write` toàn bộ profile. Vì vậy `currency`, `inventory`, `quests`, EXP trong profile **không thể coi là tài sản đã được xác thực**. Không bật mua truyện từ số dư này.
2. `economy-live-v52.js` đang dựa vào callable Firebase Functions (cần điều kiện triển khai khác kế hoạch Spark). Giữ nhánh V52 tắt, không âm thầm gọi các endpoint chưa triển khai.
3. Arcade tính thời gian và lượt chơi tại client; Firestore Rules không thể tự kiểm chứng rằng người chơi thật sự treo máy/đào/vào vườn đúng thời gian. Nếu chủ dự án chấp nhận mô hình tin cậy cho **vài tài khoản cá nhân**, phải ghi rõ đó là cơ chế giới hạn rủi ro, **không phải chống gian lận tuyệt đối**.
4. Bản V49 EPUB hiện cho người đọc lấy nội dung chương đã `published`. Một truyện được đặt giá không thể chỉ dùng điều kiện mua ở giao diện; bắt buộc phân biệt chương công khai và nội dung chỉ có quyền đọc.
5. Các công cụ EPUB L2D chỉnh metadata, chương, thay thế hàng loạt và lưu nháp đang có feature gate. Phải chốt quyền sửa/xóa/khôi phục trước khi viết lần Rules hợp nhất.
6. **Đã chốt edition** bằng ảnh danh sách database: `(default)` — **Standard**. CLI trong phiên này chưa đăng nhập Firebase nên không được coi là xác nhận đã triển khai Rules lên dự án thật.

## 3. Quy ước giao dịch cho đợt tích hợp (chưa kết nối Firestore)

- Các luồng thưởng và chuyển Xu phải có một định danh sự kiện ổn định và không được tính hai lần: `ARCADE_TRANSFER`, `QUEST_CLAIM`, `FUN_CLAIM`, `LOOT_CLAIM`.
- Một lần chuyển/mở khóa/mua vật phẩm phải kiểm tra số dư trước, thay đổi số dư và tạo dấu vết nhận/mua cùng một giao dịch; refresh hoặc gửi lại cùng lệnh không được thưởng/trừ lần nữa.
- Với Nhiệm vụ, mã gồm nguồn + ID nhiệm vụ + kỳ ngày/tuần + UID từ Auth (không lấy UID do client nhập). Với DUDU FUN, mã gồm trò + ngày. Với nhặt đồ, mã gồm nguồn/lượt hợp lệ; riêng chương cần UID + storyId + chapterId và chỉ ghi nhận **một lần đã thử**, kể cả hụt. Không dùng ngày để làm mới cơ hội.
- Đồ nhặt phải lưu loại và nguồn gốc (toàn cục hay chương, nguồn, thời điểm, instance ID), giới hạn Kho, phân biệt vật phẩm thật với vật phẩm chỉ hiển thị trong thế giới hoặc quà thử nghiệm.
- Phải giữ tiến trình cũ, nhưng **không tự động chuyển** Xu/EXP/đồ nhặt địa phương từ bản cũ thành tài sản máy chủ.
- Nút **⇄ Đổi** ở ví Arcade chỉ mở popup chuẩn bị; lệnh thực vẫn vô hiệu hóa cho tới khi một mô hình xác thực/hạn mức được nghiệm thu.

## 4. Những quyết định cần chốt trước lượt Rules cuối

1. Xác nhận tỷ lệ đã dự kiến **10:1**, tối thiểu **10 Xu Arcade/lần**, **không đặt trần/ngày**, chỉ một chiều và không có đổi ra tiền thật. Xác nhận giao dịch đúng một lần trên hai thiết bị khi phát hành thật.
2. Truyện hay chương nào cần khóa; giá cố định cho toàn truyện hay từng chương; có phần đọc thử hay không.
3. Nhiệm vụ nào có thưởng thật (đọc chương, điểm danh, DUDU FUN, nhặt đồ). Với trò may rủi trên trình duyệt, có chấp nhận thưởng vật phẩm thật trong mô hình cá nhân ít tài khoản không?
4. Bản lưu local có được nhập một lần vào ví/Kho mới không, hay bắt đầu ví thật từ 0 để không biến dữ liệu dễ sửa thành quyền mở truyện?

## 5. Trình tự kỹ thuật một lần Rules

1. Đọc bản Rules **đang triển khai thực tế** và sao lưu; xác minh Firestore edition, Auth admin claim, phiên bản app và tình trạng EPUB gate.
2. Hoàn thành adapter giao dịch và đường đọc trả Xu, ngăn các luồng legacy client tự cộng Xu/đồ khi đang sử dụng ví xác thực. Trình duyệt chỉ gửi yêu cầu; nơi kiểm chứng phải kiểm tra đầy đủ điều kiện.
3. Kiểm thử giả lập: chủ tài khoản/khách, hai UID, hai tab và hai thiết bị, thiếu Xu, hủy, gửi lặp, lỗi mạng giữa chừng, gian lận timestamp, đổi UID giữa phiên, kho đầy, xóa sửa quyền, query EPUB draft/published/paid.
4. Tạo **một bản Rules tổng hợp** gồm Thư viện legacy + EPUB L2D + profile + quyền sở hữu/đổi Xu + Quest/FUN/loot + mở khóa nội dung; từ chối mặc định cho những đường chưa cấp.
5. Chạy Firebase Emulator Rules tests, dry-run cấu hình trong môi trường phù hợp; người chủ xác nhận trước khi deploy. Đổi Rules **một lần** và thử bằng dữ liệu nhỏ, có phương án phục hồi.

**Điểm dừng hiện tại:** chưa mở thưởng thật, chưa thêm collection hoặc chỉnh Rules, chưa kích hoạt các nút EPUB/collectible cũ đang bị khóa. Các nâng cấp trong Arcade vẫn tiêu **Xu trò chơi trên thiết bị**, không đụng tới ví/Kho sản xuất.
