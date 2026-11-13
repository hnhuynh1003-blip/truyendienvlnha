# DUDU Studio — C4.5: Rà soát & nối điều kiện nhiệm vụ thật

Ngày: 30/10/2026. Phạm vi: `main`, hồ sơ Firebase `profiles_v2` của chính người chơi. **Không triển khai Vạn Giới, không reset mùa, không đổi Firestore Rules.**

## Tình trạng 16 nhiệm vụ tài khoản chính

| Nhiệm vụ | Điều kiện từ game | Trạng thái sau C4.5 |
| --- | --- | --- |
| `q_daily_read` | Mở 2 chương/ngày, mỗi chương tối đa một lần/ngày | Tiếp tục giao dịch C2.3 |
| `q_daily_loot` | Nhặt thành công 2 lần/ngày | Tiếp tục giao dịch C2.3 |
| `q_daily_fun` | Nhận vật phẩm Vạn Bảo hoặc kết quả Vé Cào Vạn Phúc | **Nối C4.5**; mỗi loại một lần/ngày |
| `q_daily_npc` | Tặng thành công 1 quà NPC/ngày | **Nối C4.5** |
| `q_daily_dudu` | Điểm danh DUDU một lần/ngày | **Nối C4.5** bằng giao dịch riêng, không cấp Xu trực tiếp |
| `q_daily_tool` | Sử dụng thật vật phẩm chức năng đã sở hữu | **Nối C4.5** trong giao dịch tiêu hao vật phẩm |
| `q_week_read` | Mở 5 chương hợp lệ trong tuần | Tiếp tục giao dịch C2.3 |
| `q_week_loot` | Nhặt thành công 5 lần/tuần | Tiếp tục giao dịch C2.3 |
| `q_week_fun` | Nhận Vạn Bảo/Vé Cào tổng 3 lượt/tuần | **Nối C4.5**, tối đa một lần mỗi loại/ngày |
| `q_week_shop` | Mua thành công 2 món ở Market/tuần | **Nối C4.5**, không tính bán hoặc giao dịch lỗi |
| `q_story_reader` | Mở 6 chương khác nhau kể từ khi bắt đầu | Tiếp tục giao dịch C2.3 |
| `q_npc_gifts` | Tặng thành công 4 món quà cho NPC | **Nối C4.5** trong giao dịch tặng quà |
| `q_npc_visits` | Điểm danh NPC 3 lần hợp lệ | **Nối C4.5**; mỗi NPC tối đa một lượt/ngày |
| `q_event_fun` | Mở Vạn Bảo **và** nhận giải Vé Cào trong cùng ngày | **Sửa điều kiện C4.5**; 2 hộp cùng ngày không thay thế được 1 vé |
| `q_main_intro` | Đọc chương đầu đã định danh của truyện chính | Tiếp tục giao dịch C2.3 |
| `q_main_write` | Tạo/chỉnh chương truyện, chưa có receipt xuất bản xác thực | **Khóa nhận thưởng tài khoản chính**; giữ nguyên dữ liệu cũ |

Các nhiệm vụ ngày/sự kiện sử dụng ngày UTC (đổi ngày lúc **07:00 sáng tại Việt Nam**); nhiệm vụ tuần bắt đầu thứ Hai UTC. Trên UI tài khoản chính, việc làm mới được xem trước **không ghi dữ liệu**; giao dịch hợp lệ tiếp theo mới lưu tiến độ. Các quest đã ghi trên tài khoản cũ được giữ nguyên, không xóa hoặc sửa thành tích lịch sử.

## Luồng chứng thực tiến độ

- `js/personal-quest-events-c45.js`: helper thuần để tiến nhiệm vụ và lưu receipt `__duduQuestEventsC45` trong `storyStates`, tối đa 300 mã. Không cộng ví, EXP hoặc vật phẩm.
- Trong **cùng một transaction hồ sơ chính** với hành động gốc: Market mua/dùng vật phẩm; NPC hỏi thăm/tặng quà; nhận hộp mù/vé cào; điểm danh DUDU. Việc mua vé/mua hộp chưa phải điều kiện hoàn thành; phải nhận kết quả.
- Receipt theo hành động và ngày/lệnh; riêng FUN định danh `box:ngày` và `ticket:ngày`, ngăn việc trả tiền mở nhiều lần để tăng nhiệm vụ sự kiện/tuần.
- Nhận phần thưởng Xu/EXP/vật phẩm vẫn do luồng `js/personal-progress-c23.js` thực hiện bằng transaction riêng, có kiểm tra đã nhận, ngày/tuần, số dư, cấp độ, Kho và lịch sử nhận. Helper C4.5 **không tự phát phần thưởng**.
- `q_main_write` bị từ chối tại chính đường nhận thưởng vì chưa có cách chứng minh hành vi sáng tác từ tài khoản chính; không chỉ ẩn nút trên UI.
- Sandbox giữ nguyên tính năng thử nghiệm. Dòng Xu nội bộ Arcade vẫn tách biệt Xu tài khoản, không mở đổi thưởng.

## Gameplay Arcade được rà soát (không thay đổi luật C4.5)

| Game | Điều kiện tiến trình đang tồn tại | Hướng kiểm tra / bổ sung đợt riêng |
| --- | --- | --- |
| Trạm Neon | 3 hợp đồng theo CPU/trạm/router; 4 mốc theo lượt khách và cấp phòng; thưởng Xu Arcade một lần | Kiểm tra hiển thị điều kiện chưa đạt, thời gian vận hành, hợp đồng đã nhận |
| Địa Tầng 07 | 3 tầng theo lượt đào/đèn; nâng cuốc, máy dò, phá mạch, album 10 loại quặng | Thành tựu sưu tầm có cấp bậc còn thiếu; không tự phát Xu chính |
| Vườn Sương | Cần+mồi, cửa sổ thu cá, cấp hồ, sổ cá; vườn cây và giống mở khóa | Thiết kế mốc bộ cá/kích cỡ, tránh làm người chơi phải kéo nhiều thẻ |
| Ngọc Phường | 5 bãi đá theo số bán và trang bị, khảo sát, cắt, chế tác, triển lãm | Cần bảng thành tựu/chứng nhận riêng theo phẩm ngọc trước khi phát thưởng ngoài Arcade |

**Giới hạn xác minh:** unit tests mô phỏng Firestore transaction; chưa phải xác nhận chạy thành công trên Firebase production và điện thoại thật. Phải chạy smoke test bằng tài khoản chủ sau khi GitHub/Hosting phát hành. Không đụng tới Firestore production, reset mùa, danh sách vật phẩm thật hay dữ liệu truyện.
