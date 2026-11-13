# G1U — Sổ sự kiện permit cho đồng bộ quyền có kiểm soát

26/10/2026. Nền `64f75b9` (G1T; GitHub Actions Pages/Smoke SUCCESS). Đây là **bổ sung SQL cục bộ và giao diện service operator-only**, không phải tiến trình đồng bộ, API public, Firestore listener, backend staging hay migration production.

## 1. Authority, source pin và revocation

- Firestore V49 là nguồn *nội dung có thể thay đổi*. V49 `ownerUid`, `published` và timestamps không đại diện cho quyền chuyển thể. `readV49Snapshot` G1T cung cấp một snapshot nhất quán, nhưng read-only transaction có thể trả snapshot cũ. Không có giao dịch phân tán với SQL.
- G1S/G1Q chuẩn hóa snapshot thành `story-source-1`, hash bằng canonical JSON và pin `storyVersion=sha256-{contentHash}`. Hash định danh **byte nội dung phiên bản**, không chứng minh nội dung đã được đóng băng, bản quyền hợp lệ hoặc trạng thái Firestore vẫn như lúc chuẩn bị. Đổi nội dung phải có permit mới gắn với hash mới; tuyệt đối không lấy permit cũ gắn vào hash khác.
- G1R/SQLite là authority của permit nội bộ. `readAdaptationPermit` chỉ cung cấp trạng thái hiện tại; `issue/revoke` vẫn đòi operator do server gán. Thu hồi G1R cắt registry/grants trong cùng SQL transaction. Quyền ngoài đời hoặc quyền lưu ở Firestore **không** bị tự động thu hồi qua G1U.
- Snapshot đã chuẩn bị mà Firestore sửa **sau lượt chuẩn bị cuối** vẫn có thể vào registry nếu permit phiên bản cũ còn active. Trước khi bật staging/live cần chính sách nguồn bất biến hoặc version fence có xác thực ngay ranh giới ghi, cùng quy trình xác minh lại thu hồi và dừng import nếu source bị xóa/rút quyền. G1U **chưa** giải quyết race xuyên kho này.
- Đường nhập library G1F legacy không permit vẫn tồn tại nhằm giữ tương thích; các host mới phải bắt buộc dùng G1Q/G1R khi lấy nguồn từ V49, không tự fallback legacy.

## 2. Outbox cục bộ

`createSqlRegistryService` tạo bảng phụ `vg_authoring_permit_outbox_v1` trong cùng SQL storage với G1R; mỗi lần `issueAdaptationPermit`/`revokeAdaptationPermit` thành công, nó ghi một hàng outbox **cùng transaction** với permit, cascading grant revoke, receipt và audit. Lỗi chèn bất kỳ hàng nào rollback toàn bộ. Replay requestId hợp lệ chỉ trả receipt, không ghi thêm sự kiện.

| Trường | Ý nghĩa |
| --- | --- |
| `seq` | `INTEGER PRIMARY KEY AUTOINCREMENT`; checkpoint tăng theo thứ tự commit SQLite, không phụ thuộc clock |
| `event_id` | UUID của cùng sự kiện G1R audit; dùng chống phát lại |
| `story_id`, `content_hash` | Khóa bản nguồn đã được cấp/thu hồi |
| `permit_revision`, `status` | Revision và trạng thái `active` / `revoked` sau chuyển đổi |
| `happened_at` | Clock server phục vụ audit, **không** phải cursor |

Bảng outbox không chứa nội dung truyện, bản chứng minh quyền, ghi chú pháp lý, người nhận, actor UID hoặc requestId. UPDATE/DELETE bị trigger chặn. Bảng chỉ là metadata có thể nhạy cảm; không xuất cho tác giả/người chơi.

`listPermitEvents(request, {after: number})` là hàm **operator-only** trên service nội bộ; `after` là checkpoint số nguyên không âm (bắt đầu `0`). Mỗi lần đọc một SQL transaction, tối đa 50 sự kiện theo `seq`, trả `{ok:true, events, checkpoint, nextCursor}`. `checkpoint` là `seq` cuối của trang, hoặc `after` nếu trang rỗng; `nextCursor` chỉ khác `null` khi trang có hơn 50 sự kiện. Sau khi xử lý trang cuối, host có thể tiếp tục polling bằng `checkpoint` ngay cả khi `nextCursor=null`. Không có HTTP route, job hay kết nối Firestore tiêu thụ outbox trong G1U.

Consumer tương lai phải xử lý idempotent theo `(eventId, seq)` và **chỉ lưu checkpoint sau khi đích đã ghi thành công**, có retry khi lỗi; không áp dụng lại event `active` cũ để hồi sinh quyền đã `revoked`. Mỗi quyết định sử dụng quyền cần đọc trạng thái permit *hiện tại* trong authority SQL và kiểm tra lại tại ranh giới commit. Event lịch sử không thay thế kiểm quyền thời điểm sử dụng. Không được coi pagination đơn thuần là snapshot dữ liệu đủ để cấp quyền bên ngoài.

## 3. Dữ liệu G1R trước outbox: fail closed

Một DB chạy G1R trước G1U có thể có permit nhưng chưa có dòng outbox. `listPermitEvents` kiểm tra rằng mỗi permit có event issue revision 1 và, nếu đã revoked, có event revoke ở revision hiện tại. Thiếu thì trả `baseline-required`; **không tự giả lập một event issue hoặc ngầm bỏ qua lịch sử**. Các hàm G1R cũ vẫn dùng được; không xóa/sửa permit cũ.

Trước khi tạo consumer thật phải đánh giá tính đầy đủ của lịch sử G1R, chụp backup, thực hiện baseline/backfill có phê duyệt riêng hoặc khởi tạo storage staging sạch. G1U không phát triển script migration, không ghi baseline vào môi trường thật. Không được xóa/rebuild outbox sau khi có consumer mà không tái lập checkpoint và đối soát revocation. Các producer cũ không ghi outbox nếu vẫn hoạt động trên cùng DB: khi kết nối staging phải bảo đảm chỉ một phiên bản producer đồng bộ chạy trong cùng authority.

## 4. Cổng an toàn cho đợt sau

1. Duyệt sơ đồ một SQL authority nhất quán cho permit/registry/world/grants/audit/outbox; chọn rõ Firestore instance, edition và môi trường staging **trước khi cấp service identity hoặc credentials**.
2. Khóa cơ chế source freeze/version fence và event thu hồi từ bên ngoài (người giữ bản quyền yêu cầu rút, nguồn bị xóa, mất phép). Không tự suy trạng thái quyền từ update Firestore.
3. Thiết kế subscriber với checkpoint bền vững, replay, giới hạn backlog, theo dõi lag, chống vượt quyền, điều kiện revoked-wins, thời điểm đối soát current permit, backup và rollback; kiểm lỗi mạng/khởi động lại/đứt phân trang.
4. Duyệt đường migration/legacy G1R nếu đã có bản quyền thật, review/publish gate và quyền operator do server cấp. Chỉ sau các cổng này mới cân nhắc source picker và gửi duyệt thật.

## 5. QA, phạm vi và rollback

Các test G1U trong `cloudflare/tests/vangioi-registry.test.mjs` kiểm: thứ tự issue/revoke cùng timestamp, replay không thêm dòng, phân trang 50, chỉ operator xem được, không lộ proof/source, tính bất biến, rollback khi outbox thất bại ở issue/revoke kèm grant, và `baseline-required` cho dữ liệu G1R cũ. Hồi quy G1F–G1T vẫn phải PASS. Không có event consumer hay smoke staging production.

Rollback mã trong môi trường chưa kết nối: revert commit G1U. Nếu từng có permit và outbox trong SQLite thật, rollback chỉ code có thể khiến event bị thiếu và quyền không đồng bộ; cần kế hoạch dữ liệu/consumer riêng, **không** xóa outbox, bản ghi revoked hoặc reset checkpoint tùy tiện.
