# DUDU V16 — Avatar người chơi & khung trang trí

**Ngày:** 15/10/2026  
**Nhánh:** `feat/identity-npc-editor-v2` (Draft PR)  
**Giới hạn phát hành:** KHÔNG merge vào `fixapp`, KHÔNG deploy Cloudflare/Firebase.

## Chức năng đã triển khai (chỉ Sandbox)

- Avatar người chơi hoàn toàn **riêng biệt** với chân dung NPC. Chọn ảnh trong 4 tranh anime nữ đã có, bộ hình mẫu vector 60 nữ/12 nam, avatar chữ mặc định hoặc tải lên JPG/PNG/WebP của chính mình.
- Có **sáu khung trang trí miễn phí** (không khung, ánh trăng, huyền tím, hoa đào, Cyber Link, tinh tú). **Ba khung đặc biệt** (huyền thoại, tri kỷ, tác giả) chỉ hiển thị ở trạng thái khóa, **không thể tự nhận** qua UI/localStorage vì chưa có hệ thống xác minh phần thưởng khung ở máy chủ. Tên/phẩm cấp mang tính thẩm mỹ, chưa cấp vật phẩm có giá trị.
- Giao diện tùy chỉnh có xem trước, chọn hình, chọn khung, Hủy/Lưu, Esc, điều khiển bàn phím và bố cục cho di động.
- Avatar hiển thị trong Hồ sơ Cá nhân, thẻ màn hình chính Cyber Phone, nút tài khoản đầu trang trên desktop, và các tin nhắn người chơi trong Liên Lạc. Trên màn hình nhỏ, nút avatar header ẩn tránh chèn ép; vào Cyber Phone để chỉnh.
- **Tải ảnh cục bộ:** giới hạn 5 MB, chỉ JPEG/PNG/WebP. Trình duyệt kiểm tra định dạng/giới hạn kích thước, cắt vuông và nén thành JPEG nhỏ, chỉ lưu bytes ở IndexedDB theo khóa người dùng + phạm vi riêng `__dudu_player_avatar_v16__` + ID, KHÔNG lưu base64 vào userProfile/Firestore.
- Dữ liệu mới duy nhất trên bản lưu Sandbox, khi người chơi tự chọn và bấm Lưu: `userProfile.playerAvatar = {kind,frameId,presetId,uploadId}`. Profile cũ không có trường này vẫn hoạt động với ảnh chữ mặc định và không bị ghi đè tự động.
- Chuyển avatar hay tài khoản làm vô hiệu yêu cầu tải/hiển thị cũ; Hủy đóng cửa sổ và không thay đổi hồ sơ đã lưu. Không thay đổi tên, cấp, Xu, kho đồ, NPC, thiện cảm, tin tưởng, quyền tác giả, kỷ vật hoặc hệ thống nhận thưởng.

## Đã kiểm thử tự động

- Node.js kiểm tra 6 khung dùng được/3 khung khóa, phân loại ảnh hợp lệ, an toàn đường dẫn/UID, sự tương thích với save cũ và ranh giới lưu trữ.
- Chromium kiểm tra xem trước rồi hủy không đổi save, lưu avatar/khung rồi mở lại, 72 lựa chọn vector/4 anime, tải ảnh cục bộ và phân tách tài khoản, hiển thị avatar nhiều nơi, Esc và cửa sổ 375px, không ghi Firestore.
- Chưa thay thế kiểm thử tay trên Android/iOS hoặc kiểm thử nhiều thiết bị với tài khoản thật.

## Cần có trước khi đưa V16 lên production

1. Thiết kế xác thực/đồng bộ riêng avatar người chơi trên máy chủ (Cloudflare R2 hoặc lưu trữ được phê duyệt), kiểm tra xác thực UID thực và dung lượng, MIME signature, xóa EXIF, biến thể ảnh, quyền xóa, audit và chống lạm dụng.
2. Xây hợp đồng mở khóa khung đặc biệt **server-authoritative** theo sự kiện/thành tựu, bảo toàn khung đã cấp, tránh client tự ghi quyền sở hữu.
3. Kiểm thử mobile thật, bảo toàn lưu trữ/sync tài khoản cũ, rồi mới cân nhắc phát hành.

**V16 đã viết mã và kiểm thử Sandbox; chưa triển khai đồng bộ nhiều thiết bị hoặc phát hành chính thức.**
