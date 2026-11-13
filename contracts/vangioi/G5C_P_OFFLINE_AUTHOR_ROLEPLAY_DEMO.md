# G5C-P — Bản chơi thử nhập vai do tác giả tự tạo (Node offline)

**Ngày:** 28/10/2026. **Nền:** G5C `5f49794ab796bc5a1f53cd5c4fc2f85c8779d639` (Smoke/Browser và Pages SUCCESS). **Phạm vi:** đợt **G5C-P** độc lập, kiểm tương tác thật ở CLI/test host bằng engine G4A/G4B, không phải G5D, không triển khai production hay mở giao diện chơi công khai.

## 1. Trải nghiệm có thể chạy ngay

```sh
node tools/vangioi/author-roleplay-cli.mjs
```

Chọn một trong hai thân phận, sau đó chọn hành động theo số. CLI chỉ dùng Node.js và các module sẵn có trong repo, không gọi network, không nhập tài khoản, không cần Firebase, không ghi file/save, không phát thưởng. Nếu nhập không hợp lệ hoặc dừng giữa chừng, phiên chỉ kết thúc trong RAM. Hướng dẫn này dành cho người có source repo và Node, **không phải link chơi trên GitHub Pages**.

Thế giới mới hoàn toàn do DUDU Studio tự thiết kế cho thử nghiệm: **Ngọn đèn cuối ở Bến Sương** (`cloudflare/tests/fixtures/vangioi-author-playtest-world.mjs`). Đây là truyện ngắn đêm bão, không lấy cảnh/tình tiết Quan Đạo để tránh phụ thuộc Canon truyện có sẵn.

| Hạng mục | Dữ liệu demo | Kiểm nghiệm |
| --- | --- | --- |
| Thể loại/bậc đề nghị | Niên đại (`era`), F | Chỉ metadata tác giả, không cấp bậc thật |
| Thân phận | `native_extra`: người tập việc; `system_cover`: thanh tra tín hiệu | G3A/G3C xét hai điểm vào, cùng cảnh có lời phản ứng NPC khác nhau |
| NPC | Bà Lan (scripted) | Thoại/lore do tác giả viết; không có LLM/NPC AI tự bịa |
| Địa điểm/cảnh | Cầu cảng, tháp đèn; bốn cảnh, hai điểm kết | Engine G4A chỉ điều hướng/đặt cờ theo allowlist |
| Lựa chọn | Cứu người đi biển **hoặc** duy trì đèn | Hai hệ quả loại trừ nhau, đi tiếp tới ending tương ứng |
| Nội dung dài nhiều arc | Không dùng trong mẫu ngắn này | G1N/G5C arc không bị thay, chưa chứng minh chơi xuyên arc |
| Vật phẩm/thưởng | Không có items, shops; đề nghị EXP `0` | Không ghi EXP, Xu, vật phẩm, Kho, settlement, giao dịch |
| Hình ảnh | Ba **metadata placeholder** có alt text | Không có PNG bytes, giấy phép, mobile measurement hoặc QA thiết bị |

## 2. Đường đi kỹ thuật và ranh giới quyền

1. `lighthouseWorld()` tạo dữ liệu tác giả theo `world-content-1`, gồm source/story/entry/NPC/cảnh/nhánh/ending. `lighthouseEngineManifest(world)` là **sidecar G4A** đóng pin `contentVersion/contentHash` và bốn luật `set_flag/enter_scene`. `lighthousePlaytestScript(world)` là văn bản hiển thị tách khỏi engine, cũng đóng pin hash nội dung.
2. `prepareAuthorRoleplayOffline()` **copy/kiểm JSON đầu vào** để chống getter hay sửa giữa bước, kiểm world bằng G3C (cả reachability theo profile), manifest bằng G4A, và từ chối scene/rule/choice/script thừa, sai pin hoặc thiếu liên kết.
3. `start(entryId)` tạo **G4B session RAM**, bao gồm flag khởi tạo của vai. `view(session)` kiểm replay/chain/scene qua G4B trước khi chỉ trả về đoạn kể chuyện, lời thoại, phản ứng theo thân phận và lựa chọn G4A cho phép. Không trả `story.secretTruth`.
4. `choose(session,{choiceId,eventId,expectedRevision})` chuyển sang **ruleId có sẵn trong sidecar G4A**, qua G4B. Kiểm thử: chỉ một lần thay đổi theo eventId, retry có đúng receipt, eventId trùng payload khác bị từ chối, lỗi revision/hash/log bị phát hiện. Đây là **G4B offline session**, không phải transaction CAS đa máy chủ hay G4C save durable.
5. `narrativeEndingId` là **kết cục kịch bản được chiếu từ state flags**, không phải bằng chứng người chơi đã hoàn thành objective, ending server đã được xét, hoặc đủ điều kiện cấp thưởng.

Mọi kết quả thành công vẫn phải giữ `fixtureOnly=true`, `worldPublished=false`, `endingVerified=false`, `missionCompleted=false`, `saveCommitted=false`, `rewardAuthorized=false`, `rewardCommitted=false`, `productionAuthorized=false`, `deviceVerified=false`, `rightsVerified=false`. **Không được dùng hash từ client, text kịch bản, kết quả CI hoặc trạng thái G4B RAM để cấp quyền.**

Nguồn `storySource.contentHash` (`aa...aa`) và các `assets[].contentHash` (`bb...bb`) là **chuỗi placeholder để kiểm định cấu trúc**, không phải checksum bytes của truyện/ảnh, không có quyền sử dụng được chứng minh. Đặc biệt không đưa world này qua cổng G5A/G5C thật như một candidate hợp lệ, không mở link Pages chơi, không phát hành ngoài repo hay dùng ảnh không có giấy phép. Nếu chuyển sang bản thử trình duyệt: cần xác nhận phương án phân phối/giấy phép/ảnh và dựng riêng giao diện text-first, không mặc định đây là world đã duyệt.

## 3. Kiểm thử và nghiệm thu

`cloudflare/tests/vangioi-author-roleplay-offline.test.mjs` kiểm: schema/reachability hai vai, nhập vai thay đổi lời thoại, hai nhánh/kết cục, G4B retry và id conflict, replay từ JSON, state tamper/commit giả, content pin stale, `give_item` bị allowlist G4A từ chối, page/entry/rule/script giả, secretTruth và quyền bị giấu, source tách Worker/Creator/live. Cần chạy cùng Cloudflare/app/Functions/Python/Cloudflare dry-run, sau đó xác nhận CI/Pages theo SHA commit. **Pages SUCCESS chỉ là build/deploy của repo, không chứng minh prototype CLI có đường chơi trên web.**

## 4. Những điều vẫn chưa xong

- G5D–F (save/version/recovery, publish/retire, go/no-go) **chưa được triển khai trong đợt này**.
- Chưa có user browser playtest, mobile asset layout/thiết bị thật, khả năng import ảnh, author form tạo sidecar G4A tự động, versioned arc runtime hoặc Canon continuity.
- Chưa có grant/quyền server, kiểm nguồn/giấy phép hiện hành, actor issuer, task evidence đa dạng, idempotent save/reward xuyên storage hoặc backup/rebind đúng G4I.
- Không đụng Quan Đạo, 48 seed V66, THIÊN MỆNH, CHỦ THẦN, Thư viện, EPUB, Firestore Rules, backend Cloudflare production, economy, Kho, NPC AI hay Canon PR #22.

**Tiếp theo:** để Du trải nghiệm trực tiếp trên trình duyệt sẽ cần một đợt quyết định riêng (giao diện test không công khai, asset/copyright và quyền truy cập). Hoặc quay lại **G5D fixture** theo roadmap; không suy ra từ CLI demo rằng world chính thức chơi được.

**Rollback:** revert bốn tệp code/fixture/test/CLI cùng đường dẫn docs. Không có migration, live data, user saves hay world published cần phục hồi.
