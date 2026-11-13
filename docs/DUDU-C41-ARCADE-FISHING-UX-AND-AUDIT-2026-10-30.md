# DUDU Studio — C4.1: kiểm kê gameplay và nâng cấp câu cá / DUDU FUN

**Ngày:** 30/10/2026. **Baseline:** `81bc56200ae262fa595ede5399e368dd8f1f32a6` (C3.1 trên `main`).

## 1. Định nghĩa trạng thái

- **Có mã main:** cấu trúc và đường gọi chức năng thực sự hiện diện trên `main`; không mặc định đã chạy thành công với tài khoản Firebase production.
- **QA Node:** test mô phỏng và kiểm tra đơn vị tại checkout này; không đại diện cho Android/iOS, Chrome/Safari, Firebase Console hay người chơi thật.
- **C3.1 Rules:** mã `firestore.rules` có bản sửa; tài liệu C3.1 cho biết chủ dự án đã publish C3.0 trước đó, **chưa có bằng chứng C3.1 đã publish**. Không tự deploy hoặc mở rộng quyền.

## 2. Kiểm kê từ mã nguồn C3.1

| Hạng mục | Đã có trên main | Khoảng trống/giới hạn quan sát được | Bước đề xuất |
| --- | --- | --- | --- |
| Trạm Neon (phòng net) | 1–3 dàn máy, CPU, GPU/VGA, Mạng, LED, tản nhiệt, tăng tốc và ba hợp đồng một lần; tự tạo Xu **Arcade** khi tab chạy | Chưa có lượt khách, bố trí khu phòng, nội thất/bàn ghế, chi phí vận hành và mục tiêu phòng net nhiều cấp; ba hợp đồng một lần chóng hết | C4.2 thiết kế vòng phục vụ khách + chi phí cục bộ, nhiệm vụ phát triển theo từng cấp, ảnh/CSS phòng có thay đổi nhìn thấy được |
| Địa Tầng 07 (đào quặng) | 10 quặng; 3 địa tầng; cuốc, đèn, xe, khoan, máy dò, phá mạch, sửa và bán bằng Xu Arcade; đếm đã phát hiện kể cả sau bán | Vẻ ngoài khoáng sản là glyph đơn giản; sổ chỉ hiển thị danh sách chứ chưa có trang vật mẫu, thông tin hiếm/địa điểm; thao tác đào lặp lại nhiều | C4.3 triển lãm khoáng vật riêng, phẩm cấp + sinh cảnh quặng; chuỗi khám phá ngắn và nâng cấp dụng cụ có quyết định thực tế |
| Vườn Sương (câu cá) | Trồng cây, thu hoạch, mồi từ hồ, cần câu và nâng hồ, Xu Arcade riêng; C4.1 có thêm thả–đợi–thu, 8 loài, kỷ lục kích thước và sổ cá | Chưa có nhiều vùng nước, mồi phân loại, thử thách thời tiết, cá độc đáo minh họa riêng; vẫn chung trang với nông trại | C4.4 mở vị trí câu theo tiến trình, bộ đồ nghề và ảnh minh họa theo loài; đánh giá nhịp thả/thu trên điện thoại trước |
| Vé Cào Vạn Phúc | Giá 10 Xu, 13 mức thưởng đến 10.000, 10 ô dò số + 5 quà, thao tác tap/drag mở ô, giao dịch UID mua/nhận có biên nhận | Mới là lật lớp phủ theo ô, chưa phải cảm giác cào lớp bạc; RNG khởi tạo ở client chưa được server xác minh; thưởng đang áp vào Ví chính | C4.5 thiết kế lớp phủ cào thực tế và hoạt cảnh, nhưng **không mở rộng quy mô/trọng số phát thưởng** khi chưa chốt nguồn RNG đáng tin |
| Hộp Mù Vạn Bảo | 1 hộp miễn phí/ngày UTC, 20 Xu/hộp trả phí, 19 kỷ vật E–SSS, vật phẩm trùng trả 4 Xu, nhập Kho + Sổ trong transaction UID | Tỉ lệ SSS cực thấp; thiếu trình xem bảo vật có kích thước lớn, diễn hoạt mở theo phẩm chất và bộ sưu tập có ngữ cảnh; client RNG chưa tin cậy cho public | C4.6 nâng triển lãm kỷ vật/hiệu ứng mở hộp; kế thừa ID, hình ảnh và transaction C2.9, không tạo hộp song song |
| Kho & Sổ sưu tầm | Mua, dùng, bán, lịch sử Kho, sổ Vạn Bảo/nhặt vật phẩm theo UID; hệ art V13 | Chưa xác minh tất cả item có hình thẩm mỹ đồng nhất, trạng thái qua hai thiết bị/tabs và vật phẩm cũ trùng | Phân loại trùng/lỗi thời theo ảnh hưởng giao dịch và quyền sở hữu; đề xuất ẩn khỏi shop trước, không xóa item đã thuộc người chơi |
| Điện thoại | 16 ứng dụng trên main theo manifest, layout điện thoại hiện hành; FUN/Arcade có trang riêng | Header và vùng giới thiệu chồng chất làm giảm chỗ chơi trên điện thoại; cần QA 320–430px và desktop | C4.1 gọn FUN; C4.7 bộ quy chuẩn typography/spacing, sheet và toast dùng chung cho các app |
| Sandbox → Main | C2.1–C2.9 đã đưa NPC, phong bao, Kho, Market, nhiệm vụ, FUN, Arcade, EPUB vào đường chạy main | `lab-v445` chỉ Sandbox; ký gửi/đấu giá chỉ draft; tặng quà tác giả đã ngừng; dữ liệu test local không phải quyền sở hữu thật | Không chuyển riêng demo, draft escrow/auction hay phần thưởng giả; chỉ đưa chức năng có chủ sở hữu, receipt và QA production đầy đủ |
| Khác | C3.1 có sửa EPUB preflight + mở công cụ biên tập tác giả trong mã; reset mùa vẫn khóa | Chưa chứng minh Rules C3.1 đã Publish hay import/edit EPUB live; cần thử trên Firebase thực | Chủ dự án publish đúng Rules C3.1 nếu chưa, sau đó thử admin EPUB theo quy trình; không sửa Rules trong đợt giao diện |

## 3. Thay đổi C4.1

1. **Câu cá có chu kỳ rõ:** khi thả tiêu một mồi; chờ 3–6 giây để phao báo cá cắn; bấm thu trong 25 giây. Không có Xu/cá khi vừa thả. Nếu người chơi bỏ qua cửa sổ, mồi đã dùng và không nhận thưởng; phao và trạng thái phản hồi ngay trên hồ.
2. **Tám loài và sổ cá:** năm loài thường/quý, ba loài hiếm hơn; mỗi lần câu thành công ghi ID loài, số lần bắt và kích thước tốt nhất. Giữ nguyên ngưỡng cá hiếm theo cần/hồ và giá trị Xu Arcade hiện hành (cá thường/hiếm); chỉ mở rộng lựa chọn loài hình tượng, không chuyển vào Kho hoặc ví hệ thống.
3. **An toàn dữ liệu cũ:** giữ `dudu-personal-arcade:v1:<uid>`, `version:1`, số Xu, `fish`, `rareFish`, mồi, cần câu, ruộng và quặng; thiếu trường mới được mặc định rỗng. Không tự suy đoán các loài từng câu trước C4.1. Một dây câu đang chờ tồn tại sau tải lại; nhận cá tối đa một lần từ dây đó.
4. **UI FUN gọn:** bỏ một hàng tiến trình và mô tả lặp trong đầu trang. Header hiện tên chế độ, lượng Xu và lượt miễn phí; đổi nhãn tab hiển thị thành **Vạn Bảo / Vé Cào**. Không thay giá, tỷ lệ hay trạng thái thưởng C2.9.
5. **Cache:** nâng query version cho đúng JS/CSS đã thay trong `index.html`.

## 4. Cổng QA và giới hạn

- Chạy `node --test tests/*.test.cjs` và `node --test functions/tests/*.test.cjs`; kiểm `git diff --check`.
- Trên Android/iPhone nên thử: mở Arcade → Vườn Sương → đợi bọt → lấy mồi → thả → nhìn phao → thu; thoát vào lại khi đang chờ cá; quá 25 giây không nhận thưởng; sổ giữ cá sau khi reload; đổi UID không lộ dữ liệu của tài khoản trước.
- Kiểm khung 320/375/390/430px và desktop, đặc biệt chiều cao phone và việc nút thu câu không bị che; browser/thiết bị thật **chưa xác nhận** ở lúc viết tài liệu.
- Không đổi `firestore.rules`, giao dịch Ví/Kho thật, seed vé cào/hộp mù, reset mùa, Worker hoặc mã Vạn Giới.

## 5. Chuỗi đợt sau C4.1 (mỗi đợt giao diện + engine + test + QA mobile)

1. **C4.2 — Neon Tycoon:** phòng net sống động, tuyến khách/ghế/máy, doanh thu/chi phí và hợp đồng phát triển nhiều giai đoạn, tương thích save hiện tại.
2. **C4.3 — Địa Tầng 07:** sổ địa tầng dạng bảo tàng, cách phân biệt mẫu quặng và độ hiếm, bản đồ khai thác/khám phá thay cho click lặp.
3. **C4.4 — Hồ câu:** tách trải nghiệm câu khỏi vùng trồng cây mà không tách save; vùng nước/mồi/cần, kích thước và cá huyền thoại minh họa.
4. **C4.5 — Vé Cào:** lớp phủ bạc và cào bằng tay/chỉ, trình diễn kết quả; chốt an toàn RNG với chủ dự án trước mọi thay đổi kinh tế.
5. **C4.6 — Vạn Bảo:** showcase kỷ vật, hiển thị thiếu/đã có, mở hộp theo phẩm chất trên chính catalog 19 món.
6. **C4.7 — Thiết kế đồng bộ:** điện thoại, Market, Kho, Sổ, hồ sơ, Thư viện; gộp thông báo/toast và tối ưu chiều cao app.
7. **C4.8 — QA Sandbox/Main:** kiểm tính năng còn chênh, chọn chuyển phần hữu ích có receipt/owner-bound; loại đề xuất thừa, không sao chép account test.

**Điều kiện phát hành từng đợt:** test hồi quy; xác nhận không ghi sai Ví/Kho; thử giao diện mobile/desktop; đối chiếu HEAD, commit lên `main` khi sạch. Firebase production vẫn là cổng riêng.
