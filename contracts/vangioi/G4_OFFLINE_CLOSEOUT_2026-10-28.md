# DUDU Studio — VẠN GIỚI G4: biên bản chốt giai đoạn offline

**Ngày kiểm toán:** 28/10/2026 (Việt Nam).  
**Repository:** `hnhuynh1003-blip/truyendienvlnha`, branch `main`.  
**Baseline được kiểm:** `56dcb9ea487f07c084842f3773accffb63af788f` (G4I).  
**Kết luận:** **G4A–G4I HOÀN THÀNH Ở MỨC MÔ PHỎNG OFFLINE/TEST HARNESS**. **G4 production, gameplay thật, save thật, reward thật và quyền phát hành: CHƯA ĐẠT/CHƯA ĐƯỢC DUYỆT.** Biên bản này không phải lệnh publish, không thay thế nghiệm thu server.

## 1. Trạng thái chức năng và khả năng thực sự

| Mốc | Đã có trong mã và kiểm thử | Chưa được khẳng định |
| --- | --- | --- |
| G4A | Parser điều kiện/hành động allowlist, chuyển cảnh theo cạnh và plan pin `contentVersion/contentHash` | Không chạy trigger tùy ý, item, NPC AI, mission/ending hay quyền runtime |
| G4B | Session/event offline, revision, eventId, replay và chuỗi hash | Hash không có chữ ký, không CAS xuyên nhiều writer |
| G4C | Node SQLite transaction/CAS, receipt bất biến, ledger chuyển cảnh, rollback và retry idempotent | Chưa có save production hoặc phát thưởng |
| G4D | G1Z operator rehearsal kết hợp callback player/access/source/snapshot **giả lập**, fence G4C trước commit | Không issuer/player entitlement thật hoặc atomicity với G1Y/Firestore/Map |
| G4E | Chứng cứ **ứng viên** từ G4C receipt/ledger cho `reach` đơn-lần và scene transition đã commit | `talk/collect/inspect/purchase/choose/survive/deliver`, `reach` lặp và ending vẫn unsupported |
| G4F | Xét duyệt bằng callback mock + policy `dry-run-only`, receipt/ledger nguyên tử và idempotent | `dryRunCommitted` **không phải** missionCompleted/saveCommitted/rewardAuthorized |
| G4G | Kiểm toán read-only phiên, G4C–G4F lịch sử, revocation hiện tại và fingerprint snapshot | Không có signed checkpoint, sửa tự động hoặc đánh giá quyền server live |
| G4H | Diễn tập backup tám bảng G4C–G4F, verify checksum/replay, restore vào fixture trống trong transaction | Không provenance/antirollback, recovery production hoặc backup nhật ký rebind G4I |
| G4I | Re-admission synthetic qua G1Z phiên mới, verify reader độc lập, CAS fence, immutable rebind receipt/ledger | Không JWT/issuer thật, không giải quyết race authority bên ngoài, không cấp quyền chơi |

**Tổng test chuyên biệt G4:** 111 ca trong 9 file `cloudflare/tests/vangioi-g4[a-i]-*.test.mjs` (G4A 8, G4B 12, G4C 9, G4D 9, G4E 12, G4F 14, G4G 16, G4H 13, G4I 18). Các file fixture Node không được import từ Worker public `cloudflare/src/index.mjs`, Firebase Functions hoặc giao diện hiện hành; **deploy Pages thành công không đồng nghĩa các engine fixture này đang phục vụ người chơi**.

## 2. Nghiệm thu trên HEAD và phạm vi bằng chứng

| Kiểm tra | Kết quả xác minh | Ý nghĩa |
| --- | --- | --- |
| Cloudflare `npm test --prefix cloudflare` | **949/949 PASS** | Gồm G4A–I và hồi quy Worker/helper; không thử grant live |
| App `node --test tests/*.test.cjs` | **104/104 PASS** | Không phát hiện hồi quy ở bộ test hiện có |
| Functions `node --test functions/tests/*.test.cjs` | **2/2 PASS** | Không tự kiểm chứng liên thông production |
| Python contract/intake | **22/22 + 16/16 PASS** | Validator/source intake riêng; không xác nhận Canon/bản quyền |
| Wrangler `npm run build --prefix cloudflare` | **dry-run PASS** | **Không deploy** Worker production |
| GitHub Actions G4I (`40634615725`) | **Smoke và Browser SUCCESS** | CI trên commit baseline G4I, không phải device/gameplay live |
| GitHub Pages G4I (`40634615120`) | **SUCCESS** | Website deploy; G4 Node fixture không tự kết nối UI |

Kết quả trên là ảnh chụp kiểm toán **ngày 28/10/2026**. Mỗi lần sửa sau này phải chạy lại theo SHA mới. Không dùng trạng thái PASS của một commit cũ để xác nhận commit mới.

## 3. Các blocker còn mở, không được giấu khi chuyển G5

1. **Định danh và quyền thật:** chưa có issuer player/adjudicator/publisher được xác thực server, admission/permit/release và revocation nhất quán tại điểm sử dụng. Callback G4D/G4F/G4I chỉ là synthetic.
2. **Độ tin cậy xuyên kho:** SQLite CAS chỉ bảo đảm trong một DB; Firestore/Thư viện, G1Y/G1Z, notice/hold, consumer/outbox vẫn có TOCTOU/privileged writer bypass. Cần topology/IAM và cutover được duyệt.
3. **Objective/ending đa dạng:** chỉ `reach` đơn-lần được mô phỏng với arrival evidence; không ép mọi truyện thành phá án/nhặt đồ/sinh tồn hay tự hoàn thành quest từ text/ruleId.
4. **Kinh tế và tiến trình:** chưa có budget, policy thưởng được duyệt, grant ledger, Kho/EXP/Xu thật, source-of-truth của save, idempotent reward production hoặc ba nhiệm vụ F được server công nhận.
5. **Khôi phục phiên:** G4H v1 không backup hai bảng rebind G4I và vì vậy **từ chối export** khi có rebind history; chưa có định dạng v2/provenance/antirollback, khôi phục xuyên storage, custody và runbook khẩn cấp.
6. **Phát hành và pháp lý:** chưa có hợp đồng publisher, môi trường staging thật được duyệt, kiểm quyền chuyển thể/licence sau V49 đổi/gỡ, asset approval/bản quyền, moderation, QA gameplay trên thiết bị, migration/rollout/rollback và tiêu chí release chính thức.

Các blocker này **không được biến thành `productionReadiness.ready=true` hoặc `released=true` chỉ bằng sửa flag/test**. Reviewer/AI không tự sửa Canon, đánh giá World Truth, duyệt/đăng world hoặc cấp thưởng.

## 4. Quyết định đóng G4 và chuyển sang thiết kế G5

**Chốt được:** nguyên mẫu G4 **offline test harness** và hồi quy G1–G4I; tiếp tục dùng cấu trúc hiện hành, không rewrite. Giữ mọi module G4 nằm ngoài live route; giữ `rewardAuthorized/rewardCommitted/saveCommitted/missionCompleted/productionAuthorized=false` trong fixture liên quan.

**Chưa chốt được:** engine gameplay phát hành, release workflow, cấp quyền author/reviewer/publisher, nhánh G5 production hoặc tính phí. Những thứ này chỉ được mở qua kế hoạch/đợt riêng có kiểm thử và quyết định cụ thể từ An Du.

**Handoff:** đọc [G5_RELEASE_AND_STAGING_PLAN_DRAFT.md](G5_RELEASE_AND_STAGING_PLAN_DRAFT.md). G5A nên bắt đầu bằng hợp đồng release candidate và tập tiêu chí kiểm tra **offline**, chưa dựng môi trường thật hay sửa Rules. G4J backup v2 không mặc nhiên có; chỉ xem xét như phụ thuộc phục hồi của G5 khi thiết kế/duyệt riêng.

Rollback của đợt **đóng hồ sơ**: chỉ hoàn nguyên doc/handoff/index; không có schema migration, dữ liệu, cấu hình cloud hoặc code runtime mới. Không xóa lịch sử G4A–G4I.
