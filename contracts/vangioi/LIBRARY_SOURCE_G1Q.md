# G1Q — Chuẩn bị nguồn chuyển thể từ Thư viện

26/10/2026; nền 722a8cf (G1P). Có module createLibrarySourcePreparer độc lập, kiểm thử bằng reader snapshot tổng hợp và registry SQLite thật. Đây là protocol chuyển dữ liệu/kiểm quyền ở tầng server, **chưa có Firebase SDK reader, truy cập Firestore thật hoặc tự ghi registry**. Không sửa EPUB V49, dữ liệu sách hay Firestore Rules.

## Contract trusted host

Factory nhận projectId, verifier Firebase hiện hữu, isOperator(uid), readSnapshot({storyId,authorizedUid}). Hai callback cuối phải do host server cài, không lấy từ input. isOperator kiểm assignment server, không dựa admin claim. readSnapshot phải đọc book/index/chapters và permit trong một consistent snapshot/transaction; không fetch từng chương ngoài snapshot rồi tự gọi đó là phiên bản ổn định. Không có reader mặc định cho live; thiếu callback thì factory từ chối.

Request chỉ gồm storyId, authorizedUid, requestId UUIDv4. Không nhận nội dung chương, license, permit, role hoặc hash từ request. Người chưa xác thực/operator không được đọc snapshot. Input đọc lại hai lần và hash cả snapshot để phát hiện thay đổi nội dung/permit/metadata trong khi chuẩn bị; operator được kiểm lần nữa. Callback đọc quá lớn/sai cấu trúc/lỗi trả code kín, không trả exception hoặc truyện.

Snapshot projection:

- book: id, title, ownerUid, status draft/published, chapterCount, chapterIndex [{id,title,order}]. Không chấp nhận importing hoặc thiếu chương. Reader V49 tương lai cần bỏ wordCount/cover metadata khi tạo projection này.
- chapters: [{id,title,order,content}] lấy từ đúng collection truyện. Có thể trả không đúng thứ tự, adapter sắp theo chapterIndex; ID/title/order phải khớp, không được trùng/thiếu. Không tạo lại chapter ID theo số đếm.
- permit: storyId, authorizedUid, contentHash, status active, revision >=1, license original/licensed/public_domain, sourceNote, proofRef. licensed phải có proofRef. Permit là kết luận của quy trình thẩm định server tương lai, không có field tương đương trong EPUB V49 hiện tại. ownerUid, published hay admin không tự cấp quyền chuyển thể. Người nhận có thể khác owner nếu permit cho phép.

Permit contentHash phải khớp hash canonical story-source-1 gồm title và các chapterId/title/text theo thứ tự. Đây là hash projection nguồn chuyển thể, không phải hash tệp EPUB, importFingerprint V57 hoặc updatedAt. Nội dung content được giữ nguyên thành text, không eval hoặc render HTML. Khi nối UI phải hiển thị như dữ liệu trơ.

## Kết quả và giới hạn

Kết quả ok chứa reference kind library/storyId gốc/storyVersion `sha256-<hash>`/contentHash, permitRevision và registryInput theo registerSource G1F. Version thay khi title/ID/thứ tự/nội dung nguồn thay. Hash là định danh nội dung, không chứng minh bản quyền. Không có approved/canPublish/grant. Output có truyện/proof riêng tư: chỉ dành thao tác operator server, không trả trực tiếp cho Creator hoặc ghi log.

RegistryInput là **gói chuẩn bị**, không phải vé quyền tồn tại lâu dài. Trước khi nối ghi thật, host phải có cơ chế bảo vệ khoảng giữa đọc Thư viện và commit SQLite: immutable source/permit version cùng commit-time revalidation, hoặc outbox/quy trình đồng bộ được thiết kế. Hai lần đọc không làm Firestore+SQLite thành giao dịch phân tán. Có thể thu hồi ngay sau kiểm tra cuối; vì vậy G1Q không tự register/grant hoặc claim đã nối production. G1F vẫn kiểm operator, recipient và tính hash lại khi operator thực hiện nhập.

Giữ giới hạn G1F: payload <=1 MiB, tối đa 5000 chương và JSON copier <=2 MiB/100000 nodes. Đây không mở giới hạn EPUB V49 160 chương; reader thực tế phải tôn trọng dữ liệu hiện có. Quá giới hạn trả lỗi, không cắt truyện hay yêu cầu tác giả đăng lại. Truyện dài hơn cần storage theo chunk/manifest riêng.

Một version registry G1F chỉ thuộc một recipient. G1Q không làm catalog dùng chung hoặc hỗ trợ nhiều license cho cùng version; nhập lại với người nhận khác vẫn xung đột theo G1F. Grant world vẫn là thao tác riêng của owner, không do preparer cấp.

## QA và bàn giao

16 test mới gồm chuẩn bị canonical pin, reorder snapshot, thiếu/trùng/sai chapter, quyền thiếu/thu hồi/hash cũ/proof, giả field/operator, thay đổi đồng thời, giới hạn và tích hợp prepare → registerSource → grant → manifest/range. Tích hợp chỉ dùng nguồn/UID giả, không ghi Firestore thật. Tổng 424 Worker/helper. Module bundle browser-target ESM được để scratch để kiểm dependency; không được thêm vào trình duyệt chỉ vì bundle thành công.

Không đổi schema world/arc, nháp, HTTP live, source picker, AI, rewards, Kho hoặc Canon. CI/Pages theo commit G1Q; không coi test hoặc Pages deploy là backend nguồn đã hoạt động.

Tiếp: chốt nơi lưu permit/version, reader consistent snapshot Firestore và chiến lược đồng bộ/thu hồi với registry trước khi bật import transport/picker. Không tự thêm Rules, cấp operator, migrate hoặc đọc account production. Rollback revert G1Q, không có dữ liệu production cần xóa.
