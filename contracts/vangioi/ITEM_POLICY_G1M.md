# G1M — Hồ sơ chính sách vật phẩm offline

Ngày 26/10/2026; nền a931b4d (G1L). Đã có schema `item-policy-proposal-1` và hàm `inspectItemPolicyProposal` trong module Node offline. Chưa có catalog thật, giao diện chọn đồ, registry lưu/duyệt item, engine cấp đồ hoặc tuyến HTTP mới.

Hồ sơ là sidecar riêng, pin worldId và hash canonical toàn bộ content bằng hashAuthoringJson hiện có. Không thêm trường vào world-content-1, không đổi validator semantic-2, nháp, snapshot, save Quan Đạo hoặc bảng SQLite. Sidecar này chưa được G1L gửi kèm hoặc xét duyệt tự động. Không import module offline có Node fs/Ajv vào Worker hay trình duyệt.

## Dữ liệu và cách kiểm tra

- Mỗi itemId tham chiếu item trong content, có definitionId/version/hash, origin standard/custom, nguồn gốc, tác dụng và giới hạn. Đây là đề nghị của tác giả. Hash định nghĩa chỉ là pin; với custom chưa có bytes định nghĩa để xác minh.
- Standard cần catalog do người chạy preflight tin cậy cung cấp, đúng một bản approved khớp ID/version/hash. Catalog mặc định rỗng; bản revoked, hash khác hoặc trùng khóa đều bị từ chối. Catalog của hệ thống cũ không tự coi là catalog G1M. Không cho nhét catalog hoặc trạng thái duyệt vào proposal.
- Notebook là ghi chép, quantity=1, mọi quyền sở hữu/sử dụng/giao dịch/xuyên giới đều false. World là đề nghị vật phẩm trong thế giới; hold/use/trade/crossWorld tách riêng, sử dụng/giao dịch/xuyên giới cần quyền giữ được đề nghị. Chưa có lớp Kho để tác giả tự khai cấp thật.
- Acquisition group gom nhiều route vào một entity theo scope instance hoặc continuity. Từ chối trùng group, trùng entity trong cùng scope, route dùng ở hai group, thiếu item hoặc quantity vượt giới hạn đề nghị. quantity là số nguyên dương an toàn JS, không phải mức cân bằng đã duyệt. Nhiều bản sao hợp lệ cần entityId riêng; nhiều tuyến cùng túi phải nằm chung group.
- Route ID hiện là định danh thiết kế của adapter tương lai, chưa ánh xạ action/hotspot/NPC trong engine. Không suy ra đường đi tồn tại hoặc vật phẩm tiếp cận được chỉ từ preflight này. Tổng cung nhiều entity và khả năng mua cần engine/policy riêng, chưa xác minh ở G1M.
- Ngoại lệ era/power cần rationale/sourceNote và tạo cảnh báo reviewer; không tự bác đồ tương lai ở cổ đại hay đồ mạnh ở F. Đây là khai báo ngoại lệ chủ động, chưa có AI phát hiện sai thời đại/sức mạnh. Đề nghị crossWorld luôn tạo cảnh báo xét duyệt, không sinh quyền xuất Kho.

Kết quả chỉ có validForOfflineReview/errors/warnings. Lỗi trả code/path, không trả nội dung truyện. PASS không phải approval, quyền dùng definition, license, publish hoặc grant. Nhãn approved của catalog chỉ xác minh định nghĩa; quyền dùng trong world vẫn cần registry/policy server tương lai. Không có API cấp EXP/Xu/chỉ số hoặc thưởng.

## Nghiệm thu và giới hạn

14 tests mới kiểm pin, catalog/thu hồi, nhiều tuyến, số lượng, sổ tay, giả quyền, ngoại lệ, dữ liệu kín và schema cũ. Chạy bằng npm test --prefix cloudflare (suite tự nhận *.test.mjs trên CI). Không sửa giao diện nên không thêm browser test mới; hồi quy Quan Đạo vẫn dùng test G1L.

Bước tiếp: thiết kế arc/source picker gọn và contract sidecar tương ứng; tích hợp item proposal vào snapshot/review chỉ sau khi có registry definition, quyền và versioned release manifest. Chưa deploy/migrate backend, chưa tự mở gameplay modules hoặc phó bản mới.

Rollback: revert commit G1M; chỉ xóa module offline/schema/tests/tài liệu được thêm, không có dữ liệu production để di trú.
