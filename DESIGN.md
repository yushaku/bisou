# Bisou design system

Hướng đã chốt: **A · Vải mềm tinh tế**, phía trái của [ảnh tham chiếu](docs/design/reference-ab.webp). Đây là hướng cho màn hình mới; không cần chọn lại phong cách cho từng tính năng.

Bisou là góc riêng của hai người. Cảm giác cần giữ: ấm, gần gũi, mềm và có chút thủ công. Ảnh, câu chuyện và điều ước của người dùng luôn nổi bật hơn phần trang trí.

## Quy tắc thiết kế

- Chất vải chỉ gợi nhẹ trên nền và thẻ. Len/nỉ rõ nét dành cho vài minh hoạ điểm nhấn; không biến toàn app thành thế giới đồ chơi.
- Bề mặt mờ, bóng mềm, nút hơi đệm và nhấn nhẹ. Tránh nhựa bóng, đường may dày khắp nơi, bóng cứng hoặc chuyển động nhún liên tục trong hướng A.
- Giữ tinh thần kem–đào ở bản sáng và ấm, dịu ở bản tối. Khi dùng bảng màu khác, giữ chất liệu và độ dễ đọc; không ép mọi theme về màu đào.
- Journal và Sticker vẫn là lựa chọn riêng. Không trộn đặc trưng của chúng vào Soft hoặc tạo một phong cách riêng cho từng màn hình.
- Bảng màu, phong cách và nền phải tiếp tục độc lập, dùng chung component. Thêm theme không được kéo theo một bản UI riêng.
- Ảnh nhật ký giữ chất ảnh thật. Minh hoạ đôi chỉ là trang trí, không thay ảnh đại diện hay giả làm danh tính của người dùng.
- Thẻ nhật ký đặt lời kể và dòng ghi chú trước lưới ảnh, sau phần người viết và tiêu đề kỷ niệm nếu có.
- Logo là trái tim nỉ màu đào, giữ màu nhận diện khi đổi theme; không tô lại theo màu hành động.
- Lời giao diện gần gũi, ngắn và cụ thể: “Góc nhỏ của hai đứa”, “Một điều ước nhỏ”, “Mở hũ”. Không đưa lời giới thiệu design system vào luồng sản phẩm
- Bánh răng trên thanh đầu mở trang Cài đặt toàn màn hình, có nút quay lại. Hồ sơ nằm trên cùng; các mục gom vào thẻ bo góc với đường ngăn mảnh, giá trị hiện tại ở bên phải. Chạm từng mục để mở sheet riêng, giữ bảng màu và chất liệu chung của Bisou.
- Thanh dưới có năm vị trí: Nhà, Nhật ký, nút cộng tròn nhô lên, Điều ước, Vườn. Nút cộng mở lựa chọn viết nhật ký hoặc thêm điều ước; không dùng thêm nút nổi trên hai trang này. Vườn mở thẻ hôm nay và vườn chung của hai đứa. Thanh này cũng có trong Cài đặt khi hai người đã ghép đôi.
- Khung cắt ảnh dùng kéo hoặc phím mũi tên để dời ảnh; chụm hai ngón, cuộn hoặc phím + / - để thu phóng, không hiện thanh trượt.
- Hũ điều ước dùng phương án A: hũ thuỷ tinh nét vẽ tay, giấy gấp lấy màu từ các token chart. Hũ của mình có mức 0, 1, 2, 3, 4 tương ứng 0, 1 đến 2, 3 đến 5, 6 đến 9, từ 10 điều ước đang mở; hũ người kia chỉ hiện mức 0 khi trống hoặc mức 2 khi có điều ước, không lộ số lượng.
- Hũ người kia trống thì làm mờ hình hũ, kèm lời giải thích đọc được bằng trình đọc màn hình. Tia lấp lánh đứng yên khi bật giảm chuyển động; mỗi hũ có ID clipPath riêng.
