# NPC V2 — Phương án A: Tin tưởng mở giới hạn Thiện cảm
Ngày 15/10/2026. Đã được tác giả duyệt. Chỉ áp dụng ở Sandbox; không merge / deploy.

## Quy tắc trần thiện cảm
- Tin tưởng 0–19: chỉ **được tăng mới** Thiện cảm tới 40.
- Tin tưởng 20–49: có thể tăng mới tới 70.
- Tin tưởng từ 50: có thể tăng mới tới 100.
- Chỉ số Thiện cảm hiện có của save cũ **không giảm** khi vượt trần mới. Ví dụ NPC đã có 95 Thiện cảm / 0 Tin tưởng vẫn giữ 95, không được cộng thêm Thiện cảm cho đến khi Tin tưởng mở trần cao hơn.
- Giới hạn +8/lượt, 3 lượt tính điểm/NPC/ngày UTC, hồi 5 phút và từ chối không mất vật phẩm không thay đổi.

## Quyết định quà
- Tính Tin tưởng có thể tăng từ món quà phù hợp đầu tiên trong ngày (+1), sau đó áp dụng trần Thiện cảm từ mức Tin tưởng mới.
- Quà trung tính khi đã chạm trần và không còn lợi ích quan hệ sẽ được từ chối, không trừ kho.
- Quà hợp sở thích có thể được nhận khi chỉ tăng Tin tưởng, dù Thiện cảm đã chạm trần. Lời thoại/UI phải thông báo chính xác cộng bao nhiêu ở từng chỉ số.
- Không giảm thiện cảm do quà không được nhận; không sử dụng văn bản AI để quyết định thay đổi chỉ số.
- Chưa có dịch vụ xác minh máy chủ về quà hoặc quan hệ: R2 và R3 chỉ là gameplay thử nghiệm cục bộ.

## An toàn dữ liệu & lộ trình
- Giữ nguyên UID/storyId/NPC ID, kho, history và affinity các tài khoản cũ.
- Màn hình Cyber Phone hiển thị trần mới trong `?sandbox=1`, không thay đổi website chính.
- Giai đoạn Trusted/Bonded và tiết lộ nội dung riêng vẫn cần mốc truyện được tác giả phê duyệt và có bằng chứng độc lập. Không suy từ thiện cảm hay tin tưởng.
- Trước khi phát hành thật: kiểm thử hai tài khoản, retry, browser mobile/desktop, đồng bộ save và backend có thẩm quyền.
