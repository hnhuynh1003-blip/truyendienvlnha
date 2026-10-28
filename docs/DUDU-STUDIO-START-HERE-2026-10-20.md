# DUDU Studio — START HERE / Bàn giao sạch · 20/10/2026

## VẠN GIỚI G5C-P2 — LOCAL BROWSER ROLEPLAY (28/10/2026)

Nền `99af328` (G5C-P, Smoke/Browser/Pages SUCCESS). Theo quyết định Du muốn tự bấm thử world, xem `contracts/vangioi/G5C_P2_LOCAL_BROWSER_ROLEPLAY.md`. Chạy `npm install --prefix cloudflare --no-audit --no-fund` một lần, sau đó `node tools/vangioi/author-roleplay-browser-server.mjs` và mở URL `http://127.0.0.1:<cổng>` do Node in ra. Demo text-first, hai vai và hai kết cục, G4A/G4B rule/revision trong RAM; localhost-only, chặn Host/Origin sai và thử Chromium mobile viewport. Không thêm đường chơi/nút trên Pages/Vạn Giới/Thiên Mệnh, không ảnh/source có quyền, save, reward, nhiệm vụ được xác nhận hay backend thật. G5D–F chưa thực hiện, CI/Pages G5C-P2 phải kiểm theo SHA mới.

## VẠN GIỚI G5C-P — AUTHOR-MADE ROLEPLAY DEMO (28/10/2026)

Nền `5f49794` (G5C, Smoke/Browser/Pages SUCCESS). Theo quyết định thử nhập vai với một thế giới tác giả tự tạo, xem `contracts/vangioi/G5C_P_OFFLINE_AUTHOR_ROLEPLAY_DEMO.md`: demo Node CLI **Ngọn đèn cuối ở Bến Sương** có hai thân phận và lời phản ứng riêng, NPC kịch bản, bốn scene, hai nhánh/kết cục; G3C kiểm đường đi, G4A áp dụng rule allowlist, G4B replay/revision/eventId trong RAM. Chạy `node tools/vangioi/author-roleplay-cli.mjs` ở clone repo. Source/ảnh là **placeholder chưa xác minh bytes/quyền**; không có browser chơi trên Pages, save, completion proof, quyền phát thưởng hoặc production. G5D–F chưa triển khai; CI/Pages G5C-P cần kiểm theo commit SHA đợt mới.

## VẠN GIỚI G5C — SYNTHETIC STAGING ASSEMBLY (28/10/2026)

Nền `8cc63e3` (G5B, Smoke/Browser/Pages SUCCESS). Đọc `contracts/vangioi/G5C_SYNTHETIC_STAGING_ASSEMBLY.md`: G5C chỉ ghép **index ID/pin** của world/arc từ G5A, dùng G1Y fixture gate kiểm lại, G3C/G4A, observation ảnh đủ và fallback text, G1N plan và snapshot parent phiên bản lịch sử; kiểm ending tồn tại ở parent và đồ thị không vòng. Không giữ truth text/asset bytes trong output, không chứng minh lineage hoặc bản quyền parent hiện tại, không mở world chơi hay quyền staging/publish. G5D kế tiếp cần version/save/recovery theo fixture và policy riêng; nếu muốn demo world tác giả thực sự chơi được phải thiết kế đợt gameplay offline riêng, không đánh đồng `packageIndex` với runtime. CI/Pages G5C phải kiểm theo SHA mới.

## VẠN GIỚI G5B — OFFLINE MODERATION REVIEW REHEARSAL (28/10/2026)

Nền `eb09fc90` (G5A, Smoke/Browser và Pages SUCCESS). Đọc `contracts/vangioi/G5B_OFFLINE_MODERATION_REHEARSAL.md`: module G5B chỉ dùng host Node SQLite fixture và các service G1L/G1Y đã có, không cấp role/endpoint. G1L review thật trong fixture ghi decision + receipt/audit bất biến; G5B kiểm lại SQL theo reviewer độc lập, rồi G1Y đánh giá quyền nguồn/ảnh/notice **sau** approval. Không biến kết quả duyệt lịch sử thành quyền staging khi G1X hold/G1R revoke hoặc source/asset stale. Nhãn và quyền pháp lý bên ngoài vẫn phải được duyệt, `readyForStaging=false` kể cả preflight fixture PASS. G5C tiếp theo chỉ được lắp staging **synthetic cách ly**, không nối Firebase/Worker hay dựng gameplay thật chỉ nhờ G5B. CI/Pages kiểm SHA commit G5B riêng.

## VẠN GIỚI G5A — OFFLINE RELEASE CANDIDATE (28/10/2026)

Từ nền `916cf084` (chốt G4; CI/Pages SUCCESS), xem `contracts/vangioi/G5A_OFFLINE_RELEASE_CANDIDATE.md`: G5A thêm sidecar kiểm G1L snapshot/phiên bản/hash/nguồn/asset/vai nhập/G1N arc, ba mode continuity **dưới dạng khai báo**, G3C reachability/ảnh, G4A manifest và G1Y callback synthetic. Không biến candidate PASS thành role reviewer/publisher, proof ending/lineage, publish, save, reward hay gameplay thật. PR #22 continuity vẫn Draft khi bắt đầu; không âm thầm chốt Phán Tử/Tái Xuyên hoặc thay Canon. G5B tiếp theo chỉ diễn tập moderation/review độc lập, chưa nối production. Kết quả hồi quy/CI/Pages phải kiểm theo **SHA commit G5A**, không dùng kết quả G4.

## VẠN GIỚI — CHỐT G4 OFFLINE / LẬP KẾ HOẠCH G5 (28/10/2026)

Nền kiểm toán `56dcb9ea` (G4I; Smoke/Browser và Pages SUCCESS). Đọc `contracts/vangioi/G4_OFFLINE_CLOSEOUT_2026-10-28.md` và `contracts/vangioi/G5_RELEASE_AND_STAGING_PLAN_DRAFT.md`. G4A–G4I có **111 ca test riêng**, toàn bộ Cloudflare 949/949, app 104/104, Functions 2/2, Python 38/38 và Wrangler dry-run PASS trên checkout sạch. **Chỉ chốt hoàn thành G4 dưới dạng test harness offline**; G4F không phát thưởng thật, G4E chỉ xác minh `reach` một lần trong fixture, G4I không có issuer, G4H v1 chưa backup nhật ký rebind, chưa có authority xuyên Firestore/SQLite hoặc world playable. G5A–F mới là **đề xuất kế hoạch**, ưu tiên G5A contract release candidate offline trước; staging thật, role/publisher, migration, Rules, reward, NPC AI, gameplay và G5 code chưa được bật trong đợt này. CI/Pages của commit đóng hồ sơ phải kiểm lại theo SHA mới.

## VẠN GIỚI G4I — 28/10/2026

Nền `4c0bfe0` (G4H, Smoke/Browser/Pages SUCCESS). Xem `contracts/vangioi/G4I_OFFLINE_RE_ADMISSION_REBIND.md`. G4I chỉ trong Node SQLite fixture: khi G4H phục hồi dữ liệu nhưng mất G1Z session RAM, host bắt buộc xác minh lại player, G1Z session mới, entitlement và pin approved/source/content bằng callback tách biệt. G4G phải xác nhận log sạch; gate/license/source không bị hold, CAS cập nhật fence G4D trong cùng transaction với immutable receipt/ledger, retry idempotent và rollback lỗi. G4H v1 bị chặn xuất backup sau khi có G4I receipts vì chưa lưu được nhật ký rebind; v2 chưa triển khai. Không tạo quyền thật, gameplay, reward, save, UI hay Firestore/Worker production, không G5/AI/Canon.

## VẠN GIỚI G4H — 28/10/2026

Nền `33e31b9` (G4G, smoke/browser/Pages SUCCESS). Đọc `contracts/vangioi/G4H_ISOLATED_FIXTURE_BACKUP_RESTORE.md`: G4H là diễn tập test-host Node SQLite **chỉ** backup/restore G4C–G4F sau audit G4G, checksum và kiểm replay riêng trong SQLite RAM; ghi khôi phục theo transaction vào **fixture đã khởi tạo nhưng hoàn toàn trống**, rollback khi lỗi, từ chối restore nhầm bản đang có dữ liệu. G1Z admission là RAM và **không được tự tái cấp quyền** khi reload DB. Fingerprint/hash không phải chữ ký hay entitlement, không có antirollback/issuer/restore production. Không thêm UI, reward, world chơi thật, Firestore/Worker live, Canon/G5/AI. CI/Pages G4H phải xác minh bằng SHA mới.

## VẠN GIỚI G4G — 28/10/2026

Nền `077dc60b` (G4F, smoke/browser/Pages SUCCESS). Đọc `contracts/vangioi/G4G_OFFLINE_RECOVERY_RECONCILIATION.md`: G4G thêm kiểm toán **chỉ đọc** Node SQLite đối soát G4C event/receipt/ledger và G4F dry-run receipt/ledger/policy, kiểm chứng lại G4B replay và objective `reach` lịch sử. Fingerprint snapshot ổn định khi đóng–mở lại SQLite, phát hiện thiếu/sửa record và phân biệt revoke/hold hợp lệ với corruption. **Không tự khôi phục/sửa data, không tạo checkpoint có chữ ký, không kết nối production.** Readiness production luôn `false` do thiếu issuer, proof đa verb/ending, approved reward, cross-store outbox, migration/rollback và QA live; không mở G5, thưởng hay UI mới. CI/Pages G4G phải kiểm theo SHA commit riêng.

## VẠN GIỚI G4F — 27/10/2026

Nền `9e2fe1c` (G4E, smoke/browser/Pages SUCCESS). Đọc `contracts/vangioi/G4F_DRY_RUN_SETTLEMENT_FIXTURE.md`: Node-only G4F dựng mock adjudicator độc lập với G4E objective evidence và policy `dry-run-only` riêng; ghi receipt + ledger chỉ mang dấu vết mô phỏng trong **một SQLite transaction** có khóa idempotency `(worldInstanceId,missionId,completionVersion)`, CAS/recheck G4D/nguồn/policy fence và rollback lỗi. Chưa issuer reviewer/publisher, chứng cứ nhiệm vụ đa dạng hoặc quyền cấp thưởng thật. Không cấp EXP/Xu/vật phẩm/Kho, không sửa Creator/Worker/Thiên Mệnh/Chủ Thần/Canon/schema, không production. CI/Pages G4F phải kiểm SHA commit mới; G4E CI không thay thế.

## VẠN GIỚI G4E — 27/10/2026

Nền `ff0b44e` (G4D, smoke/browser/Pages SUCCESS). Đọc `contracts/vangioi/G4E_OFFLINE_OBJECTIVE_EVIDENCE.md`: Node-only read-only fixture đối chiếu G4B replay với G4C receipt/ledger và fence G4D bằng cùng snapshot SQLite, chỉ tạo bằng chứng *ứng viên* cho `reach` đơn-lần khi một scene transition đã được commit. Không tính scene xuất phát; `talk/choose/collect/inspect/purchase/survive/deliver` và reach lặp **unsupported**, không kết luận hoàn thành mission, ending hay quyền nhận thưởng. Không kết nối World Creator/Worker/Thiên Mệnh/Chủ Thần/Firebase, không ghi production, không đổi Canon/schema. CI/Pages G4E phải kiểm SHA commit mới, không lấy G4D thay thế. TOCTOU liên storage và trusted issuer chưa giải quyết.

## VẠN GIỚI G4D — 27/10/2026

Nền `055fc37` (G4C, CI/Pages SUCCESS). Xem `contracts/vangioi/G4D_AUTHORITY_ADMISSION_FENCE.md`. G4D tạo bridge test-only từ G1Z operator rehearsal tới G4C: bắt buộc host reader player/entitlement/content-source pin riêng, recheck admission/snapshot trước mỗi event và fence accessRevision/epoch trong cùng SQLite transaction G4C. Không biến G1Y/G1Z thành quyền chơi, không tin event tự khai, không đổi rule/manifest/Creator/UI. Vẫn tồn tại cửa sổ race **xuyên** authority SQL, G1Z Map và SQLite fixture vì chưa có topology/trusted issuer/consumer thật. Chưa production, thưởng, EXP/Xu/Kho; CI G4D phải kiểm SHA mới.

## VẠN GIỚI G4C — 27/10/2026

Nền `0f7dc18` (G4B, smoke/browser/Pages CI SUCCESS). Đọc `contracts/vangioi/G4C_ATOMIC_SQLITE_FIXTURE.md`: adapter Node-only SQLite thử giao dịch nguyên tử, CAS nhiều kết nối, retry nhận receipt cũ, rollback toàn bộ state/receipt/audit và kiểm pin identity/content/source + quyền/giấy phép synthetic ngay trước commit. Ledger **chỉ kiểm toán chuyển cảnh**, không có grant, EXP, Xu, vật phẩm hoặc Kho. Không kết nối Worker/Firestore/Pages UI, không migration/Rules/production. CI G4C phải kiểm theo SHA commit mới, không dùng kết quả G4B làm bằng chứng.

## VẠN GIỚI Giai đoạn 1R — 26/10/2026

Nền 5bdf11b, CI G1Q SUCCESS. Xem `contracts/vangioi/ADAPTATION_PERMITS_G1R.md`. Registry có sổ permit bất biến, operator issue/read/revoke, revoke permit/object/world grants cùng transaction và guard stale import. Legacy không có permit giữ G1F; chưa migration hoặc bắt buộc permit toàn hệ thống. Chưa Firestore sync/live/picker.

## VẠN GIỚI Giai đoạn 1Q — 26/10/2026

Nền 722a8cf. Đọc `contracts/vangioi/LIBRARY_SOURCE_G1Q.md`. Có preparer server cho snapshot Thư viện + permit gắn hash, giữ chapter IDs, canonical version và registryInput G1F. Chỉ callback trusted reader/operator, chưa Firebase SDK reader hoặc ghi registry tự động; hai lần đọc không tạo transaction Firestore–SQLite. 16 tests mới gồm luồng tích hợp SQLite, tổng 424 Worker/helper. Chưa UI/picker/live/Rules/migration. Tiếp protocol permit/version/consistent reader và đồng bộ thu hồi trước bật nguồn production.

## VẠN GIỚI Giai đoạn 1P — 26/10/2026

Nền 5554912. Đọc `contracts/vangioi/SOURCE_HTTP_G1P.md`. Adapter HTTP độc lập G1K thêm ba POST query/manifest/range dưới world sources, Bearer/Origin/body giới hạn và quyền registry G1O. Chưa nối Worker live, Thư viện Firestore hoặc Creator picker; không mutation/grant route. 7 HTTP tests mới, 408 Worker/helper; CI theo commit G1P. Tiếp adapter Thư viện có quyền và manifest trước client/picker, giữ cổng deploy G1K.

## VẠN GIỚI Giai đoạn 1O — 26/10/2026

Nền 2fc45fd. Đọc `contracts/vangioi/SOURCE_MANIFEST_G1O.md`. Registry G1F thêm listSources phân trang theo world/recipient/grant, sourceManifest không text và sourceRange theo chapter ID/thứ tự payload. Read/hash/recheck quyền hiện hữu được tái sử dụng. Chỉ service SQLite độc lập; chưa HTTP/Firestore/live/Creator picker. Không đổi schema, arc/nháp/UI hoặc thưởng. Kiểm CI theo commit G1O; tiếp transport xác thực và adapter Thư viện trước nối UI.

## VẠN GIỚI Giai đoạn 1N — 26/10/2026

Nền cb7c9fd. Đọc `contracts/vangioi/ARC_PLANNING_G1N.md`. Creator có kế hoạch arc thủ công lưu local theo UID, pin nguồn riêng từng arc, xuất/nhập gói kèm content; content/schema và nháp cũ tương thích. Source picker có quyền chưa mở: EPUB V49 thiếu manifest version/hash/quyền chuyển thể. Không suy metadata thành quyền hay tự tải lại truyện. Chưa AI, review/publish arc, continuity hoặc gameplay mới. QA/CI/Pages kiểm theo commit G1N.

## VẠN GIỚI Giai đoạn 1M — 26/10/2026

Nền a931b4d (G1L). Đọc `contracts/vangioi/ITEM_POLICY_G1M.md`. Schema sidecar và preflight Node offline cho vật phẩm standard/custom, pin world/content, sổ tay/world, acquisition group nhiều tuyến và ngoại lệ era/power. Chưa nối snapshot/review/UI/runtime, chưa có catalog thật hoặc quyền cấp/xuất Kho. World-content-1 và pilot giữ tương thích. Kiểm thử theo commit G1M; unit PASS không chứng minh production. Tiếp theo arc/source picker theo thiết kế G1L.

## VẠN GIỚI Giai đoạn 1L — 26/10/2026

Nền `c575acb` (1K, CI/Pages SUCCESS). Đọc `contracts/vangioi/REVIEW_LIFECYCLE_G1L.md` và `EXPANSION_DESIGN_G1L.md`. Làm tuần tự theo yêu cầu mới: review backend → thiết kế vật phẩm/gameplay/arc → sửa lỗi túi thuốc Quan Đạo. Approve/request_changes gắn revision/accessRevision/snapshotHash, reviewer độc lập, kiểm lại source/asset và quyền trong transaction; immutable decision/receipt/audit. Owner reopen thành revision mới, không sửa snapshot hoặc kế thừa approval. Vẫn chưa publish/official rank/art approval/gameplay hoặc backend live/DO/binding/migration/client connection.

Thiết kế mới phân biệt sổ tay, vật phẩm world và Kho; nhiều tuyến chung entity/cơ hội, kiểm thời đại/nguồn/sức mạnh/giao dịch/xuyên giới có ngoại lệ được duyệt. Năm gameplay modules tùy truyện; chuyển thể truyện dài theo arc/source pin, thủ công hoặc hỗ trợ đề xuất. Chưa đổi schema/economy/AI, chưa buộc nhập toàn bộ cast/scene hoặc advanced fields. Vạn Giới dành tác giả, Thiên Mệnh dành người chơi, Chủ Thần riêng chủ dự án/AI.

Quan Đạo V8 scenarioVersion 10: evidence guard + once ẩn nhặt túi khi đã thu nhận, thay bằng kiểm tra vật chứng đang giữ; phiếu/nút dây và đường phá án giữ mở. Không đổi session key/mission/scenario ID; save V8 cũ có evidence vẫn được bảo vệ. 486 test ứng dụng + 379 Worker/helper; 5 ca logic item mới, 12 ca review mới, browser thật qua NPC/kho/reload/revisit/giải án và responsive, không request ngoài. CI/Pages kiểm theo SHA đợt này; không đồng nghĩa account/Worker production hoặc Android/iOS thực đã kiểm.

Tiếp: contract/policy vật phẩm chuẩn/đề xuất riêng, rồi arc/source picker/UI gọn theo từng đợt; gameplay module chỉ khi truyện cần. Không mở phó bản mới/48 seed/Kho/thưởng/AI hoặc các tuyến production chưa duyệt. Giữ cổng deployment/issuer/storage topology/migration/rollback của G1K.

## VẠN GIỚI Giai đoạn 1K — 26/10/2026

Nền `1177a55` (1J, CI/Pages SUCCESS). Đọc `contracts/vangioi/AUTHORING_HTTP_G1K.md`. Adapter HTTP độc lập ghép SQL authoring/provisioning: tạo world có entitlement, đọc/lưu theo scope/revision, đặt/thu hồi collaborator, submit snapshot và reviewer độc lập đọc đúng bản gửi. Origin HTTPS allowlist chính xác, Bearer Firebase trước đọc stream; byte cap 2 MiB trước parse/UTF-8 strict, metadata/path injection bị chặn, lỗi kín/no-store. Quyền và atomic receipt/audit tiếp tục do service kiểm ở commit.

13 integration tests Request/Response + SQLite thật/validator semantic-2, dữ liệu tổng hợp, kiểm scope/revoke/replay/rollback/grant/reviewer/bytes/CORS. 481 test ứng dụng + 367 Worker/helper PASS cục bộ; CI/Pages theo SHA GitHub đợt này. Không đổi frontend/validator version; Creator vẫn ở Vạn Giới và local-only, Chủ Thần riêng chủ dự án/AI.

Chưa quyết định approve/reject/reopen, chưa nối Worker live/DO/route/binding/migration, chưa kết nối nút gửi duyệt hoặc cấp tài khoản/quyền thật. Tiếp: review lifecycle có snapshot pin, quyền độc lập và receipt/audit; rồi host/client integration. Kế hoạch deployment phải xử lý topology registry/grants/revoke, issuer, rate limits, migration/rollback và duyệt production riêng; không bật gameplay/48 seed/thưởng/AI hoặc thay auth/Thiên Mệnh/EPUB/NPC/save/kho/EXP/Canon/pool.

## VẠN GIỚI Giai đoạn 1J — 26/10/2026

Nền `4ab2a6b` (1I, CI/Pages SUCCESS). Đọc `contracts/vangioi/CREATOR_SHOPS_G1J.md`. Vạn Giới có form Cửa hàng: nơi mở/NPC/tiền loại currency, stock giá/số lượng nguyên không âm; khai acquisition qua shop bằng thao tác rõ ràng, không tạo liên kết lặp. Xóa/đổi dòng hàng cuối hoặc shop còn được dùng bị chặn; duplicate import có thể sửa giữ đúng liên kết.

Validator semantic-2 dùng chung browser/server: chặn stock item trùng và acquisition trỏ shop không bán món đó; các trường hợp hết/thiếu hàng, thiếu nguồn mua/nguồn tiền chỉ nhắc review, không giả lập đủ tiền hoặc tự bổ sung hàng. Report UI nay hiện warnings G1D lẫn kinh tế. Không đổi schema V0.1/content hoặc rewrite snapshot cũ. 481 test ứng dụng + 354 test Worker/helper PASS; browser có shop/purchase/link/numeric/duplicate/save/export và responsive. CI/Pages theo SHA GitHub đợt này.

Vẫn lưu nháp thiết bị, PNG xem thử theo phiên, chưa cloud sync/review/backend route/binding/migration/deploy/giao dịch thật. Giữ Chủ Thần riêng cho chủ dự án và AI; không phát WORLD_PLAY/48 seed hoặc sửa auth/Thiên Mệnh/EPUB/NPC/save/kho/EXP/pool/AI/Canon. Tiếp: adapter backend + review có quyền thật, kiểm thử cục bộ trước kế hoạch triển khai được duyệt riêng.

## VẠN GIỚI Giai đoạn 1I — 26/10/2026

Nền `4648173` (1H, CI/Pages SUCCESS). Đọc `contracts/vangioi/CREATOR_VISUAL_G1I.md`. Vẫn soạn tại Vạn Giới, không trong Chủ Thần. Form visualIdentity/characterVisuals/variants/appearances, đúng asset kind, vị trí/layer/flags/fallback và suppressWhenPossessed. Chọn PNG xem thử theo hash; preview khung ngang/dọc + focalPoint và bố cục nhân vật theo vai nhập, không chạy cờ/gameplay.

Ảnh chỉ trong cache phiên riêng của UID; save/export giữ metadata, không bytes/Blob URL. Đổi UID/mất quyền dọn URL/DOM; upload/hash/decode async đối chiếu lại pin/UID/epoch. Container PNG G1F được tách dùng chung, server policy không đổi; preview thêm kiểm zlib/scanline/Adam7 và native decode. PNG <=1 MiB, preview <=16M pixel/64 MiB scanline là giới hạn kỹ thuật, không quota rank. Không có ảnh production hoặc approval/publish tự động.

481 test ứng dụng + 344 test Worker/helper PASS; browser kiểm file/hash/crop, visual graph, suppression, fallback không đổi scene, export và account cleanup. CI/Pages theo SHA GitHub đợt này. Chưa store/upload ảnh cloud, asset/source picker có quyền thật, decode/scan server, backend route/binding/migration/deploy hay WORLD_PLAY/48 seed. Giữ auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/pool/AI/Canon; tiếp: cửa hàng/kiểm kịch bản, rồi kế hoạch adapter backend.

## VẠN GIỚI Giai đoạn 1H — 26/10/2026

Nền `08537c8` (G1G.1, CI/Pages SUCCESS). Đọc `contracts/vangioi/CREATOR_FORMS_G1H.md`. Creator vẫn ở **Vạn Giới → Tạo / nhập thế giới**, tách khỏi Chủ Thần riêng của chủ dự án. Thêm form vai nhập ba mode, cast/NPC/tri thức/hội thoại phân nhánh, vật phẩm/cách nhận, view/hotspot, objectives theo đúng loại đích, rewards đề nghị, events/endings. Rank và AI/reward đều chỉ khai báo nháp, không cấp quyền hoặc gọi AI.

Liên kết scene-view/pickup giữ ID; xóa mục còn được tham chiếu bị chặn, không xóa dây chuyền. Nháp cũ được chuẩn bị collection trống trong bộ nhớ, giữ field/prose đã có và chỉ ghi khi người dùng lưu. Numeric schema vẫn chặn dữ liệu sai; lỗi chỉ ra vấn đề nhập vai/AI/nhiệm vụ/nhặt đồ. Luồng browser soạn bằng form đã PASS cấu trúc mà không chèn JSON model hoàn chỉnh, kiểm ba mode/tám verb/đối thoại/pickup/đóng mở và account isolation. 481 test ứng dụng + 339 test Worker/helper PASS cục bộ; CI/Pages cần xác minh theo SHA GitHub đợt này.

Chưa visual/sprite/crop/shop form đầy đủ, art/source picker thật, upload hoặc cloud sync/review/backend route/binding/migration/deploy. Không bật WORLD_PLAY/48 seed, AI provider hoặc thưởng thật; giữ auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/pool/Canon. Tiếp: visual/nguồn và kiểm tra kịch bản sâu; deployment backend thật cần kế hoạch/duyệt riêng.

## VẠN GIỚI G1G.1 — Sửa vị trí Creator theo chủ dự án · 26/10/2026

**Chỉ dẫn mới nhất:** Chủ Thần là khu riêng của chủ dự án, dành cho AI điều phối; tạo/nhập thế giới phải vào **Vạn Giới**. Bản G1G đặt Creator vào Chủ Thần là sai vị trí, không kế thừa cách gộp đó.

Nền `8db9d90` (G1G, CI/Pages SUCCESS). Đã bỏ launcher Creator khỏi renderCore, thêm **Vạn Giới → Tạo / nhập thế giới**, dialog riêng có quay lại/Escape. Creator không dùng DuduSystemAppsV69; gate tác giả hiện có và hook đổi UID tách khỏi Core. Không sửa AI, entitlement hoặc backend owner allowlist; không bật AI tự thực thi. Role AU legacy vẫn hạn chế theo gate hiện hành, không tự cấp role mới.

Giữ nguyên DB/format/key nháp G1G, không migration. Browser test mở được nháp cũ, hoạt động khi không có API Core, đóng/mở và đổi hai UID an toàn, layout 320–1280px; 481 test ứng dụng + 339 test Worker/helper PASS. Giữ main System/auth browser regression; CI/Pages kiểm theo commit bản sửa. Đọc phần sửa G1G.1 trong `contracts/vangioi/CREATOR_UI_G1G.md`; giới hạn local-only/backend chưa kết nối vẫn giữ.

## VẠN GIỚI Giai đoạn 1G — 26/10/2026

Nền `5e01681` (1F, CI/Pages SUCCESS). Đọc `contracts/vangioi/CREATOR_UI_G1G.md`. Creator mở từ Chủ Thần AU theo gate AU hiện có; soạn thông tin/Story Bible, địa điểm/cảnh, tham chiếu nguồn/ảnh, nhiệm vụ chính, JSON nâng cao và preview chữ. Lưu IndexedDB riêng theo UID, mở lại/nhập/xuất JSON; đổi UID/logout xóa model và DOM cũ, không xóa nháp đã lưu. Không ghi Firestore/Worker hoặc tự tạo owner/worldId server.

Browser dùng bundle validator G1D biên dịch sẵn, tái tạo được (esbuild 0.28.2); required-field report có path trường thiếu. Rank chỉ đề nghị, art chỉ tham chiếu; Gửi duyệt khóa và ghi chưa kết nối. 481 test ứng dụng + 339 test Worker/helper PASS cục bộ; Creator browser acceptance có Firebase giả/IDB thật, save/reopen, JSON, account isolation, quota failure và layout 320–1280px. CI thêm Creator browser vào main acceptance; kiểm CI/Pages theo SHA GitHub đợt này.

Chưa form cấu trúc đầy đủ cho NPC/items/entry/objectives/endings (còn JSON), chưa art preview thật, source picker/upload, cloud sync hoặc backend route/binding/migration/deploy. Không mở WORLD_PLAY/48 seed hay đổi auth/Thiên Mệnh/EPUB/NPC/save/kho/EXP/pool/AI/Canon. Tiếp: hoàn thiện các form nội dung và luồng tham chiếu; live adapter/deployment cần kế hoạch riêng.

## VẠN GIỚI Giai đoạn 1F — 26/10/2026

Nền `4c63061` (1E, CI/Pages SUCCESS). Đọc `contracts/vangioi/REGISTRY_INTAKE_G1F.md`. Service registry độc lập nhập story-source-1/PNG thật và tính hash từ bytes, version/payload bất biến; operator assignment backend riêng, không tin admin/JSON. Owner đúng recipient mới gắn nguồn/asset vào world theo version/hash; grant mới ảnh pending, không phải duyệt art hoặc publish. Có đọc source/ảnh riêng tư cho owner, kiểm hash và kiểm lại quyền sau await.

Thu hồi grant theo world hoặc version trong cùng storage chặn cấp lại/gửi duyệt; metadata license/recipient không đổi dưới cùng version. Transaction/receipt/audit bao trọn các bước ghi; default submit G1D đã test full flow từ intake không dùng registry seed. 39 test mới, tổng 334 test Worker PASS cục bộ và browser-target bundle thành công; CI/Pages cần xác minh theo SHA GitHub đợt này.

Giới hạn: chỉ intake PNG <=1 MiB có kiểm container/CRC, chưa decode pixel/scan/kiểm art; source <=1 MiB, chưa exporter Firestore hoặc nhập EPUB thật. Chưa issuer quyền, upload/public route/CDN, Creator UI hoặc binding/migration/deploy Worker live. Không phát WORLD_PLAY/48 seed hay đổi auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/AI/Canon. Tiếp: Creator draft theo contract thật với trạng thái backend rõ ràng; adapter Firestore/object storage và live backend cần kế hoạch riêng.

## VẠN GIỚI Giai đoạn 1E — 26/10/2026

Nền `29b3f9b` (1D, CI/Pages SUCCESS). Đọc `contracts/vangioi/PROVISIONING_G1E.md`. Module độc lập thêm createWorld với entitlement backend + UID đã xác thực, world ID do server sinh, revision-1 private draft; owner đặt/thu hồi collaborator theo section. Không cho claim admin/canEditStories hoặc JSON cấp quyền AU/reviewer/publisher/owner.

Cùng SQL/transactionSync: kiểm entitlement/owner/accessRevision ngay lúc commit, chống ghi lặp UUID/canonical hash, audit/receipt và access event append-only ghi cùng world/draft/membership. Thu hồi không xóa contributor history; retry chỉ xác nhận thao tác lịch sử, không đặt lại quyền hiện tại. 23 test mới; tổng 295 test Worker PASS cục bộ. Kiểm CI/Pages theo SHA GitHub của commit đợt này.

Chưa có issuer entitlement, invitation/consent, adapter nguồn/asset thật, Creator UI hoặc live route/binding. Không chạy migration/deploy Worker hoặc ghi tài khoản thật. Giữ auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/pool/AI/Canon. Tiếp: trusted source/asset provisioning rồi Creator; yêu cầu hình nền thật và quyền sử dụng vẫn là cổng phát hành, không bật WORLD_PLAY/48 seed từ metadata.

## VẠN GIỚI Giai đoạn 1D — 26/10/2026

Nền `8783792` (1C, CI/Pages SUCCESS). Đọc `contracts/vangioi/CONTENT_VALIDATION_G1D.md`. Có hai schema world-content-1 cho draft dở và bản gửi duyệt, code validator Ajv 8.20.0 biên dịch ở build time; runtime không compile schema hoặc eval truyện. Adapter SQL mặc định dùng validator thật thay vì bắt buộc tiêm stub. Content giữ requestedWorldRank và entrySceneId; metadata/quyền/official rank ở server.

storySource pin loại nguồn + storyId/version/hash; assets pin ID/version/hash/kind. Các bảng registry version bất biến và grant theo world tách khỏi JSON tác giả. Submit kiểm quyền registry rồi transaction đọc lại dependencies, chặn thu hồi quyền/đổi metadata ngay trước commit. Asset pending có thể đi cùng hồ sơ review, không có quyền publish; source/asset metadata không chứng minh bản quyền ngoài đời.

33 test G1D bao gồm schema/semantic/ID/nhập vai, proposal V0.1, source/asset sai phiên bản và submit qua SQLite với validator mặc định thật. V0.1 gốc không đổi; chưa tự migrate world/mission/save, chưa tạo ảnh, API upload hoặc source reader Firestore. Module chưa nối Worker live/binding/route, không chạy migration hoặc đổi auth/Thiên Mệnh/NPC/EPUB/kho/EXP/pool/AI/Canon. Tiếp: provisioning/adapter nguồn và asset, sau đó Creator UI. CI/Pages cần đọc theo commit GitHub, không dùng PASS xét duyệt làm WORLD_PLAY.

## VẠN GIỚI Giai đoạn 1C — 26/10/2026

Nền `6a99b52` (1B, CI/Pages SUCCESS). Đọc `contracts/vangioi/SQL_PERSISTENCE_G1C.md`. Adapter `cloudflare/src/vangioi-authoring-sql.mjs` dùng SQL + transactionSync, tái sử dụng policy/prepare G1B. Save/submit kiểm quyền và revision lại trong transaction; nội dung/header/contributor/snapshot/receipt/audit commit cùng lúc. UUID request theo world + UID chống ghi lặp, retry sau response mất vẫn nhận receipt; history và snapshot không UPDATE/DELETE.

26 test SQL cục bộ gồm ghi đồng thời, rollback giữa transaction, thu hồi quyền ngay trước commit, request ID sai/chéo UID và đóng/mở file database. Chưa có class/binding DO, chưa import vào Worker live hoặc thêm HTTP route/migration. Không có API tạo world/mời AU thật; world/membership test chỉ do fixture provision. Validator submit vẫn phải được backend cung cấp; chưa đủ căn cứ bật gameplay hoặc dùng report offline làm nghiệm thu.

Tiếp: contract/validator submit, nguồn truyện có version và asset registry/provisioning; sau đó mới nối Creator. Giữ nguyên auth/Thiên Mệnh/NPC/EPUB/save/kho/EXP/Canon/pool/AI và không chạy migration backend thật. Kiểm CI/Pages theo commit GitHub của đợt này; SQL tests không chứng minh DO live.

## VẠN GIỚI Giai đoạn 1B — 26/10/2026

Điểm tiếp nối nền: `4ad5d73` (đợt 1A đã được cho phép cập nhật main; CI và Pages SUCCESS). Xem `contracts/vangioi/AUTHORING_BACKEND_G1B.md` trước khi nối World Creator.

Đợt 1B thêm `cloudflare/src/vangioi-authoring.mjs` và 37 test: xác thực Firebase + membership theo world, collaborator chỉ đọc/sửa mục được giao, chặn tự duyệt và quyền tự khai từ JSON; kế hoạch sửa nháp đúng revision, snapshot gửi duyệt được clone/freeze/hash và kiểm quyền lại sau await. Mọi kế hoạch ghi có `requiresAtomicCommit:true`: chưa có writer, chưa lưu/khóa bản nháp thật. Validator submit phải là backend callback bắt buộc, không dùng PASS offline làm quyền gửi/publish.

Module chưa import vào Worker live, chưa thêm route/DB/migration, không đổi auth/Thiên Mệnh/EPUB/NPC/kho/EXP/save/pool99-100/Canon/cờ AI. Tiếp theo là adapter lưu trữ và transaction/idempotency G1C; không mở 48 seed hoặc worldAccess chỉ vì policy tests PASS. CI và deploy cần kiểm theo commit GitHub tương ứng; source PASS khác live backend PASS.

## VẠN GIỚI Giai đoạn 1A — 26/10/2026

Đã đọc master prompt và gói World Authoring V0.1 do chủ dự án cung cấp, đối chiếu code nền tại `1f2fdb14074d99cd1a1542f334175c946c412f49`. Quy tắc làm việc main/không nhánh hoặc ZIP riêng vẫn giữ. Master prompt mới yêu cầu không phát hành production chưa phép; đợt này chuẩn bị và kiểm thử tại checkout main, chưa push hoặc deploy trong phiên triển khai.

Xem `contracts/vangioi/README.md`: lưu nguyên 10 file nguồn cùng hash; thêm `tools/vangioi/intake.py` chỉ đọc JSON và in báo cáo offline, schema bắt buộc, semantic checks, báo xung đột `period/era`, bậc tự khai và luồng trial. Không đổi Canon hoặc schema/runtime cũ. Normalized metadata chỉ là đề xuất, bậc chính thức=null, quyền vào world/publish/thưởng đều false. JSON status/assetStatus/ownershipDeclaration không xác thực backend.

QA: 22 test nguồn + 16 test intake PASS. Workflow smoke bổ sung chạy hai nhóm Python; chưa xác nhận CI remote. Chưa tạo Creator UI, database/migration, quyền AU, asset upload hoặc World Engine production. Giữ nguyên auth, Thiên Mệnh, EPUB, NPC, save, kho/EXP, pool99/100 và các cờ AI. Tiếp theo: contract backend draft/version/membership sau khi đối chiếu các quyết định còn mở; không dùng PASS offline để mở 48 seed hoặc khảo hạch.

> **Trang duy nhất nên đọc ĐẦU TIÊN trong cuộc trò chuyện ChatGPT mới.**
> Dành cho việc tiếp tục dự án sau khi lưu trữ/xóa các chat dài. Đây là **bản chỉ mục + mốc trạng thái**, không phải bản sao mọi cuộc trò chuyện; mã nguồn `main` và các hồ sơ chuyên đề dưới đây mới là căn cứ kiểm tra.
> Repository **PUBLIC**: tuyệt đối không đưa khóa API, token, UID người dùng, nội dung chat riêng tư hay dữ liệu tài khoản thực vào tài liệu/commit.

## 0. Nơi lấy trạng thái đúng

- GitHub: `hnhuynh1003-blip/truyendienvlnha`; nhánh chính `main`; web tĩnh `https://hnhuynh1003-blip.github.io/truyendienvlnha/`.
- Mốc kiểm kê tại thời điểm tạo bản này: `241552d46c3decdfa8d9130d2ec14ac3975c6952` (Quan Đạo V8, sửa ending đoán sai không lộ đáp án). **Không dùng SHA này thay cho việc fetch HEAD hiện tại.**
- Có 95 hồ sơ trong `docs/`, 113 tệp trong `js/`, 113 tệp trong `tests/` (số liệu ở thời điểm kiểm kê). Phần lớn quyết định đã có trong repo; GitHub **không giữ toàn văn lịch sử ChatGPT, tài liệu chưa commit, kết quả thiết bị thực hay dữ liệu backend cá nhân**.
- Bắt đầu đọc `docs/DUDU-CORE-CONTINUATION-PROMPT-V1.md` (14 mốc, mục 14 là mới nhất), `docs/DUDU-MASTER-DELIVERY-2026-10-19.md` (các đợt triển khai) rồi tài liệu chuyên đề theo việc định làm. **Không coi những mục mốc cũ là trạng thái code hiện tại.**

## 1. Sản phẩm và những quyết định không đổi

DUDU Studio là nền tảng **đọc truyện/EPUB + tương tác NPC qua Messenger + thế giới truyện tương tác**, không phải chỉ một game nhiệm vụ. Độc giả vẫn phải đọc truyện bình thường; gameplay xuyên giới là **tùy chọn**, không cản đọc. Hai luồng kiểm thử quan trọng là **AU (tác giả)** và **Reader (độc giả)**, desktop và điện thoại; không trộn dữ liệu UID/nhân vật/truyện, kể cả thử chế độ khách.

- Giao diện: phong cách **hệ thống Vạn Giới** có dấu ấn riêng, ít chữ trên thẻ, hành động không trùng lặp; chat NPC tối giản như Messenger, trả lời ngắn, đúng giọng, không kể hành động dài.
- Quy tắc thế giới: 6 thể loại **Cổ đại / Hiện đại / Niên đại / Tương lai / Tu tiên / Mạt thế**. Bậc **hệ thống** `F→E→D→C→B→A→S`, phân biệt với cấp **nhiệm vụ**, cấp người chơi và cấp truyện. 48 seed (30 F + 18 E) V66 đang **chưa phát hành**.
- DUDU CORE (Chủ thần) khác DUDU trò chuyện trong điện thoại và khác AI NPC. Hệ thống có chính quy/phi chính quy, khế ước ký chủ, cân bằng tri thức/hậu quả. Không để chatbot tự cấp vật phẩm/EXP/Xu, công bố nhiệm vụ, kết luận World Truth hay tự ký khế ước.
- Khảo hạch 3 nhiệm vụ F khác ID chỉ có giá trị **khi server xác minh**, chưa thể lấy kết quả pilot làm thật. Đừng đồng nhất localStorage với dữ liệu công nhận server.
- Người dùng chủ trương **triển khai từng đợt lớn có tính nhất quán, thường trực tiếp lên `main` cho web** và kiểm thử theo đợt; không chia thành hàng chục cuộc xác nhận nhỏ. Nhưng **không được** tự bật thanh toán, Worker AI trả phí, khóa API, backend production, sửa Firestore Rules, xóa dữ liệu, phát hành nhiệm vụ thật hoặc ghi thưởng thật khi chưa được duyệt rõ. Luôn ghi SHA, kiểm thử đã chạy, giới hạn QA và hướng rollback.
- Không dùng chat riêng của người chơi để huấn luyện khi chưa có opt-in hợp lệ.

## 2. Tình trạng theo phân hệ — Đọc mốc mới, không phỏng đoán

| Phân hệ | Source / tài liệu chính | Giới hạn cần nhớ |
|---|---|---|
| Trang chủ, cổng hệ thống, thư viện | `js/site-shell-v60.js`; `docs/DUDU-V60-HOMEPAGE-DEDUP.md`, `docs/DUDU-V60-SYSTEM-PORTAL.md` | Đã có hướng giảm lặp thẻ; không gọi nội dung ngoài giao diện đã kiểm là hoàn thành |
| Đọc sách / EPUB | `js/epub-production-v49.js`, `js/epub-text-v57.js`; `docs/DUDU-V57-EPUB-IMPORT.md` | V57 có import/resume, quyền phát hành; lưu chương đã đọc/incognito/mobile cần QA thực, không sửa Rules tùy tiện |
| NPC chat / Gemini-GLM / free Multi-AI | `js/ai-proxy.js`, `js/npc-auto-model-v56-11.js`; `docs/DUDU-V57-1-V58-FREE-MULTI-AI.md` | Tài liệu V58 trải nhiều mốc draft/merge; phải đối chiếu `main` + Worker thực. HTTP 400, fallback, DNS adblock điện thoại, mô hình miễn phí và AU/Reader không được tuyên bố đã ổn định nếu chưa test |
| Cyber Phone và DUDU chat | `js/dudu-messenger-v67-2.js`, `js/dudu-system-steward-v67-3.js`; `docs/DUDU-V67-APP-BASELINE-AUDIT.md`, `docs/DUDU-V67-3-STEWARD.md` | DUDU Steward hiện **scripted, read-only**, không phải AI độc lập và không có quyền thao tác nền |
| Vạn Giới / 6 loại / 48 seed / A-B-C | `js/world-taxonomy-v66.js`, `js/world-blueprint-v66.js`, `docs/DUDU-V66-SYSTEM-PACT-GENRES-MISSIONS.md` | Seed và atlas có thể hiển thị nhưng không phải world gameplay hay pact/reward đã mở server |
| CORE luật F và engine | `js/dudu-core-rules-v1.js`, `js/dudu-story-engine-v1.js`, `js/dudu-story-engine-v2b.js`; `docs/DUDU-CORE-CANON-FOUNDATION-V1.md` | Foundation + pilot deterministic, quyền verified backend tương lai |
| Truyện F01 Quan Đạo **mới nhất** | `js/dudu-pilot-f-v2b.js`, `js/dudu-pilot-world-v2b.js`; `docs/DUDU-F-WHODUNIT-V8.md` | **V8 / scenarioVersion 9**, 27 scene, 9 ending, pilot only, không thưởng, chưa QA thực trên thiết bị |

## 3. Quyết định sáng tác F mới nhất — V8 thay V7

Người dùng loại bỏ hướng F01 V7 vì vụ án được giải ở giữa rồi kéo dài thành nhiệm vụ kiểm kê/vận chuyển thuốc không hấp dẫn và không thưởng. **Quy chuẩn đang hiệu lực V8**:

1. DUDU đưa **mục tiêu ngắn đầu truyện** khi thể loại phù hợp.
2. Ba nghi phạm đều có cơ hội/dấu nghi cụ thể; các vật chứng sai hướng lành mạnh phải có cách giải thích ở hồi kết.
3. Cho người chơi tự đi, hỏi, kiểm tra; **tìm vật bị mất trước khi kết luận thủ phạm**.
4. Chỉ cần **bằng chứng then chốt hợp lý**, không gom đủ N loại theo checklist. Có hai đường đối chiếu khác nhau.
5. **Cao trào:** đối chất → chọn nghi phạm → lý giải đúng nguyên nhân. Giải xong **kết thúc gần như ngay** và hiển thị “ĐÃ GIẢI ÁN (BẢN THỬ)”, không thêm minigame sau đó.
6. F02/F03 cần **gameplay khác**: hiện đại có thể là quan hệ/xung đột đời sống, tu tiên có thể là cơ duyên/giao dịch/đánh đổi; không bắt tất cả truyện F đều phá án.

Link bản V8: `https://hnhuynh1003-blip.github.io/truyendienvlnha/dudu-pilot.html?v=play-v8`.
Pilot lưu riêng `dudu:pilot-f-casefile-v8:`; không tự nhập save V7. Test logic V8: 4 bộ hồi quy **PASS bằng V8 mock lấy source GitHub**, **chưa xác thực trình duyệt Pages/Android/iOS**.

## 4. Hạng mục còn tồn tại / không được giả định đã xong

- Test trực tiếp **Pages sau deploy**, giao diện 320/375/390/430px, desktop, đóng/mở, refresh, login/guest, quay lại scene, không lộ lời giải. Những test mock JS không thay thế browser smoke.
- NPC AI: xác minh HTTP 400 và model fallback bằng log đã lọc, AU và Reader riêng, laptop và phone có DNS ad-block; không kích hoạt nhà cung cấp có thể phát sinh phí.
- EPUB/bookmark: xác minh tiến độ chương và quyền Reader trên thiết bị thực; không khẳng định đã sửa chỉ nhờ source.
- 3 nhiệm vụ F khảo hạch thực, E thực, DUDU CORE generative AI/AI Director, khế ước có xác minh server, phần thưởng authoritative, training opt-in: **chưa phát hành**, cần xét quyền và thiết kế.
- Dữ liệu Firebase/Cloudflare deploy, cấu hình bí mật, billing, quyền access thật và feedback UX ở chat riêng **không thể tái hiện từ repo**. Tài liệu `.rules.review` trong `security/` là bản xem xét, không chứng minh Rules console đang chạy.

## 5. Cách làm việc ở cuộc chat mới

1. Dùng **GitHub connector** fetch HEAD của `main` và tài liệu này; kiểm tra source thật trước khi tuyên bố tiến độ. Không chỉ đọc tên file hoặc một tóm tắt cũ.
2. Chọn **một đợt lớn có giới hạn rõ** (ví dụ QA F01 V8 → phát triển F02/F03), xác định dữ liệu được phép chỉnh và các phần giữ nguyên.
3. Commit có mô tả, chạy tests liên quan, ghi SHA, phân biệt `source PASS` / `browser PASS` / `deployed` / `pending`.
4. Bổ sung tài liệu chuyên đề + dòng tiếp nối trong file này sau mỗi mốc đáng kể. Không lưu chat nguyên văn hoặc ảnh cá nhân trong repository công khai.

**Gợi ý prompt cho cuộc chat mới:**

“Tiếp tục DUDU Studio từ GitHub `hnhuynh1003-blip/truyendienvlnha`, nhánh `main`. Hãy đọc `docs/DUDU-STUDIO-START-HERE-2026-10-20.md`, kiểm tra HEAD + source hiện tại, sau đó đọc tài liệu chuyên đề mới nhất. Quan Đạo V8 vẫn pilot; giữ EPUB, NPC, auth, dữ liệu và billing. Tóm tắt trạng thái thực và đề xuất đợt tiếp theo, không giả định test mock là đã triển khai sản xuất.”


## V69 — Quyết định thay thế V68: ứng dụng Hệ Thống riêng + Chủ Thần AU (20/10/2026)

**Chỉ dẫn mới nhất của chủ dự án đã thay thế cách gộp bốn vai vào Liên Lạc.** Không dùng kênh DUDU Chủ Thần / hệ thống con bên trong chat bạn bè; mã `js/dudu-agent-v68.js` và test của phương án đó đã bị xóa, Messenger và CSS V67.2 được hoàn nguyên có chọn lọc. **Không tạo nhánh phụ hay ZIP riêng; mọi mã hiện hành tập trung trên GitHub `main`.**

Ba bề mặt độc lập:
- **Liên Lạc DUDU** = người bạn hướng dẫn đọc truyện, trò chuyện thường ngày; chat NPC qua AI router riêng. Giữ nguyên dữ liệu cũ. Không cấp luật/phần thưởng.
- **Ứng dụng Hệ Thống Xuyên Truyện** = dành cho người chơi, có popup tám chỉ số, các hàng thống kê ký chủ, hệ thống con, lịch sử xuyên, thưởng và vật phẩm; hiển thị **không xác minh** khi thiếu dữ liệu có chữ ký từ server. Chưa có thẻ → không ký khế ước, không xuyên giới hoặc tăng cấp.
- **Ứng dụng Chủ Thần AU** = chỉ có launcher/quyền mở khi đạt `canEditStories`, riêng production kiểm `DuduAuth.isAdmin()`. Có công cụ quy tắc nháp, đánh giá điều kiện chỉ số và chuẩn audit. Không trích xuất dữ liệu tài khoản khác và không áp đặt xử phạt thật.

**Luồng chuẩn mới:** `Nhiệm vụ mở đầu → xác minh server → Thẻ thông hành → ký khế ước với hệ thống con → hệ thống thức tỉnh → nhiệm vụ xuyên truyện và nâng cấp`. Ba F khảo hạch (phải là ba mission khác nhau được server nghiệm thu) nằm trong tiến trình game, **không tự trở thành nhiệm vụ phát thẻ trước khế ước**.

Mã: `js/dudu-transmigration-v69.js`, `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`, hai app mount mới trong `index.html` và kiểm thử V69. `js/phone-app-contract-v67.js` giờ liệt kê **14 ứng dụng** (12 cũ + 2 mới). `cloudflare/src/dudu-hive-v68.mjs` là adapter **tắt mặc định, chỉ AU được Firebase xác thực và UID thử** để thử Chủ Thần/hệ thống con sau này; không được tái gắn vào chat DUDU bình thường. Chưa gọi API Hive, chưa có công cụ backend phát thẻ, ghi rank, phạt, thu thập hoặc mở NPC/World Truth.

**Nguồn tiếp nối mới cần đọc trước nhất:** `docs/DUDU-V69-SYSTEM-PASSPORT-AU-CORE.md`. Thứ tự tiếp: sửa/kiểm thử toàn bộ CI → thiết kế dịch vụ Nhiệm vụ mở đầu và Thẻ thông hành có chữ ký server → khế ước có xác nhận → dữ liệu stats/rewards/progression và hệ thống con thật → AI Chủ Thần/hệ thống con có giới hạn thẩm quyền. Giữ nguyên canon luật, 48 seed chưa phát hành, EPUB, Firebase, NPC, ví/kho và xác thực hiện hữu.

## V70 — Hệ Thống tối giản, khóa trước hồ sơ, thẻ thử Sandbox và Chủ Thần bằng prompt (20/10/2026)

**Ưu tiên cao hơn thiết kế V69:** trang `Hệ Thống Xuyên Truyện` đối với người chưa được máy chủ cấp thẻ **chỉ có ô nhập mã Thẻ thông hành**, không render profile hay popup. Sandbox có mã trình diễn `DUDU-THU-2026` (chỉ dùng `?sandbox=1` cùng tài khoản Sandbox). Đây chỉ là quyền **xem mẫu giao diện**, không cho ký khế ước/xuyên thế giới/cấp thưởng/cấp EXP, không có server pass receipt thật. Đăng nhập Firebase bình thường không được dùng mã này để mở khóa.

Khi nhập đúng mã thử, app hiện gọn: tên ký chủ, ID ký chủ `KC-XXXXXXXX`, hệ thống con có ID công khai riêng `SYS-F-XXXXXXXX`, thiên hướng giả định, tiến trình demo, hai hành động nhỏ Chỉ số/Nhật ký. Popup chỉ số có 8 thuộc tính demo; không hiển thị phần lớn bảng dài V69. **Chính quy/phi chính quy không thể phân biệt bằng mã công khai**; backend cần kiểm chứng nguồn gốc bằng dữ liệu/issuer chứng thực không gửi cho browser.

Chủ Thần AU chuyển thành **một prompt → DeepSeek Core → phản hồi/kế hoạch** thay cho các biểu mẫu thủ công. Chỉ AU Firebase được máy chủ công nhận mới được gửi; ở `?sandbox=1` luôn từ chối gọi AI. Trong Worker, model Core chỉ được phản hồi văn bản và chịu hai cờ tắt Hive + giới hạn 20 lượt; chưa có công cụ trích xuất riêng tư/xử phạt tự động. Hướng đúng tương lai là AU xác lập chỉ thị, AI điều phối sự kiện, **bộ thực thi backend** tự đánh giá chứng cứ và áp dụng chính sách nằm trong phạm vi cho phép, có audit/khôi phục/kháng nghị. Không cho prompt AI tự nâng quyền.

Đã sửa trực tiếp `main`: `js/dudu-system-gate-v70.js`, `js/dudu-core-ai-v70.js`, cập nhật `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`, `index.html`, adapter `cloudflare/src/dudu-hive-v68.mjs` và kiểm thử. **Đọc chi tiết ở cuối `docs/DUDU-V69-SYSTEM-PASSPORT-AU-CORE.md`**. Không tạo ứng dụng lab phụ hoặc dữ liệu người chơi giả ngoài Sandbox.

## V71 — System thật trên main, không Sandbox, không lộ hệ thống lậu (21/10/2026)

**Thay thế màn V70 demo và các chỉ dẫn nhập mã `DUDU-THU-2026`.** Mã Sandbox đã bị loại khỏi giao diện đang chạy. Không thêm website riêng hoặc nhánh phụ. Trước thẻ thật: một màn nhập mã duy nhất. Sau thẻ: đăng ký tên ký chủ một lần, xem ID ký chủ do máy chủ cấp (bất biến), sau đó hệ thống ngẫu nhiên được phân phối từ kho 99.

**Registry thật:** `cloudflare/src/dudu-system-registry-v71.mjs` có Durable Object SQLite, 99 hệ thống DUDU-01..99, internal_id riêng, nguồn `regular/irregular`, thiên hướng và ký ức riêng đều **không nằm trong payload công khai**. Random assignment là giao dịch nguyên tử trên server sau khi đổi thẻ một lần cho đúng UID Firebase. Hệ thống phi chính quy có thể **công bố mã DUDU giống một mã chính quy khác**; máy chủ giữ `public_id` thật, `display_id` tự xưng và `internal_id` riêng. Trình duyệt không nhận bằng chứng để tự suy ra lai lịch. Chỉ trả system public ID, tên hiển thị, rank/level/EXP, không có origin, độ tin cậy hay private personality. Tám chỉ số ban đầu được tạo **ở máy chủ** và bảng popup đọc từ `GET /v1/system/me`, không suy từ mã ID hoặc lời AI.

**Luồng có hiệu lực server:** `POST /v1/system/owner/issue-test-pass` chỉ chấp nhận Firebase `admin:true` + `DUDU_SYSTEM_PILOT_UID` khớp + `DUDU_SYSTEM_PILOT_CARD_ENABLED=true` + xác nhận chính xác. Một thẻ ngẫu nhiên 128-bit, lưu hash SHA-256, 7 ngày, gắn một UID và chỉ đổi một lần. `POST /v1/system/redeem` phân hệ thống độc quyền; `POST /v1/system/register-name` đăng ký tên ký chủ 2-28 ký tự đúng **một lần**, không đổi ID; `POST /v1/system/consent-pact` đòi người chơi tích chọn chấp nhận `v71-pilot-1`. **Chưa có nhiệm vụ mở đầu thật phát thẻ tự động**, việc cấp thẻ hiện là thử nghiệm chỉ AU, không được phát công khai cho người chơi. Chưa có World Engine production, loot hoặc thưởng thật; hiện `worldAccess:false` ngay cả sau ký khế ước V71 pilot.

**Thất bại, thu hồi và reset:** registry có thủ tục internal `reclaimByRule` để trả hệ thống về kho, reset cấp/EXP/ký ức riêng và hủy host ID/hồ sơ xuyên truyện, **không ảnh hưởng tài khoản, truyện, NPC, bookmark, ví**. Thủ tục **không có public route hoặc auto-trigger**; chưa chọn ngưỡng thất bại, thời hạn kháng nghị và bằng chứng; tuyệt đối không kích hoạt xóa thật trước khi chốt chính sách và xây bộ phát sự kiện đã xác minh.

**Đổi tên nhân vật:** trong `Hồ Sơ Danh Tính` có nút `Đổi tên nhân vật` dùng `userProfile.name` cùng cách lưu profile cũ, hoàn toàn tách khỏi ký chủ hệ thống (đăng ký riêng một lần). Không đổi Firebase UID hoặc mã hệ thống.

**Giao diện:** `js/dudu-system-app-v69.js` đã thay bằng luồng live, `css/dudu-system-app-v69.css` thiết kế lại tối giản, `js/dudu-system-client-v71.js` lấy JWT và gọi Worker chung; thông tin private không có trong DOM hoặc prompt. Không nên dùng `js/dudu-system-gate-v70.js` (đã xóa).

**Triển khai thực tế:** GitHub Pages chỉ triển khai frontend. Cloudflare Worker cần deploy mã V71 + Durable Object migration `v6-dudu-system-registry-sqlite` và secret `DUDU_SYSTEM_PILOT_UID` theo đúng tài khoản AU, không commit secret hoặc UID thật. Hai wrangler files đã cấu hình binding; **thay đổi git không chứng minh Worker đang chạy đã được deploy**. AI Hive vẫn OFF và không cần key để chạy registry. Tuyến Core AU vẫn chỉ tạo đề xuất bằng DeepSeek nếu owner bật AI; không có quyền cưỡng chế/thi hành hình phạt.

Tiếp nối: kiểm tra CI UI + DO SQLite thật; triển khai Worker bằng quy trình được duyệt; chứng minh thẻ AU thật → bind đúng UID, cấp ngẫu nhiên, tên bất biến, provenance kín; rồi thiết kế nhiệm vụ cấp thẻ chính thức; sau đó bổ sung fail/reclaim event receipts server và AI personality riêng theo từng systemId.


## V71.1 — Sửa phân biệt trạng thái registry và cổng thẻ (21/10/2026)

- `js/dudu-system-app-v69.js`: chỉ hiện form nhập mã khi `GET /v1/system/me` trả về `stage:locked` từ registry đã xác thực. Nếu thiếu phiên Firebase, hiển thị yêu cầu đăng nhập. Nếu Worker/registry lỗi, hiển thị trạng thái không khả dụng và nút **Thử kết nối lại**; không đánh đồng lỗi dịch vụ với việc chưa cấp Thẻ thông hành.
- `tests/dudu-transmigration-v69.test.cjs`: bổ sung kiểm tra màn offline/khách không có form đổi thẻ, trong khi màn `locked` do server xác nhận vẫn có. Không thay đổi UID, thẻ thật, phân phối hệ thống, khế ước hay luật Chủ Thần.
- Trạng thái CI quan sát trước thay đổi: `smoke` trên `main` PASS, browser job FAIL do `tests/browser-auth-private.cjs` đợi trạng thái đăng nhập Firebase mock quá thời hạn; lỗi này cần được điều tra riêng, không được báo là browser QA PASS.
- **Không** gọi migration/deploy Worker bởi commit frontend này; V71 thực tế vẫn cần chạy workflow `dudu-v71-system-safe-deploy.yml` thủ công sau khi phê duyệt, secrets và các ràng buộc triển khai được xác minh. Chưa coi khả năng cấp thẻ AU là đã nghiệm thu production.

V71.1 CI note: `tests/browser-smoke.cjs` now expects a *guest/authentication gate without a redemption form*, rather than the obsolete V71 `dudu-v71-lock` demo-like screen. The corrected assertion continues to verify no System stats, no AU entry, no user-data writes.


## V71.2 — Quy trình phát triển trực tiếp trên main (21/10/2026)

**Quyết định mới của chủ dự án:** không phát triển V71 ở chế độ Sandbox rồi merge lại. Source, integration, tài liệu và nghiệm thu chính đều ở nhánh `main`. Không tạo nhánh hoặc website thử nghiệm riêng cho hệ thống xuyên truyện. Giao diện thực là GitHub Pages ở `/` (không tham số `?sandbox=1`). Mỗi đợt sửa `main` phải chạy kiểm thử main-mode và theo dõi cả Pages deployment.

- Thêm `tests/browser-main-system-v71.cjs`: Chromium chạy trang thực *production-mode* từ checkout `main`, lần lượt kiểm: khách bị chặn, reader Firebase không có quyền AU, thẻ sai thất bại, thẻ hợp lệ → ký chủ, đăng ký tên, consent khế ước, đủ tám chỉ số, logout xóa dữ liệu hệ thống cũ. Tất cả Firebase/Worker HTTP đều được chặn và cung cấp đáp ứng giả lập **ngay trong test browser**, tuyệt đối không tạo UID, thẻ, pact hay dữ liệu live. Đây là **integration browser trên main**, không phải chứng minh registry Cloudflare live.
- CI đổi thứ tự: **main V71 + main Firebase auth bắt buộc chạy đầu**, bộ sandbox legacy vẫn giữ để chống regress cho các chức năng lịch sử, nhưng không còn là con đường phát triển/nghiệm thu V71.
- Sửa `js/dudu-system-app-v69.js`: mỗi lần UID đổi hoặc logout, xóa ngay hồ sơ ký chủ/Popup đã render của UID trước; chỉ lấy lại dữ liệu khi client server xác thực phiên mới. Không chia sẻ thông tin người chơi giữa tài khoản.
- **Giới hạn quan trọng:** `main` (GitHub source/Pages) khác với việc tự ghi thử lên Cloudflare/Firebase production. Worker V71 migration, thẻ owner, dữ liệu người dùng, Rewards/EXP/XP và AI trả phí vẫn chỉ bật bằng thao tác có chủ ý sau khi xác minh quyền/secret và bước triển khai thủ công. Có thể duyệt giao diện/luồng trực tiếp trên Pages, nhưng không được tuyên bố thẻ live hoạt động khi Worker chưa chạy.


## V71.3 — Sửa màn khóa và giao diện Hệ Thống trên main (21/10/2026)

- Màn không kết nối trước đây gán `panel.className='dudu-v71-unavailable'`, làm mất class `dudu-v71-lock`; vì vậy biểu tượng/nhãn/nút dồn góc trên và phần còn lại của Cyber Phone trống. Đã sửa giữ nguyên class cơ sở và gắn modifier để màn lỗi vẫn căn giữa, được bố trí thành một giao thức Hệ Thống có ấn ký, vệt trang trí, thanh trạng thái và bảng thao tác.
- Sửa `js/dudu-system-app-v69.js`, `css/dudu-system-app-v69.css`: tái thiết kế cổng Thẻ thông hành và lỗi kết nối theo phong cách Vạn Giới, ưu tiên 320–430px; guest có đường đăng nhập, offline có thử kết nối lại. Không dựng hồ sơ ký chủ, chỉ số, nguồn chính quy/phi chính quy hoặc mã thẻ giả khi server không trả dữ liệu xác thực.
- `js/dudu-system-client-v71.js` phân biệt HTTP 404 (Worker chưa có route), HTTP 503 (registry chưa cấu hình), 401 (xác thực), timeout và lỗi đường truyền/CORS/DNS. Thông báo chỉ mô tả **khả năng** khi chưa có bằng chứng từ live Worker; không tuyên bố nguyên nhân duy nhất.
- Đổi cache query cho HTML/JS/CSS `main`, cập nhật unit test và workflow verify Published Pages. Chỉ frontend được thay; chưa chạy migration Cloudflare, chưa cấp thẻ, chưa tạo dữ liệu người chơi.


### V71.3 — Chẩn đoán Worker công khai (21/10/2026)

Đã chạy GitHub Actions `DUDU V71 Worker route diagnostic (read-only)`, run `39538816413` trực tiếp từ runner không có token/JWT và không ghi dữ liệu. Kết quả: `GET /health → HTTP 200`, `GET /v1/system/me → HTTP 404 error.code=not-found`, CORS allowed origin trả chính xác `https://hnhuynh1003-blip.github.io`. **Kết luận: Worker đang hoạt động nhưng bản được triển khai CHƯA chứa tuyến System V71.** Không gán lỗi này cho người dùng, mã thẻ hoặc Firebase, cũng không thể sửa chỉ bằng CSS/frontend/main Pages.

Bước xử lý có tác động production: rà soát secret `DUDU_SYSTEM_PILOT_UID`, binding hiện có và điều kiện an toàn; sau đó khi chủ dự án cho phép rõ ràng, chạy workflow thủ công `dudu-v71-system-safe-deploy.yml` với xác nhận `DEPLOY_DUDU_V71`. Workflow có preflight bảo toàn các binding/secret hiện hữu và triển khai migration SQLite; không bật phí AI. Sau khi deploy, chạy lại probe công khai (mong đợi `GET /v1/system/me → HTTP 401` khi thiếu JWT), rồi thử account AU thật có quyền; không lưu token, UID, mã thẻ vào repo/log. Đừng dùng kết quả browser mock thay cho kiểm thử backend thật.


## V71.4 — Tên ứng dụng và cổng triển khai production (21/10/2026)

- Đổi nhãn ứng dụng Cyber Phone từ «Hệ Thống Xuyên Truyện»/«Hệ Thống» sang **«✧ Thiên Mệnh»** (tiêu đề) / **«Thiên Mệnh»** (biểu tượng ứng dụng). Đây là đổi cách hiển thị; không đổi API path `/v1/system/*`, ID hệ thống, quy tắc khế ước hay phân quyền.
- V71 Worker cần migration SQLite trên Cloudflare **không cần DeepSeek API key**. Tuyến DeepSeek hiện có trong mã V68/V70 thực chất qua **TheHive AI** (`HIVE_API_KEY`, `https://api-cdn.thehive.ai/api/v3/chat/completions`), không sử dụng API key chính thức của DeepSeek; các cờ `DUDU_HIVE_ENABLED=false`, `DUDU_HIVE_TEST_APPROVED=false`, `DUDU_PAID_PROVIDERS_ENABLED=false` phải giữ OFF khi triển khai registry V71. Chưa cần đăng ký key/bật thanh toán cho ngân sách $0.95.
- Workflow `dudu-v71-system-safe-deploy.yml` vẫn **chỉ có workflow_dispatch** và bắt buộc xác nhận `DEPLOY_DUDU_V71` trên nhánh `main`; audit bindings, secret, vars, migration giữ nguyên. Bổ sung smoke GET `/v1/system/me` không token, **yêu cầu HTTP 401 + `error.code=unauthenticated` + CORS đúng origin** sau khi deploy (404/503 là FAIL). Không đưa token, UID hay code thẻ vào log. Nếu thiếu secret `DUDU_SYSTEM_PILOT_UID` thì preflight dừng an toàn.


### V71.4 Worker deploy preflight: missing flags vs drift (21/10/2026)

- GitHub Actions manual run `39541996239` thất bại ở bước so sánh `vars` (`STOP: existing Worker vars differ from approved config`), **không** chạy deploy hay migration. Bước chỉ đọc `39542340994` xác nhận secret AU và Gemini đều tồn tại, không có biến có giá trị khác nhau; chỉ vắng bốn biến mới trong Worker cũ: `DUDU_HIVE_ENABLED`, `DUDU_HIVE_TEST_APPROVED`, `DUDU_SYSTEM_LIVE_ENABLED`, `DUDU_SYSTEM_PILOT_CARD_ENABLED`.
- Đã sửa audit manual deploy để chấp nhận **chỉ** bốn biến thiếu với giá trị cho phép `false,false,true,true`; nếu biến đã có nhưng khác giá trị thì **STOP**, không ghi đè. Nếu thiếu biến ngoài danh sách hoặc Worker có biến lạ, vẫn **STOP**. Mục đích thêm bốn cờ an toàn khi triển khai V71 mà không thay đổi cấu hình AI/giao dịch cũ. Chỉ tài khoản AU có `admin:true` và UID khớp secret mới được yêu cầu thẻ thử.
- **Chưa chạy deploy production trong lần chỉnh mã này.** Sau khi CI PASS, phải kích hoạt workflow manual lần nữa trên HEAD mới rồi kiểm tra API không-token trả `401 unauthenticated` thay vì `404 not-found`.


### V71.5 — Worker đã deploy; chẩn đoán false-negative smoke (21/10/2026)

- **Lần deploy manual** GitHub Actions `39542756024`, commit `bf32c383`: các bước validation, dry run, bảo toàn bindings/secrets và `npx wrangler deploy --keep-vars` đều **PASS**; log xác nhận **Uploaded + Deployed dudu-ai-staging**. Job chung hiện **FAIL** do *health and System route smoke* gọi `GET /v1/system/me` **ngay sau deploy** và nhận HTTP 403, kỳ vọng 401. **Không được diễn giải FAIL job này là Worker chưa deploy.**
- Chẩn đoán độc lập không ghi dữ liệu `39543054483` vài phút sau: `/v1/system/me` trả đúng `HTTP 401 error.code=unauthenticated` cả khi không có Origin lẫn khi dùng Origin của GitHub Pages, CORS đúng. Điều này chứng minh tuyến V71 đã lên và yêu cầu xác thực, **chưa** chứng minh được user Firebase thật và Durable Object/Thẻ thông hành sau đăng nhập.
- Trong workflow manual đã sửa bước kiểm tra sau triển khai thành retry tối đa 12 lần, mỗi lần cách 5 giây, yêu cầu **đồng thời** HTTP 401 + error.code unauthenticated + CORS origin đúng; vẫn FAIL nếu không ổn định. Đây là sửa chất lượng kiểm thử sau triển khai, **không chạy migration lần nữa**. Không cần owner re-run deploy chỉ để chuyển một kết quả test cũ thành xanh.
- Bước nghiệm thu tiếp: đăng nhập tài khoản AU trên Pages, kiểm tra `DuduAuth.isReady()` và Firebase custom claim admin, gọi GET `/v1/system/me` bằng JWT qua client, xác minh duy nhất UID chủ secret, sau đó mới xét cấp thẻ pilot; không gửi UID, JWT, secret hoặc mã thẻ lên log/chat. Hive/DeepSeek vẫn tắt.


## V71.6 — Thiên Mệnh trực tiếp trên main (21/10/2026)

- Ổn định scroll: hàm `resetSystemScroll()` đặt scrollTop=0 cho màn System khi mở, khi bắt đầu load, khi quay lại từ Worker hoặc khi chuyển trạng thái guest/locked/name/linked. Tránh ảnh chụp màn khóa bị mất ấn ký và tiêu đề vì vị trí cuộn cũ sau lần mở trước.
- Thêm thẻ mục **Thẻ thử dành cho AU** bên trong cổng Thiên Mệnh chỉ khi Firebase auth đã ready và custom claim `admin:true` đã được frontend xác thực. Người dùng phải đánh dấu xác nhận trước khi nhấn nút, Worker tiếp tục yêu cầu **admin JWT + đúng `DUDU_SYSTEM_PILOT_UID` + body `ISSUE_MY_TEST_PASS`**. Mã chỉ hiển thị trong DOM của UID đúng; không lưu localStorage, không in log; copy cần người dùng chủ động bấm. Thẻ thử chỉ dùng một lần. Không cấp thẻ khi chạy test hoặc khi người dùng chưa bấm nút.
- Bỏ luồng tạo thẻ trực tiếp từ console Chủ Thần để tránh hai nút phát hành không thống nhất; thay bằng đường dẫn về Thiên Mệnh. Không bật AI trả phí hoặc thưởng/EXP.
- Cache buster `71-main-4` và `71-visual-4` để GitHub Pages không dùng giao diện cũ. Vẫn kiểm thử production-mode UI trên `main`, dùng mock network chỉ trong Chromium test; chưa thao tác cấp thẻ thật.

- Thêm hồi quy Chromium main-mode: cuộn giao diện rồi mở lại Thiên Mệnh phải trở về đầu, tránh mất tiêu đề. Clipboard chỉ báo sao chép thành công khi API thực sự hiện hữu và hoàn tất. Không có yêu cầu cấp thẻ thật từ bài test.
