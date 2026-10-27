# VẠN GIỚI — G4A: Engine điều kiện/hành động offline (allowlist)

Ngày 27/10/2026. Mốc nền `5bc058136151e3cc8960f106b89ba3b1f755b58c` (G3C). Theo Quy chuẩn tác giả V0.1, mục IV và IX, G4 bắt đầu bằng parser điều kiện/hành động **khai báo có danh sách cho phép**, rồi mới đi tới save/reward idempotent. G4A **chỉ triển khai bộ xử lý chuyển cảnh trên dữ liệu thử**, chưa cấp quyền chơi/phát hành.

## Hợp đồng thử độc lập

`cloudflare/src/vangioi-engine-g4a.mjs` cung cấp:

- `prepareG4AEngine(world, manifest)`: xác thực world đầy đủ bằng validator G1D; sao chép JSON an toàn; ràng buộc manifest với `contentVersion` và SHA-256 nội dung chuẩn hóa (`hashAuthoringJson` hiện hành). Sai hash, sai phiên bản hoặc lỗi cấu trúc: dừng đóng, không suy luận từ văn bản tác giả.
- `startG4AEngine(plan, entryId)`: khởi tạo `sceneId` và cờ của **một vai nhập được khai báo**, không ép thế giới phải có cả ba kiểu vai.
- `applyG4ATransition(plan, state, ruleId)`: kiểm tra điều kiện và cạnh chuyển cảnh khai báo, xuất **ứng viên trạng thái mới** bằng dữ liệu thuần. Hàm không thay đổi `plan`, `world`, `manifest`, `state` ban đầu.

Manifest `g4a-rules-1` là **sidecar**; không sửa schema `world-content-1`, dữ liệu nháp, snapshot G1 hoặc nghĩa của `scene.transitions[].trigger` dạng văn bản cũ. `ruleId` được nối với `fromSceneId + transitionIndex` của chính world đã ghim hash; chỉ đi tới `toSceneId` của cạnh đó, không tự mở đường mới. `transition.requiredFlag` vẫn là cổng bắt buộc, ngoài điều kiện sidecar. Mỗi cạnh có tối đa một rule được khai báo.

### Danh sách cho phép G4A

| Loại | Lệnh | Ý nghĩa |
|---|---|---|
| Condition | `flag_set`, `flag_unset` | Kiểm tra cờ trong trạng thái |
| Condition | `all`, `any` | Nhóm điều kiện con, không có biểu thức JS |
| Action | `set_flag`, `clear_flag` | Sửa cờ *chỉ trong ứng viên trạng thái* |
| Action | `enter_scene` | Bắt buộc là lệnh cuối, đích phải trùng cạnh đã khai |

Không hỗ trợ `eval`, mã JS/HTML, điều kiện văn bản tự do, truy cập secret, state mutation của server, thực thi trigger opaque, NPC AI, item, kho, giao dịch, EXP/Xu, quest grant hoặc ending grant. Unknown op/khóa dư/flag sai định dạng bị từ chối; không có cơ chế fallback coi lệnh lạ là `true`.

### Ví dụ thuần dữ liệu

```json
{
  "version": "g4a-rules-1",
  "contentVersion": "1.0.0",
  "contentHash": "<sha256 từ hashAuthoringJson(world)>",
  "rules": [
    {
      "ruleId": "open-door",
      "fromSceneId": "scene-room",
      "transitionIndex": 0,
      "condition": {"op": "all", "conditions": [
        {"op": "flag_set", "flag": "key_found"},
        {"op": "flag_unset", "flag": "guard_present"}
      ]},
      "actions": [
        {"op": "set_flag", "flag": "door_opened"},
        {"op": "enter_scene", "sceneId": "scene-hall"}
      ]
    }
  ]
}
```

Đoạn trên là **ví dụ contract**, không phải một world đã cài vào Creator. Nếu world không có cạnh `scene-room → scene-hall`, hoặc hash/phiên bản đã đổi, Engine từ chối. Hash đảm bảo ràng buộc dữ liệu trong bản thử; **không phải chữ ký publisher hay xác minh quyền tác giả**.

## Giới hạn an toàn và kiểm thử

- Rule tối đa 512; tối đa 8 action/rule; AST điều kiện tối đa 48 nút, 6 tầng; trạng thái tối đa 256 cờ. Đây là **ngân sách an toàn parser**, không phải quota thể loại, NPC, vật phẩm hoặc số chương.
- Các lỗi trả về `code`/`path`, không phát lại bí mật Story Bible. `engineVerified:false` và `productionAuthorized:false` luôn được giữ cho ứng viên trạng thái.
- `G3A` là phân tích đường đi **có thể**; G4A chỉ thử một đường chuyển cảnh khai báo. Nó **không thay thế** kiểm nhiệm vụ, kết cục, điều kiện NPC, save, ledger hoặc thử trên thiết bị.
- Không import module này từ Worker public, giao diện Creator, Firebase Functions, Thiên Mệnh, Chủ Thần hoặc Quan Đạo. Không đổi Firestore Rules, không migration, không deploy, không ghi state/EXP/kho thật.

Kiểm thử: `node cloudflare/tests/vangioi-g4a-engine.test.mjs` và `npm test --prefix cloudflare`. Bao gồm chặn lệnh cấp thưởng, JS tự do, đường chuyển giả, hash cũ, dữ liệu không phải JSON thuần, điều kiện thất bại, flag trùng và không mutate dữ liệu đầu vào.

**Sau G4A:** G4B mới xem xét adapter trạng thái/sự kiện và cơ chế idempotent save/reward trong harness staging; bản thiết kế phải tách quyền server và chống phát lại, không được dùng dữ liệu tự khai từ client để cấp thưởng. Nếu kiểm thử G3C trên browser còn đỏ, phải đóng lỗi trước khi gọi một giai đoạn là nghiệm thu hoàn chỉnh.

Rollback: bỏ riêng module/test/doc G4A; vì không có database writer hoặc thay đổi schema, nháp/snapshot/saved pilot giữ nguyên.
