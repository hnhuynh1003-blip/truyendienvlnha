# DUDU V44.9 — Cổng nghiệm thu Sandbox trước Pilot V45

Ngày kiểm tra: **17/10/2026** · Nhánh **main** · Đối tượng: cơ chế Sandbox hiện có trong cùng website (không có website draft).

## Kết luận
**Phần gia cố nghiệp vụ đã hoàn thành và vượt qua kiểm tra mô hình. Chưa đạt cổng triển khai giao dịch đa tài khoản thật.**
Các bản vá V44.8–V44.9 không bật cờ backend, không nạp inventory client lên trusted server ledger và không thay đổi Firestore rules. Pilot V45 là một giai đoạn kiểm thử riêng, không được tự coi các vai A/B/AUTHOR hư cấu là Firebase UID thật.

## Thay đổi đã đưa lên main
| Mức | Vùng | Hành động & bảo đảm |
|---|---|---|
| P1 | DUDU FUN | Từ chối bắt đầu hoặc nhận giải lại khi lịch sử cùng ngày/type đã ghi nhận, ngay cả khi `round` bị mất; từ chối phiên thời gian đảo ngược khi bắt đầu |
| P1 | DUDU FUN | Không chấp nhận round `READY/CLAIMED` nếu chưa đủ ba bước nhập hộp mù hoặc ba ô vé số |
| P1 | Nhiệm vụ/Xu | Đối chiếu receipt theo ngày (DAILY/EVENT), tuần ISO thứ Hai (WEEKLY) hoặc vĩnh viễn (STORY/NPC/MAIN) trước khi phát thưởng lại |
| P1 | Nhiệm vụ/Xu | Từ chối clock rollback nếu lịch sử của cùng nhiệm vụ có ngày sau ngày hiện tại |
| P1 | Save/Sổ Sưu Tập | Tạo snapshot phát hiện trước, ghi profile vào localStorage, rồi mới thay đổi collection trong bộ nhớ. Nếu quota lỗi không phát sinh tiến độ ảo |
| P1 | Save/Phone | Lỗi làm mới UI **sau khi đã lưu thành công** không được ném về caller và kích hoạt hoàn tác giao dịch đã commit |
| P2 | Giao diện | Tăng query phiên bản script để browser tải đúng mô hình đã sửa: quest, FUN, functional items, inventory trade, multi-actor domain/UI |

Các bản sửa V44.5.1–V44.8 khác được giữ từ [biên bản trước](DUDU-V44.5-44.8-SANDBOX-INTEGRATION-AUDIT.md).

## Kiểm thử thực thi trực tiếp trên mã main
| Bộ kiểm thử | Kết quả |
|---|---|
| Lab ba vai giả lập, escrow, quyền người gửi/nhận, duplicate/non-owner và dữ liệu lỗi | 10 / 10 bài nghiệp vụ |
| Kho bán/ký gửi, nguồn chương, hủy, trùng instance và giới hạn kho | 7 / 7 |
| Vật phẩm chức năng, coupon, supply output, cooldown, quota | 7 / 7 |
| Nhiệm vụ ngày/tuần, receipt, event, đổi ngày và quay lui thời gian | 9 / 9 |
| DUDU FUN hộp mù/vé số, tiền, vật phẩm, receipt ngày và round chưa hoàn thành | 8 / 8 |
| Thực thi riêng hàm `saveCurrentAccount`: quota error, thành công, lỗi render sau commit | 3 / 3 |
| Đối chiếu 6 URL script cache-busting trên trang `index.html` | 6 / 6 |

**Tổng kết:** 41/41 bài kiểm thử nghiệp vụ module và 3/3 ca lưu hồ sơ đạt trong môi trường thực thi JavaScript cô lập với module thực lấy từ `main`. Catalog thực có 160 bản định nghĩa. Những phép thử này **không thay thế** việc chạy đầy đủ `node --test`, worker integration / browser-smoke trên CI, hoặc kiểm thử end-to-end thật.

Có các bài test tĩnh/DOM trong bộ test Node không thực thi trong môi trường cô lập; không đánh dấu chúng PASS. Không có bằng chứng môi trường này đã deploy hoặc nhận kết quả CI.

## Cách kiểm thử trực tiếp trang GitHub Pages (Sandbox)
1. Mở `https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=44-9`. Kiểm tra deployment Pages đã cập nhật thay vì chỉ nhìn query string.
2. Sao lưu dữ liệu Sandbox nếu cần. Kiểm tra mở/tắt tab Kho, Đấu giá nháp, công cụ, Sổ Sưu Tập và tải lại.
3. DUDU FUN: chơi đủ hộp mù, vé số, nhận mỗi giải đúng một lần; chuyển ngày mô phỏng và không nhân thêm giải ngày cũ.
4. Nhiệm vụ: nhận thưởng ngày, đóng/mở lại; đã nhận không hiện nút nhận lần hai; qua tuần mới chỉ reset WEEKLY đúng ngày.
5. Mua Gói Tiếp Tế/coupon/Time Pulse; kiểm đếm inventory 500 chỗ, lưu localStorage lỗi, không tự thêm kỷ vật.
6. Phòng thử A → B → AUTHOR: bình luận, gắn quà, ký gửi, nhận/từ chối/hủy, replay và ngắt mạng. Đảm bảo kho và Xu ngoài phòng thử không đổi.
7. Test responsive 320 px và thiết bị Android/iOS thật; không suy diễn từ Chromium giả lập sang Safari iOS.

Các lệnh Node khuyến nghị chạy từ thư mục gốc repository khi có local runtime:
```bash
node --test tests/dudu-fun-v43.test.cjs tests/quests-v43-7.test.cjs tests/functional-items-v43-8.test.cjs tests/inventory-trade-v43-9.test.cjs tests/multi-actor-lab-v44-5.test.cjs tests/profile-save-atomic-v44-8.test.cjs
```

## Điều kiện chặn trước Pilot V45
- [ ] Kết quả toàn bộ Node, Cloudflare SQLite, Firebase Rules, Chromium browser-smoke trên CI đáng tin cậy.
- [ ] Kiểm thử thật iOS Safari và Android Chrome, kể cả thiết bị 320 px.
- [ ] Sao lưu dữ liệu và kiểm tra rollback tài khoản hiện hữu.
- [ ] Dựng staging tách riêng với allowlist ba UID Firebase thật; không truy cập dữ liệu sản xuất qua query string.
- [ ] Story registry chủ sở hữu UID verified + lịch sử thu hồi/chuyển quyền.
- [ ] Server issuer cho vật phẩm có proven ownership / instance ledger, không import inventory local.
- [ ] Saga/outbox giao dịch bình luận ↔ quà có idempotency, rollback, reconciliation, race tests.
- [ ] Các server feature gate cho bình luận/quà/settlement/collectibles giữ OFF cho đến khi QA chấp thuận mở riêng staging.
- [ ] Tiến hành thử báo cáo/quản trị/quyền tác giả thật trên môi trường nhiều tài khoản; Sandbox A/B/AUTHOR không thay thế.

## Quyết định phát hành
- **Giữ nguyên các cơ chế đọc truyện hiện hành trên main;** các bản vá lần này chỉ gia cố hành vi Sandbox/logic chia sẻ theo cổng hiện hữu.
- **Không mở Pilot V45 hoặc giao dịch thật** chỉ vì test module đạt.
- V45 bắt đầu với staging/allowlist/verified issuer sau khi các blockers ở trên được xử lý và chứng minh bằng end-to-end test.
