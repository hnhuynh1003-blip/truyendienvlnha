# VẠN GIỚI — G3B: kiểm tra bố cục tài nguyên hình trên mobile (offline)

Ngày 27/10/2026. Nền đối chiếu: G3A tại `9c181e1392ba84560a20d556632957c9026cae06`. Đợt này kế tiếp đúng **G3 — JSON Schema, semantic validator, reachability, mobile asset QA** trong `source-v0.1/QUY_CHUAN_TAC_GIA_THE_GIOI_V0_1.md`, mục IX.

**Nguyên tắc:** giữ nguyên `world-content-1`, mã semantic G1D, bản nháp G1G–G1I và quyền/registry G1F–G2Y. Không tạo workflow upload, không duyệt ảnh, không kích hoạt G4/G5, không sửa Thiên Mệnh, Chủ Thần, Thư viện/EPUB hoặc Firestore thật.

## Chức năng được thêm

Module thuần `cloudflare/src/vangioi-mobile-assets-g3b.mjs` có:

- `analyzeG3BMobileAssets(content, {assetObservations})`: kiểm JSON schema/semantic G1D trước; dùng metadata ảnh **theo đúng assetId + assetVersion + contentHash**. Báo cáo chỉ dùng mã lỗi, JSON Pointer, viewport, không trả lời thoại, ảnh hay spoiler trong world.
- `g3bCoverCrop(imageWidth,imageHeight,viewport,focalPoint)`: mô phỏng đúng quy tắc **object-fit: cover** và **object-position** của xem trước G1I, cho khung mobile **320/375/390/430 px** tỷ lệ dọc xấp xỉ 9:16 và desktop 1280 × 720. Hình không bị kéo giãn hoặc chỉnh sửa byte.
- `g3bObservationFromPng(asset, bytes)`: tùy chọn đọc PNG đã chọn tại máy, kiểm container qua **bộ kiểm G1I/G1F hiện có**, đối chiếu SHA-256 của bytes với pin trong world và lấy width/height, thay vì bắt tác giả gõ tay kích thước. Đây **chưa phải kiểm giải mã toàn bộ pixel**; bản xem thử G1I có bước kiểm raster riêng.

Mỗi observation có thể mang **vùng quan trọng được đánh dấu**. Nếu một vùng bị crop trên bất kỳ viewport nào, báo `important-region-cropped`, kèm `affectedViewports`; G3B không tự di chuyển focalPoint, tạo hình thay thế hay sửa Canon.

Các cảnh báo bổ sung:

- Ảnh cần hiển thị nhưng chưa có metadata thử (`rendered-asset-unmeasured`), kích thước quá nhỏ và bị upscale trong khung thử.
- Một background được dùng cho **hai place khác nhau** hoặc ảnh worldCover được dùng làm view: yêu cầu kiểm tra chủ đích, **không mặc định cấm tái dùng hợp lý**.
- Hotspot overlay thiếu cơ sở đo tọa độ/diện tích chạm trong schema hiện tại; sprite chưa khai fallback text hoặc observation báo không có alpha. Đây là các điểm phải xem thử thật.
- Không ép hình cho mọi thành viên trong `cast`: chỉ tính ảnh cover, scene, view và những appearance thực sự khai báo; không đặt quota theo bậc F/E/D/C/B/A/S.

## Dữ liệu thử (không ghi vào world JSON)

```js
import {analyzeG3BMobileAssets} from './cloudflare/src/vangioi-mobile-assets-g3b.mjs';

const report = analyzeG3BMobileAssets(worldContent, {
  assetObservations: [{
    assetId: 'art-room',
    assetVersion: 'v1',
    contentHash: 'b'.repeat(64), // phải khớp pin của asset
    width: 1920,
    height: 1080,
    format: 'png',
    importantRegions: [
      {regionId: 'main-door', bounds: [0.03, 0.30, 0.12, 0.60]}
    ]
  }]
});
```

`bounds` là **[xMin, yMin, xMax, yMax]** trong khoảng 0–1 của ảnh gốc, do người duyệt ảnh đánh dấu khi cần giữ một vật/nhân vật/mốc truyện trong khuôn hình. Nếu không có chú thích vùng quan trọng, công cụ **không thể khẳng định** các landmark đã hiển thị. Không bắt tác giả nhập chú thích cho ảnh thừa/ảnh chưa dùng. Quan sát JPG/WebP/AVIF có thể được truyền từ viewer tin cậy sau này; G3B hiện chỉ có helper đọc bytes cho **PNG**, không tự tải URL.

## Báo cáo và ranh giới quyền

Kết quả luôn:

```json
{
  "status": "needs-device-review",
  "canPublish": false,
  "deviceVerified": false,
  "rightsVerified": false,
  "productionAuthorized": false,
  "evidenceAuthority": "caller-supplied-preview-only"
}
```

`status` có thể là `invalid-content`, `invalid-evidence` hoặc `analysis-budget-or-evidence-invalid` nếu chưa đủ/không hợp lệ để phân tích. Không có trạng thái **đã đạt QA mobile** trong G3B. Observation do bên gọi cung cấp có thể giả mạo; ngay cả nếu PNG khớp hash thì đó **không phải chứng minh giấy phép/đã duyệt**. Registry server và reviewer độc lập vẫn bắt buộc kiểm quyền thật, nguồn ảnh, watermark, spoiler, tuổi/nghề/niên đại, ánh sáng, fallback, sắc độ và tương phản.

Crop G3B dựa trên **khung giả định G1I**. Hình/điện thoại thật còn có safe-area, thanh hệ thống, overlay, tỷ lệ thiết bị, ngón tay và UI động; G3B không chụp screenshot thiết bị thật và không tuyên bố đánh giá thẩm mỹ. Nếu không thấy cảnh báo, vẫn phải test trên mobile và kiểm storyboard theo arc.

Giới hạn 1.600 asset/observation và 24 vùng mỗi ảnh là **ngân sách công cụ**, không phải quota sáng tác. Báo cáo cắt ở 160 cảnh báo. Không có DB, đọc file ngoài helper PNG gọi trực tiếp, network, AI, upload, thay đổi ảnh/asset pin, quyền publisher hoặc route Worker.

## Kiểm thử và bước tiếp theo

```sh
node cloudflare/tests/vangioi-g3b-mobile-assets.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
```

G3B kiểm mẫu một phòng ít hình; crop tâm và focal trái; ảnh landscape 16:9 trên bốn khung dọc; vùng cửa bị cắt; hotspot overlay; background tái sử dụng; cover trong gameplay; sprite; metadata giả/cũ/trùng; PNG hash đúng/sai; và không có quyền production.

**G3C tiếp theo** mới đưa kết quả G1D + G3A + G3B vào bản xem thử/editor tác giả một cách gọn nút, duy trì nháp/local và nhãn *cần kiểm bằng Engine/mobile thật*. G4 mới xử lý điều kiện/hành động gameplay. Không dùng G3B làm cổng tự động gửi duyệt/phát hành.

Rollback: bỏ module, test và tài liệu G3B; không migration, không sửa JSON/snapshot và không có dữ liệu người dùng bị ghi.
