# DUDU Studio – Giai đoạn nền tảng (nhánh thử nghiệm)

> **CHƯA ĐƯỢC DUYỆT TRIỂN KHAI SẢN XUẤT.** Không hợp nhất nhánh này trước khi kiểm thử thực tế và hoàn tất xác thực/phân quyền phía máy chủ.

## Đã thay đổi

- Lịch sử chat: khóa lưu trình duyệt theo **tên đăng nhập**; mỗi hội thoại có **story ID + NPC ID**.
- Bookmark và bản nháp: khóa lưu trình duyệt theo tên đăng nhập và story ID. Thời gian chờ nhặt vật phẩm được lưu riêng theo tài khoản.
- Tiến trình mở khóa NPC: thêm cấu trúc `storyStates[storyId].collectedCharacters`. Chỉ chuyển trạng thái NPC cũ khi xác định được truyện nguồn.
- Không tự mở khóa NPC khi tác giả tạo nhân vật; nút kết nối và gửi tin nhắn kiểm tra trạng thái liên kết.
- Tạo NPC ngay trong trình soạn chương, hỗ trợ biệt danh và thế giới nguyên bản; giữ lựa chọn NPC đang đánh dấu khi quay lại soạn.
- Tránh gán phản hồi AI đang xử lý vào màn chat của tài khoản, truyện hoặc NPC khác.
- Cho phép **nhập bản sao** lịch sử chat cũ thủ công và có xác nhận; **không xóa** dữ liệu chat cũ.
- Chế độ `?sandbox=1` để kiểm thử cục bộ không đọc/ghi tài liệu Firestore của thư viện hoặc tài khoản.

## Hạn chế cần xử lý trước khi phát hành

1. **Đăng nhập hiện tại chỉ là tên trong trình duyệt, KHÔNG xác thực.** Phải bổ sung Firebase Authentication (hoặc cơ chế tương đương), UID thực và Security Rules phía máy chủ. `userProfile.role` hiện có thể thay đổi ở client; nút ẩn không thể bảo vệ dữ liệu.
2. **Thư viện truyện vẫn thuộc document Firestore dùng chung** `studio_data/main_library`. Chưa tách thành nhiều tài liệu, chưa có luồng xuất bản/biên tập của tác giả.
3. **Hạn mức AI và API key không được bảo vệ ở backend.** Chưa nâng cấp Gemini Engine.
4. **Chưa triển khai cơ chế nhiệm vụ + chi phí mở khóa NPC.** Nút mở khóa cuối chương vẫn là luồng cũ để đảm bảo khả năng thử nghiệm; KHÔNG coi đây là gameplay hoàn thiện.
5. **Chưa thay cơ chế EXP đọc chương, nhặt vật phẩm hoặc quét NPC tự động.** Những phần này thuộc các đợt riêng sau khi xác nhận cấu trúc dữ liệu.
6. **Dữ liệu chat cũ không xác định chắc tài khoản/truyện.** Người dùng phải xác nhận nhập vào đúng tài khoản, đúng truyện; không tự chuyển dữ liệu mơ hồ.
7. Chế độ sandbox chỉ cô lập **dữ liệu**, không tự tắt yêu cầu Gemini API nếu người dùng cấu hình key; kiểm thử AI có thể vẫn tiêu hao hạn mức.

## Cách xem thử mà không ảnh hưởng dữ liệu thật

1. Checkout nhánh `feat/identity-npc-editor-v2` về máy hoặc sử dụng môi trường preview của nhánh.
2. Chạy web tĩnh bằng server local, ví dụ `python -m http.server 8000`.
3. Truy cập `http://localhost:8000/?sandbox=1`.
4. Kiểm tra thanh cảnh báo **SANDBOX** phía trên giao diện.
5. Đăng nhập bằng hai tên thử `tester-a` và `tester-b`; sandbox sử dụng các khóa lưu riêng.
6. Chuyển thử vai trò Tác giả (chỉ là UI thử nghiệm, **không** phải xác thực thật).
7. Tạo chương mới và bấm **+ Tạo NPC** trong phần gán nhân vật.
8. Tạo nhân vật có tên, biệt danh và nguyên giới; kiểm tra tên mới được đánh dấu mà nội dung chương chưa mất.
9. Đọc chương và xác nhận NPC chưa liên kết không chat được chỉ vì vừa được tạo.
10. Đổi tài khoản, đổi truyện và thử xem danh bạ, bookmark, lịch sử chat có bị lẫn không.
11. Với lịch sử chat cũ, thử nút **Nhập lịch sử chat cũ** và chỉ đồng ý khi chắc chắn nguồn dữ liệu đúng.

## Kiểm thử nhanh bằng Node

```bash
node --test tests/phase1-smoke.test.cjs
```

Các kiểm tra này chỉ bao phủ cú pháp và một số quy tắc lõi. **Chưa thay thế kiểm thử trình duyệt** trên PC, Android/iOS; chưa thay thế việc kiểm thử Firestore Security Rules hoặc sao lưu/phục hồi dữ liệu.

## Tiêu chí duyệt đợt tiếp theo

- Luồng tác giả tạo NPC/gán chương hoạt động trên giao diện thực.
- Có thể đổi tài khoản/truyện mà không lộ lịch sử hội thoại khác.
- Dữ liệu cũ không mất, quá trình nhập dữ liệu cũ có xác nhận.
- Dữ liệu test sandbox không xuất hiện trong tài liệu Firestore sản xuất.
- Đã có kế hoạch Firebase Auth và Security Rules trước khi đưa lên website công khai.
