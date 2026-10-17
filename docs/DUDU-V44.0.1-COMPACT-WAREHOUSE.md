# DUDU V44.0.1 — Kho gọn cho điện thoại (UI-only hotfix)

**Lý do:** phản hồi ảnh điện thoại 17/10/2026: header, ô tìm kiếm, thanh sức chứa, chip danh mục, bộ lọc, dashboard kho bốn số, bốn tab và nhiều đoạn hướng dẫn nối tiếp khiến ô vật phẩm không xuất hiện ở màn hình đầu.

## Các thay đổi

- Điều hướng 4 chế độ **Kho / Bán / Đấu giá / Tặng** được đặt trước thanh tìm kiếm. Mặc định mở **Kho**, bao gồm sau khi rời rồi mở lại điện thoại; không giữ tab bán trong lần mở mới.
- Xóa hero tiêu đề trùng, dashboard 4 chỉ số, phần giới thiệu dài ở trang mặc định. Chỉ một dòng **🎒 số/500 · 🪙 Xu** và nút **Dùng được**.
- Tìm kiếm còn một ô 34px; bộ lọc nâng cao được ẩn phía sau nút **☷** cạnh ô tìm kiếm (ARIA expanded / controls, mở/tắt không mất điều kiện lọc).
- Chip danh mục tiếp tục cuộn ngang; bỏ chip **Dùng được** lặp, vẫn còn shortcut chức năng và input hidden tương thích.
- Card vật phẩm nhỏ gọn hơn (min-height 108px), icon và nhãn chức năng không còn chồng lên nhau; 2 cột dưới 365px, 3 cột trên đó, đảm bảo 320px không tràn.
- Chỉ khi bấm tab khác mới có một dòng mô tả số lượng và nút **?** hướng dẫn; nhật ký giao dịch nằm trong menu đóng mở. Đấu giá hiển thị các lô hiện có, không bổ sung bất kỳ tính năng đấu giá nào.
- Bán lọc **đúng món bán được**; Tặng lọc món có đích nhận phù hợp; Đấu giá lọc món đủ điều kiện ký gửi. Bộ lọc dùng vị trí instance thật, không giả mạo hoặc chuyển món khác.
- Giữ nguyên v43.9 giao dịch Xu Sandbox, v44.0 khóa gửi tác giả thật, giữ các ID vật phẩm/save/nhiệm vụ và không làm phát sinh Cloudflare/Firebase writes.

## Kiểm thử

- Node test kiểm tra DOM order, render mode, filter predicate, stable item index, phân trang và responsive CSS.
- Chromium smoke kiểm tra 320px: grid không tràn, ô vật phẩm đầu nằm gần phía trên, dashboard không lặp, bộ lọc nâng cao đóng mặc định nhưng mở được; tab Bán chỉ có món có thể bán; các luồng ký gửi/tặng/Xu từ V43.9 vẫn chạy và không ghi Firestore.
- Không tạo ảnh, không thay đổi backend, không deploy Worker.

Link Sandbox: https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=44-compact
