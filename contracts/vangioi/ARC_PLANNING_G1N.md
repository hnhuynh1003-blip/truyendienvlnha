# G1N — Kế hoạch arc trong Creator

26/10/2026; nền cb7c9fd (G1M). Đã thêm tab Kế hoạch arc ở Vạn Giới: tạo thủ công từng chặng với ID ổn định, tên, mã chương đầu/cuối, mở đầu, mục tiêu, kết thúc và bản ghim nguồn. Không bắt nhập toàn bộ cast/NPC/scene hoặc dùng AI. Kế hoạch có thể còn thiếu nội dung.

## Lưu và tương thích

`arc-plan-1` là sidecar của nháp local, không phải trường world-content-1. Lưu vào record IndexedDB hiện có dưới arcPlan; format/key/UID/store không đổi, không nâng database. Nháp cũ thiếu arcPlan được mở với kế hoạch rỗng. Đổi UID dọn kế hoạch cùng nội dung; async lưu/mở giữ guard epoch/UID hiện hữu.

Xuất JSON giữ định dạng content cũ và chỉ xuất nội dung world. Nút Xuất kèm arc xuất envelope creator-arc-package-1 gồm format/content/arcPlan. Nhập JSON nhận cả hai dạng; nhập content cũ khởi tạo kế hoạch rỗng, có xác nhận thay nháp khi đang sửa. Kế hoạch sai cấu trúc bị từ chối trước khi thay nội dung. Giới hạn nhập 2 MiB giữ nguyên; tối đa 200 arc và 4000 ký tự mỗi trường là giới hạn công cụ, không phải quota kể chuyện/bậc F–S. Truyện lớn hơn có thể chia gói.

## Nguồn và giới hạn thực tế

Arc tạo khi nguồn hiện tại đủ kind/storyId/storyVersion/contentHash sẽ copy pin; nếu thiếu thì source=null. Có nút ghim lại rõ ràng, hỏi xác nhận khi thay pin cũ. Đổi source của world chỉ báo lệch, không sửa nguồn của arc cũ. Pin này là tham chiếu tác giả khai, chưa được server xác minh; không tự chuyển dữ liệu chương, cấp quyền hoặc đổi Canon.

Đối chiếu EPUB V49: publicBooks trả ID và chapterIndex nhưng không có version/hash hoặc quyền chuyển thể được registry xác nhận. Không dùng updatedAt làm phiên bản, không hash một index chưa tải đủ nội dung và gọi đó là hash truyện. Vì thế **source picker có quyền chưa triển khai** ở G1N. Tác giả tiếp tục nhập pin đã có từ registry tại Nguồn & ảnh; không cần tải lại truyện. UI luôn báo chưa xác minh chương/quyền. Không đọc truyện riêng bằng cách bỏ qua rules.

Mã chương lưu như ID nguồn, không suy thứ tự bằng so sánh chuỗi hoặc số chương. Khoảng chương chưa được kiểm tồn tại/thứ tự, nội dung arc chưa được kiểm đồ thị hoặc chơi. mode chỉ manual; hỗ trợ AI là hướng tương lai. Chưa có phụ thuộc/continuity giữa arc, review/publish manifest hoặc chuyển trạng thái người chơi.

## QA và bàn giao

11 test logic mới: kế hoạch thiếu nội dung, giữ pin cũ, trùng ID, giả quyền, version/hash, giới hạn, không rò nội dung. Chromium Creator thêm luồng soạn → lưu → xuất/nhập gói → đổi source → mở lại nháp, cùng hồi quy nháp G1G, UID, PNG, shops và quota. CI hiện hữu tự chạy các test mới. Không đổi backend/Firestore/auth/Kho/AI/kinh tế hoặc pilot.

Tiếp theo: adapter source manifest có quyền và chapter IDs ổn định trước khi mở picker; rồi pin/hash sidecar trong snapshot review, kiểm tham chiếu và diff nguồn. G1N không tuyên bố đã hoàn tất liên kết Thư viện production.

Rollback: revert G1N; record local cũ có thể giữ arcPlan nhưng code cũ sẽ bỏ qua khi đọc. Xuất kèm arc trước rollback để bảo toàn kế hoạch; không có migration production.
