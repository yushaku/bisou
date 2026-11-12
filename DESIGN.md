# Bisou design system

## Nền tảng

- Hướng đã chốt: **A · Vải mềm tinh tế**, phía trái của [ảnh tham chiếu](docs/design/reference-ab.webp). Dùng cho màn hình mới, không chọn lại phong cách theo tính năng.
- Cảm giác: ấm, gần gũi, mềm, thủ công. Ảnh, câu chuyện, điều ước của người dùng nổi hơn trang trí.
- Chất vải chỉ gợi nhẹ trên nền và thẻ; len/nỉ rõ nét chỉ cho vài minh hoạ điểm nhấn.
- Bề mặt mờ, bóng mềm, nút hơi đệm. Tránh nhựa bóng, đường may dày, bóng cứng, chuyển động nhún liên tục.
- Journal và Sticker là lựa chọn riêng: không trộn vào Soft, không tạo phong cách riêng cho từng màn hình.

## Màu, theme, logo

- Kem đào ở bản sáng, ấm và dịu ở bản tối. Bảng màu khác giữ chất liệu và độ dễ đọc, không ép về đào.
- Bảng màu, phong cách, nền độc lập nhau, dùng chung component; thêm theme không kéo theo UI riêng.
- Logo: trái tim nỉ màu đào, giữ màu khi đổi theme, không tô theo màu hành động.
- Toast dùng ding (`@yusufceng1z/ding-react`), icon gốc, dáng Dynamic Island: viên thuốc đảo màu theo theme (nền `--foreground`, chữ `--background`). Xem `src/client/styles.css`.

## Lời giao diện và ảnh

- Lời ngắn, gần gũi, cụ thể: “Góc nhỏ của hai đứa”, “Một điều ước nhỏ”, “Mở hũ”. Không đưa lời giới thiệu design system vào luồng sản phẩm.
- Ảnh nhật ký giữ chất ảnh thật. Minh hoạ đôi chỉ để trang trí, không thay ảnh đại diện hay giả làm danh tính.
- Khung cắt ảnh: kéo hoặc phím mũi tên để dời; chụm hai ngón, cuộn hoặc phím + / - để thu phóng; không thanh trượt.

## Điều hướng và Cài đặt

- `.liquid-glass`: utility bề mặt chung cho mọi theme.
- Thanh dưới (cũng có trong Cài đặt khi đã ghép đôi): Nhà, Nhật ký, nút cộng tròn nhô lên, Điều ước, Vườn.
  - Island liquid glass kiểu iOS: bo 4 cạnh, lơ lửng, lề hai bên và dưới (safe area), nền bán trong suốt theo `--card`, `backdrop-blur`/saturate, viền nhẹ, bóng mềm, dễ đọc trên sáng và tối.
  - Nút cộng mở lựa chọn viết nhật ký hoặc thêm điều ước. Trên Nhật ký mở thẳng sheet hai tab Nhật ký và Lời nhắn nhỏ; không thêm nút nổi trên hai trang này.
  - Vườn mở thẻ hôm nay và vườn chung.
- Cài đặt: bánh răng trên thanh đầu mở trang toàn màn hình, có nút quay lại. Hồ sơ trên cùng; các mục trong thẻ bo góc, đường ngăn mảnh, giá trị hiện tại bên phải; chạm mục mở sheet riêng.

## Home

- Thứ tự: banner chọn giai đoạn (nếu có), Câu hỏi hôm nay, Deep talk, Bài hôm nay, Các câu hỏi quan trọng mà chúng ta đã thống nhất, Sắp tới.
- Mẫu khối: tiêu đề `font-heading text-xl` ngoài thẻ, nút phụ như “Xem tất cả” bên phải tiêu đề, nội dung là thẻ bên dưới.
- Câu hỏi hôm nay, bốn lượt: viết, đợi người ấy (theo tên), người ấy đã úp thẻ tới lượt mình, cùng lật.
  - Tên thật hiện cả trước và sau khi lật.
  - Lật và tưới một lần trên thiết bị, rồi giữ hai câu trả lời ngửa ở mọi nơi.
  - Lựa chọn dùng chip ToggleGroup; chọn không ghi chi tiết hoặc để sau thì ẩn ô chữ.
  - “Thôi” để huỷ; “Để sau” chỉ là lựa chọn trả lời.
- Deep talk: player hiển thị một thẻ với nhãn loại; hai lựa chọn và thang 1 đến 10 là nội dung tĩnh, không ghi câu trả lời.

## Nhật ký và Lời nhắn nhỏ

- Thẻ nhật ký: lời kể và dòng ghi chú trước lưới ảnh, sau phần người viết và tiêu đề kỷ niệm (nếu có).
- Form (cả hai tab):
  - Tiêu đề chỉ cho trình đọc màn hình, không hàng tiêu đề, không nút đóng.
  - Form nhật ký không có gợi ý lưu hay bộ đếm ký tự.
  - Chung khoảng cách, vùng nội dung cuộn, chân form cố định, vị trí nút chính, đệm safe area.
  - Sheet cao theo tab cao hơn, tối đa bằng khung nhìn; hai tab giữ cùng chiều cao.
  - Mặc định theo mục đang xem; giữ nội dung cả hai tab khi chuyển.
  - Ô câu chuyện giãn lấp phần chênh lệch; nút thêm ảnh giữ kích thước thường.
  - Bốn ô lời nhắn nhỏ cao bốn dòng, tự giãn; không nhắc điền đủ bốn phần.
- Thời điểm gửi (ToggleGroup): “Gửi ngay” (mặc định), “Sau 8 tiếng”, “Tuỳ chọn” (ô ngày giờ theo múi giờ thiết bị).
  - Nút chính: “Gửi cho {partner}” hoặc “Hẹn gửi”.
  - Hẹn giờ tự gửi khi đóng app; phong bì ghi “Hẹn gửi {ngày giờ}”.
  - Trước khi gửi có thể sửa nội dung, đổi lịch, xoá; sửa nội dung giữ nguyên lịch.
- Phong bì: màu nước vẽ tay, hai cột, giấy kem, mực nâu, nắp gập chữ V ở mặt sau.
  - Chưa mở: dấu sáp đỏ hình trái tim. Đã mở: nắp hé, dấu sáp vỡ.
  - Tem hình bông hoa (không dùng trái tim).
  - Dấu bưu điện lượn sóng chỉ khi đã gửi; ghi “Gửi {partner}” hoặc “Từ {partner}”.
  - Trạng thái và một dòng xem trước ở chú thích bên dưới; lời nhắn đang chờ mở không có xem trước, không có ngày.
- Hộp thư lời nhắn nhỏ nghiêng nhẹ hai lần rồi nghỉ.

## Hũ điều ước

- Phương án A: hũ thuỷ tinh nét vẽ tay, giấy gấp lấy màu từ token chart. Mỗi hũ có ID clipPath riêng.
- Hũ của mình mức 0 đến 4 ứng với 0, 1 đến 2, 3 đến 5, 6 đến 9, từ 10 điều ước đang mở.
- Hũ người kia chỉ mức 0 (trống) hoặc 2 (có điều ước), không lộ số lượng. Khi trống: làm mờ hũ, kèm lời giải thích cho trình đọc màn hình.

## Vườn

- Lộ trình giữ bản đồ giai đoạn bằng hình đảo. Chạm giai đoạn (kể cả hiện tại) mở sheet xem vườn và thẻ đã trả lời.
- Hai đứa cùng chọn thì mở giai đoạn mới ngay. Banner chọn giai đoạn ở Home và Vườn: gọi tên người chọn, cho đồng ý, chưa hoặc rút lại.
- Mở giai đoạn có cảnh mừng nhỏ cùng chất liệu với cảnh tưới cây, hiện một lần trên thiết bị.
- “Điều cần bàn trước khi {stage}”: chỉ nhắc, không khoá.
  - Nằm trên màn Vườn của giai đoạn xa nhất; sheet giai đoạn không có.
  - Thẻ bo góc; mỗi dòng: tên bộ thẻ, câu hỏi tối đa hai dòng, nhãn trạng thái (tới lượt mình, chưa ai trả lời, đợi người ấy, hai đứa đã bàn).
  - Hiện ba câu, ưu tiên tới lượt mình; có nút xem tất cả.
  - Chạm một câu mở sheet trả lời tại chỗ, không sang trang chậu cây.

## Hộp thẻ

- Lưới hai cột, thẻ cao bằng nhau; ảnh nền chữ nhật dọc phủ toàn thẻ, biểu tượng trọn trong nửa trên.
- Tên hộp một dòng; tổng số thẻ trong panel kính, chữ nhỏ và nhẹ.
- Tên thật và mô tả trên `.liquid-glass` sát đáy: cao theo nội dung, bo hai góc trên, viền sáng, bóng mềm.
- Nhãn giá/Miễn phí ở góc trên trái ảnh, nền card đặc; không nhãn xem thử. Ảnh lỗi giữ nền card.
- Bộ đếm đã xem (trên điện thoại này) gần thẻ chơi; hộp xem thử chỉ đếm thẻ xem thử. Không aria-live, vùng thông báo vẫn nằm trên thẻ.
- Thẻ chơi: tỷ lệ 5:7, mặt màu hộp, cạnh chồng phía sau, tên hộp Lora nghiêng ở góc dưới. Vuốt và nút đổi thẻ cùng chuyển động.
- Thanh điều khiển: Thẻ trước bên trái, nút biểu tượng rút ngẫu nhiên ở giữa (vùng chạm 44px), Thẻ tiếp là nút chính bên phải.

## Linh vật (mascot)

- Hai nhân vật len đã duyệt từ minh hoạ đôi ở Home, mặc định bạn gái; chọn bằng hai ô nhỏ có ảnh trong Cài đặt, lưu riêng trên thiết bị.
- Đứng yên, nền trong suốt, chỉ điểm nhẹ ở trạng thái trống, đợi tải đầu, lỗi, ăn mừng; không thay ảnh đại diện.
- Quy tắc và tiêu chí: [Mascot](docs/product/mascot.md).

## Chuyển động

- Luôn tôn trọng giảm chuyển động: cảnh mừng mở giai đoạn, hộp thư và tia lấp lánh của hũ đứng yên; đổi thẻ dùng mờ chéo.
