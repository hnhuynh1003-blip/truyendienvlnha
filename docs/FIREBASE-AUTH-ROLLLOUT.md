# DUDU Studio v2 — Checklist xác thực Firebase (BẢN DỰ THẢO)

**Trạng thái: CHƯA TRIỂN KHAI lên Firebase / chưa hợp nhất PR.**

## Đã chuẩn bị trên nhánh thử nghiệm
- `js/auth-v2.js`: Google Sign-In, Email/Password, theo dõi Firebase Auth state.
- Hồ sơ trò chơi mới lưu theo `profiles_v2/{auth.uid}` thay cho tên người dùng tự đặt.
- Giao diện Tác giả chỉ bật khi ID token chứa **custom claim** `admin: true`.
- `security/firestore.rules.review`: Firestore Rules mẫu kiểm duyệt, **không được deploy ngay**.
- `?sandbox=1`: tiếp tục dùng đăng nhập bằng tên để thử nghiệm cục bộ, không chạm tài liệu Firestore sản xuất.
- Dữ liệu tài khoản/nhân vật cũ được giữ nguyên, KHÔNG tự chuyển sang UID mới.

## Cần người sở hữu Firebase Project tự thực hiện khi sẵn sàng
1. Mở [Firebase Console](https://console.firebase.google.com/), chọn project `truyendienvl`.
2. Ở **Authentication → Sign-in method**, bật nhà cung cấp **Google** và (nếu muốn dùng) **Email/Password**.
3. Ở **Authentication → Settings → Authorized domains**, thêm domain website và domain preview được phê duyệt. Tránh bật domain không tin cậy.
4. Kiểm tra, xuất bản sao dự phòng Firestore trước mọi thay đổi về Rules hoặc dữ liệu.
5. Xác định Firebase UID của tài khoản tác giả được phép quản trị. Chỉ từ môi trường tin cậy dùng **Firebase Admin SDK** cấp custom claim `admin: true`; KHÔNG gán quyền admin từ client, tên email, nickname hoặc profile.
6. Kiểm tra Rules hiện hành; đối chiếu với `security/firestore.rules.review` và các collection đang thực sự sử dụng. **Không thay Rules trực tiếp từ tài liệu mẫu**, vì nó chặn đọc/ghi `user_profiles` theo cách app hiện tại vẫn cần.
7. Thử Auth + Rules trên Firebase Emulator hoặc project staging riêng, bao gồm các tình huống: khách đọc truyện, độc giả sửa truyện (bị từ chối), tác giả hợp lệ sửa truyện (được phép), độc giả truy cập profile tài khoản khác (bị từ chối).
8. Chỉ sau khi kết quả đạt và có kế hoạch rollback mới triển khai lên môi trường dùng thật.

## Các lưu ý bảo mật và game economy
- Firebase web config `apiKey` không phải khóa quản trị Admin SDK; không đưa service account private key lên GitHub.
- Người chơi cũ đăng nhập bằng nickname không sở hữu danh tính xác thực; không thể xác nhận người sở hữu chỉ bằng việc nhập lại nickname đó.
- Nếu import dữ liệu cũ phải có **xác nhận + kiểm tra sở hữu** trước khi chuyển sang UID; dữ liệu chat không rõ nguồn không tự nhập.
- Rules `profiles_v2/{uid}` mới chỉ cách ly mỗi tài khoản. Vì EXP, xu, vật phẩm hiện do trình duyệt tính, vẫn có nguy cơ gian lận. Trước khi mở rộng public, chuyển thưởng/vật phẩm quan trọng sang backend có xác minh.
- Đang dùng `studio_data/main_library` chung cho tất cả truyện, cần tách tác phẩm/chương trước khi quy mô lớn.
- API Key Gemini nhập qua trình duyệt và có thể bị lộ trên thiết bị dùng chung. API dùng chung công khai phải đặt ở backend, có quota và chống lạm dụng.

## Kiểm thử
- `node --test tests/*.test.cjs`
- `node tests/browser-smoke.cjs` (cần cài Playwright)
- Smoke browser chạy hoàn toàn với Firebase giả lập ở `?sandbox=1`, không xác nhận Rules thực tế.
