# VẠN GIỚI — Nguồn V0.1 và cổng nhập offline

Giai đoạn 1A, ngày 26/10/2026. Chỉ nhập và kiểm tra hồ sơ ở local; chưa có Creator UI, API lưu nháp, cấp quyền hoặc phát hành. Không được dùng báo cáo của công cụ làm chứng nhận server.

## Nguồn và quy tắc làm việc

- Mã nền được đối chiếu tại `1f2fdb14074d99cd1a1542f334175c946c412f49` trên `main`.
- `docs/DUDU-STUDIO-START-HERE-2026-10-20.md`, mục 1/5 và V69/V71.2: làm trên main, không nhánh/ZIP riêng, kiểm thử theo đợt, giữ thông tin riêng tư ngoài repo công khai.
- Master prompt VẠN GIỚI, mục 12–14: kiểm toán trước, triển khai lần lượt; không đổi Canon, dữ liệu thật hoặc phát hành production khi chưa được phép. Quy định này mới hơn chỉ dẫn tự triển khai web cũ. Các thay đổi đợt 1A chưa được push vì push main có thể kích hoạt Pages.
- `docs/DUDU-MASTER-DELIVERY-2026-10-19.md`, Deployment gates: ghi SHA/kiểm thử/giới hạn/rollback, phân biệt commit với deploy.

`source-v0.1/` chứa nguyên byte **10 file** trong gói World Authoring do chủ dự án cung cấp, kèm SHA-256. Không chỉnh các file đó để che xung đột. Bản quy chuẩn và template rời trùng byte với bản trong ZIP. Chỉ copy tài liệu thiết kế và dữ liệu mẫu của dự án; không copy chat riêng hoặc thông tin tài khoản.

## Đối chiếu với master prompt và code

| Nguồn V0.1 | Nguồn hiện hành | Cách xử lý trong đợt này |
|---|---|---|
| `genreId=period` | V66 dùng `era` cho Niên đại | Báo alias và đề xuất era trong normalizedMetadata; không sửa JSON gốc hoặc ID runtime. |
| Tác giả điền `worldRank` | Master: hệ thống/reviewer đánh giá bậc chính thức | Đưa vào requestedWorldRank; officialWorldRank=null. Không chấm bậc bằng số lượng nhiệm vụ, ảnh, NPC. |
| Quy chuẩn II đặt ba F trước hộ chiếu | Bàn giao V69–V71: nhiệm vụ mở đầu → thẻ → khế ước; ba F khảo hạch trong tiến trình sau đó | Ghi xung đột; trial/passport trong JSON chỉ là khai báo chưa tin cậy, không cấp grant. Không tự phân loại trial thành khảo hạch. |
| Tự ghi status approved/published hoặc assetStatus approved | Master: backend có quyền xác nhận | Chỉ kiểm cấu trúc theo schema gốc, kiểm semantic ở draft; báo nhãn tự khai, không xác nhận quyền/duyệt/publish. |
| Ngân sách AI/số main theo rank | Master: không khóa quota hoặc tỷ trọng chưa kiểm thử | Không chuyển các warning quota rank cũ thành tiêu chuẩn công cụ mới. Chưa dùng điểm 30/30/20/20. |
| Schema yêu cầu world hoàn chỉnh, doc cho lưu draft dở | Creator tương lai cần lưu thiếu trường | Công cụ hiện chỉ kiểm cấu trúc: lỗi không làm xóa file, template TODO vẫn là draft. Backend draft sau này cần schema partial riêng, chưa dựng trong 1A. |
| Story Bible chứa secretTruth, toàn bộ NPC knowledge | Master: chỉ người có quyền đọc nội dung ẩn | Report không xuất toàn bộ world/prose; source tác giả vẫn là nội dung riêng. Trước backend phải có projection riêng. |
| Không có storyVersion/series/timeline/owner đã xác thực | Master có các liên kết và chữ ký server | Không tự bịa hoặc ép các trường ấy vào schema V0.1. Cần contract backend tiếp theo trước UI. |
| Trigger/event dạng chuỗi | Master: engine dùng luật được xác nhận | Công cụ không eval hoặc thực thi trigger; PASS cấu trúc không chứng minh playable hoặc nhân quả đúng. |

Đây là các cách xử lý trong **công cụ kiểm tra offline**, chưa phải migration hoặc Canon mới. Còn cần chuẩn hóa schema runtime, nguồn truyện versioned, quyền membership, asset registry, instance và event log theo các giai đoạn sau.

## Chạy công cụ

Python 3.10 trở lên và dependency kiểm JSON Schema:

```sh
python -m pip install -r tools/vangioi/requirements.txt
python tools/vangioi/intake.py contracts/vangioi/source-v0.1/world_example_F.json
python -m unittest discover -s tools/vangioi -p 'test_*.py' -v
python -m unittest discover -s contracts/vangioi/source-v0.1 -p 'test_*.py' -v
```

`intake.py` chỉ đọc một file và in JSON report ra stdout. Không có ghi output tự động, mạng, database, tải ảnh, gọi AI hoặc public route. Không cần API key. Thiếu dependency schema thì dừng, không âm thầm bỏ qua bước kiểm.

- Exit 0: đủ cấu trúc để xem xét như bản nháp offline, không phải QA đạt/publish/khảo hạch.
- Exit 1: sai schema hoặc semantic/tham chiếu.
- Exit 2: lỗi đầu vào, giới hạn công cụ hoặc thiếu dependency.
- Metadata chuẩn hóa giữ worldId/contentVersion, genre alias có báo cáo, bậc chỉ đề nghị. ownerVerified, assetApprovalsVerified và mọi quyền hành động luôn false; luôn yêu cầu backend entry grant.
- SHA-256 ghi nhận đúng bytes tệp đầu vào; không phải chữ ký, bằng chứng quyền sở hữu hoặc chống gian lận.
- Giới hạn 2 MiB/64 tầng/100.000 nút là giới hạn parser của công cụ này, không phải quota sáng tác theo bậc; tương lai có thể chuyển sang nội dung theo arc/chunk sau khi đo thực tế.

## Nghiệm thu và giới hạn

- Bộ gốc: 22 tests PASS.
- Công cụ mới: kiểm schema bắt buộc, kiểu đầu vào sai, khóa JSON lặp, số không hữu hạn, giới hạn parser, ID thiếu, AI vượt quyền, nhãn publish tự khai, cấp S không thành bậc chính thức, alias có báo cáo, thiếu dependency dừng đúng, không lộ prose trong lỗi schema.
- Không thay source runtime, HTML/CSS, Rules, Wrangler, pool99/100, save, UID hoặc workflow deploy. Chưa có kiểm thử browser/live backend cho đợt này vì chưa nối vào ứng dụng.
- Bộ V0.1 nguyên gốc có thể có lỗ hổng ngoài các ca regression; wrapper kiểm schema trước khi gọi semantic. Reachability gốc chỉ là đồ thị cảnh bỏ qua điều kiện, chưa phải chứng minh mọi profile hoàn thành được. PASS không chứng minh bản quyền, lore, độ khó, ảnh đẹp, budget hoặc an toàn runtime.

Rollback source: hoàn nguyên commit chỉ thêm contracts/tools và dòng bàn giao. Không có migration hoặc dữ liệu người dùng cần khôi phục.
