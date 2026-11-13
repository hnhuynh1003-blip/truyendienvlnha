# Tu Tiên → main — 2026-11-13

Theo yêu cầu Owner, chỉ tích hợp app Tu Tiên; không merge toàn nhánh `work/tutien-world-v1`.

## Phạm vi

- App MOD-P2 trong iframe, màn động phủ VIS-T1, điều hướng VIS-T2, Túi Càn Khôn và Pháp Khí Các hiện có.
- Prototype, bộ kiểm thử, asset runtime và bridge trình bày độc lập. Không nhập ZIP, concept hoặc PNG nguồn chưa được runtime sử dụng.
- `index.html`: đúng một hook mở Tu Tiên, ID banner sandbox để đo safe area, hai CSS và hai script Tu Tiên/host. Không mang các thay đổi tên Bách Hí/Kỳ Vận, layout các game khác hay UI Ví.
- CSS host được giới hạn bằng `.tutien-integ-open`; các app khác giữ hình học trên main. Script đo banner chỉ đặt CSS variable, không ghi dữ liệu.
- Không đưa Quán Trọ, Neon N2.0, contracts/r2, các cải tiến Vạn Bảo hoặc commit thiết kế từ nhánh làm việc vào main.

## Dữ liệu và giới hạn

Đây vẫn là app **MOCK ONLY** đang có trong worktree: nhân vật fixture, IndexedDB mock, không nối tài khoản, Firebase, Ví, Tu Vi hoặc thưởng thật. Việc đưa mã vào main không đồng nghĩa triển khai production hay hoàn thiện kinh tế. App T0 cũ vẫn giữ mã, dùng fallback khi adapter không có; app mới không migrate hoặc xóa dữ liệu T0.

Không đổi nhánh/worktree, reset, stash, xóa dữ liệu, push hoặc deploy. Toàn bộ thay đổi chưa commit trước nhiệm vụ vẫn giữ tại worktree Tu Tiên. Main local trước tích hợp là `51c1972`; commit lockfile Cloudflare có sẵn được giữ nguyên khi cập nhật nền từ `origin/main` (`a4eee89`). Sau đó tạo commit riêng chỉ chứa app Tu Tiên.

## QA bản ứng viên trên nền main

- 96/96 prototype + integration/projection/bag/equipment Node.
- 61/61 phone/T0 regression Node.
- Browser: 21/21 luồng app/phó bản ba trận/lưu receipt/chuyển app; 58/58 Pháp Khí Các; 28/28 điều hướng; 86/86 Túi Càn Khôn.
- Mobile 320–430 px, desktop 1280 px; hình động phủ và chi tiết trang bị được kiểm tra trực quan. Không request bên ngoài sandbox hoặc lỗi runtime trong các báo cáo browser.
- Không kiểm thử bằng tài khoản production; viewport giả lập không thay thế nghiệm thu thiết bị thật.

Runner điều hướng được điều chỉnh để kiểm tra bố cục hiện tại thay vì so hình học với baseline mỹ thuật cũ; runner túi kiểm tra mở túi không resize chính app Tu Tiên, không bắt các app khác đổi kích thước theo Tu Tiên. Lỗi manifest của server offline được sửa trong công cụ preview, không sửa manifest production.

Xem [tổng hợp](qa/summary.json), [luồng app](qa/app-report.json), [trang bị](qa/equipment-report.json), [điều hướng](qa/navigation-report.json), [túi](qa/bag-report.json). Ảnh: [động phủ mobile](qa/navigation-after-stage-390.png), [desktop](qa/navigation-after-stage-1280.png), [chi tiết trang bị](qa/equipment-detail-sword-1280.png), [túi](qa/bag-bag-locked-390.png).

## Chạy lại trên main

`node tools/tutien-integ-t0/serve.mjs 4180`, mở `http://127.0.0.1:4180/?sandbox=1` → Cyber Phone → Tu Tiên. Server preview chặn kết nối ngoài và dùng offline SDK. Các báo cáo cũ trong `tools/tutien-integ-t0/` là lịch sử; kết quả tích hợp main nằm ở tài liệu này.

Browser: `node tools/tutien-main-integration/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"`. Các runner cùng thư mục dùng profile Chrome tạm. `prepare.py` chỉ là công cụ audit của lần tích hợp này, có assertion phụ thuộc baseline và không dùng làm lệnh deploy.
