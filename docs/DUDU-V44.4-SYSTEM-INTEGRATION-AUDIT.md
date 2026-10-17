# DUDU V44.4 — Rà soát tích hợp và chốt điều kiện vận hành an toàn

Ngày rà soát: **2026-10-17** · Repository: `hnhuynh1003-blip/truyendienvlnha` · Nhánh: `main`.
Phạm vi: DUDU Studio đọc truyện, bình luận, Kho 160 vật phẩm, nhặt đồ, bán đồ, DUDU FUN, NPC, hộp thư tác giả, giao dịch quà và Cloudflare Worker. Không mở đấu giá thật trong đợt này.

**Quan trọng:** V44.4 hoàn thiện *quy tắc giao dịch và kiểm thử hồi quy*, **không** xác nhận giao dịch quà qua hai tài khoản thật đã được bật. Trạng thái Sandbox và trạng thái quyền sở hữu máy chủ là hai tầng khác nhau.

## Các lỗi đã phát hiện và xử lý

| Mức | Phân hệ | Phát hiện | Cách khắc phục | Trạng thái |
| --- | --- | --- | --- | --- |
| P0 | Quà → UID tác giả | Quà chờ có thể được tác giả cũ chấp nhận sau khi truyện đổi chủ hoặc thu hồi xác minh | Kiểm tra lại `trusted_stories.owner_uid`, `binding_status` và `revision` tại thời điểm ACCEPT/DECLINE; từ chối `author-binding-changed`; người gửi vẫn CANCEL được | Đã sửa, test SQLite |
| P1 | Quà và nguồn chương | Quà phổ thông gửi tới AUTHOR/STORY có thể đính kèm mã chương chưa tồn tại do chỉ kiểm chapter cho REALM/CHAPTER | Tất cả yêu cầu có `chapterId` bắt buộc tồn tại, thuộc truyện đang chọn, trạng thái PUBLISHED, cả quote và send | Đã sửa, test SQLite |
| P1 | Hộp thư tác giả | Quà `PENDING` của chủ cũ vẫn có thể hiển thị sau khi đổi chủ | Lọc inbox PENDING bằng UID, trạng thái xác minh và revision hiện hành, vẫn giữ lịch sử đã hoàn tất | Đã sửa, test SQLite |
| P1 | Bình luận + quà Sandbox | Trình duyệt có thể gặp lỗi lưu giữa khi trạng thái bình luận / Kho / bộ sưu tập đã thay đổi trong bộ nhớ | Lưu snapshot trước khi commit, hoàn nguyên các trường và giá trị localStorage trước đó nếu xảy ra lỗi, không báo gửi thành công | Đã sửa, test Chromium với Storage quota |
| P2 | Modal chọn quà | Modal gắn lên body có thể còn lại khi người đọc quay về Trang chủ/chuyển chương | `closeActive` chạy khi đổi truyện/chương và quay về Trang chủ, trả focus và hủy overlay | Đã sửa, test Chromium |
| P2 | Chất lượng test | Các test trước chủ yếu kiểm regex/pure contracts, không bắt được SQL custody và race-state | Bổ sung bộ test SQLite thật chạy bằng `node:sqlite` ở Node 22, mô phỏng 2 UID, escrow, idempotency, rollback và comment reports | Đã bổ sung |
| P2 | Kho, quà và UX | Native dropdown quà trước đây dài, khó lọc / quá 100 món | Đã giải quyết ở V44.3.1 bằng modal tìm kiếm không dấu, gộp theo mã, 8 thẻ/trang, giữ chính xác instanceId | Đã xác minh hồi quy |

## Ma trận rà soát theo phân hệ

| Phân hệ | Các bất biến kiểm tra | Mức hoàn thiện |
| --- | --- | --- |
| 1. Đăng nhập / quyền | Worker dùng Firebase JWT UID; không tin tên hiển thị hay trường `isAdmin` từ client | Server security tests; staging auth chưa mở quà |
| 2. Thư viện truyện/chương | ID truyện, ID chương, trạng thái PUBLISHED; chapter không thuộc sai story | Đã kiểm hợp đồng; registry công khai chưa được nạp |
| 3. Kho & save | 500 chỗ, 70 legacy + 90 realm, nhóm chức năng/đạo cụ, giữ instance ID, rollback local | Sandbox test đạt |
| 4. Tỉ lệ nhặt | Kho thường, 6 realm, 12 món B/A mới khóa event, cooldown và không tự cấp relic | Sandbox unit/browser đạt |
| 5. Giao diện Kho mobile | 320px, tab Kho/Bán/Đấu giá/Tặng, Sổ Sưu Tập thu gọn | Chromium đạt; Safari/iOS cần test thật |
| 6. Xu / bán vật phẩm | Không bán relic hệ thống/đồ khóa; giới hạn ngày; nhật ký Xu không chồng lấn | Sandbox test đạt; ví server chưa có |
| 7. Đấu giá | Giữ lô ký gửi nháp, rút ra giữ identity, không buyer giả | Chỉ Sandbox, tạm hoãn |
| 8. NPC / tặng quà | Thiện cảm/tin tưởng riêng, không chuyển nhầm sang Kho tác giả | Regression đạt trong Node/Chromium |
| 9. Bình luận truyện/chương | Phạm vi, trả lời cùng chương, 45s, 20/ngày, hiển thị an toàn | Sandbox hoạt động; SQLite comment ledger test đạt |
| 10. Báo cáo và kiểm duyệt | Mỗi UID chỉ báo cáo một lần, server admin mới được ẩn/mở | SQLite test đạt; chưa bật công khai |
| 11. Bình luận đính kèm quà | Có vật phẩm trước, chọn đúng story, trừ đúng 1 Sandbox instance khi lưu | Sandbox test đạt; chưa đồng bộ xuyên tài khoản |
| 12. Hộp thư tác giả | Thư gửi cục bộ có nhãn chưa giao; thư đến thật dựa trên JWT UID; không hiển thị PENDING chủ cũ | UI Sandbox và SQL test đạt |
| 13. Giao dịch quà server | SERIALIZED SQL: pending→accept/decline/cancel, khóa vật phẩm, idempotency; không tự cấp | Test SQLite đạt, **feature gate OFF** |
| 14. Thu hồi/hoàn nguyên | Hoàn trả đúng bản ghi sở hữu cũ; hủy quà khi đổi chủ truyện; không nhân bản | Test SQLite đạt |
| 15. Cloudflare / Firebase | Builds, Node tests, Firebase Functions tests, DO migrations, JWT checks | CI dry-run đạt; **chưa deploy các API mới** |
| 16. Tương thích account/save | V43.8 chức năng, V43.9 Kho, V44.0–44.3 records vẫn giữ, không tự import local thành proven inventory | Node/browser regression đạt |

## Giao dịch thực: các điều kiện CHƯA được đáp ứng

1. **Xác nhận tác giả thật cho mỗi truyện:** chưa có registry `storyId → verifiedFirebaseUID` được cấp từ một luồng xuất bản đáng tin cậy có lịch sử chuyển giao. Dữ liệu `novel.author`, vai trò user hay quyền chỉnh sửa thư viện **không** đủ làm bằng chứng.
2. **Nguồn sở hữu vật phẩm thật:** 160 bản định nghĩa catalog chỉ là mẫu vật phẩm, không phải quyền sở hữu; `userProfile.inventory` do trình duyệt sửa được nên không được import để cấp quyền sở hữu cho người khác. Phải có verified issuer và server-side instance ledger.
3. **Bình luận + quà không thể giao dịch nguyên tử giữa hai Durable Object hiện tại:** cần transactional outbox / idempotent saga có cơ chế bù trừ, retry và đối soát. Xóa/ẩn bình luận không được tự nhân bản hoặc hoàn tiền lần hai.
4. **Hộp thư sản xuất và quản trị:** phải có hai tài khoản Firebase khác nhau trên staging, thử quyền người gửi/tác giả, kiện toàn báo cáo, thông báo và kiểm duyệt. Chưa có hệ thống quản trị báo cáo thật được kích hoạt.
5. **Chưa bật backend hoặc xác nhận dữ liệu staging:** `COMMENTS_ENABLED=false`, `GIFTS_ENABLED=false`, `GIFT_SETTLEMENT_ENABLED=false` và `COLLECTIBLES_ENABLED=false`. Bật flags không thay thế xác minh author/issuer. Đợt GitHub chỉ chạy `wrangler deploy --dry-run`.
6. **Lưu trữ và migration:** `security/firestore.rules.review` chỉ là bản xem xét; `profiles_v2.inventory` và Xu client-authoritative. Cần sao lưu, dữ liệu migrate được duyệt, bổ sung các quy tắc và chọn nguồn chân lý cho wallet/server trước khi mở giao dịch.
7. **Thiết bị:** Chromium ở chế độ mobile/responsive đạt; chưa có chứng cứ thử trực tiếp Safari/WebKit iOS trên thiết bị thật. Không đánh dấu "hỗ trợ iOS hoàn toàn" khi chưa chạy.

## Điều kiện chấp nhận trước khi mở V44.4 server live

- [ ] Sổ truyện có UID tác giả server-verified; test chuyển chủ truyện khi quà đang pending.
- [ ] Đồ thường/realm có instanceID thực với provenance server, ký bởi issuer độc lập; DUDU relic và đồ chức năng không chuyển.
- [ ] Atomic cross-DO comment/gift saga, bù trừ mất kết nối, retry và quarantine khi thất bại.
- [ ] Kết nối UI Hộp thư tới `/v1/gifts/author-inbox` từ JWT người dùng thật.
- [ ] Test hai tài khoản, hai thiết bị, duplicate request, race, wrong world/chapter và rollback.
- [ ] Phê duyệt rồi mới bật các gate, deploy staging, giữ kill switch và kiểm tra log.
- [ ] Test thực tế iOS Safari và Android Chrome, đồng thời backup save cũ.

## Trạng thái phát hành

**V44.4 GitHub Pages Sandbox** có mã vá và test mới. **Quà liên tài khoản, bình luận công khai và đấu giá vẫn khóa**, không được mô tả như tính năng đã live. Link kiểm tra: `https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=44-4`.

**Giai đoạn tiếp:** phần công việc phải tiếp tục là "V44.4 server activation" — xác thực author, verified issuer và atomic outbox — trước khi hứa phát hành giao dịch giữa hai người dùng thật.
