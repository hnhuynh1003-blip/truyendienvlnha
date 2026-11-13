# G2E — Xác minh nguồn gốc backup giấy phép trong fixture

27/10/2026. Kế thừa G2D `a617f3a` (572 Worker / 497 app / 10 Functions PASS và cả hai workflow GitHub Actions SUCCESS). G2D có SHA-256 kiểm toàn vẹn metadata, nhưng người sửa backup có thể tính lại digest. G2E thêm **phong bì HMAC-SHA256 chỉ trong fixture** để diễn tập việc một host đáng tin cậy ký snapshot và host khôi phục từ chối backup chưa được host đó ký.

## API và khóa tin cậy

`cloudflare/src/vangioi-permit-fixture-provenance.mjs` xuất:

`createFixturePermitBackupProvenance({recovery,projectId,environment:'fixture',issuerId,keyId,secretKey,now,maxAgeMs,maxFutureSkewMs})`

- `recovery` là đối tượng G2D nội bộ với `createBackup()` và `restoreBackup()`; không do JSON hoặc trình duyệt cấp.
- `issuerId` và `keyId` được host tin cậy cấu hình cứng theo đợt kiểm thử; **không lấy từ client để quyết định authority**.
- `secretKey` phải là `Uint8Array` từ 32–128 byte, do host giữ ngoài repo, không in vào log/receipt/backup, không cấp cho tác giả, người đọc hoặc khách. WebCrypto import khóa HMAC **không xuất được**. Test có khóa tổng hợp dùng riêng trong fixture; tuyệt đối không dùng khóa ví dụ cho dữ liệu thật.
- `now` là đồng hồ đáng tin cậy của host. Mặc định `maxAgeMs=7 ngày`, tối đa 30 ngày; `maxFutureSkewMs=60 giây`, tối đa 5 phút. Đây chỉ là ngưỡng diễn tập, **chưa phải chính sách retention production**.

| Phương thức | Ý nghĩa |
| --- | --- |
| `createSealedBackup()` | G2D đọc snapshot nguyên tử, host tạo `createdAt`, UUID `nonce`, ký HMAC trên format/project/environment/issuer/key/timestamp/nonce/`backup.digest` |
| `restoreSealedBackup(envelope)` | Sao chép input, từ chối field/phạm vi/issuer/key/đồng hồ sai, **xác minh MAC trước khi gọi G2D**; G2D sau đó tái kiểm digest và chỉ khôi phục vào fixture trống |

Envelope `permit-fixture-seal-1` có các field cố định: `format`, `projectId`, `environment`, `issuerId`, `keyId`, `createdAt`, `nonce`, `backup`, `mac`. `backup` giữ nguyên cấu trúc G2D `permit-fixture-backup-1`; chữ ký bảo vệ digest và các claims, còn G2D tái kiểm mọi hàng dữ liệu với digest. HMAC verify thực hiện bằng `crypto.subtle.verify`, không tự so chuỗi MAC bằng so sánh thời gian biến thiên.

## Những điều chữ ký không chứng minh

1. **Không thay thế G1R authority:** một bản sao *được ký thật* nhưng cũ vẫn có thể ghi `active` sau khi G1R đã revoke. G2B phải đối soát checkpoint và toàn bộ projection, G1V đồng bộ sự kiện còn thiếu, G1Y kiểm nguồn/permit/hold ở thời điểm dùng. Không để kết quả HMAC tự cấp quyền phát hành, phiên chơi, EXP, Xu hoặc Kho.
2. **Không chống replay bằng nonce một mình:** UUID giúp hai phong bì khác nhau, nhưng G2E không lưu sổ nonce đã tiêu thụ. Một backup hợp lệ còn hạn có thể được dùng lại **chỉ vào fixture rỗng**. Stale rights phải được phát hiện bằng G2B/G1Y. Không hứa chống rollback toàn hệ thống.
3. **Không tự quản lý secret:** cùng khóa HMAC cấp quyền ký và xác minh. Ai đánh cắp khóa có thể tạo MAC hợp lệ; tính tin cậy phụ thuộc quản lý khóa, issuer allowlist, key ID và đồng hồ host. Key rotation ở fixture hiện là thay cấu hình host, khóa cũ bị từ chối mặc định, không có KMS/vault/audit trail thật.
4. **G2D vẫn tồn tại để tương thích:** phương thức `restoreBackup` gốc có thể được host thử độc lập. G2E là lớp tùy chọn diễn tập; **chưa có production consumer bắt buộc đi qua lớp này**. Không nhầm tính năng library/service thành bảo đảm chặn mọi đường restore nếu sau này ai đó nối route khác.

## Các ca kiểm thử

- Seal/import active và revoked với event history; G2B audit đúng sau restore; không rò rỉ private text/proof/key.
- Sai MAC, chữ ký giả, chỉnh key/issuer/project/mode/timestamp/nonce/digest; khóa được xoay; status bị sửa rồi tính lại digest cũng không vượt qua HMAC.
- Backup bị sửa nhưng giữ digest cũ vượt qua HMAC claims, **bị G2D checksum từ chối**; không có dữ liệu từng phần.
- Backup có chữ ký thật trước khi revoke → G2B phát hiện `checkpoint-lag`; G1V bù tiếp, G1Y vẫn chặn world revoked.
- Khóa sai, hết hạn, lệch thời gian; không khôi phục đè kho đã dùng; SQL inject fail rollback; đột biến input trong lúc verify không đổi kết quả; không nhập module vào Worker hay author HTTP.

## Ranh giới và điều kiện bước sau

G2E không bật production/staging database, không thay Firestore Rules, không thêm migration, không cài secret từ client, không kết nối Thư viện thật, không sửa quyền tác giả, không tự duyệt world hoặc phát thưởng. Chưa giải quyết retention, custody tại nguồn, KMS thực, khóa luân phiên/phục hồi, sổ nonce chống replay hay quy trình cấp quyền service-to-service. Các quyết định đó phải trình Du trước khi xây consumer hoặc endpoint thật.

Rollback G2E: chỉ bỏ module/test/docs của đợt này; G2D fixture backup và các hợp đồng cũ giữ nguyên. Không có dữ liệu production được tạo hoặc bị sửa trong đợt này.
