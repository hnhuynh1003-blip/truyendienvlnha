# VẠN GIỚI G1I — Tạo hình và xem thử ảnh tại Creator

Ngày 26/10/2026. Nền `4648173` (G1H, CI/Pages SUCCESS). Creator tiếp tục ở **Vạn Giới → Tạo / nhập thế giới**, độc lập với Chủ Thần riêng của chủ dự án và AI điều phối. Không có thay đổi backend live hoặc quyền tác giả.

## Nội dung đã triển khai

- Mục **Tạo hình & bố cục**: visualIdentity (palette/landmarks/mood/artStyle); hồ sơ tạo hình theo cast, mức ưu tiên, đặc điểm cố định, ghi chú; variants với format/asset/expression/pose/outfit/timeline và art note.
- Cấu hình lần xuất hiện: character/view/variant, displayMode lấy từ variant hợp lệ, showOn/hideOn, dialogue trigger hoặc cờ sự kiện, required/forbidden flags, suppressWhenPossessed, anchor/x/y/scale/layer và fallbackText. Avatar dùng cho hồ sơ tạo hình nhưng không được đưa vào appearance vì schema hiện hành không hỗ trợ displayMode avatar.
- Chọn biến thể chỉ trong đúng nhân vật, loại asset theo format; đổi nhân vật/kiểu kích hoạt thì bỏ đích phụ thuộc cũ để chọn lại. Chặn duplicate visual profile qua form, chặn xóa/đổi format hoặc chuyển hồ sơ khi biến thể còn được dùng. Các thao tác bị chặn khôi phục giá trị đang hiển thị, không để select khác model.
- Ở **Nguồn & ảnh**, có chọn PNG xem thử, tính SHA-256 từ bytes và điều chỉnh focalPoint. Hash đã khai phải trùng tệp; hash trống được điền sau khi tệp kiểm tra thành công. Không tự tạo version, grant, license proof, approval hoặc worldId. Nút dùng điểm giữa xóa cấu hình focalPoint tùy chọn, không đổi ảnh gốc.
- **Xem trước** chọn scene/view, khung ngang 16:9 hoặc dọc 9:16, vai nhập và bật xem bố cục nhân vật. Background giữ tỷ lệ bằng object-fit:cover và object-position theo focalPoint. Nhân vật có vị trí/tỷ lệ/layer, thiếu ảnh có fallback chữ. Không crop/resize bytes ảnh hoặc bắt mọi art sản xuất theo một tỷ lệ cố định.

Đây là **preview tác giả**, chưa phải World Engine. Khi bật bố cục, các điều kiện showOn/requiredFlags không được thực thi; UI nói rõ không xét cờ hoặc chạy gameplay. Chọn role cast_possession chỉ mô phỏng việc ẩn sprite của đúng nhân vật khi suppressWhenPossessed=true. Không gán vai người chơi thật, thay save hoặc chạy hội thoại. Lỗi ảnh giữ nguyên scene/view và lời dẫn, không tự chuyển nơi chốn.

## Tệp PNG và ranh giới tin cậy

`cloudflare/src/vangioi-png.mjs` tách nguyên bộ kiểm container G1F thành hàm thuần dùng chung: signature/chunks/CRC/IHDR/palette/IDAT/IEND, chặn APNG và critical chunk không hỗ trợ. Registry vẫn gọi wrapper base64 như trước, không đổi bảng/version/quyền hoặc tự phục vụ ảnh. **Server intake vẫn chưa có pixel decoder/scan đầy đủ**.

`js/vangioi-local-png.mjs` bổ sung kiểm riêng cho preview: DecompressionStream deflate, độ dài raster/scanline, filter byte và các pass Adam7; đọc stream với giới hạn thay vì giữ toàn bộ raster. Sau đó trình duyệt giải mã ảnh trước khi tạo preview. Test đã phát hiện Image.decode đơn lẻ có thể chấp nhận PNG có dữ liệu nén hỏng, nên không dùng thành công của Image.decode làm bằng chứng duy nhất.

Giới hạn xem thử: PNG <=1 MiB, <=16 triệu pixel, dữ liệu scanline giải nén <=64 MiB; container chung vẫn có giới hạn riêng G1F (chiều <=10000, <=40 triệu pixel). Các mức này là ngân sách kỹ thuật preview, không phải quota art/thế giới theo rank hoặc định dạng phát hành cuối. PNG trong suốt hoàn toàn, palette/pixel semantics, metadata, nội dung nhạy cảm, spoiler, tính hợp pháp, chất lượng và crop cần pipeline/QA riêng. Kiểm file thành công không phải chứng nhận art hay an toàn tuyệt đối.

Môi trường thiếu DecompressionStream không bỏ qua bước kiểm; UI báo chưa hỗ trợ. JPEG/WebP/AVIF chưa được thêm vào công cụ xem thử này, không đổi hỗ trợ của các phân hệ khác. Không có tải URL người dùng hoặc gọi image generation/provider AI.

Hash là kiểm bytes, không xác minh quyền. Image metadata trong world-content-1 vẫn cần registry và license/approval thật trước khi gửi/publish. Ảnh test chỉ là PNG hai mảng màu sinh bằng code trong fixture, không phải background/nhân vật sản xuất đủ tiêu chuẩn V1.2-A. Không dùng placeholder hoặc ảnh xem thử để bật WORLD_PLAY/48 seed.

## Lưu nháp, phiên và bảo vệ tài khoản

**Ảnh xem thử chỉ nằm trong bộ nhớ phiên**, dưới Object URL cục bộ. Save/JSON export chỉ giữ tham chiếu/hash/focalPoint và hồ sơ tạo hình; không lưu Blob, URL blob hoặc bytes ảnh vào nháp. Đóng/mở dialog cùng UID giữ cache trong phiên; tải lại trang/đổi UID/mất quyền yêu cầu chọn tệp lại. Giữ tên DB/format/key của nháp G1G–G1H, không có schema migration hoặc xóa dữ liệu.

Đổi UID/mất gate tác giả dọn Object URLs và DOM ngay. File/hash/decode async kiểm lại UID, epoch, asset object và pin ID/version/kind/hash trước khi cập nhật; kết quả từ nháp/tài khoản cũ bị bỏ. Tệp sai hash, CRC/zlib/filter/raster hoặc decode lỗi không đổi pin và ảnh trước. Khi bỏ ảnh xem thử, tham chiếu/hash vẫn giữ nguyên. Cùng hash trong cùng tài khoản có thể tái dùng cùng bytes cho nhiều asset ID; không suy ra quyền của tài khoản khác.

Creator không lưu token hoặc phát grant, không có upload/cloud sync/CDN hoặc ghi tài khoản thật. UI Gửi duyệt vẫn khóa. Thay PNG local không sửa ảnh gốc, scene ID, mission/save hay dữ liệu registry server.

## QA và phần còn lại

- 481 test ứng dụng và 344 test Worker/helper PASS cục bộ. Năm test PNG mới gồm ArrayBuffer view có offset, input không phải bytes, scanline/Adam7, PNG CRC đúng nhưng zlib/filter/length sai và ngân sách preview tách server contract. Toàn bộ regression registry G1F và build bundle tái tạo vẫn PASS.
- Browser main với Firebase giả/IndexedDB thật/chặn ghi mạng giữ G1G/G1H, thêm `tests/fixtures/creator-visual.cjs`: hash mismatch, hash thật, SVG giả PNG, raster nén lỗi, visual/appearance liên kết, flags mâu thuẫn, layer vượt giới hạn, suppression rule, protected deletion/format, crop 16:9 & 9:16, object-position, bố cục theo role, image error không đổi scene, JSON pins và dọn ảnh khi đổi UID rồi mở lại nháp cũ.
- Đã xem ảnh QA bố cục từ dữ liệu giả; kiểm browser System/auth riêng. Chưa chứng minh thiết bị Android/iOS thực, production Firebase AU, art chất lượng hoặc backend live. CI/Pages kiểm theo commit đợt này.

Còn cửa hàng và một số metadata/điều kiện sâu qua JSON; chưa có art/source picker được cấp quyền thật, lưu/upload ảnh cloud, pipeline decode/scan server, review/publish workflow hoặc engine authoritative. Không deploy Worker, sửa Rules, bật AI tự thực thi hoặc đổi auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/pool/Canon.

Tiếp: hoàn thiện cửa hàng và công cụ kiểm kịch bản, rồi kế hoạch kết nối nguồn/asset có xác minh backend. Production deployment/migration/ghi dữ liệu thật cần được chủ dự án duyệt cụ thể. Rollback: revert commit G1I; nháp vẫn cùng world-content-1, bytes preview không có dữ liệu persistent cần migrate.
