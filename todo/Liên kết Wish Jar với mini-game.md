Hầu hết các tính năng \*\*Wish Jar\*\* (Hũ điều ước) trên app cặp đôi đều rơi vào cảnh \*\*"nghĩa địa ý tưởng"\*\*: hai người hào hứng thêm cả chục gạch đầu dòng lúc mới tải app, rồi bỏ quên luôn không bao giờ mở lại.

Biến \`Wish Jar\` thành \*\*mini-game chọn kèo hẹn hò\*\* giải quyết cùng lúc 2 việc cho Bisou: xử lý nỗi đau lặp lại hàng tuần (\*"Tối nay ăn gì / Cuối tuần làm gì?"\*) và tạo ra \*\*thói quen mở app định kỳ\*\* mà không cần phụ thuộc vào native widget.

---

### 1. Chuẩn hóa nhẹ dữ liệu cho Wish Jar (Input)

Để mini-game không bị bốc nhầm kèo "đi Đà Lạt" vào tối thứ 4 đang mưa, mỗi item trong \`Wish Jar\` chỉ cần thêm \*\*2 tag tùy chọn (không bắt buộc)\*\* lúc tạo:

\* \*\*Thời lượng / Bối cảnh:\*\* \`Tối nay (1–2h)\` · \`Cuối tuần\` · \`Ở nhà\` · \`Đi chơi xa\`
\* \*\*Chi phí (tùy chọn):\*\* \`0đ\` · \`Nhẹ nhàng\` · \`Chịu chi\`

Giữ việc nhập tag thật gọn (chạm 1 icon là xong) để không làm mất cảm giác tối giản của Wish Jar.

---

### 2. Ba cơ chế Mini-game (từ dễ làm đến gây nghiện)

Vì Bisou chạy trên Cloudflare Workers + D1 + Queues (bản free), các cơ chế này đều thiết kế để \*\*chơi bất đồng bộ (async)\*\* qua Web Push cực mượt, không cần tốn công dựng WebSocket hay Durable Objects.

| Cơ chế | Cách chơi | Điểm mạnh |
| --- | --- | --- |
| \*\*1. Lắc hũ rút thẻ (Quick Draw)\*\* | Chọn bộ lọc (vd: \`Ở nhà\` + \`Tối nay\`), bấm nút hoặc lắc điện thoại để Mascot bốc ngẫu nhiên 1 điều ước. Cho phép tối đa \*\*2 lần rút lại (reroll)\*\* để giữ sự bất ngờ. | Dễ code nhất, xử lý gọn trong 10 giây khi cả hai đang ngồi cạnh nhau. |
| \*\*2. Luật 5 – 3 – 1 (Bất đồng bộ)\*\* | \*\*Bước 1:\*\* Hệ thống bốc (hoặc Người A chọn) \*\*5\*\* điều ước trong hũ.&lt;br&gt;

&lt;br&gt;\*\*Bước 2:\*\* Push sang Người B gạch bớt 2, giữ lại \*\*3\*\*.&lt;br&gt;

&lt;br&gt;\*\*Bước 3:\*\* Push ngược lại Người A chốt \*\*1\*\* kèo cuối cùng. | Giải quyết triệt để bệnh "sao cũng được". Rất hợp chơi từ trưa thứ 6 lúc cả hai đang đi làm để chốt kèo cho tối. |
| \*\*3. Vuốt ẩn danh (Blind Match)\*\* | Lấy 8–10 thẻ từ \`Wish Jar\` (có thể trộn thêm thẻ gợi ý từ Bisou). Cả hai tự vuốt \`Thích / Để sau\` độc lập. \*\*Chỉ hiện ra những kèo cả hai cùng gật đầu\*\*; nếu có nhiều kèo trùng, Mascot chọn ngẫu nhiên 1 cái. | Tạo cảm giác tò mò và công bằng tuyệt đối — không ai cảm thấy mình đang "ép" người kia đi theo ý mình. |

---

### 3. Vòng lặp khép kín với hệ sinh thái sẵn có của Bisou

Đây là chỗ biến một mini-game đơn lẻ thành "keo dính" gắn kết toàn bộ các module bạn đã xây:

1. \*\*Kích hoạt đúng nhịp (Trigger):\*\* Dùng \*\*Cloudflare Queues + Web Push\*\* gửi thông báo nhẹ vào chiều thứ 5 hoặc trưa thứ 6 (chỉ gửi nếu trong \`Wish Jar\` còn ít nhất 3 điều ước chưa làm): \*"Cuối tuần này chưa có lịch, vào lắc Wish Jar không?"\*
2. \*\*Chốt kèo → Đẩy sang \`Upcoming Events\`:\*\* Ngay khi chốt được điều ước từ mini-game, hiện 1 nút \*"Lên lịch luôn"\* để tự động tạo một \`Custom Event\` đếm ngược ngày đi.
3. \*\*Đi chơi về → Đóng vòng sang \`Shared Journal\`:\*\* Sau thời điểm diễn ra event, app nhắc đánh dấu điều ước là \*\*Đã hoàn thành (Fulfilled)\*\* và mở sẵn form viết \`Shared Journal\` (tận dụng luôn luồng ảnh R2 bạn đã thiết kế ở ADR 0005).
4. \*\*Phần thưởng cho \`Garden\`:\*\* Mỗi điều ước hoàn thành có thể tưới thêm nước hoặc mở khóa một chi tiết nhỏ trong khu vườn chung.

---

### 4. Cách móc nối sang doanh thu (Monetization)

Vấn đề lớn nhất của người dùng mới là \*\*Wish Jar bị trống\*\* (lười tự nghĩ kèo). Bạn có thể biến chính điểm này thành đòn bẩy bán hàng cho hệ thống \`Card Box\` sẵn có:

\* \*\*Bản Free:\*\* Chơi \`Quick Draw\` và \`5–3–1\` với các điều ước tự nhập + 1 bộ 15 gợi ý hẹn hò cơ bản.
\* \*\*Bản Trả phí (Date Boxes / Couple Pass):\*\* Mở khóa các hộp \*\*Date Idea Packs\*\* được biên soạn sẵn (vd: \*Hẹn hò ở nhà không màn hình\*, \*Budget dưới 200k\*, \*Hâm nóng cuối tuần / Spicy\*, \*Thử thách lần đầu\*) để \*\*trộn thẳng vào Wish Jar\*\* khi chơi \`Blind Match\`. Lúc này, cùng một engine \`Card Box\` của bạn vừa bán được bộ câu hỏi trò chuyện, vừa bán được bộ ý tưởng hẹn hò.

Về mặt kỹ thuật trên D1, bạn chỉ cần thêm 1 bảng \`date\_game\_sessions\` lưu \`couple\_id\`, \`mode\`, \`candidate\_wish\_ids\` (JSON), \`turn\_user\_id\` và \`status\` là đủ gánh trọn cả 3 chế độ chơi mà không đội chi phí vận hành.

Hiện tại trong \`Wish Jar\` của Bisou, hai người có nhìn thấy toàn bộ điều ước của nhau ngay lập tức không, hay có cơ chế "điều ước bí mật" (chỉ người viết thấy cho đến khi mở)?