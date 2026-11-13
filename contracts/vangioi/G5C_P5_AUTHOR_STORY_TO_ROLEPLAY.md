# G5C-P5 — Tác giả tự viết: Tầng Mây 9 → World Creator schema → nhập vai

**Ngày:** 28/10/2026. **Nền:** G5C-P4 `2a5a9305e899722a9c04eeaeb50b06636658eabf` (Smoke/Browser/Pages SUCCESS). **Nguồn yêu cầu:** An Du thấy thử Bến Sương vẫn giống pilot Quan Đạo, font khó đọc, việc chọn thân phận thiếu cảm giác hệ thống. Chủ dự án yêu cầu tự viết **một truyện gốc có Canon** để thử hành trình tác giả dựng thế giới chứ không thêm game chọn đáp án đơn lẻ.

## 1. Truyện nguyên gốc là đầu vào bắt buộc

`contracts/vangioi/samples/tang-may-9/BAN_GHI_SO_0_TAC_PHAM_GOC.md` là nguyên tác sáng tác cho đợt thử: **Tầng Mây 9 — Bản Ghi Số 0**, Thiên Khâu năm 2187, 3 chương tạo thành Arc 1. Có nhân vật, quan hệ, xung đột đạo đức, thời gian, sự kiện nguyên nhân/hệ quả và **Story Bible bất biến**. Kết thúc chính thức cố ý dừng ở ngưỡng quyết định; game thể hiện nhánh *what-if*, không sửa chương gốc.

Chuỗi chuyển đổi có thể kiểm chứng:

1. **Nguồn truyện:** build script tách 3 chương từ bản thảo Markdown, dùng `hashAuthoringJson(chapters)` pin `world.storySource.contentHash` và bản nguồn.
2. **Hồ sơ World Creator:** dựng `world-content-1` có 4 profile theo đúng 3 mode, nhân vật đã tồn tại/NPC, 3 place và 11 scene/view, bản đồ, metadata ảnh thực SHA-256, events/objective/ending. `parseDraft` và G3C thực của Creator kiểm cấu trúc/đường đi. Không cấp quyền author/owner/publisher từ dữ liệu client.
3. **Kịch bản chơi:** `SCI_FI_STORYBOARD` gắn **tất cả 11 scene** với một chương và lý do chuyển thể. G4A allowlist flag+enter_scene quản lý điều kiện, G4B RAM revision/eventId/replay giữ truy vết, kết cục không tự trở thành Canon/mission proof.
4. **Bàn viết trực tuyến:** `playtests/tang-may-9/` có chỉnh sửa chương và lời dẫn/thoại cảnh ngay trên trình duyệt, bấm **Kiểm tra bản thảo & chạy thử** sẽ tính lại local source hash, world pin và script pin, rồi chạy `prepareAuthorRoleplayOffline`. Thử sửa chương 1 sẽ hiện trích đoạn mới ở cảnh có provenance; sửa lời cảnh đổi thật lời dẫn trong gameplay. Bản thử không lưu ra server hay IndexedDB và không giả mạo quyền của Creator thật.

## 2. Vì sao khác demo Quan Đạo/Bến Sương

- **Truyện có nguồn đọc được:** ba chương văn xuôi có nhân vật Lam/Khải/Nhi/Tuyên và manh mối bản ghi số 0. Không tạo kịch bản chỉ từ hai câu lựa chọn.
- **Vai thật và điều kiện khác nhau:** Lam (vai chính) vào kho dữ liệu; Khải (vai phụ) vào trạm cơ khí; Nhi (nhân vật nền/người qua đường) quen nhân chứng; K-07 (thân phận ảo) không được vào kho cho đến khi tìm thấy dấu vết và thuyết phục ông Tuyên. Không đặt NPC trùng người đang nhập vai.
- **Ba kết cục giả định:** công bố có đủ bản ghi+lời khai; cách ly tín hiệu sau khi hiểu vòng lặp; Nhi chuyển băng trực tiếp cho gia đình. Không có chuyện chọn một lời thoại bất kỳ là tự động lấy quyền hoặc cấp thưởng.
- **Trình bày kiểu thiết bị hệ thống tương lai:** nhãn hồ sơ, revision, mã nguồn chương, lựa chọn quyền, giao diện xanh neon/amber. Phần văn bản dài dùng font hệ thống sáng, lớn và khoảng dòng rộng để đọc trên di động; không dùng serif trang trí cho lời truyện.
- **Ảnh mới riêng cho tác phẩm:** thành phố, kho lưu trữ, trạm tín hiệu, 4 portrait, NPC ông Tuyên — tạo cho synthetic demo rồi chuyển WebP, hash bytes khớp world assets, không dùng liên kết ảnh bên ngoài. Vẫn cần QA thiết bị/cắt ảnh và review pháp lý cho mọi phát hành thật.

## 3. Quyền và ranh giới

- Trang **trong khu VẠN GIỚI** thay thẻ Bến Sương P4 bằng thẻ *Tầng Mây 9 — Mở bàn viết*. Trang Bến Sương cũ vẫn truy cập trực tiếp và CSS được cải thiện chữ đọc.
- Đây là **browser-only author sandbox công khai**, không phải bật quyền `isAdmin/canEditStories`, không thay hoặc tự điền dữ liệu vào nháp riêng của World Creator thật. Dữ liệu đúng định dạng để import và kiểm, nhưng phiên sửa trên trang test **không đồng bộ sang Creator**. Việc kết nối editor thật cần một hợp đồng riêng về quyền, lưu nháp và asset rights.
- Không nhúng giao diện này vào Thiên Mệnh hoặc Chủ Thần; không sửa account, Thư viện/EPUB, Firestore Rules, Cloudflare production, truyện Canon thật hay 48 seed.
- Nội dung người chơi nhập chỉ được ánh xạ vào **choice hiện khả dụng**, không gọi AI và không viết rule/ending/role. `story.secretTruth` nháp riêng được redacted trước khi đóng public bundle. Script hash chỉ là nhất quán client, **không phải chữ ký/issuer hay quyền cấp EXP/Xu/Kho**.

## 4. QA phải đạt trước khi giao link

- Unit: nguồn có 3 chương >1.500 ký tự/chương, Story Bible/Arc, scene-to-chapter đủ 11, tất cả 8 ảnh actual bytes/hash, Creator parser G3C valid, 4 mode roles, K-07 bị chặn quyền, hai chứng cứ mới được công bố, ba ending có hệ quả, thử tác giả sửa chương/scene và repin, G4B retry và forgery fail closed.
- Browser: Chromium tự thử sửa văn bản nguồn/lời cảnh → chơi 4 vai → 3 kết cục, có ảnh và NPC đúng sự kiện, ý định tự cấp EXP bị chặn, responsive 320–1280 px, chỉ tài nguyên same-origin.
- Workflow `phase1-smoke.yml` build lại `author-content.json` + `app.js` và `git diff --exit-code` để từ chối artifact stale; kiểm toàn dự án, browser, Pages theo **SHA commit P5**, không lấy thành tích P4 làm chứng nhận.
- Trạng thái bất biến: `worldPublished:false`, `missionCompleted:false`, `endingVerified:false`, `rewardAuthorized:false`, `rewardCommitted:false`, `saveCommitted:false`, `productionAuthorized:false`, `rightsVerified:false`, `deviceVerified:false`.

**Rollback:** revert fixture world, script/builder, source truyện, trang thử/asset, test, card Vạn Giới và tài liệu. Không có migration, tài khoản, thưởng hoặc save server phải khôi phục.
