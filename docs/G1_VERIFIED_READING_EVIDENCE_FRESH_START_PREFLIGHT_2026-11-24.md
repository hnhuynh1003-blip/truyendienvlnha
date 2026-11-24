# DUDU STUDIO — G1 VERIFIED READING EVIDENCE (STAGING CONTRACT)

**Ngày:** 24/11/2026  
**Gốc:** G0 Draft PR #56 (chưa merge)  
**Nhiệm vụ:** Issue #53 (EXP đọc truyện, Tu Vi) và #55 (fresh start tài khoản test **sau** khi hoàn thành gameplay).

## 1. Phân biệt đọc trang với đọc được chứng thực

- Hiện `index.html` có đường phát `+5 EXP` khi **mở chương lần đầu** ở Sandbox và giao dịch C2.3 cho Web non-R2. Đường này là legacy, **không chứng minh người dùng đã đọc**, không nên được tái sử dụng làm nguồn thưởng đọc đã xác minh.
- R2 `novel._r2V1 === true` **đang bị loại khỏi luồng thưởng C2.3** vì chưa có verified reading producer. **Giữ guard này**.
- V25/V26 đã có hợp đồng `STORY_READ_SERVICE` và `CHAPTER_VERIFIED` server-side cho mốc hoàn tất chương, nhưng đó không phải kế toán thời gian đọc thực. Không thể suy ra số phút đọc thật từ một lần mở trang/mốc nhận chương.
- Không dùng mua hàng/Shop làm nguồn EXP đọc, không lấy EXP nhiệm vụ/ngọc/đan thay Tu Vi từ đọc.

## 2. Mã mới trong G1 (KHÔNG NẠP VÀO WEBSITE / KHÔNG IMPORT WORKER)

`cloudflare/src/verified-reading-ledger-g1.mjs` — lớp ledger riêng tư trên Durable Object SQL (`sql.exec`, `transactionSync`). Chỉ chấp nhận sự kiện đọc JSON có **HMAC SHA-256** được ký từ một dịch vụ phát hành sự kiện độc lập đã kiểm toán (hiện **chưa có**).

- Trường bắt buộc: `version,eventId,proofId,uid,storyId,chapterId,contentRevision,sourceMode,progressEpoch,startedAt,endedAt,verifiedActiveMs,evidenceSource`.
- `sourceMode` là `WEB` hoặc `EPUB_R2`; `contentRevision` định danh đúng revision và phải được xác minh với bộ nội dung xuất bản phía máy chủ khi có producer thật.
- `evidenceSource='STORY_READ_SERVICE'` là nhãn yêu cầu; **tự nhãn không có giá trị** nếu thiếu HMAC xác thực và đối chiếu nguồn. Không dùng đoạn JS/visibility/timer của client như chứng cứ server.
- HMAC ký `timestamp + '.' + raw JSON bytes`. Thời gian ký chênh tối đa 5 phút; payload tối đa 2 KiB, thời lượng một cửa sổ tối đa 300.000 ms. Các số này chỉ là **ràng buộc kiểm định gói**, **KHÔNG phải** EXP/phút, số phút nhận thưởng/ngày hay cân bằng gameplay đã được duyệt.
- SQL append-only `event_id` duy nhất, `proof_id` duy nhất trên mọi tài khoản/epoch. Cùng event + payload được xem là idempotent; event ID khác cùng proof phải dừng. Cấm ghi trùng các cửa sổ giao nhau của **cùng UID + progressEpoch** kể cả hai tab hoặc nhiều thiết bị.
- `progressEpoch` là số phiên tiến trình, **KHÔNG mang nghĩa Mùa 01**. Fresh Start sau nâng cấp game có thể bắt đầu tiến trình 1 mới trong khi giữ nguyên ledger chứng cứ phiên 0; proof cũ không được tái sử dụng ở epoch mới.
- Không có API `claim`, `grant`, `earn`, `reset`; `awardExp=0`, `awardTuVi=0`, không thay `profiles_v2`, `economy_accounts_v52`, vật phẩm, Xu, danh hiệu, Firebase Rules.
- **Không** thêm route từ trình duyệt tới ledger. `cloudflare/src/index.mjs` không import module này. Secret chỉ là tham số constructor, không được lưu trong GitHub/JS client; các khóa dùng trong test là chuỗi giả lập.

`cloudflare/tests/verified-reading-ledger-g1.test.mjs` — dùng SQLite cục bộ Node, mô phỏng khóa ký/chứng cứ, chạy 2 tài khoản + 2 tab + các epoch và lỗi cơ sở dữ liệu. **Không phải Firebase token thật**.

## 3. Chuỗi xác minh cần xây **trước** khi phát EXP

1. Reader Web/EPUB được Auth server xác minh Firebase UID; đối chiếu chính sách reader access (EPUB R2 không mặc nhiên public), story ID, chapter ID, published status và revision thật.
2. Dịch vụ đọc có **nguồn sự kiện độc lập**, cửa sổ chú ý/tiến độ, clock monotonic ở máy chủ khi có thể, ngắt khi tab ẩn/mất focus/ngưng tương tác, chống đọc nhiều tab/thiết bị đồng thời, chặn replay/đổi UID/đổi revision. Chỉ các tín hiệu trình duyệt là **heuristic, không phải bằng chứng an toàn tuyệt đối**.
3. Backend kiểm tra tính toàn vẹn rồi phát sự kiện nội bộ đã ký; chỉ backend được phép gửi. Phải kiểm toán nguồn dữ liệu, chống automation và chi phí lưu trữ/đọc trước khi cho phép sự kiện thật.
4. G1 ledger xác thực chữ ký/unique/overlap và lưu bằng transaction; nếu một điều kiện không đạt, **không** phát thưởng.
5. Tách công cụ thưởng được quản trị bởi server vào giai đoạn tiếp: định mức EXP/phút, Tu Vi/phút, giới hạn/phạt đọc farm, hạch toán EXP chung/Tu Vi tu luyện, idempotent reward receipt và UI. Các hệ số **chưa duyệt**, không hardcode.
6. Chạy Emulator, verified Auth real claims và thiết bị khác nhau theo phê duyệt; kiểm chứng Rules production, cách phục hồi lỗi giữa ghi ledger và ghi EXP. Chỉ mở sau owner go/no-go.

## 4. Quan hệ với Fresh Start tài khoản test

**Ý định đã chốt:** Sau khi gameplay hoàn chỉnh, reset **tiến trình chơi** của tài khoản test đang cấp cao để chơi lại từ cấp 1. Không reset mùa, không reset mọi UID. Kế hoạch authoritative là Issue #55.

G1 chỉ thêm `progressEpoch` như dữ liệu **phục vụ thiết kế**. Không cho phép client tự tăng epoch để farm, không có reset executor hoặc nút. Trong bản thật chỉ trusted server sau phê duyệt chủ dự án mới được tăng epoch, đồng thời khóa stale writes và lưu biên nhận cũ để chống phát trùng. Truyện, EPUB, dấu trang và tác giả không thuộc phạm vi reset.

## 5. Kiểm thử, rollback và phạm vi nghiệm thu

- Local Node SQLite có thể chứng minh atomic append, idempotency, signatures, duplicate proof, overlap và epoch isolation. Không chứng minh thời gian đọc do người thật tạo.
- Kiểm tra riêng Web và EPUB R2 qua mô phỏng. Chưa test Firebase JWT thật, Cloudflare R2 bucket thật, Worker staging, mobile vật lý hoặc quy định sản phẩm.
- Chưa merge/deploy. Rollback: bỏ nhánh, không thay production data.
- **G1 PASS kỹ thuật** không đồng nghĩa **EXP đọc production PASS**. Việc nối đoạn C2.3/Nhặt đồ chỉ được làm sau các cổng phát hành riêng.

## Link

- Roadmap gameplay: https://github.com/hnhuynh1003-blip/truyendienvlnha/issues/53
- Fresh Start tài khoản test: https://github.com/hnhuynh1003-blip/truyendienvlnha/issues/55
- G0 Draft PR #56: https://github.com/hnhuynh1003-blip/truyendienvlnha/pull/56
