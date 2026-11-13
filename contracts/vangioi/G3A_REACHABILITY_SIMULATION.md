# VẠN GIỚI — G3A: mô phỏng reachability bảo thủ cho bản thảo

Ngày 27/10/2026. Nền đối chiếu: `main` tại `1d5f47f1755cc8ebc9711fac93ac1e3b4bfea5dd` (G2Y). Theo mục IX trong `source-v0.1/QUY_CHUAN_TAC_GIA_THE_GIOI_V0_1.md`, G3 bao gồm **JSON Schema + semantic validator + mô phỏng reachability + mobile asset QA**. G1D đã có schema, semantic và BFS cấu trúc. G3A **bổ sung một lớp phân tích riêng**, không thay validator/snapshot cũ hoặc chạm luồng gửi duyệt.

## Mục đích

- Tách kết quả theo **từng `playerEntryProfile` được tác giả khai báo**; không ép mọi thế giới phải có đủ ba kiểu nhập vai, số NPC hoặc địa điểm cố định.
- Dò những scene có thể đến từ `startSceneId` qua transition/hotspot `move`, kể cả trường hợp phải đợi flag có nguồn khai báo.
- Tính **khả năng tồn tại** của nguồn flag: `initialFlags`, event `setFlags` có các tiền điều kiện flag, và lựa chọn hội thoại NPC **chỉ khi cảnh giới thiệu NPC có thể đến được**. Không tự chạy trigger, chọn thoại hoặc phát event.
- Chỉ ra cảnh không có đường đến, nhiệm vụ chính bắt buộc chưa có đường đến/nguồn được khai báo, nơi/NPC bắt buộc thiếu đường đến, cờ khóa transition và cờ kết thúc chưa có nguồn.
- Với mục tiêu vật phẩm, tham khảo nơi nhặt, hotspot `inspect`, shop stock/nơi bán và loại nguồn nhận. Nguồn `questReward`/`npcGift`/`craft` vẫn **chưa xác định** nếu không có bằng chứng khả thi; không giả định giao dịch/nhận đồ thật.

## API thử độc lập

```js
import {analyzeG3AReachability} from './cloudflare/src/vangioi-reachability-g3a.mjs';

const result = analyzeG3AReachability(worldContent);
```

Đầu vào là JSON world-content-1 dạng **đủ điều kiện kiểm schema/semantic G1D**. Bản nháp dở vẫn lưu được theo schema draft cũ, nhưng trả `invalid-content` và **không phân tích**. Mỗi kết quả mang `analyzerVersion`, `inputValid`, `status`, `issues` (mã và JSON Pointer; với cảnh báo theo hồ sơ có `entryPath`) và `profiles` (mode, số scene có thể đến, số scene chưa có đường khai báo, số ending có đủ nguồn flag khả dĩ). Không xuất truyện gốc, lời thoại, spoiler hoặc thông tin bí mật trong báo cáo.

Kết quả luôn có:

```json
{"canPublish":false,"engineVerified":false,"productionAuthorized":false}
```

`needs-engine-review` **không phải đạt QA gameplay**. `possibleSceneCount` là **cận trên** theo liên kết/nguồn cờ, không phải số cảnh người chơi chắc chắn đi được. `possibleEndingCount` chỉ nghĩa là flag kết thúc *có thể* được tạo; không chứng minh điều kiện thắng, đối thoại, lựa chọn, vật phẩm, timing hoặc kết thúc thực sự kích hoạt. Nếu không thấy cảnh báo cũng vẫn cần chạy Engine G4 và reviewer kiểm đường chơi ở staging về sau.

## Giới hạn và an toàn

1. Trigger, điều kiện mô tả bằng văn bản và hành vi NPC không được thực thi; không `eval`, không gọi AI. Mọi nguồn flag qua event/hội thoại chỉ là khả năng **lạc quan**. Nhiệm vụ `survive` và nhánh cần logic Engine không được tuyên bố hoàn thành.
2. Dò theo mỗi profile để phát hiện đường cụt khai báo; không ghép quyền hoặc flag giữa hai profile. Một ending có nguồn flag không chứng minh có thể mở từ trạng thái chơi thực.
3. Có ngân sách kiểm toán kỹ thuật: tối đa 1.600 scene, 12.000 cạnh di chuyển, 4.000 flag, 128 vòng lặp và 120 cảnh báo. Vượt ngân sách trả `analysis-budget-exceeded` hoặc báo kết quả profile chưa hoàn tất. **Đây không phải quota sáng tác hoặc giới hạn theo bậc F–S.**
4. Không ghi DB, không sửa Canon, không chạm quyền reviewer/publisher, không cấp EXP/Xu/Kho, không đăng ký Worker route, không nối Firebase hay thay Firestore Rules. G3A chưa gắn vào source picker, editor hoặc cổng gửi duyệt thật.
5. Không thay `world-content-1`/schema draft, mã semantic `world-content-1-semantic-2`, SQL snapshots hoặc các tuyến G1–G2. Báo cáo là một bước **kiểm tra bổ trợ offline**.

## Kiểm thử

```sh
node cloudflare/tests/vangioi-g3a-reachability.test.mjs
npm test --prefix cloudflare
```

Các ca G3A gồm: một world/cấu hình nhập vai hợp lệ; cảnh tách rời; hotspot di chuyển; trigger mờ; flag không có nguồn; flag từ event; lựa chọn NPC ở cảnh có/không có đường đến; vòng phụ thuộc flag không có điểm khởi đầu; hai hồ sơ nhập khác nhau; item khởi đầu không thay thế quyền mua; hotspot inspect; input lỗi không lộ nội dung; cờ `canPublish=false` và tách khỏi route production.

## Sau G3A

- **G3B:** mobile asset QA trên metadata/fixture, ảnh và bản quyền phải kiểm riêng; không bắt quota hình theo bậc.
- **G3C:** tích hợp kết quả validator/reachability/asset QA vào editor tác giả ở trạng thái thử, gắn nhãn *cần kiểm bằng Engine*; không biến cảnh báo thành nút tự duyệt.
- **G4:** Engine parser cho condition/action allowlist và mô phỏng gameplay có trạng thái thật, sau đó mới có thể xác nhận đường kết thúc và idempotency.

Rollback G3A chỉ loại bỏ module phân tích, bài test và tài liệu mới; không có migration hay dữ liệu người dùng cần khôi phục.
