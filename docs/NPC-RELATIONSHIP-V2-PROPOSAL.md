# DUDU Studio — NPC Relationship V2 · Hồ sơ đề xuất, CHƯA CODE
**15/10/2026 · chỉ kế hoạch, chờ tác giả duyệt từng đợt trước khi sửa gameplay.**

## Mục tiêu & giới hạn
Thay “cứ tặng món phẩm cấp cao thì +nhiều %” bằng quan hệ có chiều sâu: **thiện cảm (warmth), tin tưởng (trust), giai đoạn thân thiết (stage)**, quà phù hợp sở thích và phản hồi NPC theo tính cách. Không cần Gemini để chơi; lời thoại AI sau này chỉ diễn đạt, **không phán quyết nhận quà hay thưởng**. Không đụng kỷ vật độc quyền, tiền/EXP, lịch sử chat, NPC unlock hoặc save cũ khi chưa có bảo mật tương xứng.

### Bằng chứng hệ thống hiện tại
- `index.html:executeGiftItem`: bỏ vật phẩm trong `userProfile.inventory` **trước khi NPC phản hồi**; tăng `affinity` theo phẩm F=5…SSS=100, không đọc tính cách, không cho từ chối; sau đó mới gọi Gemini tùy trường hợp. Có thể nhanh chóng đạt 100%.
- `userProfile.storyStates[storyId].collectedCharacters[npcId]` đang chứa tiến độ; `getStoryProgress` copy legacy có kiểm tra nguồn. `unlockChapterCharacter` khởi tạo `affinity:20`. Tên và ID NPC ở public library; chat/memory ở localStorage theo UID/story/NPC.
- 70 vật phẩm gốc có `id/rank/type/realmTag` nhưng **chưa có taxonomy sở thích quà**; không đoán sở thích bằng icon, tên hoặc lời thoại AI.
- `profiles_v2` cho client tự ghi vật phẩm và điểm quan hệ; **chưa thể coi bất kỳ quà/affinity client-side nào là quyền lợi kinh tế được máy chủ xác thực**.

## Schema và bảo toàn dữ liệu

```js
storyStates[storyId].collectedCharacters[npcId] = {
  // Giữ nguyên các trường hiện có: id, name, role, note,
  // novelTitle, affinity, ... và dữ liệu lưu cũ.
  affinity: 20, // giữ nguyên số đã có cho người chơi cũ
  relationshipV2: {
    version: 1,
    trust: 0,      // chỉ tăng khi có hành động rõ ràng được quy tắc chấp nhận
    stage: 'ACQUAINTED',
    lastGiftAt: 0,
    giftDayUtc: '',
    acceptedGiftCountUtc: 0,
    acceptedInstanceIds: [],
    milestones: []  // chỉ mốc do tác giả xác nhận, không lấy từ text AI
  }
}
```

- Nếu đã có `affinity` 0–100: **giữ nguyên**. Không ép giảm 100 xuống 20, không mất lịch sử. Nếu chưa có V2, khởi tạo khi hiển thị/tương tác, không viết lại toàn bộ profile ngay khi mở app.
- `trust` khởi tạo 0 khi lần đầu nâng cấp; UI giải thích đó là **chỉ số mới** không đồng nghĩa “tình cảm cũ bị mất”. Có thể cho giai đoạn cũ tạm thời là “Đã quen” theo `affinity`, nhưng mốc cao phải đợi cốt truyện.
- Mỗi bản ghi khóa bởi UID Firebase + storyId + NPC ID hiện có; NPC đã lưu trữ vẫn giữ quyền truy cập lịch sử ở các chương cũ; không tạo NPC mới chỉ vì được tặng quà.

## Tính cách và sở thích do tác giả khai báo

Thêm khối **Sở thích NPC** ở trình chỉnh sửa Nhân Vật (trường tùy chọn, không phải prompt AI):
```js
giftPreferences: {
  likedTags: ['DRINK_COFFEE','PRACTICAL'],
  neutralTags: [],
  dislikedTags: ['DANGEROUS'],
  refusedTags: ['BOUNDARY_VIOLATION'],
  reactionStyle: 'reserved'  // reserved | cheerful | gentle | default
}
```
Mở đầu cần thống nhất taxonomy tags cho **70 vật phẩm** và các item truyện (bảng mapping riêng có ID bất biến), rồi mới cho phép chọn tag. Không ghi spoil vào profile public của NPC. Trường `giftable=false`, `unique`, `scope` và **kỷ vật từ server** phải được tuân thủ tuyệt đối. Không tự cấp quà mới bằng việc tác giả sửa hồ sơ NPC.

## Phép tính đề xuất để cân bằng (chỉ đề xuất)

| Quà | Kết quả quan hệ | Có tiêu thụ? |
|---|---|---|
| Từ chối vì ranh giới hoặc item không được phép tặng | Không tăng thiện cảm/tin tưởng; câu phản hồi đặc trưng | **Không** |
| NPC ghét loại quà | Từ chối nhẹ nhàng, gợi ý sở thích; không phạt tình cảm lần đầu | **Không** |
| Quà trung tính hợp lệ | Thiện cảm +2 đến +6 theo bậc (từ F đến B+), không tăng đột biến | Có, **chỉ sau khi xác nhận nhận** |
| Quà hợp sở thích | Thêm +2 (tối đa +8 mỗi lượt), lời cảm ơn theo persona | Có khi nhận |
| Trùng quà liên tục | Lượt 2 trong ngày nhân 0.5, lượt 3 nhân 0.25; sau lượt 3 chỉ có tương tác xã giao, không tiêu vật phẩm | Chỉ khi nhận |
| Tin tưởng | +1 ở quà phù hợp đầu tiên trong ngày nếu đã kết nối NPC; các mốc + điểm cần điều kiện truyện có thể kiểm chứng | Không tự tăng từ thoại AI |

**Chống farm:** 5 phút tối thiểu giữa hai lượt tặng được tính điểm cùng NPC; tối đa 3 lượt tặng được tính điểm/NPC/ngày UTC; mọi lần double-click/retry dùng `instanceId` và `giftEventId` để idempotent. Đây mới là **logic thử nghiệm phía client**, không phải bảo vệ kinh tế thật. Trước khi phát thưởng có giá trị, chuyển kiểm tra item ownership, cooldown, spending, rewards và quan hệ lên backend trusted.

## Giai đoạn quan hệ đề xuất

| Giai đoạn | Điều kiện phác thảo | Hiệu ứng |
|---|---|---|
| Chưa kết nối | Chưa mở khóa NPC qua chương | Không tặng quà hay tăng quan hệ |
| Quen biết | Đã mở khóa | Hội thoại cơ bản, ghi nhớ sự kiện địa phương |
| Thân thiện | `affinity>=40`, `trust>=10` | Thêm vài câu thoại tùy tính cách |
| Tin cậy | `affinity>=70`, `trust>=30` và mốc truyện nếu có | NPC chia sẻ nội dung tác giả đã **phê duyệt** |
| Gắn bó | `affinity>=90`, `trust>=60` **và** mốc truyện cho phép | Tương tác đặc biệt; không tự mở spoiler hoặc phần thưởng |

Các mốc gắn bó **không đồng nghĩa tình cảm lãng mạn**; mọi tuyến tình cảm là tùy chọn do tác giả thiết kế cho NPC thích hợp. Không suy diễn dựa trên gift rank hoặc đoạn chat.

## UI/UX tránh nhồi chữ
Trong Cyber Phone → Nhân Vật: thẻ gọn hiển thị `❤️ Thiện cảm`, `🛡️ Tin tưởng`, giai đoạn; nhấn `?` để xem cơ chế. Trong bảng tặng quà: badge nhỏ “Phù hợp”, “Trung tính”, “NPC có thể từ chối”; xác nhận nhận rồi mới giảm kho. Lời thoại phản hồi từ bảng câu cá tính, có thể chạy **không tốn Gemini token**.

## Kế hoạch theo đợt + tiêu chí bàn giao

**R1 — Schema và sở thích (ưu tiên cao, không phát quà)**
- Chốt taxonomy gift tags 70 món và item tác giả; cấu trúc `giftPreferences` cho NPC, validation, UID/story/NPC scope; test từ chối spoiler/ID sai. Không thay `executeGiftItem` hoặc save.
- Đạt khi bộ test unit và browser không tạo thêm xu/EXP/items, không làm mất save/affinity cũ.

**R2 — Quyết định tặng quà + anti-spam trong Sandbox**
- Pure `evaluateGift({npc,item,relationship,now})` trả `ACCEPT/REFUSE/COOLDOWN` có lý do, delta và plan tiêu item. `executeGiftItem` chỉ commit khi ACCEPT. Chặn double-click, cooldown, phạm ranh giới và item không giftable; không phụ thuộc Gemini.
- Đạt khi từ chối **không mất vật phẩm**, double-click không tiêu hai lần, F không thể lên 100 nhanh, không mint đồ qua retry.

**R3 — Quan hệ, mốc truyện và lời thoại**
- Thêm trust, stage, quà theo cá tính; giữ `affinity` cũ; cổng spoiler do tác giả quyết định; hội thoại NPC có tính cách riêng và giữ ký ức per UID/story/NPC.
- Đạt khi kịch bản 0/20/50/100 affinity cũ tương thích; không lộ chuyện chưa công bố; khi AI off có lời đáp script.

**R4 — Giao diện + kiểm thử người thật + kiểm soát kinh tế**
- Thẻ NPC gọn, nút `?`, bảng quà, phản hồi từ chối, các bài browser trên mobile/desktop; thử bằng 2 account. Xem xét backend trusted cho gift rewards trước khi mở tính năng có giá trị kinh tế thật.
- Đạt khi không nhảy layout Cyber Phone, không tăng độ trễ, không lẫn tài khoản, và no Cloudflare AI usage ngoài yêu cầu đã được bật rõ ràng.

## Cần tác giả duyệt trước khi code NPC
Chốt **2 chỉ số** (Thiện cảm + Tin tưởng), 5 giai đoạn, ngưỡng quà tối đa +8, tối đa 3 món/ngày/NPC, 5 phút cooldown và quy tắc **từ chối không mất vật phẩm**. Nếu các con số chưa hợp gu chơi, cân bằng ở đây trước; không bắt đầu sửa `executeGiftItem` khi chưa được chốt.
