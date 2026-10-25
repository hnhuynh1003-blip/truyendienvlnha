# VẠN GIỚI — Validator gửi duyệt và nguồn có phiên bản Giai đoạn 1D

Ngày 26/10/2026. Nền đối chiếu: `8783792a88d72c1452728dc909b99104bf9e6887`.

Đợt này chuẩn hóa content contract và nối validator thật vào adapter SQLite khi không truyền callback thay thế. Đã kiểm thử submit qua SQL với schema/semantic/registry thật trong database test, không dùng validator luôn-pass cho các ca G1D. Chưa thêm binding/route, chưa triển khai Worker hoặc migration live, chưa có UI Creator, upload ảnh hoặc đồng bộ Firestore thật.

## Hai mức dữ liệu

| Mức | Schema | Điều kiện |
|---|---|---|
| Nháp đang viết | `world-content-1-draft.schema.json` | Có thể thiếu trường, để trống prose, chưa có ảnh/version/hash. Trường đã có phải đúng kiểu, enum và allowlist; không tự chèn quyền/AI authority. |
| Nội dung gửi reviewer | `world-content-1.schema.json` | Đủ Story Bible, nội dung chính và tham chiếu; không TODO/prose bắt buộc toàn dấu cách; nguồn/ảnh tham chiếu phiên bản cụ thể và quyền dùng được xác nhận trong registry. |

`schemaVersion=world-content-1`. World ID, owner, membership, lifecycle và bậc chính thức thuộc metadata server, không nằm trong content do tác giả sửa. `requestedWorldRank` vẫn chỉ là đề nghị; một world S không bị ép nhiều NPC/ảnh/địa điểm hoặc thêm main mission để đủ quota.

`entry` chỉ chứa `entrySceneId`. Không mang trialInstance/passportRequired của V0.1 sang thành quyền bỏ hộ chiếu; quyền vào chơi thuộc service cấp grant sau này. `playerEntryProfiles` và entryPolicy vẫn cho fixed hoặc lựa chọn trong tập tác giả hỗ trợ.

Khi save, SQL adapter kiểm cả patch và content đã ghép theo schema nháp. Khi submit, kiểm schema đầy đủ trước semantic; dữ liệu sai kiểu không được đưa vào vòng duyệt tham chiếu. Các bản nháp thiếu nội dung vẫn có thể lưu, nhưng không thể gửi duyệt bằng report offline G1A.

## Nguồn truyện ổn định

```js
storySource = {
  kind: 'original', // original | library | manuscript
  storyId: 'id-truyen-dang-co',
  storyVersion: 'phien-ban-da-khoa',
  contentHash: 'sha256-64-ky-tu-hex'
};
```

ID truyện nguồn không bị ép theo mẫu ID world; giữ khả năng dùng ID EPUB/legacy hiện có. Validator đối chiếu đúng loại nguồn, storyId, phiên bản, hash và grant của world trong registry. Không tải lại toàn bộ truyện để gửi mỗi hành động, không tự đổi nguồn sang bản mới nhất và không ghi đè truyện cũ.

Registry lưu **metadata tham chiếu** của source snapshot, chưa lưu hoặc tự trích nội dung từ thư viện Firestore. Kết nối đọc truyện/version snapshot thật, xác nhận quyền chuyển thể và provisioning nguồn cần xây ở đợt sau. Grant active trong test chỉ là fixture; không chứng minh quyền sở hữu tác phẩm ngoài đời.

## Asset có phiên bản và quyền riêng

Mỗi mục assets trong content gồm `assetId`, `assetVersion`, `contentHash`, `kind`, `altText` và focalPoint tùy chọn. Không cho tác giả gửi assetStatus=approved, license hoặc proofRef để tự xác thực ảnh. Các dữ liệu xét quyền và trạng thái duyệt nằm trong registry server.

- Phải khớp assetId/version/hash/kind với bản ghi bất biến.
- Phải có grant active của chính world, license/sourceNote đã khai; licensed cần proofRef được backend ghi nhận.
- Asset pending/inReview có thể đi cùng hồ sơ gửi reviewer, kèm warning; asset rejected hoặc quyền unknown bị chặn. **Gửi duyệt không phải phát hành.** Publish sau này vẫn cần duyệt ảnh, nội dung, QA và quyền publisher riêng.
- Validator chỉ đối chiếu metadata, không mở file ảnh để chứng minh bối cảnh/thẩm mỹ/bản quyền. Chưa có upload, quét ảnh, crop mobile hoặc public asset URL.
- Có thể tái dùng cùng bytes có chủ đích cho cover/background qua các bản ghi vai trò riêng. Không gộp ID/quyền hoặc dùng số ảnh để xếp bậc.

## Registry SQLite được bổ sung

| Bảng | Đặc điểm |
|---|---|
| `vg_authoring_source_versions_v1` | kind + storyId + storyVersion và hash; chặn UPDATE/DELETE |
| `vg_authoring_source_grants_v1` | Quyền dùng phiên bản nguồn theo world, trạng thái và grantRevision |
| `vg_authoring_asset_versions_v1` | assetId + assetVersion, hash và kind; chặn UPDATE/DELETE |
| `vg_authoring_asset_grants_v1` | Grant theo world, reviewStatus, license, sourceNote/proofRef và grantRevision |

Chưa có API author/reviewer để tự ghi những bảng này. Công cụ provisioning/quản lý quyền tương lai phải kiểm danh tính và cập nhật grantRevision; không nhận bản ghi registry từ JSON tác giả.

Validator giữ bản đọc dependencies của source/assets trong kế hoạch server. Transaction submit đọc lại các bản ghi và đối chiếu trước commit. Thu hồi quyền hoặc thay metadata trong khoảng trống sau validate sẽ trả `dependency-conflict`, không khóa nháp hoặc tạo snapshot dở. Các bản ghi dependency không bị đưa vào snapshot người đọc; content chỉ giữ ref/version/hash.

Receipt của hành động đã commit vẫn là xác nhận lịch sử; không cấp quyền mới hoặc tự chuyển trạng thái published khi grant bị thu hồi. Workflow moderation/publish tương lai phải kiểm lại quyền hiện hành, không dùng receipt cũ làm giấy phép.

## Kiểm tra semantic đã có

- ID trùng/mất, các liên kết map/place/scene/view theo hai chiều, chu trình parentPlace, asset cover/background.
- Hotspot target, focus trong cùng scene, key nhặt một lần và đối chiếu hai chiều với nguồn thu nhận item.
- Cast khác NPC; hình có thể không có actor. Kiểm variant/appearance/asset/trigger thoại, không tạo sprite trùng vai đang bị player nhập.
- Profile fixed có tồn tại, cast playable, system_cover có thân phận, native_extra có lịch sử xã hội.
- Nhiệm vụ main bắt buộc, side/hidden không chặn completion, objective/reward/shop trỏ ID thật, số liệu không âm/không tràn JS safe integer.
- NPC ai_candidate có yêu cầu rõ và fallback kịch bản; JSON không bật AI rewards/world mutation.
- Structural reachability theo từng profile là warning, không giả định mọi điều kiện đều thỏa. Trigger/event dạng text chưa được thực thi, cần engine/reviewer kiểm thêm.

Các target được hỗ trợ trong contract kỹ thuật này: inspect/read/collect/purchase/deliver liên kết item, talk liên kết NPC, reach/move liên kết scene, focus liên kết view, choose liên kết hotspot, survive liên kết event. Đây là phạm vi validator hiện tại, không tự thay Canon hoặc mô phỏng gameplay; parser engine sau này phải đối chiếu trước khi phát hành.

PASS chỉ có nghĩa đủ điều kiện **đưa vào xét duyệt**, không chứng minh câu chuyện hay, mọi profile thắng được, không deadlock theo điều kiện, ngân sách thưởng hợp lý, ảnh đúng nhân vật hoặc đã đủ quyền phát hành. `canPublish` vẫn false trong verdict.

## Tiếp nhận V0.1 có chủ ý

`proposeLegacyContent()` tạo một đề xuất mới, không sửa input hoặc database:

- Đổi schema content và alias period → era; worldRank → requestedWorldRank.
- Giữ Story Bible và dữ liệu sáng tác, không tự viết thêm lore/nhân vật/cảnh.
- Không nhập owner/author claim, trạng thái publish/asset approved hoặc quyền trial bỏ hộ chiếu.
- Asset cũ chưa có version/hash được để thiếu trong draft, không bịa hash hay đánh dấu đã upload.
- storySource có thể được khai bằng ref tới truyện đã có; validator vẫn phải kiểm registry. Không tự bind worldId/missionId hiện hữu hoặc migrate save.

Gói nguồn V0.1 và SHA256SUMS vẫn giữ nguyên byte. Đây không phải migration tự động cho các draft/game save cũ.

## Build và kiểm thử

Ajv được khóa ở `8.20.0`. Chỉ script build dùng Ajv để biên dịch hai schema cố định thành `src/generated/vangioi-content-validators.cjs`. Worker tương lai nhập mã validator đã biên dịch, không compile schema từ người dùng hoặc nới unsafe-eval/CSP. Mã semantic không eval trigger/câu chuyện.

```sh
node cloudflare/scripts/build-vangioi-validator.mjs
node cloudflare/scripts/build-vangioi-validator.mjs --check
node --test cloudflare/tests/vangioi-content.test.mjs
node --test cloudflare/tests/*.test.mjs
```

Hai schema mới được dựng từ cấu trúc V0.1 rồi tách metadata/quyền và thêm version refs; test --check bảo đảm schema/mã generated không lệch script. Có 33 ca G1D, bao gồm submit SQL dùng validator mặc định thật và thu hồi quyền source/asset ngay trước commit. Đã kiểm bundle browser ESM cục bộ (~285 KB minified) và không có new Function/eval trong bundle; đây chưa phải Cloudflare live smoke hoặc đo hiệu năng production.

Tài liệu kỹ thuật thư viện: https://ajv.js.org/json-schema.html và https://ajv.js.org/standalone.html. Không lấy PASS JSON Schema làm nghiệm thu gameplay/bản quyền.

## Giới hạn và tiếp nối

Chưa có source snapshot reader từ Firestore, upload ảnh, công cụ provision world/grant/membership, review decision hoặc publish workflow. Chưa đổi dữ liệu hoặc phân quyền thật. Tiếp: provisioning và adapter nguồn/asset cho một owner được xác thực, rồi mới nối UI Creator và xét triển khai backend có kiểm soát. Retention, migration, backup, stress test và QA mobile cần hoàn thiện trước phát hành chơi.

Rollback source: revert phạm vi G1D, schema/generated và dependency Ajv bổ sung. Không xóa dữ liệu người dùng vì chưa có migration live.
