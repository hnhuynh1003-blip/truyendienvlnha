# G2S — Đóng thử đường client publish bỏ qua sourceEpoch (Firestore Emulator)

Ngày 27/10/2026. Baseline `c48e3de` (G2R). G2R phát hiện người sở hữu EPUB V49 có thể cập nhật `draft → published` qua client mà **không** tăng `sourceEpoch`. G2S thử nghiệm một ứng viên Rules tách riêng để chặn con đường đó. **Không có quyền xuất bản thật, không triển khai Firebase.**

## Phạm vi và thay đổi

- Candidate: `cloudflare/tests/fixtures/vangioi-g2s-v49-server-publish-only.rules`. Bản sao G2M ngoại trừ đúng hai rào chắn: chỉ cho client chuyển `importing → draft` và kiểm `request.resource.data.status != 'published'` khi cập nhật. File Rules G2M giữ nguyên; validator `validBookV49` trên create/update, giới hạn chapter/identity, owner-only private draft, guest-read published và default-deny vẫn giữ.
- Emulator cục bộ: `demo-vangioi-g2s` tại `127.0.0.1:18085`, cấu hình `tools/vangioi/firebase-emulator-g2s.json`. Test manual từ chối chạy khi có credential path, sai host hoặc sai project.
- Tests: `cloudflare/tests/vangioi-g2s-publish-gate.test.mjs` đối chiếu chính xác G2S với G2M; `cloudflare/tests/manual/vangioi-g2s-publish-gate-emulator.mjs` chạy SDK client thật qua Rules Unit Testing và chứng minh tác động server SDK riêng.
- **Không** sửa `firebase.json`, Firestore Rules thật, EPUB UI, `js/epub-production-v49.js`, `js/epub-import-v48.js`, `functions/`, Worker runtime, Auth Claims, IAM, staging hoặc production data. Firestore edition/database ID chưa được chủ dự án chọn.

## Kịch bản nghiệm thu

| Tình huống | Kỳ vọng |
| --- | --- |
| Owner `admin:true` nhập book `importing`, tạo chapter, finalize `importing → draft` | Cho phép |
| Owner publish bằng `update`, `set`, `merge`, batch cập nhật cả sidecar | **Từ chối** |
| Chính hàm V49 `publishDraft` chạy kiểm chương rồi cập nhật `published` | **`permission-denied`** |
| Owner tạo parent `published` ban đầu | Từ chối |
| Guest xem book/chapter `published`, query `where(status==published).limit(60)` | Cho phép |
| Guest/admin khác/reviewer tự khai xem draft hoặc sửa private chapter | Từ chối |
| Owner ghi/đọc `vg_fixture_v49_epochs_g2r` từ client | Từ chối |
| Server/Admin SDK cập nhật published mà không tăng epoch | **Vẫn làm được** — blocker |
| Guest xem `importFingerprint` trên parent published | **Vẫn lộ** — blocker G2L/G2M |

## Giới hạn và quyết định triển khai

1. **Không được deploy ứng viên độc lập này làm Rules toàn dự án.** Nó mặc định chặn mọi collection khác, chưa đối chiếu Rules thật, Firestore edition, version và identity của instance. Cần xác nhận database/edition/region trước khi thiết kế nối staging.
2. Nếu sau này áp dụng chính sách chặn publish vào production, nút xuất bản EPUB V49 **sẽ lỗi**. Chỉ triển khai khi đã có API publish được server xác thực và kế hoạch chuyển V49/rollback; không âm thầm gây gián đoạn cho người đang dùng.
3. Rules bảo vệ SDK phía client, **không kiểm soát Admin/server SDK**. Cần IAM tối thiểu, một tuyến writer nguồn duy nhất, recheck đầy đủ mọi chương, pin/permit/revoke/assignment G1R–G2O, epoch CAS tại thời điểm commit G2Q–G2R và audit bất biến. Hiện chưa có trusted publisher hay giao dịch phân tán SQLite–Firestore.
4. Không xử lý các lỗi còn mở: public parent lộ metadata nội bộ, chưa xác thực toàn bộ 160 index/chapter trước publish, ISO timestamp phía client có thể tự chọn, và giấy phép EPUB chuyển thể chưa được duyệt cho nguồn cụ thể.
5. Không thay Canon, gameplay, XP/Xu/Kho, NPC AI, quyền Chủ Thần/Thiên Mệnh hay mở Vạn Giới world thật.

## Chạy lại

```sh
npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore @firebase/rules-unit-testing firebase
node cloudflare/tests/vangioi-g2s-publish-gate.test.mjs
npx firebase-tools@13.35.1 emulators:exec \
  --config tools/vangioi/firebase-emulator-g2s.json \
  --only firestore --project demo-vangioi-g2s \
  'node cloudflare/tests/manual/vangioi-g2s-publish-gate-emulator.mjs'
npm test --prefix cloudflare
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm run build --prefix cloudflare
```

**Kết quả local 27/10/2026:** Rules Unit Testing qua Firestore Emulator thành công, **10 allow + 23 deny**; đã chạy chính hàm xuất bản V49 và xác nhận `permission-denied`; cũng chứng minh server SDK vẫn xuất bản không tăng epoch. Test G2S **5/5 PASS**; Cloudflare **724/724 PASS**; app **103/103 test files PASS**; Functions **2/2 test files PASS**; Wrangler build `--dry-run` PASS. Các lỗi `PERMISSION_DENIED` có chủ đích là kết quả mong đợi trong attack tests. G2S chỉ là prototype Rules cho Emulator; kiểm thử trên Emulator **không** chứng minh an toàn của Firebase production. SHA/CI đối chiếu sau commit.

Rollback: bỏ candidate G2S, hai tệp test, config và liên kết README; giữ nguyên G2M/G2R. Không có migration/dữ liệu thật cần phục hồi.
