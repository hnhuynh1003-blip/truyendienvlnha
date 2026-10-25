# VẠN GIỚI — Bộ hồ sơ tạo tiểu thế giới V0.1

**Ngày soạn:** 25/10/2026  
**Trạng thái:** ĐỀ XUẤT CHỜ DU DUYỆT — chưa áp dụng vào Thiên Mệnh v71.11.

**Điều chỉnh cùng ngày:** Không còn quota cứng về số nhân vật/NPC, địa điểm hay ảnh. Tách `cast` (nhân vật trong truyện) và `npcs` (actor có tương tác), thêm `playerEntryProfiles` và `entryPolicy`; mở rộng `map/place/scene/view/hotspot` cho VẠN GIỚI. Mẫu cũ cần bổ sung các trường này khi nhập lại.

**Bổ sung tiếp:** Có hệ thống ảnh nhân vật theo `characterId`: `characterVisuals` (giữ nét nhận dạng, tuổi/nghề và các biến thể ảnh), `characterAppearances` (hiện/ẩn theo cảnh/thoại/biến cố), cùng CG nhiều nhân vật bằng `view.depictedCharacterIds`. Không ép mọi NPC hiện hình hoặc mọi nhân vật có ảnh.

## Mục tiêu

Bộ hồ sơ này dành cho **tab VẠN GIỚI**, giúp chủ dự án và tác giả bên ngoài chuẩn bị tiểu thế giới từ truyện do mình sáng tác, tự chọn hình ảnh, khai báo NPC, nhiệm vụ, vật phẩm, cửa hàng và các kết thúc; cùng một dữ liệu có thể dùng cho nhập thủ công, biên tập bằng biểu mẫu và hệ thống nhập tự động trong tương lai. **Thiên Mệnh là app hệ thống của người chơi**, không phải nơi tác giả dựng thế giới.

**Không có giao diện nhập liệu hay kết nối production nào được tạo trong gói này.** Đây là hợp đồng nội dung, mẫu dữ liệu và công cụ kiểm tra sơ bộ.

## Các tệp

1. `QUY_CHUAN_TAC_GIA_THE_GIOI_V0_1.md` — tài liệu chính: khung phân cấp, tiêu chí F–S, quy trình, quyền tác giả, QA, cách tích hợp.
2. `world.schema.json` — JSON Schema dự kiến cho một phiên bản tiểu thế giới.
3. `world_example_F.json` — tiểu thế giới F hoàn chỉnh ở mức khai báo mẫu, không phải nội dung đã phát hành.
4. `world_template.json` — mẫu để tác giả nhân bản và thay nội dung.
5. `validate_world.py` — kiểm tra cấu trúc tối thiểu, tham chiếu ID, phân cấp và cổng phát hành bằng thư viện chuẩn Python; không thay thế trình kiểm tra nội dung và JSON Schema đầy đủ.
6. `GIAO_DIEN_EDITOR_TUONG_LAI.md` — phác đặc tả các màn nhập, tự tải ảnh, chế độ nhập từ truyện và quyền người sáng tác.
7. `test_validate_world.py` — các ca kiểm tra hồi quy cho công cụ preflight.
8. `QUY_CACH_BAN_DO_CANH_VAT_PHAM_V0_1.md` — quy cách nhập nhiều map/cảnh/góc nhìn và nhặt đồ bằng chữ hoặc ảnh; ví dụ Quan Đạo, hiện đại, tu tiên.
9. `QUY_CACH_HINH_NHAN_VAT_V0_1.md` — quy cách ảnh nhân vật theo hồ sơ tạo hình, độ tuổi/nghề, portrait/sprite/CG, biểu cảm và thời điểm xuất hiện có điều kiện.

## Quy trình sử dụng ngay

1. Đọc tài liệu quy chuẩn, nhất là cột **[GIỮ] / [ĐỀ XUẤT] / [CHƯA CHỐT]**.
2. Viết cốt truyện hoàn chỉnh trước: mở đầu, bí mật, các biến cố, kết thúc, luật của tiểu thế giới.
3. Sao chép `world_template.json`, đổi `worldId`, `title`, `cast`, `characterVisuals`/`characterAppearances` nếu có ảnh nhân vật, `npcs`, `playerEntryProfiles`, `entryPolicy`, `maps/places/scenes/views/hotspots`, vật phẩm, nhiệm vụ và kết thúc.
4. Tự chọn hình minh họa, ghi quyền sử dụng và ID ảnh trong hồ sơ. Ảnh chưa tải lên thì để `assetStatus: "pending"`, không đổi sang `approved`.
5. Chạy `python3 validate_world.py path/to/world.json` để kiểm tra nền tảng.
6. Biên tập viên duyệt lore, logic nhánh, giá/vật phẩm/EXP, nội dung an toàn, bản quyền ảnh, thử chơi và duyệt phát hành.

Mẫu dữ liệu sử dụng mã khóa tiếng Anh để dễ tích hợp, còn nội dung hiển thị cho người chơi có thể viết hoàn toàn bằng tiếng Việt.

## Trạng thái và giới hạn

- Không tự sửa registry hệ thống 99/100, quan hệ người chơi, save, thưởng, EXP, NPC AI hoặc bản v71.11.
- Không tự biến 48 seed ở V66 thành phó bản playable.
- Bảng chỉ tiêu bậc F–S là **đề xuất**, không phải Canon đã khóa.
- Công cụ kiểm tra tĩnh chỉ giúp tác giả phát hiện lỗi. Chỉ backend/Game Engine sau khi được tích hợp mới có quyền xác nhận hoàn thành, trả thưởng, cập nhật kho và trạng thái thế giới.

