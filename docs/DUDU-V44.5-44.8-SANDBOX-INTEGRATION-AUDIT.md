# DUDU Studio — Biên bản kiểm thử tích hợp Sandbox V44.5.1–V44.8

Ngày: 17/10/2026 · Repository: `hnhuynh1003-blip/truyendienvlnha` · Nhánh triển khai: **main**.

## Phạm vi và ranh giới
- Không tạo nhánh nháp hoặc trang web thay thế. Thay đổi mã Sandbox trực tiếp trên `main`.
- Không di chuyển, cấp, xóa vật phẩm tài khoản thật; không thay đổi registry Firebase, Firestore rules, Worker flags hoặc Durable Objects.
- V44.5 chỉ có ba vai hư cấu trong một phiên localStorage. Đây **không phải** thí nghiệm xuyên ba UID thật.
- Catalog có 160 định nghĩa; quyền sở hữu client-side không phải entitlement được máy chủ chứng thực.

## Các lỗi đã sửa

| Đợt | Mức | Lỗi/phân hệ | Sửa chữa | Phạm vi |
|---|---|---|---|---|
| V44.5.1 | P1 | POST bị chặn bởi hạn mức 100 bình luận trước khi nhận diện requestId đã xử lý | Đặt kiểm tra idempotency trước chặn hạn mức, không tái tiêu thụ món | Lab mô phỏng |
| V44.5.1 | P1 | Bản ghi phòng thử bị sửa vẫn có thể đổi itemId sang món catalog hợp lệ hoặc trỏ sai người gửi/bình luận | Kiểm nguồn gốc 6 item gốc, sourceStoryId, icon; kiểm comment/request/transfer liên kết và không lặp request ID | Lab mô phỏng |
| V44.5.1 | P1 | localStorage lỗi cấu trúc null làm bộ kiểm tra toàn vẹn ném ngoại lệ | Xử lý item/comment/transfer null; nhận diện dữ liệu hỏng thay vì crash | Lab mô phỏng |
| V44.5.1 | P2 | Nút gửi lại mã cũ còn xuất hiện sau khi đổi vai | Xóa shortcut khi người dùng chuyển vai | UI Lab |
| V44.6 | P1 | Ký gửi local có thể nạp trạng thái bị chỉnh sửa, trùng instanceId, khác thế giới/chương, hoặc không phải B+ | Chuẩn hóa chỉ nhận escrow draft canonical B+ của chương cùng nguồn, loại trùng ID | Sandbox Kho |
| V44.7 | P2 | Trạng thái quà hiện mã tiếng Anh và không nói rõ đã hoàn trả | Hiển thị chờ nhận, đã nhận, đã từ chối/đã hủy và đã hoàn trả (không đổi mã trạng thái đã lưu) | UI Lab |
| V44.8 | P1 | Gói Tiếp Tế có thể tạo ID vật phẩm đầu ra trùng vật phẩm đã có trong Kho (save lỗi/replay) | Từ chối quote khi deterministic output instance đã tồn tại, không áp dụng tiêu hao/cấp thêm | Sandbox vật phẩm chức năng |

## Kiểm thử đã thực hiện
- Thực thi **10 bài kiểm thử nghiệp vụ V44.5.1** bằng JavaScript isolate với **catalog thật 160 bản ghi**: PASS.
- Thực thi **7 bài kiểm thử nghiệp vụ V43.9/V44.6** bằng JavaScript isolate với các module Kho/catalog/core thật: PASS.
- Thực thi **7 bài kiểm thử nghiệp vụ V43.8/V44.8** với functional item/loot cadence/quests thật: PASS.
- **10 kiểm tra mã nguồn/UI wiring V44.5**: PASS, bao gồm tách localStorage, khóa Sandbox và không gọi API hồ sơ/tài sản thật.
- **Chưa xác nhận**: lệnh `node --test` đầy đủ trong CI hoặc local runtime, browser-smoke Playwright, Android thật, Safari iOS thật. Không đánh dấu toàn bộ release là được chứng nhận chỉ từ các bài isolate.
- Trạng thái GitHub connector cho commit kiểm tra: không có CI status / PR workflow run được báo về; trạng thái này **không đồng nghĩa** CI xanh.

Lệnh kiểm tra đầy đủ khi có runtime repo:
```bash
node --test tests/multi-actor-lab-v44-5.test.cjs tests/inventory-trade-v43-9.test.cjs tests/functional-items-v43-8.test.cjs
```

## Những cơ chế giữ nguyên, chưa tự ý phát hành
1. Đồ TOOL/STORY_PROP thuộc 160 catalog nhưng chưa có tác dụng vẫn hiển thị **chưa có hiệu ứng sử dụng**; không mở nút Dùng giả.
2. Đấu giá mới ở mức **ký gửi và rút lại**, không có tiền thật, người mua thật, đối ứng hoặc payout.
3. DUDU FUN, nhiệm vụ, loot, coupon, Xu và thưởng đang là **kinh tế Sandbox client-authoritative**; tuyệt đối không chuyển thành tiền/quyền sở hữu Firebase thật bằng cách nạp profile.
4. Bình luận kèm quà của lab là mô phỏng, không chuyển quyền sở hữu vật phẩm thực; bản chờ tặng AUTHOR/STORY tại server phải bật gate sau khi có provenance.
5. Quyền tác giả kiểm thử bằng nhiều tài khoản thực được dành cho Pilot V45, không tuyên bố đạt qua vai AUTHOR hư cấu.

## Cửa kiểm soát trước Pilot V45 (chưa đạt)
- [ ] Verified story owner UID và lịch sử thu hồi/chuyển quyền đáng tin cậy.
- [ ] Issuer cấp từng vật phẩm thuộc trusted ledger, không lấy dữ liệu kho trình duyệt làm quyền sở hữu.
- [ ] Saga/outbox cho comment ↔ gift, idempotency, escrow rollback và recovery xuyên Durable Objects.
- [ ] Staging có 3 UID Firebase được allowlist riêng, phân biệt độc giả A/B và tác giả thực.
- [ ] Kiểm thử phân quyền server (sai UID, chapter, world, revoked author), retry/offline/đua request, hai thiết bị.
- [ ] Sao lưu dữ liệu thật và xác nhận migration; giữ các feature gate OFF cho đến khi đạt.
- [ ] Kiểm thử mobile WebKit/iOS Safari và Android Chrome thật, cùng bộ browser smoke trên CI.

## Hướng tiếp tục
**V44.8 phần còn lại:** rà soát giao dịch Xu, nhiệm vụ, loot, DUDU FUN và nhật ký ngày/đổi ngày; ưu tiên lỗi dẫn tới nhận thưởng lặp hoặc mất item. **V44.9:** chạy bộ hồi quy đầy đủ + kiểm tra trên điện thoại, lập release gate checklist. **V45:** chỉ triển khai pilot staging với quyền sở hữu được server xác minh, không mở giao dịch thật đại trà.
