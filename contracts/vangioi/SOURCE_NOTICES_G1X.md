# G1X — Thông báo tranh chấp nguồn, tạm giữ quyền và quyết định thu hồi

26/10/2026. Nền `bc74b49` (G1W; GitHub Actions Smoke/Pages SUCCESS). G1X bổ sung một **sổ notice và overlay tạm giữ trong SQLite offline**, kết hợp registry G1R/G1U/G1W và kiểm tra authoring đã có. Chưa kết nối Firestore thật, listener, hệ thống pháp lý, backend public, production migration, Firestore Rules, role/entitlement từ client hoặc Creator picker.

## 1. Phân biệt các trạng thái — không tự suy đoán quyền

| Biến cố ghi nhận | Ý nghĩa | Quyết định được phép trong G1X |
| --- | --- | --- |
| `source_unpublished` | Operator ghi nhận thông tin nguồn Thư viện không còn xuất bản | Tạo **notice open** để tạm giữ; không suy rằng đã mất bản quyền, không tự xóa snapshot |
| `rights_dispute` | Có tranh chấp quyền chuyển thể cần thẩm định | Tạm giữ theo đúng `storyId + contentHash`, chờ xác minh evidence |
| `owner_report` | Người được xác minh báo mất/thu hồi đồng ý sử dụng | Tạm giữ trước; operator kiểm phạm vi, sau đó nếu hợp lệ mới gọi G1R revoke |
| `released` | Operator đã xử lý một notice và cho phép bỏ *hold* của notice đó | **Không cấp license/permit/grant**; các điều kiện cũ vẫn phải đáp ứng |
| `revoked` | Operator đã xác nhận G1R permit cho hash đó bị thu hồi | G1R tiếp tục là authority bất biến, revoke grants và ghi outbox; không được tái cấp bằng giải tỏa notice |

`source_unpublished` không đồng nhất với `revoked`. Một bản nội dung đã pin không tự hợp lệ hay bất hợp lệ chỉ vì Firestore có thay đổi metadata. Trước khi triển khai listener/staging, Du vẫn phải duyệt chính sách: bản hash cũ có thể được sử dụng theo permit độc lập hay bị tạm giữ khi V49 sửa/gỡ. G1X không đưa ra lựa chọn pháp lý thay Du.

## 2. Hợp đồng SQL và operator

`cloudflare/src/vangioi-source-notices.mjs` xuất `createSqlSourceNoticeService({storage,projectId,verify,now})` với các phương thức:

- `openNotice(request,{requestId,storyId,contentHash,reason,evidenceRef})`: chỉ UID thuộc `vg_authoring_registry_operators_v1` trạng thái active được mở notice. Evidence có thể là tham chiếu private, không phải văn bản được chứng minh tự động. Tạo `noticeId` server và trạng thái `open`, revision 1, ghi receipt + audit nguyên tử.
- `resolveNotice(request,{requestId,noticeId,expectedRevision:1,decision,note})`: `decision=release` thì đóng notice thành `released`; `decision=confirm_revoke` **chỉ thành công sau khi** current G1R permit đã có status `revoked` (operator gọi G1R riêng trước). Không có nhánh AI hay client tự revoke.
- `readNotice(request,{noticeId})`: operator-only; trả trạng thái và metadata tối thiểu, **không trả evidenceRef, note hay nội dung nguồn**.

Sổ `vg_authoring_source_notices_v1` dùng từng `noticeId` riêng, cho phép nhiều tranh chấp độc lập trên cùng `(storyId,contentHash)`. Chỉ khi **không còn notice `open`** cho khóa đó, hold mới được gỡ. Metadata bất biến; UPDATE chỉ cho đúng chuyển tiếp `open → released/revoked`, tăng revision 1; không xóa, không reopen. Những thay đổi thật được ghi receipt/audit `scope=notices`, replay requestId không tạo notice mới, lỗi audit rollback toàn transaction.

Không có endpoint cho người đọc/tác giả; role reviewer/publisher/client admin không có quyền open hoặc resolve. `release` không đổi permit G1R; nếu permit đã revoked thì vẫn bị chặn dù hết hold. Những notice không có permit cũ vẫn có thể release theo thẩm định operator để gỡ khối chặn *tạm thời*, nhưng không vì thế mà nhận license.

## 3. Tác động đối với đường sử dụng nguồn đã có

Khi có notice `open` cho một source `library` và đúng content hash, các thao tác SQL sau bị chặn hoặc che nguồn:

1. `issueAdaptationPermit`: không issue mới khi hash đang held; G1R revoke **vẫn được phép**.
2. `registerSource` G1F: chặn đăng ký nguồn, kể cả lối library legacy chưa permit và cả requestId retry trong thời gian hold. `setSourceGrant(status=active)` bị chặn; thu hồi grant vẫn được phép.
3. `readSource`, `sourceManifest`, `sourceRange`: không trả payload/private chapters; kiểm hold trước đọc và **kiểm lại** sau bước hash có `await`.
4. `listSources` G1O: không liệt kê source held cho owner; không lộ chi tiết khi cursor phân trang.
5. `freezePrepared` và `registerFrozen` G1W: không lưu bản đóng băng mới hoặc mở bytes từ frozen archive khi notice đang open; G1F vẫn chặn ở ranh giới ghi nếu hold xuất hiện muộn.
6. `storySource` resolver trong SQL authoring: trả hiệu lực grant như `revoked` khi source bị hold, nên **submit/review approve** có phụ thuộc nguồn này sẽ không vượt qua validation hay dependency recheck, dù grant row vật lý vẫn `active`.

Overlay này là **tạm giữ**, không sửa grant revision, không thay đổi snapshot/Canon. Nếu mọi notice được release và permit/grant còn hợp lệ, các thao tác trước đó có thể tiếp tục. Với nguồn không phải `library`, hold không can thiệp. Source picker chưa có HTTP route; trước live cần bổ sung chính sách publisher/approved worlds đã phát hành: một world đã approved trước khi notice được mở **không tự bị de-publish** bởi G1X, và không được mô tả rằng toàn bộ gameplay đã bị tắt.

## 4. Thử lỗi và giới hạn staging

- Regression kiểm: source owner đang có grant không thể đọc/list/submit trong hold; giải tỏa phục hồi; nhiều notice chồng nhau; review approve không vượt qua hold; intake G1F legacy/permit mới đều bị chặn; G1R revoke trước xác nhận notice; role client/owner/admin bị từ chối; replay và schema immutable; audit rollback; hold xuất hiện khi đang hash không rò văn bản nguồn.
- Không có Firestore listener. Việc phát hiện V49 sửa/xóa/unpublished, xác thực ownership và giấy phép ngoài đời còn là **bước nghiệp vụ/chức năng staging tương lai**, chưa đọc dữ liệu Firebase thật.
- Quyền giữ/xóa dữ liệu nhạy cảm vẫn chưa chốt. Bảng notice/evidence và archive G1W chứa dữ liệu có thể cần retention policy, backup, legal hold hoặc privileged purge; **không** được xóa thủ công dữ liệu production theo commit rollback.
- Quyết định Firebase instance/edition, service account, region, Rules, DO topology, sink/checkpoint, chi phí và backup phải được Du duyệt trước khi cấu hình. Nối staging phải test lại mọi đường phát hành/đọc thật, không suy từ SQLite fixture là đã bảo vệ production.

Phụ lục V1.2-A về `worldCover`, `sceneBackground`, `placeId/sceneId` tiếp tục chỉ là tham chiếu. G1X không sửa 48 seed, gameplay, NPC AI, item/Kho, Xu/EXP, tài khoản, EPUB hoặc Chủ Thần.

Rollback khi G1X chưa live: revert module, schema/guard, kiểm thử và contract. Nếu đã từng có notice ở môi trường thật, phải khóa intake trước, trích xuất/đối soát trạng thái hold/revoke và giữ nguyên bất kỳ permit revoked nào; không xóa điều kiện deny mà chưa có phương án thay thế.
