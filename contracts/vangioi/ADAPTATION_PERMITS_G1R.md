# G1R — Sổ quyền chuyển thể và thu hồi nguyên tử

26/10/2026, nền 5bdf11b; CI G1Q đã SUCCESS. Mở rộng registry SQLite hiện hữu bằng bảng adaptation_permits_v1, không tạo backend mới. Chưa triển khai production hoặc Firestore.

Operator server dùng issueAdaptationPermit với requestId, storyId, contentHash, authorizedUid, license, sourceNote, proofRef. Quyền gắn một recipient và hash nguồn canonical, chỉ issue một lần; licensed yêu cầu proof. Đây là ghi nhận kết luận thẩm định của operator, không kiểm pháp lý tự động. Không lấy admin claim thay assignment operator.

readAdaptationPermit({storyId,contentHash}) chỉ cho operator; trả đúng hình dạng permit của G1Q. Host có thể dùng kết quả để tạo snapshot preparer; vẫn phải bảo đảm consistent reader và kiểm source hash. Chưa có reader Firestore hoặc tự ghép hai kho thành transaction. G1Q không tự gọi reader này vì chưa có host reader thật.

revokeAdaptationPermit thêm expectedRevision và requestId. Trong cùng transaction: kiểm operator/revision → chuyển permit active thành revoked → revoke registry object cùng source hash → revoke mọi world grant của version sha256-hash → receipt/audit. Lỗi bất kỳ rollback tất cả. Không xóa payload/snapshot. Replay trả kết quả lịch sử, không khôi phục quyền. Metadata permit bất biến; không xóa/reactivate. Không mở UI/API cấp quyền.

registerSource kiểm permit đang tồn tại ngay trong transaction: trạng thái active, recipient/license/proof/sourceNote khớp và storyVersion=sha256-hash. Gói G1Q đã chuẩn bị trước khi thu hồi sẽ bị chặn. Không nhận permit vào request đăng ký; đọc từ SQL thật. Source legacy không có permit tiếp tục theo G1F để giữ tương thích; đây không phải yêu cầu bắt buộc permit cho toàn bộ library intake. Không cho tạo permit để nhận lại nguồn đã đăng ký dưới cùng story/hash; cần kế hoạch migration riêng. Cổng legacy/operator chưa được bật HTTP. Không được mô tả G1R là toàn bộ nguồn Thư viện đã bắt buộc qua permit.

Giới hạn: thu hồi chỉ nguyên tử trong cùng storage SQLite. Firestore chưa được đồng bộ; không có outbox liên dịch vụ hoặc phát hiện thu hồi từ bên ngoài. Trước live phải xác định authority duy nhất và adapter đồng bộ/kiểm tại commit. Không tự thay Rules, migration, EPUB, AI, Kho hoặc kinh tế.

QA: 5 test mới về persistence/read/replay, immutability, cascade revoke, chặn stale import/đổi recipient, rollback và quyền/revision. Toàn bộ Worker/helper kiểm cùng hồi quy hiện hữu; CI theo commit G1R. Module vẫn độc lập, Pages deploy không có nghĩa backend đã bật.

Tiếp theo: host source/permit reader và staging topology; chỉ nối picker khi có endpoint và quyền thật. Rollback revert G1R trong mã; chưa có dữ liệu production. Nếu sau này đã dùng bảng permit thật, cần rollback policy giữ chặn quyền revoked, không chỉ xóa code guard.
