# DUDU V71.11 / V72 — Số hiệu hiển thị và hồ sơ 100 Hệ Thống

Ngày 25/10/2026. Nhánh main. UI đã sửa; bộ pool 100 hiện chỉ là bản thiết kế (không chạy trong Worker production).

## A. Giao diện đã duyệt

- Thẻ thay LIÊN KẾT HỆ THỐNG bằng HỆ THỐNG ĐỒNG HÀNH.
- Hệ thống có display ID DUDU-82 nay hiển thị duy nhất số 82 (alias công khai), không còn lặp tên và mã kho quản lý.
- Ngay dưới là tên cá nhân và KC-ID từ Worker, không thêm KÝ CHỦ / ID KÝ CHỦ làm nhãn lặp.
- Khi khế ước đã ký, không thêm lời xác nhận đã ghi server nữa. Khi chưa ký, vẫn yêu cầu consent đúng quy trình.
- Bỏ thông báo chung xác nhận hồ sơ khỏi thông báo thu gọn. Không lộ loại chính quy/lậu, memory, internal ID.

## B. Quyết định hướng phát triển pool V72

**100 hệ thống tổng cộng, đúng 90 chính quy và 10 lậu**, không phải tính trung bình kỳ vọng: các vị trí nguồn gốc được xáo ngẫu nhiên ở thời điểm tạo pool, máy chủ phân phối trong tập đang rảnh. Tỷ lệ 90/10 là thành phần ban đầu, không bảo đảm mọi lượt rút sẽ có xác suất 10% nếu đã có hệ thống bị chiếm.

Mỗi hệ thống có một internal ID bất biến, tính cách/lịch sử riêng, ưu thế riêng có perkKey độc lập, điều kiện phát huy và điểm yếu cân bằng riêng. Chính quy có thể thiên về ổn định và bảo hộ, lậu thiên về linh hoạt và ngụy trang, nhưng mỗi cá thể phải khác nhau; cả hai đều có ưu nhược, không mặc nhiên chính quy tốt và lậu xấu. Các nhóm kỹ năng không được chỉ định để lộ nguồn thật.

Mã hiển thị là alias (có thể trùng nếu hệ thống lậu ngụy trang), không phải khóa ledger. Phân loại origin và chứng cứ luôn ẩn trong Worker, không truy xuất bằng số bên ngoài. Không dùng AI để cấp nhiệm vụ, EXP hay quyền; Game Engine phải kiểm điều kiện theo từng kịch bản.

## C. Trạng thái source và migration

- Đã bổ sung cloudflare/src/dudu-system-pool100-plan.mjs làm bản thiết kế độc lập **không import** vào Worker live: đúng 100 số nội bộ, xáo nguồn 90/10 bí mật, 100 perkKey và advantageDraft khác nhau. Test trong tests/dudu-system-pool100-plan.test.cjs. AdvantageDraft chỉ là ý tưởng biên tập, chưa phải quyền gameplay.
- Worker V71 đang chạy vẫn có **99 hệ thống**, nguồn gốc random với xác suất 18% irregular từng hàng. Không tự sửa nguồn gốc hoặc số nội bộ của những hệ thống đã phân phối.
- Trước migration cần audit read-only số lượng thật/chủ sở hữu/tỷ lệ, không tiết lộ từng nguồn theo số hiệu. Khi migration, chỉ cho phép thêm 100th record và rebalance các hàng **chưa có ký chủ** sau khi được phê duyệt. Không đổi UID/hostId/systemNum/khế ước/EXP/ký ức của hệ đã gắn. Nếu đã có hơn 10 hệ lậu đang sở hữu, không thể bảo toàn nguyên trạng và vẫn đúng 90/10: dùng pool version mới/grandfathering.
- Hoàn thiện biên tập 100 ưu thế: điều kiện, giới hạn, trade-off, cooldown, cấp được phép, phạm vi thế giới; test bằng Game Engine; phê duyệt rồi mới bật hiệu ứng thật.
- Cổng triển khai: backup và khả năng rollback Durable Object, migration idempotent, audit gán đồng thời, không leak origin/khóa, thử trên main backend bằng workflow riêng có xác nhận; không dùng nút frontend để cấp quyền.
- Chưa chạy migration và chưa bật AI trả phí trong thay đổi V71.11.

## D. Luật bất biến

Không động chạm thẻ thông hành, khế ước đã ký, số liệu 8 chỉ số, nhiệm vụ F chưa phát hành, quyền đọc EPUB, dữ liệu người dùng và NPC. Quyền gán system và thưởng vẫn ở server.