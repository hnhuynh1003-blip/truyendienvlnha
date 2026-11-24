# L5.7 — Gợi ý tên tự nhiên (chờ nghiệm thu)

Baseline: `c60090e9`, nhánh `feature/natural-name-suggestions-l57`.

Tích hợp ngay trong Sửa tên L5.4, dùng bộ tra L5.5 hiện có. Ba nhóm: Chuẩn Hán–Việt (chữ Hán đầu vào hoặc dấu vết bộ tra, ghi rõ nếu suy ngược); Tên tự nhiên (cách gọi đã duyệt hoặc phương án biên tập); Giữ nguyên. Tối đa ba lựa chọn mỗi nhóm gợi ý. Nhóm thiếu bằng chứng hiển thị trạng thái trống trung thực.

Hai mẫu biên tập toàn tên đầu tiên: Khi Dã → Kỳ Dã, Nhưng Chân → Nhược Chân. Đây không phải khẳng định tên gốc, họ hoặc giới tính. Không ghép âm tùy tiện cho tên chưa biết; người dùng vẫn nhập thủ công được. Tên đã xác nhận được ưu tiên; các hồ sơ trùng tên giữ riêng, không tự liên kết. Không có chữ Hán bịa cho phương án biên tập.

Không tự điền ứng viên suy ngược vào ô đích. Chọn đề xuất chỉ sửa ô nhập; Xác nhận mới lưu bằng từ điển L5.4 theo story ID trên thiết bị. Giữ nguyên dùng quy tắc tên → chính tên đó. Hoàn tác và xuất/nhập JSON dùng cơ chế cũ. Không sửa chương gốc, bookmark hay quyền; không Firebase writes, AI API hoặc thay Worker/R2. EXP/nhặt đồ không bị thay đổi.

## Kiểm thử

- 57/57 unit/regression L5.3–L5.7 PASS: Unicode NFC/NFD, từ thường ngoài tên, tên mơ hồ/trùng hồ sơ, bằng chứng bộ tra, lưu theo truyện, undo và backup.
- Browser L5.7 PASS tại 320/390/1280: bộ tra Worker thật chạy local; chọn rồi xác nhận, giữ nguyên, cách ly Web/EPUB, bookmark không đổi, không request ghi, không tràn ngang.
- Browser L5.4, L5.5, L5.6B PASS: chọn tên, bàn phím mobile, bộ tra/import, fallback lỗi mạng, undo/backup và thuật ngữ.
- Syntax/diff check PASS. Browser fixtures biệt lập, không phải bằng chứng nghiệm thu production. Chưa thử Android thật.

Lỗi bộ tra được báo tại status của dialog; các lựa chọn biên tập/Giữ nguyên và sửa thủ công vẫn dùng được. Test fallback đã đổi vị trí kiểm tra theo hành vi này, không bỏ kiểm thử.

## Nghiệm thu và rollback

Chờ owner duyệt trước merge; không triển khai production. Kiểm tra một tên trong truyện Web và EPUB, xác nhận chỉ tên đầy đủ được đổi, undo rồi xuất/nhập từ điển. Rollback commit frontend này, giữ nguyên các từ điển local đã lưu vì schema không đổi. Không liên quan PR #44.
