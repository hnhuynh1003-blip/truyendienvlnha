# L5.5 — Bộ tra tên có dữ liệu thực (bản chờ chủ sở hữu duyệt)

Nhánh: `library/l55-name-lookup`.
Cơ sở: `5b773bb` trên `main`, đã bao gồm T0/F4.4 của Work Game và các tệp L5.4 trước đó.
**Không hợp nhất, đẩy hoặc phát hành lên main cho đến khi An Du yêu cầu rõ ràng.**

## Hành vi đã triển khai

- Có bộ dữ liệu tra sẵn: 13.079 chữ và 109.168 mục nghĩa đã xử lý, xây từ 122.596 mục CVDICT cùng Hán–Việt Pinyin wordlist. Phiên bản nguồn, hash, cách biến đổi, tác giả và giấy phép được ghi ở `assets/reader-name-lookup-l55/SOURCES.md` và `manifest.json`.
- Bộ tra được tải khi mở công cụ, khoảng 7,45 MB JSON trước nén HTTP; không tải mỗi lần mở chương. Việc lập chỉ mục và phân tích chạy trong Worker riêng, dữ liệu được giữ bằng CacheStorage trên thiết bị để dùng lại. Không gửi đoạn truyện đến bên thứ ba, không gọi AI hay API dịch trả phí.
- Tra trực tiếp chữ Hán ra ứng viên âm Hán–Việt; tra ngược các nghĩa Việt thành ứng viên tên; ưu tiên quy tắc đã được xác nhận trong chính truyện. Có gợi ý liên kết nhân vật và phát hiện một số trường hợp đảo thứ tự từ so với tên đã lưu.
- Bấm Sửa tên sẽ thấy các nút ứng viên, căn cứ từng phần và chữ dùng để tra. Ví dụ đã kiểm thử trên dữ liệu thật: `lộc biết thuyền → Lộc Tri Chu`, `tần rõ ràng → Tần Minh`, `dương ánh sáng → Dương Quang`. Các cách đọc khác vẫn là lựa chọn, không khẳng định tên gốc.
- Người đọc có thể chọn ứng viên hoặc dùng **Xóa tên đề xuất · Nhập thủ công**. Kết quả tra đến muộn không ghi đè tên người dùng đang gõ. Chỉ nút Xác nhận mới lưu thành quy tắc truyện; EPUB/chương gốc không bị sửa.
- Dò tên hiển thị dạng gốc → gợi ý, số lần xuất hiện, đoạn văn xung quanh và ba nhóm xác nhận / tin cậy cao / nghi vấn. Những cụm thông thường chứa âm giống họ nhưng thiếu ngữ cảnh nhân vật được loại bớt.
- Trường hợp chọn riêng một từ trong tên mới, bộ tra có thể bổ sung nút Chọn cả cụm sau khi nhận diện được đoạn văn. Các thao tác +/−, cuộn, Xong và chọn văn bản bình thường vẫn hoạt động.

## Tự động và thủ công

- Mặc định cần chủ động xác nhận các tên suy từ nghĩa Việt. Tự viết hoa và các quy tắc L5.3/L5.4 đã xác nhận vẫn dùng như trước.
- Có tùy chọn **Tự áp dụng gợi ý duy nhất, đủ ngữ cảnh**, mặc định tắt. Chỉ xét ứng viên không đa nghĩa, có ít nhất ba lần nhắc và hai ngữ cảnh nhân vật; các ánh xạ nguyên cụm duy nhất trong bộ nghĩa cá nhân cũng có thể đủ điều kiện. Có thể tắt để trả lại phần hiển thị gốc của những gợi ý tạm thời này.
- Chế độ tự động không âm thầm lưu các gợi ý mới thành quy tắc. Quy tắc đã xác nhận và tên đã bị bỏ qua luôn ưu tiên hơn suy luận. Các trường hợp như `ôn nếu` hoặc trùng tên rút gọn không được tự gộp nhân vật.
- Đây không phải bộ phục hồi chắc chắn tên Trung gốc từ bản dịch Việt. Xếp hạng dùng quy tắc và một tập ưu tiên chữ thường gặp trong tên, không phải xác suất chính xác của tên nhân vật. Dữ liệu CVDICT có thể có sai sót theo chính tác giả nguồn.

## Hai loại nhập/xuất được phân biệt

| Công cụ | File | Phạm vi |
|---|---|---|
| Nhập / Xuất quy tắc | JSON đã xuất từ cùng truyện, tương thích L5.3/L5.4 | Quy tắc tên theo truyện, giữ các kiểm tra xung đột và hoàn tác |
| Nhập bộ tra — Tên riêng | `.txt` kiểu `汉字=Tên hiển thị` (Names/Names2), hoặc JSON bộ tra cá nhân | Dữ liệu gợi ý trên thiết bị |
| Nhập bộ tra — Phiên âm | `.txt` kiểu `字=âm`, nhiều âm ngăn bằng `|` hoặc `;` | Tra chữ; ưu tiên cách đọc cá nhân |
| Nhập bộ tra — Nghĩa Việt | `.txt` kiểu `字=nghĩa tiếng Việt` (VietPhrase), hoặc JSON bộ tra cá nhân | Tra ngược nghĩa theo dữ liệu phiên âm |

Tối đa 8 MB / 50.000 mục cho một bộ cá nhân. Có xem số mục và vài dòng trước khi xác nhận. Mỗi loại có một bộ cá nhân; nhập mới thay bộ cùng loại sau xác nhận. Không nhận một gói QT tùy ý như thể nó đã đúng định dạng; các biến thể hoặc file quá lớn được báo lỗi rõ.

Bộ cá nhân lưu ở IndexedDB riêng, có xuất JSON và gỡ bộ cá nhân. Gỡ bộ cá nhân không xóa bộ tra có sẵn hoặc quy tắc truyện. File không hợp lệ hay lỗi ghi bộ nhớ không làm mất dữ liệu đã lưu trước đó. Bộ tra có sẵn đã được đóng gói, người dùng không cần đi tìm file nhập để bắt đầu.

## Kiểm thử

- 59 kiểm thử liên quan: bộ tra thực, dấu/NFD, tên hai/ba từ, họ kép, trùng tên rút gọn, quy tắc ưu tiên/chồng nhau, import lỗi, bộ tra cá nhân, lưu L5.3/L5.4, chương dài, nguồn/hash/giấy phép, trình đọc và EPUB wiring.
- Bộ thử trình duyệt L5.5 dùng Worker và toàn bộ dữ liệu thực qua HTTP cục bộ: PC; Android cảm ứng mô phỏng 320/390/430 px; viewport bàn phím thu hẹp; chọn cụm; chọn ứng viên; xóa để gõ tay; kết quả đến muộn; đoạn ngữ cảnh; nhập/xuất Names; IndexedDB qua reload; CacheStorage; lỗi tải và thử lại; lỗi ghi IndexedDB mô phỏng; giữ bộ tra cũ và quy tắc; bật/tắt tự động mà không tạo quy tắc ẩn.
- Bộ thử L5.4 vẫn qua. Bộ thử ứng dụng đầy đủ dùng DOM trình đọc thực, Dò tên `lộc biết thuyền → Lộc Tri Chu`, chọn/lưu ứng viên, giữ nguyên nguồn, vị trí đọc, browser Back và reload; không có ghi dữ liệu ra dịch vụ ngoài.
- Đã xem ảnh chụp popup PC, Android mô phỏng và ứng dụng đầy đủ. Bàn phím Android/OEM thật vẫn cần chủ sở hữu thử sau khi duyệt cách đưa bản thử lên thiết bị.

## Xem riêng và hợp nhất sau

Chạy `node scripts/preview-reader-name-lookup-l55.cjs 8787`, mở `http://127.0.0.1:8787/`. Trang thử độc lập không tải Firebase hoặc dữ liệu truyện thật; có đoạn mẫu và ô dán văn bản. Dữ liệu thử dùng story ID riêng trên origin localhost.

Chỉ sau khi chủ sở hữu yêu cầu hợp nhất: fetch main mới nhất, so sánh thay đổi của Work Game, tích hợp bằng fast-forward/merge/rebase phù hợp, xử lý các dòng chung trong `index.html`/workflow, chạy lại kiểm thử liên quan rồi mới phát hành. Không force-push main.
