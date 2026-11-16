# DUDU STUDIO — Library L5.6A: Kiểm tra tên trong chương

**Trạng thái:** Nhánh riêng / PR nháp, chưa hợp nhất hoặc phát hành.  
**Baseline Game trên main khi tạo nhánh:** `d28211d6cf5fe274d4bccb40b925a5fa34e71b6b`.  
**Phạm vi:** Chỉ bộ quét tên và giao diện Thư viện. Không chỉnh sửa EPUB/chương nguồn, Firebase Rules, Game, R2, EXP hoặc Xu.

## 1. Nguyên nhân Dò tên sai

- `lookup.detect` trước đây chấp nhận họ Hán–Việt + từ đứng sau khi bộ tra trả kết quả phiên âm/tra ngược nghĩa Việt, ngay cả khi không có vai trò nhân vật trong câu.
- `analyze` cộng gộp các nhắc lại và nâng độ tin cậy theo tần suất, khiến cụm thông thường lặp lại thành tên.
- Cơ chế L5.5 trước đây cho phép bật chế độ áp dụng gợi ý chưa xác nhận; L5.6A vô hiệu hóa việc này, không tự sửa văn bản từ suy luận.

## 2. Đổi hành vi ở L5.6A

- `lookup.detect` yêu cầu chứng cứ từ cụm xưng hô/gọi tên ở trước hoặc hành vi giao tiếp ở sau, bên cạnh các giới hạn cụm/họ/từ loại trừ.
- `DuduReaderNameScanL56A.analyze` chỉ index chuỗi **xuất hiện nguyên văn** trong chương, đếm toàn bộ lần xuất hiện thực; lặp lại không được tính là ngữ cảnh.
- Quy tắc xác nhận lấy từ từ điển của **truyện đang đọc**, ưu tiên kể cả khi cụm có thể mang nghĩa thông thường.
- Tra ngược nghĩa Việt cho ra **ứng viên chưa xác minh**, không phải khẳng định phiên âm gốc; khi không có chứng cứ, danh sách trống.
- Trùng tên rút gọn giữ các hồ sơ riêng, không tự liên kết hoặc gộp.
- `Bỏ qua` lưu ở key `dudu-reader-name-scan-ignore-l56a:<encoded-storyId>`, giới hạn 300 cụm/truyện, **tách khỏi** JSON quy tắc L5.3/L5.4/L5.5; có `Khôi phục`. Nếu đã xác nhận tên thì bỏ qua không thắng quy tắc.
- Chỉ quét chương đang xem, không mở toàn EPUB. Bản gốc nằm trong WeakMap, chỉ dựng lại phần hiển thị nếu người đọc lưu quy tắc.

## 3. Giao diện

Thanh công cụ chính chỉ gồm **Sửa tên** và **Từ điển**. Trong Từ điển có `Công cụ nâng cao → Kiểm tra tên trong chương`. Mỗi dòng có cụm gốc, đề xuất hiển thị, đếm số lần, trích đoạn, nhãn ngữ cảnh, vị trí theo đoạn và nút **Đến vị trí**. Khi nhảy vị trí, đóng popup mà không phục hồi vị trí trước đó; đoạn được nhấn tạm thời. Giữ phong cách Hologram nhạt cyan/rose, danh sách cuộn và nút chạm có kích thước mobile.

## 4. Kiểm thử và cổng duyệt

- `tests/reader-name-scan-l56a.test.cjs`: kết quả `lộc biết thuyền`, `tần rõ ràng`; phủ định `lâm vào`, `mặc dù`, `đường đi`, `tần suất`, `thành công`; tần suất đơn thuần; tên 2–4 từ, họ kép; trùng tên rút gọn; bỏ qua/khôi phục; Unicode NFD; chương dài.
- Browser fixture L5.4/L5.5: kiểm tra thao tác tay, màn hình 320/390/430px, popup, bản gốc, từ điển có dữ liệu thật, nhập bộ tra, phím và thu nhỏ viewport.
- Workflow `.github/workflows/library-l56a-qa.yml` chạy unit và browser qua PR, **chỉ đọc**. Các kết quả của CI được xem trực tiếp tại tab Checks của PR; không suy diễn PASS nếu chưa kết thúc.
- Cần chủ dự án nghiệm thu trên Android **thật**: bàn phím IME, vuốt/cuộn, menu chọn/copy của Android và EPUB/Web thực. Browser emulation không xác thực các lớp Android OEM.

## 5. Chưa nằm trong L5.6A

L5.6B (từ điển thuật ngữ mở rộng), L6 (Cloudflare R2), L6.1 (xóa EPUB cũ), đồng bộ cloud danh sách bỏ qua, và việc thay Firebase Rules. Đề nghị cho L5.6B: tách `nameCandidate` và `termCandidate`, xác nhận có chủ đích, khai báo nguồn chứng cứ và duy trì trạng thái tương thích từ điển cũ trước khi mở rộng dữ liệu.
