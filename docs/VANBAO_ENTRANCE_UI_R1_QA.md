# Vạn Bảo — Entrance UI R1, 13/11/2026

Main baseline d8d971b; worktree sạch. Chỉ UI, không thay engine, phí, dữ liệu hoặc thưởng.

## Luồng mới

- Vào Vạn Bảo: sảnh Trận Các với artwork đã duyệt, không render nhánh hoặc puzzle node.
- Chọn Chinh Phục:5nhánh độ khó dưới dạng lựa chọn đóng, không tự mở Nhập môn.
- Chọn nhánh:chỉ render nhánh đó và các thế đủ điều kiện; nhánh khóa/chưa có nội dung vẫn giữ điều kiện cũ. Nút Chọn nhánh quay về5lựa chọn.
- Back đi từ trận ->map, map ->danh sách nhánh, danh sách ->sảnh, sảnh ->phone home theo host hiện có.
- Vô Tận/Vật phẩm truy cập trực tiếp qua nav; không bắt nhận nhiệm vụ.
- Ván Vô Tận PLAYING hoặc WON đã lưu vẫn tự khôi phục như trước, không bị sảnh mới ghi đè. Hộp thưởng Chinh Phục giữ state.wins, vẫn mở lại được từ nhánh/thế tương ứng; không tạo thêm quyền nhận.

## Tệp

js/vanbao-lobby-final-f44.js: trạng thái presentation entrance/branch, điều hướng Back.
css/vanbao-final-f44.css: sân khấu sảnh, nút điều hướng; giữ artwork gốc.
index.html: chỉ cache suffix cho2tài nguyên vừa sửa.
tests/browser-vanbao-main-f44.cjs và tests/browser-vanbao-final-f44.cjs: mặc định không map, mở một nhánh, back và dữ liệu thưởng/reload không hồi quy.

## QA đã chạy

- Node vanbao-chess/rewards/final/final-art +ky-van-r33-main-nav:28 PASS,0 FAIL.
- Browser main integration:PASS;320x568,360x640,390x844,430x932,desktop1280x900. Sảnh không puzzle/nhánh; overview5nhánh không puzzle; chọn1nhánh hiển thị đúng4thế, quay lại đúng,3tab cùng hàng44px, Vé Cào/Vạn Tượng/Ví không lỗi.
- Browser final:PASS; proof move/claim,6mode,Khó khóa,WorkerĐốiCục,khôi phục ván/receipt,account/Sandbox không hồi quy.
- Dùng Chrome và Playwright có sẵn, profile mới, DB/Auth giả. Không đọc/ghi production.
- Ảnh: C:/Users/TUF F16 FX608/AppData/Local/Temp/vanbao-entry-r1-20261113/ gồm entrance-{width}.png, branches-{width}.png, selected-map-{width}.png. Đã kiểm trực quan sảnh320 và map320/430.

Chưa push/deploy. Chưa phát hành thêm thế, chưa mở Khó/Đại sư, không có thay đổi schema/save; hạn chế lưu giữa ván Chinh Phục trước thắng giữ nguyên như báo cáo kiểm toán.
