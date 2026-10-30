# DUDU Studio — Cyber Phone C1: đồng bộ Sandbox / tài khoản cá nhân

Ngày: 30/10/2026. GitHub main trước C1: e2089121 (L2A Kho cá nhân).

## Mục tiêu đợt C1

Đồng bộ danh sách app và điều hướng trước khi nối nghiệp vụ thật. Không nhầm việc
**đã có giao diện** với **đã có quyền ghi Xu, tặng quà hay tính thưởng**.

## Đã làm

1. Đưa wallet (Ví Xu) và arcade (Arcade) vào DuduPhoneAppsV67 cùng 14 app
   có trước. Cả hai mount và renderer đã tồn tại trên main, nhưng thiếu trong
   inventory V67 khiến lifecycle không nhận được app đang ở foreground.
2. Bộ DuduPhoneLifecycleV671 giữ nguyên kiến trúc, nhưng có thể theo dõi đủ
   16 app nhờ dùng manifest. Kiểm thử giả lập chuyển chat → shop → wallet →
   arcade → home và thay đổi tài khoản; không xóa lịch sử.
3. Ví Xu nói rõ số Xu Arcade chỉ lưu cục bộ, nút “Xem trước mức đổi Xu” mở
   bảng tỷ lệ, còn nút chuyển thật vẫn **bị khóa** chờ Rules kiểm thử. Không
   bật cờ DUDU_SPARK_EXCHANGE_V1_READY và không phát thưởng mới.
4. Nút Phong bao ở tài khoản thường được đánh dấu **🔒**, vô hiệu hóa rõ
   ràng vì chỉ có logic chi Xu ảo Sandbox. Nếu gọi hàm thủ công, chỉ báo
   “chờ Rules”, không trừ Xu. Sandbox giữ gửi phong bao ảo như cũ, và tính
   năng Quà của tài khoản thường không bị thay đổi trong bản vá này.
5. Bổ sung test bao phủ mount/route, điều hướng Wallet/Arcade và khóa
   phong bao ở tài khoản thường. Sửa lỗi regex có sẵn trong bài kiểm tra
   manifest khiến trước đây khó chạy kiểm tra riêng.

## Chưa triển khai / không đụng đến

- Không thay đổi hoặc triển khai Firebase Rules/Functions, không sửa quyền
  Firebase Auth, không sửa Cloudflare Worker.
- Không di chuyển quà, phong bao, NPC liên lạc, sổ sưu tập, thư tác giả hoặc
  log giao dịch từ Sandbox thành dữ liệu thật. Các mô-đun cần schema và test
  quyền sở hữu/khử giao dịch trùng trước khi bật.
- Không reset Xu, số dư Arcade, inventory, quà, tin nhắn hay quan hệ NPC của
  bất kỳ UID nào. Đợt reset mùa mới chỉ thực hiện **sau** một lần đối chiếu
  Rules, sao lưu và thử trên một tài khoản đã chọn.
- Không đồng bộ minigame cục bộ giữa thiết bị, không gán Xu/EXP thật từ game.
- Không thay đổi Vạn Giới, truyện/EPUB hoặc ảnh người dùng.

## Kiểm thử và nghiệm thu

- Chạy riêng node tests/phone-app-contract-v67.cjs,
  node tests/phone-lifecycle-v67-1.cjs và
  node --test tests/red-packet-v32.test.cjs.
- Chạy toàn bộ node --test tests/*.test.cjs, rồi git diff --check.
- Trên GitHub Pages khi đăng nhập một UID: mở Ví Xu → Arcade → quay về
  Cyber Phone → NPC Liên lạc; xác nhận không có nút chuyển Xu thật, Phong
  bao hiển thị khóa, Quà không bị mất, số dư giữ nguyên. Kiểm tra lại bằng
  ?sandbox=1 để xác nhận phong bao ảo vẫn dùng được.
- Browser/mobile E2E chỉ được ghi nhận khi chạy thật; bộ kiểm thử DOM giả
  không thay thế xác nhận trên thiết bị.

## Điểm tiếp nối C2

Audit/migration thiết kế cho Quà — Kho — Liên lạc/quan hệ NPC; xác định
trường ghi dữ liệu, UID sở hữu, trường dùng chung/riêng Sandbox, lưu lịch
sử & phương án rollback. Chỉ sau đó chuẩn hóa Firestore Rules trong một lần
chốt, chưa tự bật chuyển Xu/phong bao.

Rollback mã C1: revert đúng commit C1; dữ liệu tài khoản không đổi.
