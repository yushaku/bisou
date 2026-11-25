Cơ chế \*\*Blind Matching (Yes / No / Maybe)\*\* là một trong những tính năng có tỷ lệ chuyển đổi trả phí cao nhất trong các app cặp đôi vì nó đánh trúng tâm lý \*\*an toàn tuyệt đối\*\*: không ai sợ bị từ chối hay ngại ngùng khi bày tỏ mong muốn thật, vì những gì đối phương không đồng ý sẽ \*\*biến mất hoàn toàn trong im lặng\*\*.

Dưới đây là thiết kế chi tiết từ luồng trải nghiệm, ma trận ghép đôi, kiến trúc dữ liệu trên Cloudflare D1 cho đến cách gài paywall cho \`Card Box\` của Bisou.

---

### 1. Ma trận kết quả (Match Matrix)

Thay vì chỉ có Yes/No cứng nhắc, nút \*\*Maybe (Tò mò / Để thử xem)\*\* rất quan trọng vì nó giảm áp lực cam kết. Quy tắc hiển thị nên được tính \*\*hoàn toàn ở backend (Worker/SQL)\*\* và chỉ trả về client những cặp đạt chuẩn:


| Người A        | Người B       | Kết quả hiển thị cho cả hai                                                                                                               |
| -------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| \*\*Yes\*\*    | \*\*Yes\*\*   | \*\*Match hoàn hảo (Độ ưu tiên cao)\*\* — Hiện thẻ, cho phép lưu vào \`Wish Jar\` hoặc ghim lại.                                          |
| \*\*Yes\*\*    | \*\*Maybe\*\* | \*\*Match mở (Có thể thử)\*\* — Hiện thẻ kèm nhãn \*"Cả hai đều có hứng thú"\* (không ghi rõ ai chọn Yes, ai chọn Maybe để tránh áp lực). |
| \*\*Maybe\*\*  | \*\*Maybe\*\* | \*\*Match nhẹ\*\* — Hiện ở mục \*"Cùng cân nhắc sau"\*.                                                                                   |
| \*\*Bất kỳ\*\* | \*\*No\*\*    | \*\*Ẩn hoàn toàn\*\* — Cả hai đều không bao giờ biết người kia đã chọn gì.                                                                |


---

### 2. Luồng trải nghiệm (UX) tối ưu cho PWA

Vì là PWA trên điện thoại, thao tác vuốt (swipe) kiểu Tinder đôi khi bị xung đột với cử chỉ vuốt quay lại (back gesture) của iOS Safari. Dùng \*\*3 nút bấm rõ ràng\*\* ở đáy thẻ (\`Không\` · \`Có thể\` · \`Muốn thử\`) kết hợp animation lật/trượt thẻ sẽ mượt và ít bấm nhầm hơn.

1. \*\*Chơi độc lập (Async):\*\* Người A mở một hộp \`Card Box\` dạng Blind Match, trả lời lần lượt các thẻ lúc rảnh. App lưu tiến độ từng thẻ.
2. \*\*Nhắc nhịp bằng Web Push:\*\* Khi Người A hoàn thành ít nhất 5 thẻ (hoặc hết hộp), Cloudflare Queues gửi Push sang Người B: \*"Người ấy vừa hoàn thành hộp [Tên hộp]. Vào chọn để xem hai bạn hợp nhau ở điểm nào nhé."\*
3. \*\*Khoảnh khắc "Mở quà" (Reveal):\*\* Ngay khi Người B chọn xong thẻ nào tạo ra Match, hoặc sau khi Người B hoàn thành cả hộp, app hiển thị màn hình tổng hợp \*\*Danh sách Match chung\*\* (có hiệu ứng mở phong bì hoặc lật thẻ).
4. \*\*Đổi ý sau này:\*\* Cho phép người dùng vào mục \*"Lựa chọn của riêng tôi"\* để đổi từ \`No\` → \`Maybe/Yes\` (hoặc ngược lại) bất cứ lúc nào. Nếu đổi từ \`Yes\` sang \`No\`, thẻ đó tự động biến mất khỏi danh sách Match chung mà không gửi thông báo.

---

### 4. Cách móc nối sang hệ sinh thái Bisou & Kiếm tiền

\* \*\*Nối thẳng sang \`Wish Jar\`:\*\* Với các hộp chủ đề hành động (Hẹn hò, Du lịch, Thử thách, 18+), ngay trên thẻ đã Match đặt sẵn 1 nút \*\*"+ Thêm vào Wish Jar"\*\* để biến mong muốn thành kế hoạch thật.
\* \*\*Các chủ đề hộp bài bán chạy nhất cho Blind Match:\*\*

1. \*\*Intimacy / Spicy (18+):\*\* Chủ đề ăn tiền số 1. Chia làm 3 mức độ (Nhẹ nhàng → Táo bạo → Thử nghiệm) để cặp đôi không bị sốc.
2. \*\*Ranh giới & Thói quen sống chung:\*\* (vd: \*"Ngủ riêng chăn"\*, \*"Dùng chung tài khoản ngân hàng"\*, \*"Không cầm điện thoại trên bàn ăn"\*). Rất thực tế cho cặp đôi yêu lâu hoặc sắp về chung nhà.
3. \*\*Bucket List / Trải nghiệm lần đầu:\*\* Những việc điên rồ hoặc lãng mạn muốn làm cùng nhau ít nhất 1 lần.

\* \*\*Cơ chế Paywall tận dụng Preview Cards (ADR 0011):\*\*
\* Cho cả hai chơi miễn phí \*\*5–7 thẻ đầu tiên\*\* của hộp trả phí để cảm nhận sự hồi hộp khi có Match.
\* Hoặc mạnh hơn (chuyển đổi rất cao): Cho phép cả hai \*\*vote trước toàn bộ hộp\*\*, sau đó hiện thông báo \*"Hai bạn có \*\*8 điểm chung\*\* trong hộp này — Mở khóa hộp để xem chi tiết"\*. (Lưu ý: Chỉ nên dùng cách này nếu đã báo rõ từ đầu đây là hộp trả phí để tránh cảm giác bị gài bẫy).



Bạn đã phác thảo danh sách các hộp bài (launch boxes) trong \`card-box-content\` chưa — hiện tại chúng nghiêng về câu hỏi trò chuyện (Q&A) hay đã có sẵn các chủ đề dạng hành động/18+?