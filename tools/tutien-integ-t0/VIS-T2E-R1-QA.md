# VIS-T2E-R1 — 08/11/2026

Kết luận: PASS kỹ thuật; chờ An Du nghiệm thu hình thức.

## Preflight và bảo toàn

- Worktree D:/Games/gamedienvl/github/tutien-world-v1; branch work/tutien-world-v1; HEAD 6adc79707eea7808589448ca08e30f6c2277d361.
- Giữ toàn bộ dirty/untracked hiện hữu. Backup tệp liên quan và WebP trước sửa: tools/local-backups/vis-t2e-r1-20261108/.
- Đối chiếu manifest 110 đường dẫn bảo vệ từ NAV R2: 108 nguyên vẹn; chỉ hai JS tích hợp đã thay đổi từ VIS-T2E trước đó. Không sửa prototype/Combat Core hoặc CSS NAV.
- 21 bản nguồn trích ZIP giữ đúng SHA256. Không sửa ảnh PNG gốc.

## Nguyên nhân và sửa chữa

1. X cha ở header có stacking level cao hơn stacking context chứa chi tiết; vùng nhấn vô hình có thể bắt chạm tại X chi tiết. Khi mở chi tiết: ẩn và vô hiệu X cha, đặt main inert, dùng closeDetail riêng, chặn click truyền lên; Escape chỉ đóng chi tiết.
2. PNG detail-panel-empty đã vẽ hai khung thuộc tính, vùng hiệu ứng, hai ô so sánh và hai nút. Fixture chỉ có tên kiếm/trạng thái sở hữu; không có ảnh item, phẩm chất, bonus riêng hay mô tả. Không còn đổ thông báo thiếu dữ liệu lên các khung rỗng. Bản R1 dùng khung ngọc vuông equipment-slot-empty hiện có cho bảng chi tiết gọn, cùng một tỷ lệ artwork; chỉ tên, danh mục, trạng thái và quay lại.
3. Ô trống chỉ chọn ô và cập nhật thông báo inline, không mở chi tiết vật phẩm. Footer hiển thị số ô đã trang bị từ phép chiếu dữ liệu.
4. Công cụ xuất WebP trước đó tham chiếu window.name thay vì tên asset trong vòng lặp Node. Kết quả mọi ảnh bị hạ xuống cạnh dài384px. Sửa tham chiếu, xuất lại nền873x1801 và nhân vật cạnh dài1254 từ PNG gốc. Chi tiết không có filter/backdrop-filter/opacity giảm; chỉ nền phía sau tối.

## Tệp sửa

- js/tutien-equipment-vis-t2e.mjs
- css/tutien-equipment-vis-t2e.css
- tools/tutien-integ-t0/optimize-t2e.mjs
- tools/tutien-integ-t0/run-t2e.mjs
- tools/tutien-integ-t0/equipment-vis-t2e.test.mjs
- assets/tu-tien/vis-t2e/web/: nền chính, nhân vật, bảng chi tiết derivative và manifest. Các WebP khác tái xuất có bytes giữ nguyên.

## Kiểm chứng đã chạy

- node --test prototypes/tutien-combat-s/tests/*.test.mjs tools/tutien-integ-t0/*.test.mjs: 108 PASS, 0 FAIL.
- node tools/tutien-integ-t0/run-t2e.mjs <Chrome>: 58 PASS, 0 FAIL.
  Viewports320x568,344x710,375x812,430x932,1280x900: thao tác chạm X chi tiết rồi X cha, ô Nhẫn không mở item giả, Escape, bounds nội dung, ảnh đúng độ phân giải, host/NAV không đổi, snapshot save trước/sau byte-identical, không request ngoài.
- node tools/tutien-integ-t0/run-browser.mjs <Chrome>: 21 PASS, 0 FAIL. MOD-P2 đủ3trận, receipt/reload và điều hướng Library/Kỳ Vận/Bách Hí/Kho/Ví/Nhiệm Vụ không hồi quy.
- Dùng profile Chrome QA tạm biệt lập và server loopback offline4180. Không dùng profile/save của An Du.

Ảnh và report cuối: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-zbQsQD/

- equipment-{320,344,375,430,1280}.png
- detail-sword-{width}.png
- empty-ring-{width}.png
- returned-equipment-{width}.png (sau nhấn X chi tiết)
- returned-home-{width}.png (sau nhấn X cha)
- report.json và geometry.json

Hồi quy website: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-PIsO77/.

## Giới hạn asset và đề xuất Art

Không dùng detail-panel-empty trong runtime R1 vì bố cục cố định buộc hiện nhiều vùng không có nội dung. CSS chỉ có thể đặt chữ hoặc che phủ các vùng đã vẽ, không thể dồn khung hoặc bỏ nút mà vẫn giữ toàn vẹn hoa văn. Không sửa PNG gốc. Khi mở rộng dữ liệu item, đề xuất khung chi tiết có viền/tiêu đề tách lớp, nền nội dung trống không vẽ sẵn khung stats/so sánh/nút; nút và đóng là lớp riêng. Đây chỉ là đề xuất, chưa tạo asset.

Chi tiết R1 chưa có ảnh vật phẩm riêng, phẩm chất, bonus hoặc thao tác tháo/lắp. Không giả lập các trường đó. 320x568 vẫn có lề ngang để giữ toàn thân và tỷ lệ khung chính. Không có gameplay mới, không thay chỉ số/ownership/save/backend và không commit/push/deploy.

Preview: http://127.0.0.1:4180/?sandbox=1 → Tu Tiên → Trang bị.
