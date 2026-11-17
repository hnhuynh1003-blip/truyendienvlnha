# DUDU STUDIO — Library L5.6B (đề xuất nghiệm thu)

Baseline: main 3d73a6d016e1fd8b21509f5d74aa44c861528863, đã tích hợp L5.6A và QA Library.
Phạm vi: từ điển thuật ngữ trong trình đọc Web/EPUB. Không sửa Game, Cloudflare R2, Firebase Rules, dữ liệu truyện, tiến độ, Kho/Ví, EXP hoặc Tu Vi.
Trạng thái: triển khai nhánh riêng; chỉ coi là phát hành khi PR được hợp nhất và QA đạt.

## 1. Phân biệt tên nhân vật / thuật ngữ

- nameCandidate: L5.6A và từ điển L5.3–L5.5 tiếp tục phụ trách; yêu cầu ngữ cảnh nhân vật và chủ động xác nhận.
- termCandidate: tìm khớp nguyên văn trong chương từ 27 cụm gợi ý tu tiên cục bộ hoặc thuật ngữ do người đọc lưu. Danh mục này không xác nhận ý nghĩa trong một truyện cụ thể, không khẳng định chữ Hán gốc.
- termConfirmed: người đọc xác nhận cùng ghi chú tối đa 240 ký tự, tách biệt hồ sơ nhân vật.
- Tên nhân vật xác nhận được ưu tiên; không cho lưu thuật ngữ trùng tên nhân vật.

## 2. Hiển thị và dữ liệu

- Mở Từ điển → Kiểm tra thuật ngữ trong chương; không có nút nổi mới trên trình đọc.
- Có số lần xuất hiện thực, trích đoạn, vị trí, nút Đến vị trí.
- Người đọc dùng Xem và lưu, ghi chú thủ công, Lưu thuật ngữ, Bỏ qua, Khôi phục, Sửa, Xóa, Hoàn tác và Xuất/Nhập JSON.
- Khóa lưu riêng dudu-reader-terms-l56b:<encoded-storyId> (localStorage), phiên bản 1, tối đa 200 mục và 300 mục bỏ qua; không thay đổi key tên nhân vật L5.3–L5.6A.
- Import bắt buộc cùng storyId, từ chối mục xung đột, phát hiện lỗi parse và không làm hỏng dữ liệu cũ; undo từ chối khi tab khác đã thay đổi.
- Không tự sửa từ ngữ trong văn bản, kể cả thuật ngữ đã lưu; chỉ bổ sung chú giải. Không ghi cloud.

## 3. Kiểm thử và nghiệm thu

- Unit: chứng cứ thực, Unicode NFC/NFD, offset, tên ưu tiên, tách truyện, bỏ qua/khôi phục, undo, backup, atomic import, chương dài.
- Browser: desktop và mobile mô phỏng 320/390/430 px; xác nhận, lưu, bỏ qua, khôi phục, mở Web/EPUB, giữ nguyên bản gốc và bookmark.
- Workflow Library tiếp tục chạy regression L5.3–L5.6A, Web/EPUB.
- Vẫn cần nghiệm thu Android thật về bàn phím IME, chọn/copy gốc và vuốt.
- L6/R2, xóa EPUB cũ, Firebase Rules và đồng bộ cloud nằm ngoài phạm vi.

## 4. Giới hạn

- Danh mục mở đầu có 27 thuật ngữ; không phải từ điển từ nguyên học và không đảm bảo đúng nghĩa mọi truyện.
- Không trích nguồn Hán ngữ, không tự gộp đồng nghĩa, không dùng API AI trả phí.
- Từ điển cục bộ theo thiết bị; chuyển thiết bị bằng Xuất/Nhập JSON đến khi có phê duyệt đồng bộ.
