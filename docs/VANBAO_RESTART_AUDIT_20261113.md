# Vạn Bảo — kiểm toán khởi động lại, 13/11/2026

Baseline: main 9a449304c7fa44a8275890c1f137e31f6251a92b tại D:/Games/gamedienvl/github/truyendienvlnha. Worktree sạch trước nhiệm vụ. Không tạo nhánh. Đây là kiểm toán source và kiểm thử cô lập, không xác nhận trạng thái dữ liệu tài khoản production.

## Bảng hiện trạng trước batch sửa

| Thành phần | Phân loại | Bằng chứng và giới hạn |
|---|---|---|
| Sảnh Ngũ Tử Trận Các | Đang chạy; có lỗi tích hợp | js/vanbao-lobby-final-f44.js:3,18–19; renderer trực tiếp và tài khoản giả lập chạy. FUN gọi mount trước khi nối stage; ready=false không có lần load async để che lỗi frame.isConnected. |
| Ba tab Kỳ Vận | Bị lỗi | js/dudu-fun-ui-v43.js:1296 gập vào details khi box; css/dudu-fun-v43.css:30 chia hai cột; trái yêu cầu luôn hiện ba tab một hàng. Test tích hợp bổ sung đã tái hiện FAIL trước sửa. |
| Tên hiển thị | Bị lỗi/không đồng nhất với quyết định | index.html vẫn DUDU FUN và Arcade ở launcher/header; chỉ cần sửa nhãn, không đổi fun/arcade hay source thành tựu. |
| Chinh Phục | Đang chạy; lưu giữa ván chưa hoàn chỉnh | 5 nhánh hiển thị. NOVICE/EASY/MEDIUM có 4 thế mỗi cấp. Mở Dễ sau 3 Nhập môn; các nhánh sau dùng min(5,số thế đã phát hành). Lần thắng đầu có win/choice/claim bền vững; chơi lại luyện tập không thưởng. Bàn cờ đang giải trước thắng chỉ nằm trong closure của lobby, reload không tiếp tục đúng các nước đang đi. Không đổi schema để khắc phục trong batch UI. |
| Vô Tận | Đang chạy; chưa có bộ sinh vô hạn | js/vanbao-sessions-f44.js lưu board, moves, boxes, status và phiên bản; chọn ngân hàng theo cấp, tránh 2 thế gần nhất. Chỉ bridge tài khoản hợp lệ được bắt đầu; Sandbox tích hợp hiện không có mock Vô Tận đầy đủ. |
| Đối Cục AI | Đang chạy, không chứng nhận trình độ đại sư | js/vanbao-duel-f44.js: bàn trống, đổi đen/trắng bằng duelCounter; nếu người cầm trắng AI đi đầu. Freestyle >=5, alpha-beta chọn lọc sâu4, ngân sách4500 node, Worker, timeout15s. Tactical và full-game legality test PASS. Không phải solver chứng minh thắng mọi ván. |
| Nhập môn / Dễ / Trung bình | Đang chạy | 4/4/4 thế; logic và browser giả lập đã chạy. |
| Khó / Đại sư giải thế | Chưa phát hành | 0/0 thế; có thẻ chế độ và bảng tỷ lệ dự phòng, Start khóa, không được thu phí. Đối Cục là chế độ thứ sáu riêng, không thay thế ngân hàng Đại sư. |
| 100 thế, tỷ lệ15/25/30/20/10 | Chưa hoàn chỉnh | js/vanbao-puzzles-f44.js và docs/VANBAO_F44_DESIGN.md:5: mới12; còn thiếu11/21/26/20/10 theo5cấp. |
| Solver và chứng chỉ | Đang chạy với12 thế đã phát hành | js/vanbao-chess-f44.js:11 verifyProof duyệt mọi đáp trả O hợp lệ; canonical khử8đối xứng. Test28ca đã chứng minh bank hợp lệ, không trùng canonical và không đi thêm sau thắng. Không dùng thắng AI duy nhất làm chứng minh tổng quát. |
| Thoát / reload | Đang chạy với giới hạn nêu trên | Vô Tận lưu từng lượt, quay về sảnh vẫn resume; chủ động bỏ cuộc tiêu lượt, không hoàn phí. Win/choice pending được giữ. Chinh Phục không lưu nước chưa thắng. |
| Ba hộp, chọn một, nhận lại khi Kho đầy | Đang chạy | vanbao-rewards-f44.js (Chinh Phục), vanbao-sessions-f44.js (Vô Tận); test retry/choice/claim/full inventory/UID đã chạy. Hộp chưa chọn dùng chung hình, không bí mật đối với chủ hồ sơ đọc dữ liệu. |
| Một lượt miễn phí mỗi ngày, sau đó20Xu | Đang chạy trong mô hình hiện tại | dayOf UTC+7, chung các cấp Vô Tận/Đối Cục; seq/id và transaction chống debit lặp; kiểm tương thích lastFreeDay cũ, ngày lùi. Không phải đồng hồ server đáng tin cậy. |
| Kho500, quyền sở hữu/Phôi Thẻ | Đang chạy trong logic và giao dịch giả lập | Giữ itemID, instance provenance, giới hạn500 physical instances, guard750KiB; nhận thất bại vẫn giữ lựa chọn. 19 bảo vật+3PhôiThẻ; Vạn Tượng66ID không đổi. |

## Nguồn và kết quả kiểm thử baseline

- Đã đọc docs/DUDU_F44_FINAL.md, docs/VANBAO_F44_DESIGN.md, engine/puzzles/rewards/sessions/endless/duel/lobby, FUN renderer, CSS và kiểm thử liên quan.
- 28/28 Node: vanbao-chess-f44, vanbao-rewards-f44, vanbao-final-f44, vanbao-final-art-f44, museum-vanbao-v1. Gồm kiểm chứng mọi đáp trả hợp lệ, đối xứng, thắng cuối, replay, debit/claim/retry, full Kho, lỗi Worker và UID.
- Browser baseline: browser-vanbao-main-f44 và browser-vanbao-final-f44 PASS với Auth/Firestore giả. Những bài cũ không bao phủ tab gập hoặc mount không có lần load async; không coi PASS cũ là bằng chứng hai lỗi này không tồn tại.
- Nguồn F4.5/B2B có trong ref work/tutien-world-v1: js/vanbao-puzzle-{model,generator,worker}-f45.js; vanbao-{job-queue,motif-generator,tactics}-f45b2b.js; benchmark và seed/test tương ứng. Không tồn tại trên main; không merge hay kích hoạt trong nhiệm vụ. Chưa chạy lại/đánh giá chuẩn phát hành bộ sinh đó trong kiểm toán này.

## Firebase và kinh tế — chỉ đọc

- index.html:7338 trở đi: bridge tài khoản lấy UID, chờ pendingLiveProfileWrites rồi gọi transaction; currency/inventory/storyStates cập nhật từ kết quả.
- js/vanbao-sessions-f44.js:3–13 và js/vanbao-rewards-f44.js: owner checks + transaction chung profiles_v2. Tests dùng DB/Auth giả, không production.
- firestore.rules:12,201–207: legacy profile là client-mutable của chính UID. Solver, entropy và giờ thiết bị do client thực hiện; không được quảng bá thành backend chống gian lận hoặc RNG bí mật.
- Chinh Phục hiện có thưởng EXP legacy và Xu theo bảng cũ; Vô Tận không thêm EXP. Không đổi nguồn này, không chuyển EXP legacy thành Tu Vi.
- Không đổi coin weights, phí, free entitlement, source/sourceID, instanceID, journal, Kho/Ví, Phôi Thẻ, Firestore Rules hoặc backend.

## Batch sửa nhỏ được chọn

Chỉ presentation: gắn stage trước khi mount, bỏ lớp gập ba tab, đặt ba tab một hàng với touch target44px và nhãn launcher/header Kỳ Vận/Bách Hí. Bổ sung kiểm tra tích hợp không có async load che lỗi, UID/profile nguyên vẹn, mobile320/360/390/430 và desktop. Không phát hành thêm thế hoặc mở Khó/Đại sư.

## Lộ trình cần chủ dự án duyệt

1. Nghiệm thu batch UI và xác nhận hành vi lưu giữa ván Chinh Phục có cần nâng cấp riêng hay không; nếu có, thiết kế tương thích dữ liệu trước khi code.
2. Batch Puzzles01: tối đa4 thế Nhập môn mới, đạt16 tổng. Puzzles02:4Dễ, đạt20. Puzzles03:4Trung bình, đạt24. Mỗi batch chỉ phát hành sau kiểm chứng và duyệt, không xem đây là phạm vi đã chốt.
3. Mỗi thế cần board hợp lệ, ID ổn định, canonical khác tất cả bank+batch, certificate phủ mọi đáp trả hợp lệ và được verifier độc lập chạy lại. Timeout/ngân sách hết là chưa chứng minh, không được phát hành. Test transcript âm, nước cuối, reward replay và tài khoản cũ giữ winID.
4. Sau3batch phân bố8/8/8/0/0, còn thiếu7/17/22/20/10 để đạt15/25/30/20/10. Chia tiếp batch nhỏ; không tạo bản xoay/gương để đủ số lượng.
5. Chỉ thẩm định F4.5/B2B offline ở batch riêng: ngân sách, reproducibility, uniqueness và proof gate. Không đưa generator ngẫu nhiên chưa chứng minh vào ván trả phí.
6. Thử nghiệm Khó/Đại sư bằng dữ liệu đạt chuẩn và UX trung thực; chưa mở Start hoặc áp kinh tế mới. Mọi authority/backend cần phê duyệt riêng.
