# DUDU V44.5 — Phòng thử nghiệm đa nhân vật (chỉ Sandbox)

Ngày 17/10/2026 · Dự kiến URL kiểm tra: `https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=44-5`

## Mục tiêu
Tạo được một phòng thử nhỏ ngay trong Cyber Phone để mô phỏng bình luận và vòng đời chuyển quà giữa 3 vai trước khi chạy Pilot V45 bằng 3 UID Firebase thật.

**Phòng thử không phải một máy chủ nhiều tài khoản.** Độc giả A, Độc giả B và Tác giả là vai *giả lập* trong một phiên dữ liệu cục bộ trên trình duyệt. Không có xác thực UID, không tạo hồ sơ Firebase, không gửi dữ liệu sang Cloudflare, không có quyền tác giả thật, không chuyển quyền sở hữu vật phẩm thật.

## Đã thiết kế / triển khai

- **🧪 Phòng thử** xuất hiện trên trang chủ Cyber Phone chỉ khi `?sandbox=1`; chế độ chính thức không có đường thao tác mở.
- Dữ liệu duy nhất lưu trong `localStorage['dudu-v445-multi-actor-lab-v1']`; không đọc hoặc ghi các khóa `userProfile`, tiền, Kho, nhiệm vụ, lịch sử NPC, bình luận thực hoặc Hộp thư tác giả.
- Ba vai A, B, AUTHOR với **6 vật phẩm thử nghiệm** mượn *định nghĩa* từ catalog (không trừ hay cộng món trong Kho của người chơi).
- Đổi vai, tạo bình luận cho **một truyện và một chương giả**, trả lời một cấp, đính kèm một món, chọn người nhận là một vai khác.
- Một vật phẩm ở một thời điểm chỉ có một nơi giữ: `USER:actor` hoặc `ESCROW:transferId`. Các trạng thái quà: `PENDING → ACCEPTED / DECLINED / CANCELLED`. Người nhận được nhận/từ chối; người gửi được hủy. Từ chối/hủy trả về **cùng instanceId** cho người gửi.
- Nhận hai lần không sinh ra bản sao; gửi lại cùng `requestId` trả kết quả idempotent; thay đổi nội dung nhưng tái dùng mã sẽ bị từ chối. Người không sở hữu món không thể gửi; người không phải người nhận không thể ACCEPT.
- Có công tắc **Ngắt mạng / Kết nối lại** để kiểm tra không thay đổi state khi mô phỏng lỗi mạng. Việc lưu localStorage thất bại cũng không cập nhật state trong bộ nhớ.
- Có kiểm tra toàn vẹn trạng thái: ID vật phẩm duy nhất, sổ ký gửi trỏ đúng món, không có escrow mồ côi, vật phẩm phù hợp với định nghĩa catalog, số món không thay đổi. Nếu dữ liệu lưu sai, UI yêu cầu khởi tạo lại, không tự nhập dữ liệu bẩn.
- Nút **Đặt lại dữ liệu thử** cần hai lần xác nhận trong màn hình. Không bao giờ đặt lại dữ liệu Kho Sandbox hoặc Firebase.
- Bố cục thẻ gọn cho Cyber Phone, mọi nội dung bình luận được ghi bằng `textContent`, không chèn HTML.

## Luồng dùng thử
1. Vào `?sandbox=1`, Cyber Phone → 🧪 Phòng thử.
2. Chọn Độc giả A, điền bình luận, chọn Bánh Quy thử nghiệm và người nhận Tác giả.
3. Gửi → quan sát `PENDING`, vật phẩm vào ký gửi.
4. Chọn Tác giả → mở **Thư đến** → **Nhận quà** hoặc **Từ chối**.
5. Đổi sang A để xác minh món đã chuyển, trả lại hoặc hủy theo trạng thái; dùng B để kiểm tra riêng biệt.
6. Dùng công tắc **Ngắt mạng**, thử gửi, kiểm tra không phát sinh bình luận/đồ. Kết nối lại.
7. Mở lại trang để kiểm tra key riêng được lưu. Đặt lại phòng thử nếu muốn lặp lại kịch bản.

## Tiêu chí nghiệm thu
- [ ] Không tạo thêm item khi nhận hai lần hoặc gửi lại yêu cầu.
- [ ] Trừ một món *khỏi ví mô phỏng của vai gửi* tại thời điểm lập giao dịch, **không** trừ khỏi Kho chính.
- [ ] Đúng vai gửi/nhận, không tráo UID/author thông qua trường client giả.
- [ ] Từ chối/hủy không trùng bản sao và không thay đổi Xu, EXP, nhiệm vụ.
- [ ] Ngắt mạng, đầy bộ nhớ, chuyển trang, tải lại giữ trạng thái hợp lệ hoặc không áp dụng thay đổi.
- [ ] Có thể đặt lại phòng thử mà không xóa bất kỳ dữ liệu tài khoản thực nào.
- [ ] Chromium mobile smoke, Node regression, Worker/Firebase suites cùng thành công.

## Không thuộc V44.5
Đồng bộ bình luận giữa ba Firebase UID thật, gửi quà thật, đăng nhập Google phụ, liên kết provider của cùng UID, sửa Rules thật, nạp registry tác giả, triển khai Worker, đấu giá, trả thưởng hoặc tăng vật phẩm.

## Sau V44.5
- V44.6: hoàn thiện công dụng vật phẩm, nhãn chức năng, các giao dịch dựa theo nguồn gốc.
- V44.7: trạng thái và UX hộp thư/đính kèm, phục hồi tình huống lỗi.
- V44.8: cân bằng Xu/nhiệm vụ và các giới hạn khai thác.
- V44.9: tổng rà soát Sandbox rồi Pilot V45.0 với nhiều tài khoản Firebase trong **vùng dữ liệu riêng**. Phải có allowlist UID và kill switches server, không phân quyền bằng query string.
