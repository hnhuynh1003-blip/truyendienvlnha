# DUDU Studio 2.0 — Giai đoạn A+B: Hồ sơ riêng & Gemini qua máy chủ

> **Mới triển khai trên nhánh `feat/identity-npc-editor-v2`. Chưa merge `fixapp`, chưa deploy Functions và chưa bật Gemini AI công khai.**
> Điều kiện quan trọng: **Không nhập Gemini API key vào HTML, GitHub, localStorage, ảnh chụp hoặc cửa sổ trò chuyện.**

## A. Tách thư viện và dữ liệu riêng

Cyber Phone → Hồ sơ:
- **Thư viện DUDU (dùng chung):** số truyện, tổng chương. Hai UID khác nhau vẫn nhìn thấy cùng số 2/25 vì đây là nội dung công khai.
- **Tiến trình riêng:** số truyện đã mở (bookmark local theo UID), NPC đã mở khóa (storyStates theo UID), số vật phẩm, cấp độ, xu.
- Firebase Auth xác định UID thật, không dựa vào tên người dùng hay quyền Admin lưu trong profile.
- Khách chưa đăng nhập có thể xem thư viện mà không bị hộp thoại đăng nhập cản trở; đăng nhập mới đồng bộ hồ sơ cloud, AI cần đăng nhập.
- **Giới hạn chưa hoàn thiện:** bookmark và lịch sử chat hiện lưu trên thiết bị theo UID, chưa đồng bộ đa thiết bị; không hiểu "số truyện đã mở" là số chương đã đọc. Firestore profile client vẫn có thể sửa XP, tiền, kho đồ nên chưa thể coi kinh tế là an toàn.

## B. Kiến trúc AI

```text
GitHub Pages (HTML / Firebase Web SDK)
     │ Firebase Auth ID token + Firebase App Check token
     ▼
Callable Firebase Functions v2: duduAiGenerate
     │ authenticated UID + App Check + kiểm tra nội dung
     │ Firestore transaction: user/day và global/day quotas
     │ Secret Manager: GEMINI_API_KEY
     ▼
Gemini model cố định: gemini-2.5-flash-lite
```

- Người chơi **không cần nhập Gemini API key**.
- AI key chỉ ở Secret Manager của Firebase/Google Cloud.
- **25 yêu cầu/người/ngày UTC, 200 yêu cầu/toàn hệ thống/ngày UTC**, 10 giây giữa hai yêu cầu, 1 yêu cầu đang xử lý/tài khoản.
- Giới hạn input tổng 12.000 ký tự, output tối đa 320 token chat hoặc 850 token hỗ trợ viết. Không cho client chọn model hay truy cập tùy ý endpoint của Google.
- Firestore `ai_usage_v2` và `ai_global_usage_v2`: chỉ Admin SDK có quyền; Security Rules cấm trình duyệt trực tiếp.
- Lượt gọi **được tính khi chấp nhận yêu cầu**, kể cả Gemini sau đó báo lỗi; chống spam gây chi phí. Không hoàn lượt tự động.
- Quota giới hạn số yêu cầu nhưng **không bảo đảm chi phí = 0**; cần cảnh báo ngân sách và giám sát Cloud Billing, kiểm soát API ở Google AI Studio trước khi mở beta rộng.
- Khi chưa cấu hình App Check, ứng dụng **từ chối gọi AI một cách an toàn**, không tự dùng key trong browser.

## Các bước triển khai (chỉ làm khi chủ dự án đồng ý cấp chi phí/hạn mức)

1. Sao lưu Firestore `studio_data/main_library` và `profiles_v2` trước mọi lần phát hành. Kiểm tra Security Rules hiện hành, **không deploy nhầm bộ Rules** khi chỉ cần Functions.
2. Firebase project: `truyendienvl`. Đảm bảo đã bật **Blaze billing** (Cloud Functions gen 2 và Secret Manager có thể tính phí). Thiết lập ngân sách và cảnh báo tại Cloud Billing; cảnh báo không phải công tắc ngắt chi phí cứng.
3. Google AI Studio: tạo **API key riêng cho DUDU**, giới hạn/giám sát API và quota, không tái sử dụng key từng nằm trong code/trình duyệt. Nếu key cũ từng chia sẻ công khai, thu hồi và tạo lại.
4. Firebase Console → App Check → chọn **Firebase Web App DUDU**, cấu hình **reCAPTCHA Enterprise** bằng key kiểu Web cho `hnhuynh1003-blip.github.io`. Theo hướng dẫn Google, **không thêm `localhost` vào khóa reCAPTCHA Enterprise production**.
5. Trong nhánh tính năng, sửa `js/ai-proxy.js`: thay `const RECAPTCHA_ENTERPRISE_SITE_KEY = '';` bằng **public reCAPTCHA Enterprise site key** (không phải Gemini key). Site key này được phép ở trình duyệt.
6. Trong Cloud Shell / môi trường có Firebase CLI, từ thư mục root của repo:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase functions:secrets:set GEMINI_API_KEY --project truyendienvl
   cd functions && npm install && npm test && cd ..
   firebase deploy --only functions:duduAiGenerate,functions:duduAiStatus --project truyendienvl
   ```
   **Chỉ nhập secret vào CLI**, không gửi qua chat. `firebase.json` trong repo **chỉ cấu hình Functions**, không thay đổi Firebase Hosting hay GitHub Pages.
7. Đưa bản frontend nhánh thử nghiệm lên **một môi trường thử nghiệm riêng** trên hostname đã cấu hình App Check. Không merge `fixapp` trước khi kiểm tra thực tế.
8. Kiểm tra tài khoản độc giả, admin, guest, token App Check, chức năng chat, giới hạn 10 giây, quota 25 và 200, lỗi Firebase, lỗi Gemini, và Firestore rules từ client. Xác nhận mỗi UID có hồ sơ khác nhau, thư viện chung đúng theo thiết kế.
9. Sau khi thử nghiệm thành công và tác giả phê duyệt mới tính đến merge PR vào `fixapp`. Xem trạng thái PR trước khi merge.

## Kiểm thử cục bộ không dùng key thật

```bash
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
# Khi cài Playwright trong root repository:
node tests/browser-smoke.cjs
node tests/browser-auth-private.cjs
```

Trình duyệt chạy `?sandbox=1` chỉ có dữ liệu giả lập; không gọi Gemini. Kiểm thử CI dùng **Firebase SDK giả**, chưa chứng minh dịch vụ Firebase/Google AI thật đã chạy.

## Những việc chưa nằm trong đợt A+B

- Xác thực server-side cho EXP/coin/vật phẩm và chống gian lận phần thưởng.
- Đồng bộ chat, bookmarks và ký ức NPC giữa các thiết bị; lưu phân tầng/lâu dài.
- Hạn mức theo thời gian thực do nhà vận hành điều khiển, reset thủ công, hóa đơn chi tiết.
- Phân quyền nội dung **bản thảo chưa công khai**: hiện thư viện `main_library` có quyền đọc công khai, cần tách truyện xuất bản khỏi bản nháp trước khi phát hành.

**Bảo vệ người dùng:** không đăng nội dung chat cá nhân hoặc API key lên issue/PR. Chỉ truyền dữ liệu thật sau khi chấp nhận chính sách dịch vụ Gemini và thông báo xử lý dữ liệu.

## C. Tối ưu token / giữ cảm giác trò chuyện tự nhiên (đã code trên nhánh thử nghiệm)

- `js/npc-chat-lite.js` nhận diện **đúng các câu giao tiếp ngắn độc lập**: chào, cảm ơn, tạm biệt, chúc ngủ ngon; kể cả khi gọi đúng tên nhân vật.
- Các câu này trả lời theo nhóm tính cách của NPC (lạnh lùng, vui vẻ, dịu dàng hoặc trung tính) bằng kịch bản cục bộ, **0 lượt Gemini / 0 token Gemini**.
- Phân loại rất bảo thủ: "Chào Lan, kể về thế giới trước đây" **không được tính là câu chào**, mà cần AI thật để trả lời đúng nội dung truyện.
- Hội thoại đầy đủ vẫn giữ nguyên trong bộ nhớ cục bộ theo UID/truyện/NPC; chỉ **tối đa 8 tin gần nhất**, mỗi tin cũ tối đa 400 ký tự, tin mới tối đa 1.000 ký tự và phần thiết lập dài của NPC tối đa 1.200 ký tự được gửi lên AI. Đây là cơ chế tạm thời: chưa có hệ thống truy xuất ký ức dài hạn.
- Chặn gửi đồng thời nhiều yêu cầu AI cùng NPC trong cùng một tài khoản, tránh tiêu hao lượt vì bấm liên tục. Câu chào kịch bản không cộng EXP, xu, thân mật, nhiệm vụ hay vật phẩm.
- Người chơi **không bị buộc nhìn thanh năng lượng hoặc trả token trực tiếp**; quota của máy chủ vẫn cần tồn tại để giới hạn ngân sách. Mức 25 lượt/người/ngày, 200 toàn hệ thống/ngày hiện là cấu hình thử nghiệm, không phải cam kết số tin nhắn miễn phí hoặc hạn mức của Gemini.
- Chưa sử dụng prompt caching của Gemini: chi phí, số token tính phí và chính sách caching phải được đánh giá sau khi chọn backend và model thật.

### Lưu ý riêng khi chủ dự án dùng Firebase Spark miễn phí

Cloud Functions gen 2 trong thư mục `functions/` chỉ là **mã chuẩn bị cho phương án Blaze**, không thể phát hành lên Firebase Spark. Tối ưu chat kịch bản ở frontend vẫn hoạt động với Spark miễn phí mà **không cần Gemini key**.

Để bật Gemini thật mà vẫn giữ Spark: cần **thay hẳn AI adapter và backend sang Cloudflare Workers**, giữ xác thực Firebase ID token do Worker kiểm tra chữ ký, dùng Cloudflare Secrets để lưu key và quota phía máy chủ. **Chưa làm/triển khai bước Cloudflare** và chưa nhập bất kỳ API key thật nào. Không được triển khai cấu hình demo mà bỏ qua kiểm tra JWT, hạn mức và bí mật.
