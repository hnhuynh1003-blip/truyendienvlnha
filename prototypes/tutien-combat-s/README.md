# Tu Tiên — Slice S + M (MOCK_ONLY)

## MOD-P3 — sinh cảnh, thu hái và túi chiến lợi phẩm

Căn cứ triển khai: MASTER HANDOFF **V1.7 — 07/11/2026** đã đọc qua Google Docs. Mở **http://127.0.0.1:4173/module/index.html?explore=1** và Ctrl+F5. P1, P2 và các prototype cũ vẫn ở các địa chỉ trước, không đổi save.

Luồng: **Tiểu Nham Thú → bãi linh thảo (tùy chọn) → Nham Thú → ổ trứng (tùy chọn) → boss**. Không có bản đồ WORLD hoặc nhiệm vụ bắt buộc.

- **Tiểu Nham Thú:** luân phiên ẩn/lộ thân. Pha ẩn Phòng Thủ 24, pha lộ 6. Các con số này thật sự được Combat Core dùng để trừ sát thương, không chỉ là nhãn. Có thể chờ lộ thân rồi dùng Trảm, hoặc dùng Hàn để giảm nguy hiểm đòn kế, đổi LL lấy HP.
- **Nham Thú:** mỗi đòn đánh tăng 8 giáp cho lượt sau, trần 16; Thủ hoặc Giáp làm rơi lớp giáp sau lượt. Công Kích fixture P3 là 24. Trạng thái giáp và Phòng Thủ hiện tại được báo rõ.
- **Boss:** giữ nhịp MOD-P2 và hai trọng kích liên tiếp, không thêm boss logic hay VFX. Không sửa Combat Core/công thức. Bản thử P3 giữ HP/LL/đan giữa các trận như P2.
- **Linh thảo:** tới cây, kéo thanh lực bằng cảm ứng/chuột hoặc phím mũi tên; bấm Thu hái để chốt. 45–65 thành công; 50–60 là tinh phẩm mock; ngoài vùng hỏng cơ hội. Chỉ thu được một lần trong run. Lực đang kéo là preview chưa commit, reload không cấp vật phẩm hay đổi vùng mục tiêu.
- **Ổ trứng:** chạm ô kề hoặc dùng các phím mũi tên; tránh đất rạn để tới ổ. Vị trí được commit mỗi bước, reload tiếp tục tại đúng ô. Đến ổ nhận một trứng CHƯA ẤP; bước vào đất rạn mất cơ hội nhưng không chặn boss.
- Có thể bỏ qua mỗi sự kiện hoặc rút tại điểm an toàn. Không hồi đầy giữa chuỗi; thua/rút mới được nghỉ hồi HP/LL. Đan đã dùng không hoàn lại.

### Luật loot đã chốt

Chỉ vật phẩm đã ghi thành công mới hiện trong **Túi chiến lợi phẩm mock**. Herb/egg có instance, owner, run, source, quality, timestamp và receipt; tất cả ở inventory của cùng record P3, không có Kho production khác.

**Thua boss hoặc rút lui giữ TOÀN BỘ loot đã commit.** Chưa hạ boss không nhận clear receipt/event của lượt mới. Clear lần đầu ghi một receipt; replay không nhân thưởng. Mỗi run chỉ một cơ hội herb và một cơ hội egg, kể cả thử lại tầng. Không phát tiền, EXP, Tu Vi; chưa luyện đan, ấp trứng hoặc pet.

Nếu cần thử lại cả hai minigame sau khi đã giải quyết cơ hội, mở **Thông tin kiểm thử → Tạo run MOD-P3 thử riêng**. Đây là slot QA khác, không xóa hoặc gộp túi cũ. URL có trial ID được giữ qua reload; địa chỉ `?explore=1` không có trial mở lại run gốc P3. Chính sách hiếm/chống farm giữa nhiều run và tích hợp sở hữu thật chưa được thiết kế.

### Kiểm chứng MOD-P3

- Node: **85 PASS, 0 FAIL**. Chrome aggregate: **63 PASS, 0 FAIL**, gồm toàn bộ hồi quy cũ.
- Raster và input Chrome native: **14 PASS, 0 FAIL** (`run-presentation.mjs <Chrome> --explore`): cảnh herb/nest ở 320/360/390/430px và desktop, native keyboard range, native touch ô trứng, ảnh thua boss vẫn giữ hai món. Raster hồi quy animation/reduced motion: **15 PASS, 0 FAIL**.
- Hai chuỗi không dùng đan đã kiểm được: quái nhỏ Trảm–thường–thường; Nham Thú **Giáp–Trảm–Thủ–thường–Trảm** hoặc **Thủ–Trảm–Thủ–thường–Trảm**; boss Trảm–Hàn–Giáp–thường–Trảm–Hàn. Kết thúc tương ứng HP32/LL2 hoặc HP4/LL5. Đây là đối chứng QA, không phải lựa chọn bắt buộc hay cân bằng canon.
- Module P3 không nạp Ngọc Phường/Library/Pet/Alchemy hoặc dịch vụ thật. Jade policy được tách khỏi phần khởi tạo helper; giao diện MR3 cũ vẫn gọi helper gốc và được hồi quy. Không migration, reset, dependency mới, commit hoặc deploy.
- Chưa kiểm điện thoại vật lý; An Du cần đánh giá khác biệt quái, độ hấp dẫn minigame và cảm giác giữ loot sau thất bại.

## MOD-P2 — một tầng, ba trận và boss

Mở **http://127.0.0.1:4173/module/index.html?waves=1** rồi Ctrl+F5 nếu đang giữ tab cũ. Địa chỉ không có `?waves=1` vẫn mở MOD-P1 và save cũ.

1. **Đi phó bản → Tầng 1 → Bắt đầu**. Không cần nhận nhiệm vụ.
2. Vượt **Tiểu Nham Thú 1/3 → Nham Thú 2/3 → Nham Thú Vương, Boss 3/3**. Sau mỗi thắng thường, bấm Tiếp tục. Không tự nhảy qua trận hoặc cấp receipt tầng trước boss.
3. HP/LL và đan còn lại được mang sang trận kế; không hồi đầy giữa ải. Cooldown, khiên và suy yếu là trạng thái từng trận, bắt đầu lại với encounter mới. Không có điểm nghỉ giữa chuỗi.
4. Boss báo trước **Tụ lực → Trọng kích 1/2 → Trọng kích 2/2 → Cắn**. Hãy cân nhắc Trảm, Giáp và Hàn thay vì chỉ đánh thường.
5. Có thể quay về Tu Tiên rồi vào lại để tiếp tục đúng ải; nút Nghỉ khóa khi chuỗi chưa kết thúc. Thua/rút thì được nghỉ hồi HP/LL, thử lại từ ải 1; không refill đan. Đan không bắt buộc để thắng.
6. Thắng boss lưu receipt/event mock một lần. Chơi lại không phát thêm quyền thưởng. Không phát tiền, EXP, Tu Vi hoặc vật phẩm.

Đây là bản ghi thử độc lập `mod-p2-run-v1` trong cùng mockTrials/IndexedDB v2 và cùng owner fixture. Không chuyển đổi hoặc xóa P1/S/M/MR3, không tạo tiến trình Tu Vi mới. Chỉ số ba đối thủ là cân bằng thử nghiệm, không phải canon.

### Cân bằng MOD-P2 đã mô phỏng

| Cách chơi | Cuối ải 1 HP/LL · lượt | Cuối ải 2 HP/LL · lượt | Cuối boss HP/LL · lượt | Kết quả |
|---|---|---|---|---|
| Ưu tiên Trảm khi sẵn sàng, còn lại đánh thường | 148/35 · 2 | 86/29 · 4 | 0/29 · 3 | Thua boss |
| Phối hợp theo chuỗi đối chứng | 148/35 · 2 | 114/32 · 5 | 28/5 · 6 | Thắng, không dùng đan |
| Phản ứng theo ý định, ưu tiên kết liễu | 148/35 · 2 | 97/29 · 4 | 11/11 · 6 | Thắng, không dùng đan |
| Dùng đan khi mới thiếu 10 HP, sau đó đánh thường | 148/38 · 4 | 86/38 · 4 | 0/38 · 3 | Hết đan, thua boss |
| Lặp Giáp → thường → thường | 148/35 · 5 | 98/35 · 6 | 0/35 · 6 | Thua boss |

Chuỗi thắng đối chứng từ đầy HP/LL: ải 1 **Trảm, thường**; ải 2 **Giáp, Trảm, thường, thường, thường**; boss **Trảm, Hàn, Giáp, thường, Trảm, Hàn**. Đã xác nhận cũng thắng khi bắt đầu với 0 đan. Đây là một mẫu kiểm chứng, không phải hướng chơi bắt buộc hay chứng minh mọi chiến thuật đều đã cân bằng.

Chạy mô phỏng: `node prototypes/tutien-combat-s/tests/simulate-waves.mjs`. Thời gian ra quyết định không giới hạn; không suy thời gian chơi thực tế từ số lượt. Animation 680ms có thể bỏ qua/giảm chuyển động như cũ.

QA MOD-P2: **70 Node PASS / 56 Chrome PASS**, cộng **15 ca raster hồi quy và 6 ca raster boss PASS**. An Du vẫn cần nghiệm thu độ khó/độ vui; chưa kiểm điện thoại vật lý.

## MOD-P1R1 — khôi phục hiệu ứng và sửa clipping

MOD dùng cùng routine animation có sẵn của Slice S qua `battle-animation.mjs`, cùng CSS vệt chém/vòng khiên/suy yếu. Chỉ chạy sau action commit mới; reload/retry không phát lại. Có **Giảm chuyển động** (cả lựa chọn trong trang lẫn thiết lập hệ điều hành) và **Bỏ qua hoạt ảnh**. Không sửa combat/reward/save schema.

Vùng nhân vật MOD có chiều cao riêng và không crop thân bằng overflow hidden. Mobile được cuộn dọc thay vì ép toàn bộ HUD vào 568px. Trang cũ vẫn giữ bố cục của Slice S.

Kiểm chứng raster Chrome bằng `node prototypes/tutien-combat-s/tests/run-presentation.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"`: profile mới, loopback, PNG/report lưu ở thư mục temp. Đây là ảnh QA, không phải asset game. Xem QA.md để biết giới hạn và kết quả hiện tại.

## MOD-P1 — Tu Tiên mini-app và tầng phó bản đầu tiên

Mở **http://127.0.0.1:4173/module/index.html** sau khi chạy server bên dưới. Trang S/M/MR3 cũ tại `/index.html` vẫn giữ nguyên.

1. Màn Tu Tiên hiển thị một nhân vật tọa thiền placeholder và Tu Vi/cảnh giới giả lập chỉ đọc. Đột phá chưa khả dụng; chờ hoặc đánh quái không tăng Tu Vi.
2. Bấm **Đi phó bản → Tầng 1 → Bắt đầu**. Không nhận nhiệm vụ và không qua bản đồ.
3. Chiến đấu bằng năm nút tròn, Đan và Rút lui như Slice S. Nút **Thông tin chiêu** trong trận có mô tả/điều kiện sử dụng bằng cảm ứng hoặc bàn phím.
4. Thắng: lưu thành tích tầng và receipt mock một lần, không phát phôi, vật phẩm, Xu, EXP hoặc Tu Vi. Có thể chơi lại.
5. Thua/rút: về an toàn; dùng **Nghỉ mock** hồi HP/LL trước khi thử lại. Không hoàn đan đã tiêu. Không áp Nội Thương đột phá.
6. Bấm **Quay về Tu Tiên** để kết thúc vòng chơi. Có thể về Tu Tiên giữa trận và tiếp tục sau; địch không tự đánh. Reload khôi phục trận đã commit.

Hai chuỗi đối chứng từ đầy HP/LL: Trảm → thường → thường → thường (thắng, HP74/LL38); Hàn → Giáp → thường → Hàn → Trảm (thắng, HP114/LL17). Thủ 12 lượt từ đầy HP sẽ thua.

MOD-P1 dùng cùng owner mock và database IndexedDB v2 hiện có, một record thử nghiệm cố định `mockTrials[owner:mod-p1-run-v1]`. Không chuyển/copy tài sản từ run S/M/MR3, không tạo ledger Tu Vi mới. Một viên đan là fixture khởi đầu duy nhất của record thử này; mở trang lại không cấp thêm. Record MOD không hiện trong danh sách run S/M/MR3, tránh mở nhầm bằng giao diện cũ.

`DUNGEON_FLOOR_CLEARED` chỉ là sự kiện local trong record, chưa gửi ứng dụng Nhiệm Vụ. Khu **Thông tin kiểm thử** thu gọn chứa receipt/run/revision. Chưa tích hợp DUDU shell, Library, Auth hoặc dữ liệu production.

QA MOD-P1: **61 Node PASS / 51 Chrome PASS**. Chưa thay thế An Du đánh giá trải nghiệm hoặc kiểm trên điện thoại vật lý.

## P2-MR3 — thử helper Ngọc Phường

Khởi động lại server preview sau khi cập nhật (Ctrl+C rồi chạy lại lệnh bên dưới), giữ đúng địa chỉ/cổng cũ để thấy save cũ. Server cũ đang chạy không tự nạp code phục vụ mới.

1. Mở **Run thử riêng**, bấm **Tạo run MR3 — thử ngọc riêng**. Run S/M cũ không được chuyển đổi hoặc xóa.
2. Nhận nhiệm vụ, đến Ngã rẽ. Thắng yêu thú hoặc khảo sát ba dấu hiệu rồi chọn trái để nhận đúng một mẫu linh ngọc. Run MR3 không nhận thêm phôi có thể tiêu từ cùng nguồn.
3. Đến Bàn chế tác; quan sát thủy đầu, vân ngọc, đường rạn. Dấu hiệu gọi trực tiếp `surface/scanHint` của Ngọc Phường gốc, không phải kết luận chắc chắn về phẩm cấp.
4. Chọn **Giữ lõi** để xem trước Hộ Thân, hoặc **Theo vân** để xem trước Dẫn Đường. Đổi lựa chọn được trước khi bấm **Xác nhận chế tác**. Sau commit, một mẫu bị tiêu và một ngọc được tạo; không đổi cấu hình.
5. Trang bị ngoài trận. Hộ Thân tăng D8 lên D10 từ trận mới; Dẫn Đường mở lối ẩn và không tiêu hao. Tại Cửa Sương dùng ngọc hoặc quan sát chọn trái để hoàn thành không cần chế tác.
6. Tạo một run MR3 khác để thử cấu hình còn lại. Danh sách đánh dấu các run MR3; không gộp tài sản giữa run.

Endpoint được duyệt `/__shared/personal-jade-core-v1.js` chỉ phục vụ đúng file gốc bằng GET/HEAD. Không mở thư mục `js`, không copy engine, không gọi `act()`, không đổi CSP/CORS. Vì vậy cần chạy từ worktree có file gốc; chép riêng thư mục prototype sang nơi khác không đủ.

QA MR3: **53 Node PASS / 43 Chrome PASS**, gồm hồi quy S/M. Chạy toàn bộ Node bằng `node --test prototypes/tutien-combat-s/tests/*.test.mjs`.

## Giao diện P2-SR1

- Năm nút tròn: Thường, Thủ, Trảm, Giáp, Hàn. Badge nhỏ hiển thị chi phí Linh Lực và số lượt cooldown còn lại.
- Chạm **Thông tin chiêu**, chọn hành động để xem tên đầy đủ, công dụng và lý do chưa dùng được. Không cần hover; Escape/Đóng trả focus về nút thông tin. Xem thông tin không tạo lượt.
- Đan có số lượng riêng; Rút lui nằm tách khỏi cụm kỹ năng.
- Ở điểm an toàn, HP0 được giữ đúng sau thua; màn hình nhắc Nghỉ mock. HP yêu thú cũ và các nút combat được ẩn, kết quả trước vẫn xem lại được. Không reset dữ liệu.
- Bố cục dọc đã kiểm tra bằng Chrome ở 320/360/390/430px; chưa kiểm trên điện thoại vật lý. Server chỉ nghe loopback của máy đang chạy, không tự mở mạng LAN.
- Kết quả QA hiện tại: **46 Node / 36 browser checks pass**. Xem `QA.md` để phân biệt kết quả hiện tại và bản ghi trước đó.

Prototype độc lập, không dùng runtime DUDU, Firebase, Cloudflare, CDN hoặc tài sản thật. Slice M bổ sung một tuyến ngắn, một nguồn phôi, hai cấu hình ngọc và một nhiệm vụ. Chỉ số là mốc thử, không phải canon.

## Chơi Slice M

1. Tại điểm an toàn, nhận nhiệm vụ **Mở lối qua màn sương**, rồi tới Ngã rẽ.
2. Chọn chiến đấu với yêu thú cũ, hoặc đi Khảo sát: đọc ba dấu hiệu, chọn đường trái theo dải rêu. Cả hai dùng chung quyền nhận **một phôi/run**; làm cả hai không nhận thêm. Phôi cũ từ Slice S được giữ và tính vào cùng quyền đó.
3. Tới Bàn chế tác, dùng một phôi chọn **Hộ thân** hoặc **Dẫn đường**. Chỉ chế một lần, không đổi cấu hình trong run. Trang bị ngọc ngoài trận.
4. **Hộ thân:** +2 Phòng Thủ trong snapshot trận mới; tại Cửa sương đọc dấu gió rồi chọn tuyến Hộ thân. **Dẫn đường:** mở lối ẩn, không cộng chỉ số chiến đấu và không bị tiêu khi dùng.
5. **Không chế tác vẫn hoàn thành:** tại Cửa sương đọc đủ ba dấu hiệu, chọn đường trái. Chọn sai được thử lại, không mất tài nguyên.
6. Đánh dấu tuyến để hoàn thành. Không nhận Tu Vi, EXP, tiền hoặc phôi mới từ hoàn thành nhiệm vụ. Thua/hết đan vẫn có nhánh khảo sát; Nghỉ mock hồi HP/LL như cũ.
7. Mở **Run thử riêng**, tạo run mới để thử cấu hình còn lại. Dùng danh sách để quay lại run gốc hoặc run thử trước. Không xóa, reset, gộp kho hoặc chuyển ngọc giữa run. URL hash ghi run thử đang mở; reload giữ đúng run.

## Chơi thử trên Windows

Mở terminal tại Git root `D:\Games\gamedienvl\github\tutien-world-v1`:

```powershell
node prototypes/tutien-combat-s/serve.mjs
```

Mở **http://127.0.0.1:4173/**. Nếu cổng bận, thêm `4174` vào cuối lệnh và mở cổng tương ứng. Server chỉ nghe loopback và chỉ phục vụ thư mục prototype; không mở entry page DUDU thật. Dừng server bằng Ctrl+C.

1. Bấm **Bắt đầu trận mới**.
2. Đọc ý định địch rồi chọn thường/thủ hoặc ba công pháp.
3. Có một Hồi Sinh Tán, chỉ dùng được khi thiếu HP. Reload không hoàn đan.
4. Thắng lần đầu trong run được một phôi mock; thắng lại không cấp thêm.
5. Khi thua/rút, về điểm an toàn. **Nghỉ mock** hồi HP/LL, không refill đan hoặc phôi.

Hai chuỗi đối chứng từ trạng thái ban đầu đầy HP/LL:

- Tấn công: Trảm → thường → thường → thường. Thắng lượt 4, HP74 / LL38.
- Khiên/suy yếu: Hàn → Giáp → thường → Hàn → Trảm. Thắng lượt 5, HP114 / LL17.

Thủ liên tục 12 lượt sẽ thua. Rút kết thúc ngay, không nhận thưởng thắng. Không có Tu Vi/EXP được cấp từ bất kỳ hành động nào.

## Lưu dữ liệu

IndexedDB riêng: `dudu-prototype-tutien-s-mock-v1`, store gốc `mockRuns`, owner `mock-reader-s`. Phiên bản vật lý 2 bổ sung store `mockTrials`; giữ nguyên record gốc và thêm world state khi đọc. Không xóa trận, đan, command hoặc receipt cũ. Tab phiên bản cũ có thể cần reload sau nâng cấp. Không đọc/ghi namespace sản phẩm. Toàn bộ trạng thái của một run, command, tiêu hao và reward được commit trong một transaction. Dữ liệu local có thể bị chủ thiết bị sửa; **đây không phải authority production hoặc chống gian lận**.

Một run được giữ qua reload và các trận mới. Không có nút reset run/tài sản. Chế độ ẩn danh, trình duyệt hoặc cổng khác có vùng dữ liệu khác. Nếu storage không khả dụng, prototype báo lỗi; không giả lập transaction bằng localStorage.

Màn Library thật không được mở từ prototype. Nút “Về Library?” chỉ giải thích ranh giới; dùng tab Library đang có riêng.

## Kiểm thử cục bộ — không cài package

```powershell
node --test prototypes/tutien-combat-s/tests/core.test.mjs prototypes/tutien-combat-s/tests/repository.test.mjs prototypes/tutien-combat-s/tests/isolation.test.mjs prototypes/tutien-combat-s/tests/presentation.test.mjs prototypes/tutien-combat-s/tests/world.test.mjs
```

Chrome cài sẵn có thể chạy kiểm chứng browser bằng:

```powershell
node prototypes/tutien-combat-s/tests/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Runner mở server loopback cổng tạm, profile Chrome thử riêng trong thư mục temp, chạy IndexedDB/UI/multi-tab checks và dừng browser sau khi nhận báo cáo. Không tải dependencies, không dùng profile/tài khoản trình duyệt thường. Profile tạm không tự xóa đệ quy.

Có thể mở `/tests/browser.html` bằng tay để xem kiểm chứng, nhưng trang này chạy các hành động thử trên **dữ liệu prototype** trong profile hiện tại, gồm một kiểm tra UI có dùng đan mock. Dùng profile thử riêng nếu muốn giữ nguyên trận đang chơi. Hai-tab check có thể cần cho phép popup localhost; không liên quan dịch vụ ngoài.

## Phạm vi và giới hạn

- Một nhân vật, một yêu thú, ba công pháp; không RNG, linh căn, Ngũ Hành, Nội Thương hoặc đột phá runtime.
- Snapshot không dùng số tầng cảnh giới để tính chỉ số; kiếm +4 đã có trong A36.
- CD2: dùng lượt1, sẵn lại lượt4. Khiên và suy yếu tối đa hai pha địch.
- Chỉ ngọc mock được trang bị/tháo ngoài trận; kiếm và luật combat giữ nguyên. Không kinh tế, tài khoản thật hoặc backend.
- Animation chỉ trình bày state đã commit; có giảm chuyển động/bỏ qua.
- Test kỹ thuật không thay thế chơi thử của An Du hoặc nghiệm thu mỹ thuật.
- Không commit/deploy hoặc tự mở rộng ngoài Slice M đã giới hạn.
