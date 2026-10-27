# VẠN GIỚI — Nguồn V0.1 và cổng nhập offline

Giai đoạn 1A, ngày 26/10/2026. Chỉ nhập và kiểm tra hồ sơ ở local; chưa có Creator UI, API lưu nháp, cấp quyền hoặc phát hành. Không được dùng báo cáo của công cụ làm chứng nhận server.

**Cập nhật tiếp nối:** đợt 1A đã lên `main` tại `4ad5d73`, CI và Pages SUCCESS sau khi chủ dự án cho phép. Đợt 1B bổ sung lõi quyền/snapshot độc lập; xem [AUTHORING_BACKEND_G1B.md](AUTHORING_BACKEND_G1B.md). Chưa nối database hoặc route live.

Đợt 1B đã lên main tại `6a99b52` với CI/Pages SUCCESS. Đợt 1C thêm adapter lưu SQLite và kiểm thử transaction cục bộ: [SQL_PERSISTENCE_G1C.md](SQL_PERSISTENCE_G1C.md). Chưa thêm binding, route hoặc migration production.

Đợt 1C đã lên main tại `8783792` với CI/Pages SUCCESS. Đợt 1D thêm schema nháp/gửi duyệt, validator mặc định thật và registry tham chiếu nguồn/asset có version: [CONTENT_VALIDATION_G1D.md](CONTENT_VALIDATION_G1D.md). Chưa nối thư viện Firestore/ảnh thật hoặc backend live.

Đợt 1D đã lên main tại `29b3f9b` với CI/Pages SUCCESS. Đợt 1E thêm service khởi tạo world nháp và collaborator theo section: [PROVISIONING_G1E.md](PROVISIONING_G1E.md). Chưa có issuer entitlement, source/asset adapter hoặc backend live.

Đợt 1E đã lên main tại `4c63061` với CI/Pages SUCCESS. Đợt 1F thêm intake version/payload nguồn/PNG, quyền dùng theo world, thu hồi và đọc riêng tư: [REGISTRY_INTAKE_G1F.md](REGISTRY_INTAKE_G1F.md). Chưa nối Firestore/object storage hoặc backend live.

Đợt 1F đã lên main tại `5e01681` với CI/Pages SUCCESS. Đợt 1G thêm World Creator trong Chủ Thần AU, lưu nháp thiết bị theo UID và kiểm nội dung chung: [CREATOR_UI_G1G.md](CREATOR_UI_G1G.md). Chưa nối backend hoặc gửi duyệt thật.

**Sửa G1G.1 theo chủ dự án:** Creator chuyển sang **Vạn Giới → Tạo / nhập thế giới**; Chủ Thần dành riêng cho chủ dự án và AI điều phối. Không đặt công cụ viết truyện trong Core. Xem phần G1G.1 của [CREATOR_UI_G1G.md](CREATOR_UI_G1G.md); nháp G1G cũ được giữ nguyên.

Đợt G1G.1 đã lên main tại `08537c8`, CI/Pages SUCCESS. Đợt 1H bổ sung các form vai nhập/NPC/vật phẩm/objectives/events/endings và góc nhìn/tương tác: [CREATOR_FORMS_G1H.md](CREATOR_FORMS_G1H.md). Vẫn soạn tại Vạn Giới, lưu trên thiết bị, chưa gửi duyệt thật.

Đợt 1H đã lên main tại `4648173`, CI/Pages SUCCESS. Đợt 1I bổ sung tạo hình/bố cục và PNG xem thử riêng trong phiên, không upload/duyệt ảnh: [CREATOR_VISUAL_G1I.md](CREATOR_VISUAL_G1I.md).

Đợt 1I đã lên main tại `4ab2a6b`, CI/Pages SUCCESS. Đợt 1J thêm form cửa hàng và validator semantic-2 cho liên kết hàng/nguồn mua, hiển thị cả nhắc review: [CREATOR_SHOPS_G1J.md](CREATOR_SHOPS_G1J.md). Chưa có mua bán hoặc backend live.

## Nguồn và quy tắc làm việc

- Mã nền được đối chiếu tại `1f2fdb14074d99cd1a1542f334175c946c412f49` trên `main`.
- `docs/DUDU-STUDIO-START-HERE-2026-10-20.md`, mục 1/5 và V69/V71.2: làm trên main, không nhánh/ZIP riêng, kiểm thử theo đợt, giữ thông tin riêng tư ngoài repo công khai.
- Master prompt VẠN GIỚI, mục 12–14: kiểm toán trước, triển khai lần lượt; không đổi Canon hoặc dữ liệu/backend thật khi chưa được phép. Chủ dự án đã cho phép cập nhật nguồn main và Pages cho đợt trước, tiếp tục đợt kế trong cùng phạm vi; điều này không cho phép migration hoặc phát hành gameplay thật.
- `docs/DUDU-MASTER-DELIVERY-2026-10-19.md`, Deployment gates: ghi SHA/kiểm thử/giới hạn/rollback, phân biệt commit với deploy.

`source-v0.1/` chứa nguyên byte **10 file** trong gói World Authoring do chủ dự án cung cấp, kèm SHA-256. Không chỉnh các file đó để che xung đột. Bản quy chuẩn và template rời trùng byte với bản trong ZIP. Chỉ copy tài liệu thiết kế và dữ liệu mẫu của dự án; không copy chat riêng hoặc thông tin tài khoản.

## Đối chiếu với master prompt và code

| Nguồn V0.1 | Nguồn hiện hành | Cách xử lý trong đợt này |
|---|---|---|
| `genreId=period` | V66 dùng `era` cho Niên đại | Báo alias và đề xuất era trong normalizedMetadata; không sửa JSON gốc hoặc ID runtime. |
| Tác giả điền `worldRank` | Master: hệ thống/reviewer đánh giá bậc chính thức | Đưa vào requestedWorldRank; officialWorldRank=null. Không chấm bậc bằng số lượng nhiệm vụ, ảnh, NPC. |
| Quy chuẩn II đặt ba F trước hộ chiếu | Bàn giao V69–V71: nhiệm vụ mở đầu → thẻ → khế ước; ba F khảo hạch trong tiến trình sau đó | Ghi xung đột; trial/passport trong JSON chỉ là khai báo chưa tin cậy, không cấp grant. Không tự phân loại trial thành khảo hạch. |
| Tự ghi status approved/published hoặc assetStatus approved | Master: backend có quyền xác nhận | Chỉ kiểm cấu trúc theo schema gốc, kiểm semantic ở draft; báo nhãn tự khai, không xác nhận quyền/duyệt/publish. |
| Ngân sách AI/số main theo rank | Master: không khóa quota hoặc tỷ trọng chưa kiểm thử | Không chuyển các warning quota rank cũ thành tiêu chuẩn công cụ mới. Chưa dùng điểm 30/30/20/20. |
| Schema yêu cầu world hoàn chỉnh, doc cho lưu draft dở | Creator tương lai cần lưu thiếu trường | Công cụ hiện chỉ kiểm cấu trúc: lỗi không làm xóa file, template TODO vẫn là draft. Backend draft sau này cần schema partial riêng, chưa dựng trong 1A. |
| Story Bible chứa secretTruth, toàn bộ NPC knowledge | Master: chỉ người có quyền đọc nội dung ẩn | Report không xuất toàn bộ world/prose; source tác giả vẫn là nội dung riêng. Trước backend phải có projection riêng. |
| Không có storyVersion/series/timeline/owner đã xác thực | Master có các liên kết và chữ ký server | Không tự bịa hoặc ép các trường ấy vào schema V0.1. Cần contract backend tiếp theo trước UI. |
| Trigger/event dạng chuỗi | Master: engine dùng luật được xác nhận | Công cụ không eval hoặc thực thi trigger; PASS cấu trúc không chứng minh playable hoặc nhân quả đúng. |

Đây là các cách xử lý trong **công cụ kiểm tra offline**, chưa phải migration hoặc Canon mới. Còn cần chuẩn hóa schema runtime, nguồn truyện versioned, quyền membership, asset registry, instance và event log theo các giai đoạn sau.

## Chạy công cụ

Python 3.10 trở lên và dependency kiểm JSON Schema:

```sh
python -m pip install -r tools/vangioi/requirements.txt
python tools/vangioi/intake.py contracts/vangioi/source-v0.1/world_example_F.json
python -m unittest discover -s tools/vangioi -p 'test_*.py' -v
python -m unittest discover -s contracts/vangioi/source-v0.1 -p 'test_*.py' -v
```

`intake.py` chỉ đọc một file và in JSON report ra stdout. Không có ghi output tự động, mạng, database, tải ảnh, gọi AI hoặc public route. Không cần API key. Thiếu dependency schema thì dừng, không âm thầm bỏ qua bước kiểm.

- Exit 0: đủ cấu trúc để xem xét như bản nháp offline, không phải QA đạt/publish/khảo hạch.
- Exit 1: sai schema hoặc semantic/tham chiếu.
- Exit 2: lỗi đầu vào, giới hạn công cụ hoặc thiếu dependency.
- Metadata chuẩn hóa giữ worldId/contentVersion, genre alias có báo cáo, bậc chỉ đề nghị. ownerVerified, assetApprovalsVerified và mọi quyền hành động luôn false; luôn yêu cầu backend entry grant.
- SHA-256 ghi nhận đúng bytes tệp đầu vào; không phải chữ ký, bằng chứng quyền sở hữu hoặc chống gian lận.
- Giới hạn 2 MiB/64 tầng/100.000 nút là giới hạn parser của công cụ này, không phải quota sáng tác theo bậc; tương lai có thể chuyển sang nội dung theo arc/chunk sau khi đo thực tế.

## Nghiệm thu và giới hạn

- Bộ gốc: 22 tests PASS.
- Công cụ mới: kiểm schema bắt buộc, kiểu đầu vào sai, khóa JSON lặp, số không hữu hạn, giới hạn parser, ID thiếu, AI vượt quyền, nhãn publish tự khai, cấp S không thành bậc chính thức, alias có báo cáo, thiếu dependency dừng đúng, không lộ prose trong lỗi schema.
- Không thay source runtime, HTML/CSS, Rules, Wrangler, pool99/100, save, UID hoặc workflow deploy. Chưa có kiểm thử browser/live backend cho đợt này vì chưa nối vào ứng dụng.
- Bộ V0.1 nguyên gốc có thể có lỗ hổng ngoài các ca regression; wrapper kiểm schema trước khi gọi semantic. Reachability gốc chỉ là đồ thị cảnh bỏ qua điều kiện, chưa phải chứng minh mọi profile hoàn thành được. PASS không chứng minh bản quyền, lore, độ khó, ảnh đẹp, budget hoặc an toàn runtime.

Rollback source: hoàn nguyên commit chỉ thêm contracts/tools và dòng bàn giao. Không có migration hoặc dữ liệu người dùng cần khôi phục.

## Giai đoạn 1K — HTTP adapter cục bộ

Xem [AUTHORING_HTTP_G1K.md](AUTHORING_HTTP_G1K.md): Request/Response → SQL service thật, entitlement/scope/revision/snapshot và đọc hồ sơ reviewer độc lập. 13 integration tests; chưa import Worker live hoặc kết nối Creator, chưa quyết định duyệt/phát hành.

## Giai đoạn 1L — Review và yêu cầu mở rộng

[REVIEW_LIFECYCLE_G1L.md](REVIEW_LIFECYCLE_G1L.md): quyết định review/reopen có quyền, snapshot, transaction/receipt/audit; sửa trạng thái túi thuốc Quan Đạo. [EXPANSION_DESIGN_G1L.md](EXPANSION_DESIGN_G1L.md): thiết kế vật phẩm, gameplay tùy chọn, truyện dài theo arc; chưa bật schema/kinh tế/AI mới. Backend vẫn độc lập, chưa production.

G1M: xem [ITEM_POLICY_G1M.md](ITEM_POLICY_G1M.md), schema và preflight sidecar offline; chưa tích hợp production.

G1N: [ARC_PLANNING_G1N.md](ARC_PLANNING_G1N.md) — kế hoạch arc local và gói xuất/nhập; source picker có quyền còn chờ adapter.

G1O: [SOURCE_MANIFEST_G1O.md](SOURCE_MANIFEST_G1O.md) — danh sách nguồn có quyền, manifest và khoảng chương; service độc lập, chưa bật picker.

G1P: [SOURCE_HTTP_G1P.md](SOURCE_HTTP_G1P.md) — ba tuyến đọc nguồn trong adapter HTTP độc lập; chưa bật live hoặc picker.

G1Q: [LIBRARY_SOURCE_G1Q.md](LIBRARY_SOURCE_G1Q.md) — chuẩn bị nguồn từ trusted snapshot/permit; chưa reader Firebase hoặc ghi tự động.

G1R: [ADAPTATION_PERMITS_G1R.md](ADAPTATION_PERMITS_G1R.md) — permit và thu hồi cùng SQLite; chưa đồng bộ Firestore.

G1S: [SOURCE_STAGING_G1S.md](SOURCE_STAGING_G1S.md) — bộ project nguồn EPUB V49 và contract authority/staging, kiểm thử cô lập với G1Q/G1R/G1F; **chưa có Firestore reader, host staging hoặc transaction xuyên hệ thống**.

G1T: [FIRESTORE_READER_G1T.md](FIRESTORE_READER_G1T.md) — adapter Firestore server-only đọc V49 bằng read-only transaction, fixture/emulator smoke cô lập và kiểm chứng G1Q/G1R; chưa nối Firebase instance thật, production/staging deploy hoặc source picker.

G1U: [AUTHORITY_SYNC_G1U.md](AUTHORITY_SYNC_G1U.md) — outbox SQL append-only cho issue/revoke permit, cursor/checkpoint operator-only và chặn lịch sử G1R chưa baseline; chưa có consumer, Firestore sync, migration hay endpoint live.

G1V: [REPLAY_AND_RECHECK_G1V.md](REPLAY_AND_RECHECK_G1V.md) — diễn tập replay/checkpoint + revoked-wins và kiểm lại source V49 trước registry; vẫn chưa có subscriber, source freeze hay kết nối staging/live.

G1W: [SOURCE_FREEZE_G1W.md](SOURCE_FREEZE_G1W.md) — archive SQL cục bộ bất biến theo hash, nhập nguồn từ bản pin dưới permit hiện hành và ma trận xử lý thu hồi/staging; chưa có Firebase thật, legal notice listener, migration, consumer hay UI.

G1X: [SOURCE_NOTICES_G1X.md](SOURCE_NOTICES_G1X.md) — notice operator-only và lớp tạm giữ theo story/hash để chặn intake/read/discovery/submit/review trong SQLite; không tự revoke giấy phép, không có Firestore listener hay route live.

G1Y: [WORLD_RELEASE_GATE_G1Y.md](WORLD_RELEASE_GATE_G1Y.md) — tiền kiểm offline cho world đã approved, xét lại hold/revoke/permit/grant/snapshot/asset trước quyết định phát hành tương lai; không cấp session hoặc bật runtime/live.

G1Z: [ADMISSION_REHEARSAL_G1Z.md](ADMISSION_REHEARSAL_G1Z.md) — diễn tập operator-only bằng ID phiên giả trong RAM, gọi lại cổng G1Y ở các bước release/start/resume/read; không kết nối gameplay hay phát hành thật.

G2A: [STAGING_READINESS_G2A.md](STAGING_READINESS_G2A.md) — kiểm checkpoint G1U so với authority, baseline và quyền G1Y bằng fixture read-only; không xác nhận replica đã đồng bộ thật hoặc cấp quyền staging/production.

G2B: [PERMIT_PROJECTION_AUDIT_G2B.md](PERMIT_PROJECTION_AUDIT_G2B.md) — đối soát mọi permit key/status/revision với bản sao fixture để phát hiện checkpoint khớp nhưng dữ liệu sai; không đồng nghĩa có quyền sử dụng world thật.

G2C: [ATOMIC_FIXTURE_SINK_G2C.md](ATOMIC_FIXTURE_SINK_G2C.md) — sink SQLite fixture commit atomic projection/event/checkpoint cho replay G1V, chống sự kiện lặp và revoke-wins; không kết nối consumer/live production.

G2D: [FIXTURE_RECOVERY_G2D.md](FIXTURE_RECOVERY_G2D.md) — sao lưu metadata permit và khôi phục giao dịch nguyên tử **chỉ vào fixture trống**, kiểm digest và diễn tập G1V/G2B/G1Y sau sự cố; không đụng dữ liệu staging/production.

G2E: [FIXTURE_BACKUP_PROVENANCE_G2E.md](FIXTURE_BACKUP_PROVENANCE_G2E.md) — bao HMAC cho bản sao G2D từ host thử nghiệm tin cậy, ràng buộc issuer/key/project/timestamp/digest và từ chối backup giả mạo trước restore; chưa phải khóa/kho sao lưu production.

G2F: [FIXTURE_RESTORE_REPLAY_G2F.md](FIXTURE_RESTORE_REPLAY_G2F.md) — sổ SQLite fixture độc lập ghi nonce đã sử dụng, high-water checkpoint và digest để chặn dùng lại seal/rollback/fork; diễn tập burn-on-attempt, chưa có distributed transaction hay consumer live.

G2G: [FIXTURE_RECEIPT_RECONCILIATION_G2G.md](FIXTURE_RECEIPT_RECONCILIATION_G2G.md) — operator-only đối soát read-only biên nhận G2F với snapshot G2D trên target fixture sau sự cố, phân biệt khớp/chưa có dữ liệu/lệch/đã tiến; không tự làm mới nonce hoặc cấp quyền.

G2H: [FIXTURE_TARGET_BINDING_G2H.md](FIXTURE_TARGET_BINDING_G2H.md) — host gắn receipt G2F với UUID bất biến của target SQLite fixture, G2G chặn nhầm target trước khi đối soát backup; không phải attestation chống nhân bản DB hay production identity.

G2I: [STAGING_INTEGRATION_AUDIT_G2I.md](STAGING_INTEGRATION_AUDIT_G2I.md) — kiểm toán toàn tuyến G1R–G2H, ghép G2B/G2A/G1Y cho một phép đo nhất quán fixture operator-only, liệt kê 7 blocker trước staging thật; không cấp quyền kết nối/release/live.

G2J: [STAGING_TOPOLOGY_AND_ACCESS_G2J.md](STAGING_TOPOLOGY_AND_ACCESS_G2J.md) — thiết kế topology Firebase staging cách ly, ma trận quyền service/author/reviewer và bộ kiểm bản khai chỉ offline; chưa chọn Firestore instance/edition hay thực hiện IAM/Rules/deploy.

G2K: [EMULATOR_SECURITY_REHEARSAL_G2K.md](EMULATOR_SECURITY_REHEARSAL_G2K.md) — kiểm host source V49 trên Firestore Emulator project demo riêng: deny môi trường thật, phân biệt operator/permit với `admin` tự khai, bắt source hash đổi; không kiểm IAM/Rules production hay nối author picker.

G2L: [V49_RULES_EMULATOR_AUDIT_G2L.md](V49_RULES_EMULATOR_AUDIT_G2L.md) — kiểm snippet V49 đang chờ duyệt bằng Rules Unit Testing trên Emulator local, xác nhận 3 điểm cần duyệt về draft cross-admin, schema update và metadata published; không sửa hay deploy Rules thật.
