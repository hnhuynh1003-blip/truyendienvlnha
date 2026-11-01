# C4.43 — Quay lại Mục lục và trở về vị trí đọc sau tải lại

## Trải nghiệm

- Khi đọc chương dài, thanh nhỏ **‹ Mục lục / ↑ Đầu trang** luôn có thể chạm ở góc trái dưới màn hình; Cyber Phone vẫn ở góc phải, không che nút điều hướng.
- Vuốt **Trở lại** của trình duyệt khi đang đọc đưa về bìa và Mục lục của đúng tác phẩm, không đi thẳng ra khỏi website. Nút Mục lục trong trang và thanh nổi vẫn hoạt động bằng một lần chạm.
- Nếu tải lại trang **ngay khi đang đọc**, phiên tab này tự mở lại đúng truyện, đúng chương và vị trí cuộn gần nhất. Một khi đã chủ động rời trang đọc, tải lại sẽ không tự mở chương cũ.
- Nếu sang trang mới/tab mới, dùng dấu trang **Đang đọc / Đọc tiếp** đã có ở Trang chủ hoặc Tủ sách; không tự mở chương một cách bất ngờ.

## Ranh giới dữ liệu

- Chỉ thêm một khóa `sessionStorage`: `dudu-reader-current-tab-c443`. Khóa ghi mã tài khoản sandbox/live, ID tác phẩm, ID chương, chỉ số chương, `scrollTop` và thời điểm. Hết hiệu lực sau bảy ngày hoặc khi chủ động rời trang đọc.
- Đối chiếu ID chủ tài khoản, ID truyện và ID chương trước khi mở lại; không bao giờ tự mở nhầm chương hoặc dữ liệu tài khoản khác.
- Không thay đổi khóa bookmark V56.8, Firebase, EPUB, quyền người dùng, phần thưởng đọc, Xu hay Firestore Rules. Các luồng lưu dấu trang cũ vẫn giữ nguyên.
- Giữ đường lui nếu `sessionStorage` hoặc History API bị chặn; người dùng vẫn đọc và bấm Mục lục bình thường.

## Kiểm thử

- `node --test tests/*.test.cjs`
- `node tests/browser-library-reading-return-c443.cjs` trong Chromium Sandbox: 320/390px, không chồng nút điện thoại, ghi nhớ cuộn, reload, Back về Mục lục, không nhân đôi EXP, không có ghi dữ liệu ngoài.
- GitHub Actions chạy kiểm thử trình duyệt kể trên và Pages trên `main`.
