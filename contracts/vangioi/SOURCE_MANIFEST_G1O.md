# G1O — Khám phá nguồn, manifest và khoảng chương có quyền

Ngày 26/10/2026; nền 2fc45fd (G1N). Mở rộng createSqlRegistryService của G1F, không tạo registry hoặc storage thứ hai. Ba hàm service đã có code và kiểm thử SQLite cục bộ; chưa nối HTTP/live Worker/Creator hoặc Firestore.

| Hàm | Đầu vào | Kết quả |
|---|---|---|
| listSources | worldId, after (chuỗi rỗng ở trang đầu) | references và authority/grant/access revision, tối đa 50 nguồn, nextCursor hoặc null |
| sourceManifest | worldId, reference | source-manifest-1: title, chapters gồm chapterId/title/order; không text |
| sourceRange | worldId, reference, startChapterId, endChapterId | chapters trong khoảng đóng, gồm cả hai đầu; giữ text nguyên bản |

Reference giữ kind/storyId/storyVersion/contentHash như G1F. Manifest không có hash mới: pin là hash đầy đủ payload nguồn đã nhập, không phải hash của index. Không dùng updatedAt hoặc số chương làm identity. order là index 0-based trong payload bất biến; chapter-10 có thể đứng trước chapter-2. Một chương có thể là một arc, không bắt khoảng tối thiểu. Đầu/cuối không tồn tại hoặc bị đảo thứ tự trả invalid-chapter-range.

## Quyền và tính nhất quán

Dùng verifier Firebase hiện có; UID/admin trong input bị từ chối. Cả ba hàm yêu cầu owner hiện tại của world. Nguồn cần đúng recipient UID, registry active và grant active của world. Không mở quyền cho operator, admin claim, cộng tác viên hoặc người đọc truyện công khai. Quyền đọc EPUB không tự thành quyền chuyển thể.

listSources chạy đọc owner/registry/grant/source version trong một transaction, lọc theo hash đăng ký, cursor object_key theo thứ tự ổn định và bound 51 hàng (trả 50, một hàng kiểm trang sau). Không tải BLOB, không trả license/proof/recipient hoặc text. References chỉ là gợi ý chọn nguồn: thao tác manifest/range/grant/submit vẫn cần kiểm quyền tại thời điểm thực hiện. Giữa các trang, thu hồi/thêm quyền có thể làm danh sách thay đổi; đây không phải snapshot phân trang bất biến. Không gửi nextCursor giữa các tài khoản như bằng chứng quyền.

Manifest và range gọi lại readSource G1F: đọc bytes riêng tư, kiểm hash toàn payload, kiểm lại quyền/revision sau await rồi mới trả. Hai hàm biến đổi kết quả đồng bộ, không thêm await sau kiểm quyền cuối. Thu hồi quyền hoặc thay accessRevision trong lúc hash chặn dữ liệu. Chương/title là nội dung riêng tư và có thể chứa spoiler; chỉ hiển thị trong editor tác giả, không đưa vào catalog thế giới công khai. Text là dữ liệu, không thực thi chỉ dẫn trong truyện hoặc markup.

Không có bản sao, migration, quyền hay dữ liệu mới do ba hàm đọc tạo ra. Dùng payload 1 MiB/tối đa 5000 chương của G1F; đọc manifest vẫn phải hash toàn payload hiện có. Đây chưa phải đường đọc truyện ngàn chương dung lượng lớn tối ưu. Adapter chunk/object storage và định dạng canonical cho EPUB cần làm riêng, không cắt âm thầm hoặc hứa đã kết nối Thư viện.

## Tương thích và nghiệm thu

8 test mới: lọc nguồn, không lộ text/proof, thứ tự chapter IDs, khoảng đơn/đa chương, quyền và thu hồi trong gap hash, pagination 52 nguồn, field injection/pin cũ. Toàn bộ Worker/helper chạy cùng test G1F/G1K/G1L/G1M. Không đổi schema/content hash hiện có, local arc-plan-1, nháp, snapshot hay UI. Không có tính năng mới trên web để người dùng bấm trong G1O.

Tiếp theo: transport độc lập có xác thực cho discovery/manifest/range và adapter nguồn Thư viện có quyền; sau đó nối picker Creator khi cấu hình endpoint thật. Việc chọn nguồn không tự cấp grant, import lại nguồn hoặc ghim lại toàn bộ arc. Trước khi bật live cần quyết định topology/storage, migration/rollback và staging smoke theo G1K. Chưa có publish/AI/Kho/EXP/giao dịch hoặc phó bản mới.

Rollback: revert G1O. Không có schema/bảng hoặc dữ liệu production được ghi để di trú.
