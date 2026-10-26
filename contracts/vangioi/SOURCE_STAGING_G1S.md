# G1S — Hợp đồng nguồn EPUB V49 và ranh giới staging

Ngày 26/10/2026. Nền `88a539c` (G1R). Đợt này là **bước kiểm chứng mã cô lập** cho đường V49 → G1Q → G1R/G1F; không phải kết nối Firestore, backend authoring hay staging Cloudflare đã được triển khai.

## 1. Nguồn có thẩm quyền và giới hạn

| Dữ liệu | Authority đề xuất cho đường kết nối mới | Quy tắc |
|---|---|---|
| Sách và chương nguyên tác | `epub_stories_v49/{bookId}` và `/chapters/{chapterId}` trong Firestore | Đọc bởi trusted server host theo một consistent snapshot hoặc phiên bản nguồn đã khóa; không lấy quyền chuyển thể từ `ownerUid`, `published`, `admin:true` hoặc fingerprint V57. |
| Quyền chuyển thể | `vg_authoring_adaptation_permits_v1` của SQLite G1R | Operator được gán phía server mới ghi/đọc/thu hồi; gắn `storyId + canonical contentHash + authorizedUid`, revision và bằng chứng quyền. Một permit không phải tự động chứng minh pháp lý. |
| Snapshot và grant dùng trong world | Registry G1F trong cùng storage SQL với world/permit | Version payload/hash bất biến, grant theo world; kiểm lại permit tại transaction đăng ký và quyền hiện hành khi đọc/submit/review. |
| Nháp/arc | Creator IndexedDB G1N | Bản ghim do tác giả điền là đề nghị; không cấp quyền; localId không phải worldId server. |

G1S **không thay đổi authority đang chạy của EPUB V49**, không ghi Rules và không chuyển quyền legacy. Phân chia trên chỉ dành cho adapter authoring mới khi có host đáng tin cậy. G1R còn lối nhập library legacy không có permit theo G1F; vì vậy không được quảng bá rằng tất cả source đã bắt buộc qua sổ quyền. Bước kết nối mới phải dùng đường G1Q với permit thực, không tự rơi về legacy khi thiếu permit.

## 2. Mã bổ sung

`cloudflare/src/vangioi-v49-staging-source.mjs` export `createV49StagingSnapshotReader({readV49Snapshot,readAdaptationPermit})`:

1. Chỉ chấp nhận hai callback do trusted host cấp; không tự kết nối Firebase, HTTP hoặc SQL và không ghi dữ liệu.
2. Đọc cấu trúc book và danh sách chapter V49 trong một callback. **Host chịu trách nhiệm** đảm bảo callback là một ảnh chụp nhất quán: không lấy từng chương từ các thời điểm rời rạc rồi tuyên bố source immutable.
3. Kiểm `id`, `ownerUid`, `status`, số chương 1–160, chapterIndex, thứ tự 0-based, ID/title/order khớp và không trùng/thiếu chương. `importing` bị từ chối; payload canonical vượt 1 MiB cũng bị chặn trước khi hỏi permit.
4. Chỉ project trường G1Q chấp nhận; bỏ cover, fingerprint, wordCount, updatedAt, nhãn quyền tự khai. Giữ nguyên chapterId và text theo thứ tự chapterIndex (không sắp theo tên ID).
5. Tính canonical hash `story-source-1` bằng `hashAuthoringJson`; gọi trusted `readAdaptationPermit({storyId,contentHash})`, yêu cầu permit active đúng recipient và hash. Không chấp nhận permit từ book/HTTP body.
6. Trả `{book,chapters,permit}` để G1Q kiểm tiếp hai lần đọc/operator và tạo **gói chuẩn bị**, không register, grant hoặc phát hành. Lỗi đóng kín, không trả truyện/bằng chứng/Firestore/SQL diagnostics.

Callback `readAdaptationPermit` có thể được host staging nối trực tiếp vào `readAdaptationPermit` G1R dưới danh tính operator đã xác thực. API không nhận request do client tự chỉ định UID/operator. Module mới **không được import vào Worker live hoặc trình duyệt**.

## 3. Ranh giới không thể giả định là transaction

Firestore book/chapters và SQLite permit/registry thuộc hai authority khác nhau. G1Q đọc lại snapshot để phát hiện thay đổi trong quá trình chuẩn bị; G1R kiểm permit khi ghi registry trong một SQLite transaction và thu hồi cùng mọi grant nội bộ. Những bảo vệ này **không tạo transaction phân tán**.

Trước khi làm G1T phải chọn và kiểm thử một thiết kế nhất quán nguồn, chẳng hạn bản source đóng băng có định danh/version bất biến hoặc cơ chế version fence + kiểm lại tại commit. Nếu nguồn còn có thể sửa/thu hồi ngoài SQLite, cần quy trình đồng bộ thu hồi/outbox hoặc cùng một authority chấp nhận quyền; không chỉ gọi lại hai API rồi kết luận an toàn. Bản quyền/sự đồng ý ngoài đời cần quy trình operator riêng và có thể bị thu hồi sau khi từng snapshot đã phát hành.

Topology staging đề xuất: một storage SQL chứa world, adaptation permits, registry, grants, receipt và audit để giữ G1R atomicity; một reader Firestore chỉ đọc với quyền tối thiểu. Chưa chốt tên Durable Object, cách định tuyến, entitlement issuer, credential, secrets, backup, rate limits, migration hoặc đường hủy staging; các quyết định này phải qua thiết kế và duyệt trước khi tạo binding.

## 4. Kiểm thử trong G1S

- `cloudflare/tests/vangioi-v49-staging-source.test.mjs`: 16 ca kiểm projection, thứ tự chapter, từ chối cấu trúc sai/quá hạn mức, quyền thiếu/thu hồi/sai người nhận/hash cũ, thay metadata trong hai lần đọc, lỗi kín, không tự cấp quyền.
- `cloudflare/tests/vangioi-registry.test.mjs`: 2 ca tích hợp thêm với SQLite thật của Node: V49 fixture → G1Q → permit G1R → registry G1F → manifest/range G1O; và thu hồi sau prepare nhưng trước register phải từ chối không ghi source.
- Các fixture là UID, sách, text và bằng chứng **giả**. Không truy cập Firebase, Cloudflare account hoặc dữ liệu người dùng.

Tiêu chuẩn nghiệm thu G1S: các ca mới và hồi quy hiện hành PASS, Worker build khô PASS, không có import/router/binding/migration mới, không sửa G1Q/G1R/schema/Creator/Canon. CI/Pages theo SHA sau commit vẫn phải được xác nhận riêng; test local không chứng minh staging live.

## 5. Việc còn lại cho G1T

1. Chọn topology staging và chính sách quyền dùng service credentials; không dùng tài khoản thật trước khi duyệt.
2. Hiện thực `readV49Snapshot` bằng Firestore SDK phía server với consistent read/phiên bản bất biến và fixture Emulator; kiểm giới hạn kích thước, 160 mục V49 và phân trang/chi phí.
3. Nối permit reader theo cùng operator authority, thiết kế version fence/revoke ngoài transaction và test concurrent edit/revoke với môi trường cô lập.
4. Kiểm source nhập vượt 1 MiB: trả lỗi có lý do, không âm thầm cắt chương; thiết kế chunk/manifest riêng trước khi nhận truyện dài hơn.
5. Chỉ sau đó mới xét host transport, worldId server, source picker, quyền creator và gửi duyệt staging.

Rollback: revert file module, tests và contract G1S; không có dữ liệu thật/migration/endpoint phải xóa. Nếu tương lai đã tạo source/permit ở staging hoặc production thì phải có rollback policy riêng, không dùng revert code để phục hồi quyền bị thu hồi.
