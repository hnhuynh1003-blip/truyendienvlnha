# DUDU Studio — C2: chuyển chức năng Sandbox sang tài khoản Firebase thật

Ngày 30/10/2026. Baseline GitHub main: bb94155 (C1).

## Làm rõ mục tiêu của An Du

Tích hợp lại gameplay mà người dùng đã thử trong Sandbox, **không chỉ mở tab hay
hiện icon**. Mỗi chức năng phải có lưu trữ theo UID, quyền sở hữu, truy hồi và
quy tắc không cấp trùng. Chỉ khi đó mới coi là đã chuyển sang main.

## C2.1: Liên lạc và NPC — chức năng thật không tiêu Xu

- Trong Sổ Tay, **NPC yêu thích** của từng truyện có thể chọn/bỏ chọn và lưu
  vào profiles_v2/{uid}.storyStates[storyId].favoriteNpcV43.
- **Hỏi thăm NPC**: dùng kịch bản và quy tắc Tin tưởng của Sandbox (R5),
  giới hạn một lần mỗi NPC mỗi ngày UTC, cập nhật Tin tưởng và mốc ngày
  gắn kết V43.4; không tự mở khóa mốc truyện Tin cậy/Gắn bó.
- Từ Sổ Tay có thể chọn NPC và hỏi thăm ngay trong giao diện, hoặc hỏi thăm
  ở màn hình Liên lạc. Bảng trạng thái gắn kết và trợ giúp V2 có thể hiển thị
  cho UID đã xác thực; Thiện cảm của vai nhập vai V56 vẫn được phân biệt với
  quan hệ tài khoản/NPC.
- Xem **chân dung NPC** trong Sổ Tay hoặc Liên lạc: cho phép với NPC đã mở
  khóa hoặc trong quyền tác giả, chỉ đọc. Ảnh do tác giả tải cục bộ có thể
  chưa có trên thiết bị khác và sẽ dùng hình dự phòng.
- Firestore Web SDK đã được tích hợp sẵn trong app (compat); lớp giao dịch
  mới chỉ sử dụng runTransaction, đọc hồ sơ chủ sở hữu rồi ghi hợp nhất
  đúng nhánh storyStates của NPC. Không thay thế toàn bộ hồ sơ, không gọi
  saveCurrentAccount sau giao dịch.
- **Không** thay currency, inventory, EXP, Quest, Auth, Rules, Worker, thư viện
  tác giả hoặc dữ liệu tài khoản khác. Dữ liệu chỉ thay đổi khi chính chủ
  bấm Yêu thích/Hỏi thăm và Firestore chấp nhận ghi.

## Bảng chuyển Sandbox → main còn lại

| Tính năng đã thử trong Sandbox | Trạng thái sau C2.1 | Việc để đạt thực sự |
| --- | --- | --- |
| Liên lạc, NPC đã mở khóa, chat AI | Main đã có, cần test runtime | Test UID/story/role và giới hạn AI |
| Chọn NPC yêu thích | Đã nối giao dịch Firebase | Test hai tài khoản và tải lại |
| Hỏi thăm, Tin tưởng, gắn kết | Đã nối giao dịch Firebase | Test ngày UTC, online/offline |
| Chân dung, trang quan hệ NPC | Mở trong main có quyền | Test ảnh trên di động |
| Tặng quà từ Kho cho NPC | C2.2 đã nối giao dịch Firebase; chờ thử UID thật | Kiểm tra quà thích/ghét, reload, vật phẩm và trần Thiện cảm trên thiết bị thực |
| Phong bao NPC bằng Xu | C2.2 đã nối giao dịch Firebase; chờ thử UID thật | Kiểm tra Xu trước/sau, 3 lượt/ngày, cooldown và lịch sử khi đăng nhập lại |
| Kho: sổ sưu tập/lịch sử món | C2.4c đã nối main theo UID; chờ thử thực tế | Kiểm tra hai tài khoản và giữ mốc sau khi dùng/bán/tặng NPC |
| Kho: bán/ký gửi/đấu giá | Main có mua/dùng/bán phổ thông; Sandbox có bản ký gửi nháp | Phân biệt đấu giá thật và nháp, không giả tạo người mua |
| Quà tặng tác giả, hộp thư | **Đã loại khỏi phạm vi triển khai** theo quyết định chủ dự án | Không phát triển chuyển quà tác giả; giữ nhật ký cũ ở chế độ lưu trữ |
| DUDU FUN phần thưởng | C2.5 đã nối main: 2 trò miễn phí, nhận Xu/vật phẩm theo UID | Thử hai UID/Android và kiểm tra khôi phục khi mất mạng |
| Nhiệm vụ, nhặt đồ, EXP | Có cả mã client cũ và module mới | Thống nhất nguồn ghi, chống cộng lặp |
| Arcade → Ví Xu 10:1 | Main có game/quote; chuyển thật khóa | Chốt Rules receipt và kiểm tra reset |
| Reset mùa mới | Chưa chạy | Sao lưu, quyết định trường, thử 1 UID trước |

## Kiểm thử và điều kiện đưa lên

- Node unit test lớp NPC thật: giao dịch UID riêng; chỉ cập nhật nhánh NPC;
  không cộng Xu/EXP/vật phẩm; chặn NPC chưa mở; chặn hỏi thăm lặp.
- Kiểm tra các ràng buộc UI hiện có, bảo vệ avatar và vai NPC.
- Node: 130/130 bộ test đạt; git diff --check đạt.
- **Chưa thử đăng nhập và Firestore Rules thực tế** trong browser ở lượt
  làm việc này; không suy ra kết quả live từ mock. Firebase của chủ dự án
  trước đó được xác định là Standard (default) trên Spark.
- Trước C2.2: cần test ít nhất hai UID, chọn/bỏ yêu thích, hỏi thăm một
  NPC, tải lại, bảo đảm số dư và Kho không đổi; nếu giao dịch bị từ chối,
  dừng và đối chiếu Rules đã triển khai, không tự nới Rules.

## C2.2 — chuyển Tặng quà và Phong bao sang main (mã nguồn)

- `js/personal-npc-exchange-v1.js` dùng một giao dịch `profiles_v2/{uid}`
  với `runTransaction` trên Firebase Spark hiện tại; kiểm tra `auth.uid`,
  NPC đã mở khóa trong hồ sơ trên máy chủ, vật phẩm có `instanceId` duy nhất,
  metadata vật phẩm hợp lệ theo catalog và quyền tặng. Kết quả nhận/từ chối
  theo engine R2; chỉ nhận quà mới trừ **đúng instance**, cập nhật Thiện cảm,
  Tin tưởng và chuỗi gắn kết. Không cộng thưởng Xu, EXP, Quest khi tặng.
- Phong bao V32 chấp nhận 10/50/100/520/1314 Xu *trò chơi*, 3 lần/NPC/ngày
  UTC, cách 5 phút; một giao dịch cùng lúc trừ Xu và ghi lịch sử cho đúng
  NPC. Không có ví NPC, chuyển tiền thật hay thưởng Thiện cảm.
- Mã giao dịch tạo bằng UUID và giữ ở localStorage khi chưa xác nhận. Nếu
  mạng lỗi sau khi Firebase đã ghi xong, bấm lại dùng mã cũ; NPC nhận quà và
  sổ phong bao nhận biết yêu cầu đã xử lý, không trừ lần thứ hai. Sandbox
  vẫn chạy nhánh cũ, không đổi cơ chế mô phỏng.
- Nút phong bao và quà đã được mở ở tài khoản Firebase xác thực và NPC
  đã mở khóa, thay cho nhánh main chỉ trừ quà cũ và nút phong bao khóa.
- C2.2a: Sổ Tay chuyển rõ `storyId` vào hộp quà và giao dịch để tránh
  nhầm truyện nếu Liên lạc đang chọn truyện khác; NPC chưa mở khóa bị
  khóa nút. Sự kiện quà chỉ gửi vào hội thoại khi đúng truyện và NPC.
- C2.2b: Phong bao không còn bị vẽ lại cố định ở cuối hội thoại. Chat mới
  lưu `at` và sắp xen kẽ với sự kiện phong bao theo `at`, giữ mã sự kiện
  riêng khi render. Hội thoại V55/V56 cũ không có thời gian được giữ
  nguyên và gom trước các sự kiện có mốc thời gian, vì không đủ bằng
  chứng để suy ra thứ tự chính xác. Quà cũ không bị trừ/cộng lại.
- C2.2b: Trạng thái phong bao `SENT` hiển thị **Đã gửi — chưa có xác nhận
  NPC đã nhận**. Không giả định NPC đã đọc/nhận vì hiện chưa có endpoint
  phản hồi độc lập hay ví NPC; `RECEIVED` dành cho một lần xác nhận thật
  trong tương lai. Mốc giờ hiển thị trên thẻ. Không chuyển tiền hoặc
  phát thưởng chỉ vì render thẻ.
- C2.2c: Tinh gọn chữ trong Điện thoại dành cho người chơi. Liên lạc,
  Sổ Tay, phong bao, Kho, Ví Xu, Nhiệm vụ, Cửa hàng, Bảo tàng và hình nền
  dùng thông báo ngắn theo ngôn ngữ gameplay, không lặp lại các từ Firebase,
  Firestore, Rules hay tên nơi lưu dữ liệu trong thao tác thông thường.
  Cảnh báo ràng buộc vẫn có (phong bao 3 lần/ngày, hồi 5 phút; tính năng
  chưa mở vẫn khóa). Thông tin model AI trong bóng chat chỉ hiện khi bật
  bảng tùy chọn AI; chi tiết lỗi còn ở console và khu vực chẩn đoán.
  Đợt này chỉ đổi câu chữ/cách trình bày, không thay giao dịch, tỷ lệ
  thưởng, UID, quyền sở hữu, Rules hay dữ liệu tài khoản.
- Những lần gọi lưu *toàn hồ sơ* đã bắt đầu trong cùng tab được chờ hoàn
  thành trước giao dịch mới; không gửi `saveCurrentAccount()` từ kết quả
  C2.2. Tuy vậy, **lưu hồ sơ cũ ở các chức năng khác và nhiều tab/thiết bị
  vẫn có thể ghi đè trạng thái mới**. Đây là nợ đồng bộ cần xử lý ở C2.3
  trước khi đặt trạng thái live-production hay làm reset mùa.

Kiểm thử máy: 132/132 tập Node đạt sau khi thêm giao dịch quà/phong bao,
bao gồm retry cùng ID, từ chối không trừ đồ, Xu thiếu, cooldown và quyền UID;
2 kiểm tra Phone manifest/lifecycle đạt. Chưa có kiểm thử thực bằng đăng
nhập và Firestore Rules production. Không cập nhật hay deploy Rules, không
reset tài khoản, không thay Worker trong đợt này.

## C2.3 — tiến độ và phần việc tiếp theo

Đợt giao diện C2.3a: Cửa hàng trên main chỉ còn tiêu đề `Cửa Hàng Xu`
và số dư ở đầu trang. Bỏ hẳn thẻ `DUDU MARKET · Ví Xu cá nhân`, không
hiện tiêu đề DUDU MARKET lần hai hoặc số dư trùng trong danh mục mua sắm.
Vẫn giữ các thẻ Mua sắm, Vị diện, Kỷ vật, Theo truyện, Chức năng và thanh
tìm kiếm. Các nhắc nhở có ích ở thẻ không bán được vẫn xuất hiện. Đây chỉ
là đổi trình bày; không sửa giao dịch mua, UID, số Xu, Kho, hoặc Rules.

### C2.3b — chống ghi đè hồ sơ giữa các tab (đã triển khai mã nguồn)

- `saveCurrentAccount()` trên tài khoản main dùng `DuduProfileSaveC23` thay
  cho `.set(cloudData,{merge:true})` mang cả Xu, Kho, nhiệm vụ và `storyStates`
  cũ lên máy chủ. Sandbox vẫn giữ cơ chế lưu trước đây.
- Khi đăng nhập, hồ sơ đã đọc từ máy chủ trở thành mốc đối chiếu; mỗi lần
  lưu chỉ ghi các nhánh thực sự thay đổi. Giao dịch đọc hồ sơ mới nhất và
  hợp nhất phần không xung đột, giữ nguyên biên nhận phong bao, quà và Kho
  vừa ghi bởi tab hoặc thiết bị khác. Các lần lưu cùng tab được xếp hàng.
- Nếu cả hai thiết bị thay đổi cùng một trường, không tự suy đoán bên nào
  đúng: giữ bản máy chủ, chặn ghi đè tiếp trên trường đó và nhắc người chơi
  tải lại. Đổi tài khoản/hồ sơ sẽ hủy hàng đợi chưa bắt đầu của phiên cũ.
- Có kiểm thử mô phỏng giao dịch, hai phiên dùng chung hồ sơ, thay đổi NPC
  khác nhánh, xung đột Xu, đăng nhập mới và đổi UID. **Chưa kiểm thử với hai
  UID thật hay Rules production; chưa có biên nhận chống cấp trùng phần
  thưởng đọc/nhiệm vụ từ client cũ.** Đây là bước bảo vệ trung gian, không
  coi là hoàn tất di trú kinh tế. Không deploy Rules, không reset người chơi.

Việc còn phải làm:

1. Đối chiếu C2.3b trên nhiều tab/thiết bị thật; bổ sung biên nhận có xác
   nhận cho thưởng đọc, nhặt đồ, EXP và nhiệm vụ trước khi coi Xu/Kho là an toàn.
2. Kiểm thử 2 UID thật: quà nhận, quà từ chối, phong bao, reload,
   đảm bảo tài khoản A không thể ghi vào tài khoản B; xác minh Rules đã
   triển khai và chính sách đọc/ghi.
3. Rà soát các chức năng Sandbox còn lại (ký gửi, Arcade,
   phần thưởng FUN, liên lạc) và chốt phạm vi Rules trước reset.

### C2.3c — phần thưởng đọc, nhiệm vụ, nhặt đồ (đã nối mã nguồn)

- Tài khoản main đọc/mở chương qua giao dịch UID, dùng `readRewards` cũ
  để chỉ cộng **5 EXP lần đầu** mỗi chương. Theo ngày UTC, mỗi chương góp
  một lượt nhiệm vụ đọc; vào lại cùng ngày không cộng lặp. Mốc chính tuyến
  chương 1 chỉ tính cho truyện gốc `truyen-dien-vl`/`ch-1`.
- Nhiệm vụ main chuyển từ chế độ xem sang **Nhận thưởng** bằng giao dịch,
  đối chiếu định nghĩa thưởng có sẵn, tiến độ và lịch sử đã nhận trong cùng
  tài khoản. Không nhận trùng khi bấm hai lần hoặc mở tab khác.
- Nhặt đồ Điện thoại có biên nhận theo lần, hồi chiêu **15 phút** lưu trên
  hồ sơ. Nhặt bảo trong chương dùng vị trí xuất hiện theo tài khoản/chương,
  chỉ thử một lần dù thành công hay thất bại; vật phẩm/EXP/Xu và đánh dấu
  lượt nhặt được xử lý trong cùng giao dịch. Dùng công cụ nạp hồi chiêu hoặc
  gia tốc đã mua cập nhật cả mốc hồi chiêu của tài khoản chính.
- Các mốc nhận thưởng được tính từ catalog và quy tắc đã có; **không chấp
  nhận số Xu/EXP hoặc tên vật phẩm do giao diện gửi vào**. Việc viết truyện
  trên main chưa phải hoạt động đủ điều kiện nhận EXP của người chơi, nên
  ngừng cộng EXP theo nhánh tác giả cũ; Sandbox giữ nguyên.
- Trường dữ liệu mới gồm `questV437`, `questsDayV43` và
  `storyStates.__duduPersonalProgressC23`; vẫn nằm trong hồ sơ UID hiện có,
  không mở collection cấp phát quà riêng và không deploy Rules.
- **Hạn chế còn lại:** mở chương chưa xác thực thời lượng/đọc xong; random
  và ngày trên client chưa có xác thực máy chủ độc lập. Đây là biên nhận
  chống cộng lặp cho người chơi thông thường, **không phải chống gian lận**.
  Cần kiểm tra thực tế ít nhất hai UID, nhiều tab, thiết bị Android và Rules
  hiện hành trước khi reset mùa hay phát thưởng công khai quy mô lớn.

Rollback C2.1: revert commit mã nguồn; bản ghi yêu thích/hỏi thăm đã thực
sự được người dùng thực hiện sẽ được giữ lại trong hồ sơ, không xóa tự động.

### C2.4a — đồng bộ hình vật phẩm Cửa hàng và Kho (giao diện)

- Cửa hàng main sử dụng **cùng trình dựng ảnh SVG theo phẩm cấp** với Kho,
  không còn trộn emoji ở quầy bán với ảnh riêng ở hành trang. Ký gửi thử
  trong Sandbox cũng dùng khung ảnh này; giữ tên, ID, nguồn sở hữu và giá.
- Mỗi món trong 12 hàng phổ thông đang bán và 4 công cụ tiêu hao có hình
  biểu trưng đúng công dụng. Các vật phẩm vị diện cũ chuyển sang biểu tượng
  theo loại (pin, bản đồ, khóa, sổ, băng cassette, gương…) thay vì chung
  hình kiện hàng. Hình kiện hàng chỉ còn dành cho hai vật phẩm thực sự là hộp.
- `archived` và `published:false` không xuất hiện trên quầy hàng; riêng món
  lưu trữ cũ `e1` trước đó đã không thuộc danh sách được mua. **Không xóa**
  hồ sơ, vật phẩm đã sở hữu, bản ghi vật phẩm, item ID hoặc thay bảng rơi
  quà của các thế giới; không tự bỏ vật phẩm có vai trò trong truyện chỉ vì
  trước đó chưa có tranh minh họa riêng.
- Đồng bộ cache các script/CSS để điện thoại tải minh họa mới; giữ nguyên
  giao dịch mua/dùng/bán, UID, Xu, EXP, Firestore Rules và trạng thái mùa.
- 137/137 bộ Node đạt, kiểm thử nội dung ảnh và việc không thay dữ liệu sở hữu.
  Chưa xác minh hiển thị trực tiếp trên Android và hai UID thật.

### C2.4b — chủ dự án bỏ tính năng tặng quà cho tác giả

- Không chuyển nhánh tặng quà/thiệp tác giả từ Sandbox sang `main` và không
  mở hộp thư nhận quà tác giả. Giữ tặng quà NPC, phong bao và các cơ chế quan
  hệ nhân vật độc lập với tính năng đã hủy.
- Kho Sandbox bỏ thẻ **Tặng** và bỏ hộp tặng truyện trong chi tiết vật phẩm;
  bình luận cá nhân bỏ nút **Đính kèm quà**. Giữ bình luận văn bản bình thường.
- Ẩn lối mở Hộp thư tác giả trên Điện thoại. Các mã và nhật ký Sandbox cũ
  được bảo lưu để tránh mất lịch sử, nhưng không còn đường thao tác tạo quà
  mới từ giao diện người chơi. Chưa xóa hồ sơ hoặc vật phẩm cũ.
- Ưu tiên chuyển **sổ sưu tập/lịch sử Kho**, kiểm tra bán hàng và tiếp tục
  hoàn thiện các tính năng gameplay độc lập; không đưa quà tác giả trở lại
  lộ trình nếu chủ dự án chưa thay đổi quyết định.

### C2.4c — Sổ Sưu Tập và nhật ký vật phẩm trên `main` (mã nguồn)

- Nút **📚 Sổ Sưu Tập** trong Kho được mở cho tài khoản đã đăng nhập. Sổ có
  sáu vị diện, 120 ô khám phá, dùng cùng minh họa món với Cửa hàng/Kho.
  Món chưa từng thấy vẫn là ô bí ẩn; món đã gặp giữ mốc ngay cả khi bán hoặc
  dùng hết. Bên dưới có Nhật ký vật phẩm gần đây: mua, dùng, bán, nhặt trên
  Điện thoại, nhặt trong chương, quà nhiệm vụ, tặng NPC và mở gói tiếp tế.
- Lưu `storyStates.__duduCollectionC24` theo đúng UID trong hồ sơ hiện có.
  Mốc được thêm **trong cùng giao dịch** với thay đổi Kho/Xu/quan hệ hoặc
  thưởng, không có lệnh cấp phát vật phẩm riêng. Mỗi mã sự kiện chỉ xuất hiện
  một lần; vật phẩm phải khớp danh mục hiện hành. Tối đa 90 sự kiện mới nhất;
  những mốc cũ bị đẩy khỏi nhật ký theo giới hạn lưu trữ.
- Tự hiển thị biên nhận mua/dùng/bán đã có ở C2.3c và biên nhận nhặt đồ Điện
  thoại từ trước C2.4c, **không sửa lại hồ sơ cũ**. Nếu vật phẩm từ trước
  chưa có biên nhận, Sổ chỉ đánh dấu món hiện còn sở hữu và **không tự bịa ngày
  nhận**. Món vật phẩm cũ đã bán/hết trước khi có nhật ký mà thiếu biên nhận
  không thể khôi phục mốc một cách đáng tin cậy.
- Sandbox giữ Sổ cục bộ như trước; tài khoản main chỉ hiển thị sổ của UID
  hiện tại và xóa nội dung đang xem khi chuyển ứng dụng/tài khoản. Giao diện
  người chơi không nhắc tên nơi lưu hay thuật ngữ lập trình.
- Node: 139/139 bộ kiểm thử đạt sau khi thêm các kịch bản nhận hàng nhiệm vụ,
  dùng tiếp tế, bán, giao dịch lặp, tặng NPC, cách ly hai UID và hồi chiếu
  biên nhận cũ. Hai kiểm tra manifest/vòng đời Điện thoại cũng cần chạy trước
  khi xuất bản. Đây vẫn là giao dịch dựa trên hồ sơ của người chơi và clock
  phía client, **không phải xác thực chống gian lận trên máy chủ**.
- **Chưa reset Xu, quà, Kho, liên lạc hay dữ liệu tài khoản.** Không deploy
  Rules/Functions. Cần kiểm tra với hai UID thật, nhiều tab và Android trước
  khi chốt mùa mới hoặc mở phần thưởng ngoài môi trường thử nghiệm.

### C2.4d — Bán vật phẩm một chạm từ Kho

- Bỏ hộp xác nhận mặc định của trình duyệt mỗi lần người chơi nhấn **Bán**
  trong chi tiết vật phẩm, cả Kho main và Sandbox. Giá thu mua vẫn hiển thị
  trực tiếp trên nút trước khi nhấn; sau giao dịch vẫn có thông báo kết quả.
- Giữ nguyên kiểm tra món đang sở hữu, giá, điều kiện bán, cờ đang xử lý và
  mã giao dịch không bán trùng. Hộp xác nhận **Vứt vật phẩm** vẫn được giữ
  vì đây là hành động xóa vật phẩm không thu về Xu.
- Sửa luôn đường hiển thị Kho cũ để không còn hộp thoại bán lặp trong trường
  hợp giao diện mới không khả dụng. Chỉ đổi trải nghiệm thao tác, không đụng
  Xu, vật phẩm, Rules hay dữ liệu hiện tại.

### C2.5 — DUDU FUN: nhận Xu và vật phẩm thật trong tài khoản main (mã nguồn)

- Hộp Mù và Vé Số **miễn phí**, mỗi loại tối đa một lượt mỗi ngày UTC.
  Hộp Mù: 50% 5 Xu, 25% 9 Xu, 15% bánh quy, 10% cà phê. Vé Số:
  50% 3 Xu, 30% 6 Xu, 15% 10 Xu, 4% 20 Xu, 1% 40 Xu. Đây là **Xu ảo
  trong trò chơi**, không bán vé và không đổi thành tiền thật.
- Lượt chơi main được lưu dưới `storyStates.__duduFunLiveC25` của UID.
  Bắt đầu, chọn biểu tượng/cào ô và nhận thưởng đều đọc trạng thái mới nhất
  trong một giao dịch theo UID. Phần thưởng được xác định trước khi chơi,
  không được đổi kết quả sau khi mở. Mỗi lần bấm có mã chống xử lý lặp;
  lượt đã nhận không cộng lần thứ hai kể cả hai tab gửi cùng lúc.
- Nhận thưởng cộng Xu vào `currency` hoặc thêm **một bản ghi vật phẩm ID chuẩn**
  vào `inventory` ngay trong giao dịch đánh dấu lượt đã nhận. Quà vật phẩm
  cũng có dấu mốc `FUN` trong `__duduCollectionC24`; đồng thời tăng nhiệm vụ
  DUDU FUN hằng ngày và tiến độ sự kiện/tuần (chưa tự nhận phần thưởng
  nhiệm vụ, người chơi vẫn phải nhấn Nhận riêng).
- Kho đầy/đạt trần Xu sẽ **không tiêu mất quyền nhận**; người chơi dọn Kho
  hoặc xử lý trần trước rồi thử lại. Sandbox giữ nguyên phần thưởng cục bộ.
- Dữ liệu `dudu-fun:practice:v51` của các lượt *minh họa* trên main trước
  C2.5 không tự biến thành quà hay được cộng bù. Lượt thật mới được bắt đầu
  trong hồ sơ tài khoản; nạp lại trang sẽ lấy tiến độ đã lưu theo UID.
- Cơ chế dùng RNG và đồng hồ trên client dưới Firestore Standard/Spark;
  có biên nhận chống nhận trùng trong trải nghiệm thông thường, **chưa phải
  RNG chống can thiệp/anti-cheat phía máy chủ**. Không deploy Rules/Functions,
  không reset Xu/Kho/tài khoản. Phải kiểm tra hai UID và Android thật trước
  khi coi là phát thưởng công khai cho nhiều người.

### C2.6 — bảo vệ mùa chơi hiện tại và chốt phạm vi Ký gửi

- Kiểm tra lại nút **Sao lưu và đặt lại tiến độ** có sẵn ở Cài đặt V54: nếu
  người dùng xác nhận đầy đủ, hàm này có thể thực sự ghi đè hồ sơ UID về
  cấp 1, 0 EXP, 50 Xu, Kho rỗng, nhiệm vụ/NPC/quan hệ/hội thoại ban đầu.
  Đây là chức năng **xóa tiến độ tài khoản**, không phải chỉ reset nhân vật.
- Trước khi duyệt Rules và chốt mùa mới, tắt nút reset trên giao diện và
  chặn ngay trong hàm xử lý bằng cờ phát hành cố định `false`. Không có dữ
  liệu hiện tại nào bị xóa. Việc mở lại phải là một đợt phát hành có kiểm
  thử, sao lưu và xác nhận cụ thể của chủ dự án.
- Bổ sung nút **Tải bản sao tiến độ** độc lập trong Cài đặt. Đọc bản hồ sơ
  mới nhất từ chính UID và các dữ liệu cục bộ thuộc tài khoản, xuất JSON
  về thiết bị; không gọi lệnh ghi/xóa, không đưa người dùng vào luồng reset.
  Người chơi cần tự kiểm tra tệp tải về và bảo quản riêng vì có thể chứa
  hội thoại/dữ liệu cá nhân.
- Đấu giá/Ký gửi V43.9 hiện chỉ có lô `AWAITING_SERVER` của Sandbox, không
  có người mua, đấu giá, thanh toán hay đối soát liên tài khoản thật. **Chưa
  mở lên `main`** để không làm giả giao dịch khi chưa có hệ thống ghép người
  chơi và quyền sở hữu phía máy chủ. Main vẫn có mua/dùng/bán về Ví thật
  và Sổ vật phẩm; Sandbox giữ nguyên lô nháp để tham khảo thiết kế.
- Không thay Firestore Rules, Functions, số dư, Kho, vật phẩm hay liên lạc
  của bất kỳ tài khoản nào trong đợt này.

### C2.7 — Arcade Workshop và sổ chốt tính năng main

- Cả ba trò Arcade đã có vòng chơi mở rộng, trang bị có tác dụng thật,
  điều kiện nâng cấp và nút thao tác mới; giữ nguyên dữ liệu Arcade V1 cũ.
- Trạm Neon có ép xung, tản nhiệt và hợp đồng; Địa Tầng 07 có ba địa tầng,
  phá mạch, xe quặng, đèn và chế máy dò; Vườn Sương có ba giống, bốn luống,
  tưới/thu hoạch hàng loạt, câu cá và nâng cần câu.
- Đã đối chiếu nhóm ứng dụng, kết nối Sandbox → main và giới hạn chưa mở
  trong `docs/DUDU-MAIN-FEATURE-CLOSURE-C27-2026-10-30.md`. Arcade vẫn chỉ
  cấp Xu Arcade trên thiết bị; đổi Xu 10:1 và đấu giá thật chưa mở; nút reset
  mùa tiếp tục khóa. Không sửa Rules hoặc hồ sơ người dùng ở C2.7.
