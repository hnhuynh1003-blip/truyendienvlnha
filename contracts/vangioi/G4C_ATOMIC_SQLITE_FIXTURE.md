# VẠN GIỚI — G4C: transaction/CAS SQLite fixture, không ghi production

Ngày 27/10/2026. Nền `0f7dc189edc36745c264ab871bd2871fb64ee160` (G4B). Đây là **một đợt kỹ thuật offline duy nhất** sau G4A–G4B. Không mở gameplay, economy, migration, Cloudflare/Firestore production hoặc quyền mới.

## Phạm vi đã làm

`cloudflare/src/vangioi-engine-g4c-fixture.mjs` dùng **Node `node:sqlite`** trong một cơ sở dữ liệu fixture cách ly, không được import từ Worker/Pages. `createG4CFixtureStore({database,plan})` nhận plan G4A có version/hash và cung cấp:

- `seed(...)`: **test operator** dựng một phiên G4B và bộ cổng synthetic đã khai rõ `playerId`, `worldInstanceId`, `entryId`, `sourceVersion/sourceHash`, `accessState`, `licenseState`, `sourceState`. Không có mặc định tự cho phép. Đây **không phải issuer** giấy phép, đăng nhập hay quyền vào world.
- `submit({actorId,event})`: nhận actor riêng từ **driver giả lập tin cậy**, không suy actor/quyền từ event. G4B kiểm toàn bộ shape/chain/replay và tạo ứng viên; sau đó G4C kiểm cổng lần nữa trong `BEGIN IMMEDIATE` → so receipt trùng → CAS `(revision, chainHash, sessionJson)` → ghi trạng thái/receipt/ledger kiểm toán → `COMMIT`. Không có `await` trong transaction. Một lỗi giữa các lệnh dẫn tới `ROLLBACK` của cả ba phần.
- `inspect(worldInstanceId)`: đọc fixture để assert dữ liệu trong unit test; **không phải player API**.

Receipt lưu immutable theo `(worldInstanceId,eventId)` với `requestHash` toàn bộ event. Nếu retry **giống hệt** sau khi server giả lập đã commit nhưng mất phản hồi, trả nguyên receipt trước, không tăng revision hoặc thêm ledger. Cùng eventId nhưng payload khác từ chối `event-id-conflict`. Hai request mới cùng đọc revision cũ chỉ một CAS được commit vào cùng SQLite store; request còn lại nhận `revision-conflict`. SQLite khóa writer nên nhiều kết nối tới cùng tệp cũng bị ràng buộc.

`vg_g4c_ledger_fixture_v1` chỉ chứa **dòng kiểm toán chuyển cảnh** (`kind=scene_transition_only`, `reward_authorized=0`), không có cột số dư, item, EXP hoặc phương thức grant. Receipt/ledger cấm UPDATE và DELETE bằng trigger. Không có đường ghi Kho, nhiệm vụ, ví, economy hoặc publisher.

## Bốn mức cần phân biệt

| Mức | Kết luận của G4C |
|---|---|
| Ứng viên thay đổi G4A/G4B | G4B tái diễn quy tắc, chưa lưu trạng thái dùng chung |
| Giao dịch thử G4C | `fixtureCommitted: true` sau SQLite COMMIT; có state + receipt + audit trong fixture |
| Quyền cấp thưởng được xác minh | **Không**. `rewardAuthorized: false`, `rewardCommitted: false` |
| Ghi dữ liệu production thật | **Không**. `saveCommitted: false`, `productionAuthorized: false` |

## Cổng quyền, nguồn và giới hạn chứng cứ

- Fixture từ chối actor sai, instance sai, plan/contentVersion/contentHash không khớp, giấy phép không `active`, quyền không `allowed`, source không `current`, hoặc source pin đã đổi. Recheck trước commit chặn thu hồi trong lúc chuẩn bị bất đồng bộ. Các trạng thái synthetic **không kiểm chứng giấy phép ngoài đời, nguồn Thư viện, permit G1R, hold G1X, release G1Y, admission G1Z hay Firebase JWT**.
- Hợp đồng V0.1 yêu cầu xác thực người chơi, quyền thế giới, source version, completion và phần thưởng bởi server. G4C chỉ mô phỏng *cơ chế nguyên tử* nếu một nhà cung cấp quyền tin cậy sau này tồn tại; không tạo nhà cung cấp đó. `actorId`, gate, `plan`, content hash và SQLite fixture không có giá trị tự chứng thực.
- G4B log/hash chống sai lệch khi replay dữ liệu test, **không phải chữ ký hoặc authority**. Nếu attacker điều khiển tệp SQLite/test driver, không có bảo đảm an ninh xuyên máy chủ. SQLite giao dịch trên cùng tệp không giải quyết transaction giữa SQLite–Firestore, đa vùng/cluster hay phát thưởng server.
- Event vẫn chỉ là `g4b-transition-1` (`version,eventId,playerId,worldInstanceId,expectedRevision,ruleId`). Thêm `missionCompleted`, `grant`, `rewardGranted`, `exp`, `publisher` hoặc trường tùy ý đều bị G4B từ chối trước khi ghi. Không suy hoàn thành nhiệm vụ từ scene, cờ, text hoặc client event.
- G4C không sửa `world-content-1`, rule allowlist G4A, session/replay G4B, các bản lưu pilot hoặc quyền G1–G3. Không thêm UI/thẻ/nút. Không import từ `cloudflare/src/index.mjs`, frontend hay Firebase Functions.

## Kiểm thử

```sh
node cloudflare/tests/vangioi-g4c-atomic-fixture.test.mjs
npm test --prefix cloudflare
node --test tests/*.test.cjs
```

9 ca G4C: CAS hai ứng viên với một/nhiều SQLite handle; duplicate receipt; eventId payload mismatch; response mất và reopen file; fault injection sau ghi state/receipt/ledger; actor/instance/content pin; chặn claim thưởng/client; license/access/source stale; revoke/source rotation ngay trước commit; tamper/missing live wiring. Regression G4A/G4B không được sửa chỉ để PASS.

**Cổng chưa đạt trước production:** trusted authentication + permit/release authority, nguồn/version được xác minh, server-side proof of mission completion, reward policy/ledger thật, cross-system transaction/outbox reconciliation, storage topology, migration, security review, rollout/rollback và phê duyệt của An Du. Không tiến sang G5 từ riêng kết quả G4C.

Rollback: hoàn nguyên commit G4C (module/test/doc/handoff). Không có dữ liệu production hoặc migration cần khôi phục.
