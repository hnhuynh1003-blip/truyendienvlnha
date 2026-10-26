# G1Y — Kiểm tra quyền tại thời điểm dự định phát hành/truy cập world đã duyệt

26/10/2026. Nền G1X `b9def0b` (Smoke/Pages SUCCESS). G1Y tạo **cổng tiền kiểm độc lập, chỉ đọc SQLite**, để chứng minh việc một thế giới đã được reviewer duyệt **không đồng nghĩa** nguồn truyện của nó vẫn hợp lệ tại thời điểm dùng. Chưa thực hiện phát hành, cấp session, chạy gameplay, tạo quyền, đồng bộ hay nối môi trường thật.

## API và ranh giới tin cậy

`cloudflare/src/vangioi-world-release-gate.mjs` xuất:

`createSqlWorldReleaseGate({storage,projectId,verify}).evaluateApprovedWorld(request,{worldId})`

- Host đã tin cậy phải khởi tạo schema G1R/G1X trong **cùng một** SQLite authority trước. G1Y không tự migration; không nạp dữ liệu client/Firestore vào bảng quyền.
- Chỉ UID đã được gán **active registry operator** trong SQL gọi được; Firebase custom `admin` hay role owner/reviewer/publisher trong JSON không thay assignment. `worldId` chỉ là selector, không nhận snapshot, permit, trạng thái duyệt hay grant từ request.
- Thành công trả `{ok:true,eligible:true,worldId,snapshotHash,gateVersion:'world-release-1'}`. Đây là *đủ điều kiện theo SQLite tại thời điểm kiểm tra*, **không phải lệnh phát hành, quyền truy cập người chơi, token, hoặc tuyên bố live**. Không trả private chapter, nội dung Canon, evidence, ảnh hay secretTruth.
- Lỗi fail closed trả `{ok:false,code}`. Những lỗi như `world-not-approved`, `source-held`, `source-not-authorized`, `permit-untracked`, `asset-not-authorized` là lý do tiền kiểm nội bộ; chưa có public endpoint và không xuất cho người chơi.

## Cách ra quyết định

1. Kiểm trạng thái header `approved` **hiện hành**, đúng revision hiện hành, bản ghi reviewer `approve`, snapshot immutable cùng `snapshotHash`, và người gửi khác người duyệt. Tính lại hash bất đồng bộ bằng hàm integrity G1L trước khi đưa ra kết luận.
2. Trong **transactionSync cuối**, kiểm lại đúng bytes snapshot và reviewer cùng header, rồi kiểm source pin `kind/storyId/storyVersion/contentHash` đối với version, quyền grant của **world hiện tại**, catalog authority và người có quyền sở hữu.
3. Với `kind=library`, nếu có notice `open` từ G1X theo `(storyId,contentHash)` thì chặn; nếu G1R permit đã revoked thì chặn; permit thiếu đối với nguồn G1F legacy cho kết quả `permit-untracked` (**chỉ ở G1Y**, không sửa hay xoá legacy G1F grants/đọc truyện cũ). Permit đang active phải thuộc đúng owner. G1Y không quyết định liệu việc V49 cập nhật/gỡ có tự hủy quyền dùng hash cũ hay không; điều đó vẫn cần Du duyệt và có operator notice khi có tín hiệu được xác minh.
4. Kiểm các asset được snapshot tham chiếu vẫn có grant active, catalog version đúng hash/kind và quyền theo world. Không thay đổi reviewStatus ảnh, không tự cấp thêm approval; bước QA visual trước khi public vẫn bắt buộc.
5. Giữ nguyên `approved` và bản ghi review trước/sau hold. `release` notice chỉ gỡ phần hold tương ứng; nhiều notice còn mở vẫn chặn. Thu hồi G1R không được phục hồi bằng release notice. World đã reopen thành draft không còn đủ điều kiện.

Vì preflight và việc phát hành/session tương lai **chưa cùng một transaction**, kết quả `eligible` có thể trở nên cũ ngay sau khi trả về. Host phát hành thật phải xác minh lại ngay ở điểm quyết định và thiết lập cơ chế chặn *discovery/start/resume/source reads* phù hợp, kể cả session đang chơi; một lần gọi G1Y không thay thế các cổng đó. Không có cơ chế push hold/revoke từ Firestore tới runtime hay cách cưỡng chế thoát người chơi trong G1Y.

## Kiểm thử và tương thích

- Regression: approved hợp lệ; hold sau duyệt; nhiều hold chồng nhau; release; G1R revoke; legacy không permit; asset revoke; world reopen; người không có assignment; input giả; JSON snapshot bị hỏng; hold xuất hiện giữa hash và transaction cuối; Worker/HTTP không import module mới.
- Không sửa bảng G1A–G1X, không thay đổi schema snapshots/receipts/registry/review, không phát hành V66 seed, AI, vật phẩm/EXP/Xu/Kho, Rules, production bindings, Worker index, Creator source picker hay Thiên Mệnh.
- Rollback offline: hoàn nguyên module/test/hợp đồng G1Y. Nếu host sau này đã nối gate, rollback **không được** bỏ cổng kiểm quyền khi world có thể phát hành; phải có giải pháp deny-all thay thế.

## Điều kiện trước staging thật

Du vẫn cần chọn chính sách hash nguồn khi Thư viện V49 sửa/unpublish (tiếp tục dùng pin có giấy phép độc lập hay tạm giữ), Firebase project/database/region/edition và phương án vận hành review notice, listener/consumer/outbox, retention, backup. Chỉ sau đó mới lập adapter operator publisher/live boundary với kiểm thử fail-closed lúc revoke, không tự bật bởi commit G1Y.
