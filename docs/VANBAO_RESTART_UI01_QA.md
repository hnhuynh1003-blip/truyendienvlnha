# Vạn Bảo — batch khôi phục UI01, 13/11/2026

## Đã sửa

- js/dudu-fun-ui-v43.js: bỏ details/summary “Trò khác”; giữ chính3nút và handler; đưa host.append(content) lên trước các renderer. Không thay tabID, state, bridge hoặc logic nhận thưởng.
- css/dudu-fun-v43.css: selector giới hạn trong phone-app-fun, ép3cột minmax0, giữ hàng không co bởi flex; min-height44px. Selector đủ cụ thể để không bị CSS casino cũ ghi đè về41px. Không đổi ảnh đã duyệt.
- index.html: nhãn/ARIA launcher Kỳ Vận, nhãn Bách Hí và header Kỳ Vận. Không sửa source của danh hiệu/thành tựu hoặc technical fun/arcade. Cache query chỉ2tài nguyên vừa sửa để tránh dùng bản cũ khi sau này phát hành.
- tests/browser-vanbao-main-f44.cjs: bắt lỗi tab bị gập, tái hiện actual FUN render khi bridge không có async load, chứng minh profile không đổi; đo3tab cùng hàng/vùngchạm44 ở320/360/390/430/1280, kiểm đường sang Vé Cào/Vạn Tượng/Ví.

## Bằng chứng kiểm thử

Trước sửa: bài browser tích hợp bổ sung FAIL `Three games must never be folded` (1details, expected0). Sau sửa PASS; đã phát hiện thêm CSS casino ghi đè min-height41 và sửa bằng selector đúng phạm vi.

Đã chạy trên main:

```
node --test tests/vanbao-chess-f44.test.cjs tests/vanbao-rewards-f44.test.cjs tests/vanbao-final-f44.test.cjs tests/vanbao-final-art-f44.test.cjs tests/museum-vanbao-v1.test.cjs tests/personal-fun-c25.test.cjs tests/personal-blind-box-c29.test.cjs tests/fun-vantvat-f33.test.cjs tests/fun-p1-currency.test.cjs tests/dudu-wallet-loot-v1.test.cjs tests/wallet-p2-bank-card.test.cjs
```

53 PASS / 0 FAIL. Gồm28caVạnBảo baseline và25ca hồi quy kinh tế/nguồn thưởng/Ví.

Browser dùng Playwright trong Codex runtime đã cài sẵn, Chrome cài sẵn qua preload QA; không cài package. Tất cả nguồn test qua loopback/vanbao.local và Auth/Firestore giả; không dữ liệu production:

- browser-vanbao-main-f44.cjs: PASS. Nămviewport; nốiDOM trước mount; giả lập bridge ready=false;3tab; danh mục22món; Khó bị khóa; Vé Cào mở đúng renderer; Vạn Tượng giá25/oldbox20/66ID giữ nguyên; Ví mở đúng; không lỗi JS.
- browser-vanbao-f44.cjs: PASS. Chinh Phục, native touch/mouse, thắng1/3nước, hộpẩn/retry/claim/thoát/hộp pending qua reload/táchUID.
- browser-vanbao-final-f44.cjs: PASS.5nhánh,6thẻchếđộ,4chếđộmở2chưa phát hành, hộp chọn bất biến,1grant, paidDuelWorker, reconnect, thua và táchaccount/Sandbox.
- browser-inventory-f43.cjs: PASS. Viewer ảnh, zoom/drag/pinch, đóng/Escape, quantitysale và vật phẩm khóa.
- browser-fun-cosmos-f41.cjs: PASS. Stream/chọn mục tiêu/1-5-10/rút/retry/đổiaccount/thoát/reducedmotion/nămwidth.
- git diff --check: PASS (chỉ cảnh báo LF/CRLF của Windows, không lỗi whitespace).

Đường dẫn ảnh QA: C:/Users/TUF F16 FX608/AppData/Local/Temp/vanbao-restart-20261113/lobby-{320,360,390,430,1280}.png. Đã xem trực quan ảnh320và430. Đây là viewport Chrome mô phỏng, không phải thiết bị Android vật lý.

## Bảo toàn và giới hạn

Không đổi các file vanbao-*.js, puzzle bank, rewards, sessions, item catalog, currency engine hoặc firestore.rules. Không ghi thử vào production. UID, Xu, Phôi Thẻ, Kho500, receipt và hộp pending dùng hợp đồng cũ. Không reset/xóa dữ liệu, không tạo nhánh, không merge và không force-push.

Chưa phát hành thêm thế, chưa bật Khó/Đại sư, chưa nhập F4.5/B2B từ nhánh khác. Chưa lưu nước Chinh Phục đang giải; chỉ win/choice/claim hiện bền vững. Tỷ lệ/kho/phí được kiểm chứng bằng DB giả và source, không kiểm tra tài khoản production. Vé Cào được hồi quy luồng mở renderer và logic Node; chưa thêm một bài end-to-end cào/claim mới cho lần này.

PASS kỹ thuật cho batch nhỏ; chờ chủ dự án nghiệm thu UX và duyệt roadmap trong VANBAO_RESTART_AUDIT_20261113.md. Chỉ commit local main theo yêu cầu; chưa push/deploy trong nhiệm vụ này.
