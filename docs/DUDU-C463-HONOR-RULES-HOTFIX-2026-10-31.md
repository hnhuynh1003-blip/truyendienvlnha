# C4.6.3 — Firestore Rules cho Sổ Vinh Danh (31/10/2026)

## Nguyên nhân đã xác minh

- GitHub `firestore.rules` tại bản C4.6.2 kiểm soát `profiles_v2/{uid}` bằng `request.resource.data.diff(resource.data).addedKeys().hasOnly(allowedLegacyProfileFields())`.
- `allowedLegacyProfileFields()` thiếu `honorV1`, trong khi giao dịch C4.6 lần đầu luôn thêm chính trường đó. Vì vậy chủ sở hữu UID hợp lệ vẫn nhận `permission-denied` khi thử lưu danh hiệu mới.
- Header của `firestore.rules` trên GitHub có ghi **REVIEW CANDIDATE / NOT DEPLOYED**. Chủ dự án nói đang dùng bản trên GitHub nhưng chưa có bằng chứng trực tiếp rằng Rules ở Firebase Console đã Publish cùng nội dung. GitHub commit **không tự Publish** do `firebase.json` mặc định không cấu hình Firestore Rules deploy.

## Bản sửa giới hạn quyền

1. Thêm `honorV1` vào danh sách trường được phép **thêm** vào hồ sơ của chính UID, không mở quyền ghi rộng.
2. Thêm `validHonorV1C463()` kiểm tra `version=1`, đủ bốn khóa `version,earned,equipped,pinned`, không có khóa lạ, tên danh hiệu nằm trong 16 ID hiện hành, mốc thành tựu nằm trong 27 ID hiện hành, danh sách earned tối đa 100, pinned tối đa 3 và chỉ ghim thành tựu đã earned.
3. Giữ kiểm tra `self(uid)`, role admin theo custom claim, giới hạn Xu, Kho và toàn bộ deny rules đang có. Các trường `currency`, `inventory`, `exp`, `role` không được cấp từ bảng vinh danh.
4. Thêm thao tác cosmetic `preferences` để người chơi bấm **Thử đồng bộ** đồng thời cho danh hiệu và huy hiệu đã ghim trên thiết bị. Giao dịch chỉ cập nhật `honorV1` và `title` trên đúng `/profiles_v2/{uid}`; nếu bị từ chối, lựa chọn cục bộ vẫn được giữ nguyên.

**Lưu ý phát triển:** Mỗi lần thêm danh hiệu/thành tựu mới vào catalog C4.6 phải cập nhật danh sách ID trong Rules và kiểm thử trước khi Publish, tránh lỗi “đã mở trên máy nhưng không lưu được” tái diễn.

## Kiểm thử

- Firestore Emulator cô lập `demo-dudu-standard`: **83/83 phép thử đạt**, bao gồm 10 phép thử C4.6.3 mới (owner equip, pin, đồng bộ; từ chối khác UID, trường lạ, mã giả, dữ liệu sai kiểu, quá giới hạn).
- Kiểm thử hiện hành vẫn xác minh EPUB import/publish/edit/revisions, ví verified read-only, chặn Arcade đổi Xu và giới hạn quyền hồ sơ.
- Bộ unit tests ứng dụng và dịch vụ chạy độc lập với emulator.
- Chưa chạy thử trên Firebase production hoặc trên điện thoại thật sau Publish.

## Hướng dẫn Publish có kiểm soát

1. Trong Firebase Console chọn đúng dự án `truyendienvl` → Firestore Database → Rules. **Sao lưu nội dung Published hiện tại**.
2. So sánh với [firestore.rules trên nhánh main](https://github.com/hnhuynh1003-blip/truyendienvlnha/blob/main/firestore.rules), nhất là các thay đổi không liên quan C4.6.3. Chỉ áp dụng bản Rules mới sau khi chủ dự án xác nhận.
3. Publish Rules bằng Firebase Console; đây là **bước thủ công**, không xảy ra khi commit lên GitHub.
4. Tải lại DUDU Studio, đăng nhập đúng tài khoản, mở **Điện thoại → Sổ Vinh Danh → Thử đồng bộ**. Nếu thành công, nhãn “Chưa đồng bộ lên tài khoản” biến mất. Kiểm tra tiêu đề đã chọn trên hồ sơ và thử bằng một trình duyệt khác.
5. Nếu tiếp tục `permission-denied`, kiểm tra tính hợp lệ của toàn bộ hồ sơ theo `validLegacyProfile()`; không nới Rules đại trà khi chưa xác định field gây lỗi.

**Không triển khai Firebase production, không reset mùa, không di chuyển hoặc xóa dữ liệu tài khoản trong đợt này.**
