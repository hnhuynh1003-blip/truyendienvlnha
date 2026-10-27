# VẠN GIỚI — G3C: tích hợp kiểm tra cấu trúc, đường đi và ảnh vào Creator

Ngày 27/10/2026. Nền kiểm tra: `b99f0d4065f7ba037288af35fdf328a4a807115b` (G3B). Đúng mục IX quy chuẩn V0.1: G3 = JSON Schema, semantic validator, mô phỏng reachability, mobile asset QA. G1D đã có validator, G3A là reachability bảo thủ, G3B là QA ảnh mobile từ metadata/fixture.

## Phạm vi giao diện

Creator vẫn nằm ở **Vạn Giới → Tạo / nhập thế giới**, không mở ứng dụng Thiên Mệnh hay console Chủ Thần. **Chỉ một nút `Kiểm tra hồ sơ` hiện có** để tác giả nhận báo cáo trong vùng `Kiểm tra nội dung` sẵn có:

1. **Cấu trúc G1D**: lỗi thiếu trường/ID/tham chiếu và cảnh báo cũ giữ nguyên cách hiển thị, quy tắc save draft và đường dẫn JSON Pointer.
2. **Đường đi & nhiệm vụ G3A**: xem số cảnh *có thể* đến theo từng profile nhập vai, các cảnh/nhiệm vụ/flag có vấn đề; nêu rõ trigger chưa chạy bằng Engine.
3. **Hình ảnh mobile G3B**: đếm ảnh đang dùng có PNG xem thử trong phiên; cảnh báo ảnh thiếu dữ liệu, phóng lớn, nền trùng place, hotspot và sprite; kiểm các vùng quan trọng *nếu observation có khai*. Khung 320/375/390/430 px chỉ là mô phỏng.

Ba nhóm báo cáo hiển thị gọn, giới hạn số cảnh báo đầu và chỉ xuất **mã đã dịch + đường dẫn**; không đưa lời thoại, nội dung Story Bible bí mật hoặc bytes ảnh vào báo cáo. Nút `Gửi duyệt` **vẫn vô hiệu**. Không có thêm nút `Xem truyện có sẵn` hoặc menu QA trùng, không mở route/publication workflow.

## Bộ nối và dữ liệu

`js/vangioi-creator-validation-entry.mjs` xuất `inspectCreatorQa(content, {assetObservations})`:

- Gọi G1D `inspectContent` trước; nếu sai, **dừng**, không chạy G3A/G3B. Đây là nhánh nội dung chưa đủ để kiểm đầy đủ; **vẫn lưu bản nháp thiếu trường** theo `validateDraftContent` hiện hành.
- Khi đủ cấu trúc, gọi nguyên module G3A và G3B, không tạo thuật toán validator song song. Tổng hợp `canPublish=false`, `engineVerified=false`, `deviceVerified=false`, `productionAuthorized=false`.
- Browser bundle IIFE được tái tạo bằng script esbuild đã pin; không đưa writer/auth route/database, không gọi server hoặc thêm quyền.

G3C sử dụng cache ảnh PNG **trong phiên** của G1I: với mỗi asset có pin và bytes đã xem thử, lấy hash/width/height đang nhớ để lập observation. Tác giả không phải nhập lại chiều ảnh. G3B vẫn xem đó là **quan sát preview**, không phải bằng chứng pháp lý hay ảnh đã duyệt. Nếu chỉ có hash metadata nhưng chưa chọn PNG, báo chưa có ảnh để đo. Không lưu observations trong world JSON, IndexedDB hay snapshot.

Thay model/focalPoint/scene/nhân vật làm báo cáo cũ hết hiệu lực; chọn hoặc bỏ PNG cũng **xóa báo cáo QA cũ** để tránh người dùng hiểu nhầm kết quả từ trạng thái khác. Không xóa file của tác giả, không ghi backend, không thay contentVersion hay ID.

## Điều G3C không kết luận

- Đường tới một cảnh theo G3A là **khả năng**, không khẳng định trigger/mission/ending chạy thật.
- Preview G3B không biết điểm quan trọng có bị cắt nếu chưa đánh dấu vùng cần giữ. Không đo tương phản, khả năng bấm, chất lượng nét, nội dung spoiler hoặc hợp tuổi/nghề/niên đại từ metadata.
- Ảnh trong phiên có hash phù hợp không có nghĩa sở hữu/licence/assetGrant được xác nhận.
- Không cấp EXP, Xu, vật phẩm, thay trạng thái thế giới, duyệt Canon hay kích hoạt NPC AI. Thư viện/EPUB, Firebase Rules, quyền tác giả, migration và staging/production không đổi.

## Kiểm thử nghiệm thu

```sh
node cloudflare/scripts/build-vangioi-creator.mjs --check
node cloudflare/tests/vangioi-g3c-creator-qa.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
# Thực thi tại máy có Chromium Playwright 1.56.1:
node tests/browser-vangioi-creator.cjs
```

Các ca riêng kiểm: một world hợp lệ dùng 1 nút QA; world dở dừng G3A/G3B; main không thể đến; ảnh thiếu/đã đo, pin sai và vùng crop; không xuất secret; không có quyền publish. Browser acceptance hiện hữu kiểm 1 nút, ba nhóm, giữ nút Gửi duyệt khóa, UID/IndexedDB/PNG/XSS và responsive.

**Giai đoạn tiếp theo G4** theo quy chuẩn là parser Engine cho condition/action allowlist, sau đó mới có mô phỏng state/save và idempotent reward. Những nội dung cần giấy phép/duyệt/staging thuộc G5; G3C không âm thầm kích hoạt.

Rollback: hoàn nguyên các thay đổi giao diện/entry/bundle và tài liệu G3C. Không migration hoặc ghi dữ liệu thật, nháp `creator-local-1` và snapshots cũ vẫn đọc được.

### Vá hồi quy browser ngày 27/10/2026

Sau commit G3C, workflow browser phát hiện `TypeError` khi nhấp `Kiểm tra hồ sơ` trên một world hợp lệ **không có tạo hình nhân vật**. `characterVisuals` và `characterAppearances` là hai mảng tùy chọn của schema; G3B đã trực tiếp gọi `.flatMap`/`.forEach` trên giá trị vắng mặt. G3B hiện dùng mảng rỗng khi các phần tùy chọn chưa khai, vẫn kiểm đầy đủ cover, scene background, hotspot và các asset thật sự được dùng. Có test hồi quy Creator kiểm QA hợp lệ khi cả hai mảng không tồn tại; bundle trình duyệt được dựng lại và đổi khóa cache cho tệp validation. Đây là sửa lỗi, **không bắt mọi truyện tạo hình toàn bộ dàn nhân vật** và không mở quyền gửi duyệt.
