# G1Z — Diễn tập cổng phát hành, bắt đầu, tiếp tục và đọc nguồn

26/10/2026. Nền G1Y `0bd2ff4` (519 Worker / 497 ứng dụng / 10 Functions PASS; GitHub Smoke/Pages SUCCESS). G1Z chỉ tạo **harness diễn tập trong bộ nhớ**, phối hợp với cổng SQL G1Y đã có. Không tạo bản phát hành, quyền người chơi, token thật, session gameplay, nội dung nguồn trả về client hoặc kết nối Firebase/production.

## Mục đích

Một quyết định `eligible` tại thời điểm dự định phát hành không đảm bảo rằng world vẫn có quyền sử dụng truyện khi người chơi mở sau đó. G1Z tạo chuỗi tình huống mô phỏng để kiểm thử các ranh giới thời gian, không tuyên bố đã gắn guard lên runtime.

`cloudflare/src/vangioi-admission-rehearsal.mjs` xuất `createAdmissionRehearsal({releaseGate,capacity=128})`. Host tin cậy truyền `createSqlWorldReleaseGate(...)` của G1Y; client không được truyền `releaseGate` hay điều chỉnh giới hạn. Các API đều yêu cầu `request` của operator được G1Y xác thực lại:

| Bước mô phỏng | Input duy nhất | Điều kiện trước khi trả PASS |
| --- | --- | --- |
| `prepareRelease(request,{worldId})` | `worldId` | G1Y trả `eligible` và snapshot hash thật; lưu release candidate tạm trong bộ nhớ |
| `simulateStart(request,{candidateId})` | ID do server tạo | G1Y kiểm lại trạng thái source/permit/notice/assets và hash hiện hành khớp candidate |
| `simulateResume(request,{sessionId})` | ID phiên **giả** do server tạo | G1Y kiểm lại toàn bộ quyền/hợp đồng và hash khớp phiên |
| `simulateSourceRead(request,{sessionId})` | ID phiên **giả** | G1Y kiểm lại quyền; **không trả nội dung chương/ảnh hoặc ghi vị trí đọc** |

`candidateId` và `sessionId` đều là UUID mới tạo trong process và chỉ dùng cho test. Không phải bearer token có thể cấp quyền truy cập. Bản ghi `Map` chứa đúng `worldId + snapshotHash` (và liên kết candidate trong session), không lưu cốt truyện, ảnh, giấy tờ quyền, tài khoản người chơi hay private chapters. Bộ nhớ giới hạn tối đa `capacity` candidate và session, mặc định 128, chỉ host tin cậy có thể cấu hình; restart process mất mọi bản ghi. Không có migration, TTL policy, external write, xóa dữ liệu thật hay replay/publish event.

## Diễn biến và nguyên tắc fail closed

- Hold xuất hiện **sau release candidate nhưng trước start**: start bị chặn, không tạo session; giải tỏa đúng quy trình thì lần gọi kế tiếp kiểm lại mới cho phép.
- Hold xuất hiện **khi session giả đã start**: resume và đọc nguồn đều bị chặn ở lần kiểm tra tiếp theo. Sau release, chỉ trở lại nếu grant, nguồn, assets và permit vẫn có hiệu lực.
- G1R revoke sau start: start/resume/đọc về sau đều deny, dù G1X notice được đóng trạng thái `revoked`.
- Ảnh được operator revoke hoặc world được owner reopen thành `draft`: phiên/candidate cũ không tự có quyền dùng tiếp. Nếu một bản mới được duyệt với hash khác, phiên mô phỏng cũng không được chuyển ngầm sang bản mới.
- Không nhận `approved`, `contentHash`, `grantStatus`, `ownerUid`, `source`, `worldId` ngoài đúng schema của API từng bước. Không cho owner, reviewer, publisher, client gắn `admin` tự chạy harness.
- Không trả Canon, scene, text, ảnh hay dữ liệu evidence khi PASS/FAIL. Lỗi của gate là kết quả diễn tập, không phải dữ liệu được phép phơi ra frontend.

G1Z **không đóng được cửa sổ race** giữa cổng G1Y read-only và hành động gameplay thực tế trong tương lai. Các ID giả trong Map không có cơ chế lock liên kho, checkpoint, TTL hay revoke push. Runtime thật phải kiểm ngay trên đường discovery/start/resume/content read với authority đã chốt, và xác định xử lý session đang chạy; đây mới là bài toán cho staging kỹ thuật sau khi Du duyệt topology/policy.

## Nghiệm thu và phạm vi ngoài

11 ca G1Z kiểm lifecycle bốn bước, tạm giữ giữa các thời điểm, thu hồi sau start, ảnh revoke/reopen, bản duyệt mới đổi snapshot hash, không đủ permit legacy, forged request, không có operator, capacity và thiếu module trong public route. Chạy cùng toàn bộ regression G1A–G1Y, Functions, app và Wrangler dry-run.

Không đổi snapshot G1B, review G1L, permits G1R, registry G1F, source freeze G1W, notices G1X, gate G1Y, cũng không bật source picker, production routes/bindings, Firebase reader thực, Firestore Rules, V66 seeds, world/AI/gameplay, Xu/EXP/Kho hay phát hành Thiên Mệnh.

Rollback G1Z trước khi live: bỏ module/test/docs; không có bản ghi bền vững cần migration. Nếu sau này host dựa vào guard thật, không thể rollback thành lối vào mặc định cho qua.

**Chặn trước triển khai thật:** chủ dự án phải chọn chính sách khi nguồn Thư viện V49 đổi/gỡ, quyền pinned hash cũ, topology/edition của Firebase và đồng bộ notice/permit cho staging, rồi mới phê duyệt adapter runtime có cổng chặn thật. G1Z không tự đưa ra quyết định đó.
