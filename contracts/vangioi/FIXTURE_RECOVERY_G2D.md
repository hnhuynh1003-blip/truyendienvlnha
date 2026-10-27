# G2D — Sao lưu, phục hồi và đối soát permit replica trên fixture cô lập

27/10/2026. Kế thừa G2C `e5d0380` với sink SQLite fixture commit checkpoint / projection / event nguyên tử. G2D chỉ bổ sung **diễn tập khôi phục dữ liệu thử**, không kết nối kho Thư viện/Firebase thật, backend staging/production, Worker route, gameplay, source picker hay quyền xuất bản.

## Phạm vi giao diện

`cloudflare/src/vangioi-permit-fixture-recovery.mjs` xuất `createSqlPermitFixtureRecovery({storage,projectId,environment:'fixture',maxEntries:1000,maxEvents:1000})`.

| Phương thức | Hiệu lực |
| --- | --- |
| `await createBackup()` | Đọc toàn bộ checkpoint, projection, event history trong **một giao dịch nhất quán** từ một G2C fixture; trả `format`, `projectId`, `environment`, `checkpoint`, `entries`, `events`, `digest` |
| `await restoreBackup(backup)` | Kiểm cấu trúc, tính toàn vẹn và phạm vi; **chỉ chèn vào fixture hoàn toàn trống** trong một giao dịch; trả số entry/event cùng checkpoint |

Đối tượng sao lưu chỉ chứa `storyId`, `contentHash`, `status`, `revision`, `seq`, `eventId`, `checkpoint`, `projectId`, `environment` và định dạng. Không chứa chương truyện, Canon, proofRef, recipient, UID, vật phẩm, phiên chơi hay kho người chơi. Số row bị giới hạn cấu hình (mặc định 1.000 mỗi bảng, tối đa 10.000); vượt ngưỡng phải dừng và chia phương án mới qua review.

**`digest` là SHA-256 của metadata chuẩn hóa, chỉ phát hiện hỏng/sửa đổi không khớp checksum; không có chữ ký hoặc khóa tin cậy.** Người có khả năng sửa metadata cũng có thể tính lại digest. Vì vậy không xem tệp sao lưu tải từ client là bản authority, không dùng nó để cấp quyền, cũng không coi sao lưu là nguồn chứng minh giấy phép. Cần kênh sao lưu được kiểm soát, bảo vệ provenance trước khi dùng ngoài fixture.

## Bất biến an toàn

1. Chỉ nhận `environment:'fixture'` và project ID hợp lệ; từ chối phiên bản/field lạ, trạng thái khác `active:1` / `revoked:2`, event ID sai, sự kiện trùng, thứ tự `seq` không tăng, checkpoint không khớp sự kiện cuối hoặc event không có projection tương ứng. Có thể tồn tại khoảng trống giữa các `seq` vì G1U outbox quyết định sequence; không suy diễn cộng một.
2. Sao lưu đọc đồng thời count và row của cả ba bảng trong transaction; từ chối dữ liệu lẫn project, vượt giới hạn, event thiếu projection hoặc projection thiếu event. Empty fixture có checkpoint 0 và không có row là hợp lệ.
3. Restore chỉ dùng **G2C fixture schema đã khởi tạo**; mục tiêu phải chỉ có một checkpoint của đúng project tại `0`, không có event/projection của bất kỳ project nào. Không `DELETE`, không reset checkpoint, không ghi đè fixture đã sử dụng. SQL exception sau bất kỳ INSERT nào phải rollback projection/event/checkpoint cùng nhau.
4. Lịch sử event và quyền `revoked` được giữ nguyên, trigger G2C tiếp tục chống đảo trạng thái khi replay. Một projection `revoked:2` vẫn có thể đi kèm chỉ event issue lịch sử, vì G1V đọc trạng thái permit *hiện hành* tại thời điểm replay.
5. Khôi phục thành công **không phải hoàn tất đồng bộ và càng không cấp quyền sử dụng thế giới**. Host tin cậy phải chạy G2B audit đối chiếu toàn bộ với G1R authority, dùng G1V replay từ checkpoint được khôi phục để cập nhật đợt còn thiếu, rồi audit lại. G1Y tiếp tục recheck source hold / revoke trước release hoặc đọc. Nếu authority/replica vẫn lệch, fail closed.

## Kiểm thử G2D

- Xuất/nhập snapshot active và revoked; so khớp G2C snapshot và G2B full audit; event history bất biến.
- Restore backup cũ trước khi thu hồi: G2B `checkpoint-lag` → replay G1V sau khi restore → G2B PASS nhưng G1Y vẫn cấm world có permit revoked.
- Backup rỗng, thiếu/thừa field, sai project/mode/version, digest hỏng, metadata cấu trúc bất hợp lệ dù digest đã tính lại, không thể khôi phục đè dữ liệu sẵn có.
- Inject lỗi ghi giữa restore: không có bản sao nửa vời; retry được; đóng/mở SQLite vẫn tiếp tục replay.
- Chặn fixture nhiều project, vượt số event và constructor production; không import vào Worker hoặc HTTP adapter.

## Chưa được mở khóa

G2D **không thực hiện backup/restore production**. Chưa có thỏa thuận Firebase project, vùng/edition, retention, nguồn tin cậy, bảo mật của snapshot, policy nguồn truyện bị cập nhật/gỡ hoặc quyền operator cấp dịch vụ. Không migration, không thay Firestore Rules, không sync từ Thư viện thực, không duyệt tác giả, không phát world, NPC AI, cấp EXP/Xu/Kho hay mở các seed V66.

Trước bước consumer thật cần quyết định bởi An Du: nguồn authority, độ trễ cho phép, chiến lược khôi phục từ bản sao có provenance, kho lưu/bảo vệ snapshot, baseline và quy trình kiểm thử staging. Rollback G2D chỉ cần bỏ module/test/docs; dữ liệu fixture được tạo riêng không được coi là quyền thật.
