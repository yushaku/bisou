# Bisou design system

Phong cách chung của cả app. Chi tiết từng màn hình nằm trong code; giá trị token nằm trong file nguồn, không chép vào đây.

## Hướng

- **Vải mềm tinh tế** ([ảnh tham chiếu](docs/design/reference-ab.webp)): ấm, gần gũi, mềm, thủ công. Mọi màn hình mới theo hướng này.

- Chất vải chỉ gợi nhẹ trên nền và thẻ; len/nỉ rõ nét chỉ dành cho vài minh hoạ điểm nhấn.
- Bề mặt mờ, bóng mềm, bo tròn, nút hơi đệm. Tránh nhựa bóng, đường may dày, bóng cứng, viền đậm, chuyển động nhún liên tục.

## Theme và token

- Luôn dùng token ngữ nghĩa của Tailwind (`bg-card`, `text-muted-foreground`, `border-border`, `rounded-xl`…).
- không viết mã màu, cỡ bo góc hay font cứng trong component.
- Hai trục độc lập, dùng chung component: bảng màu (`src/client/theme/palettes.json`: peach sáng, cocoa và frappe tối) và nền (`backgrounds.css`). Kiểu dáng duy nhất là Soft, nằm ở `base.css`, không còn trục phong cách. Mặc định: nền linen, peach (sáng), cocoa (tối). Thêm theme không kéo theo UI riêng.
- Mỗi giao diện phải đọc tốt ở cả sáng và tối, với mọi bảng màu.
- Chữ: `font-heading` cho tiêu đề, font thân mặc định cho nội dung; font thân và tiêu đề là Nunito, `font-serif` (Lora) chỉ cho tên hộp thẻ.
- Bề mặt kính dùng utility `.liquid-glass`, không tự dựng lại blur/viền/bóng.

## Component

- Dựng từ `src/client/components/ui` và `components/bisou`; icon `lucide-react`. Có sẵn thì dùng lại, không dựng widget riêng.
- Hành động phụ và chỉnh sửa mở trong sheet/drawer từ dưới lên; trang toàn màn hình có nút quay lại.
- Khối nội dung: tiêu đề `font-heading text-xl` ngoài thẻ, nút phụ (như “Xem tất cả”) bên phải tiêu đề, nội dung là thẻ bo góc bên dưới.
- Lựa chọn ngắn dùng chip `ToggleGroup`. Toast dùng ding, dáng viên thuốc đảo màu theo theme.
- Vùng chạm tối thiểu 44px; tôn trọng safe area trên điện thoại.
- Trạng thái trống, đang tải, lỗi dùng `EmptyState`, `Skeleton` và linh vật; không tự chế mẫu mới.
- Chọn và cắt ảnh không hiện toast chờ; toast tiến độ ảnh chỉ hiện khi tải lên.

## Lời và hình ảnh

- Lời ngắn, gần gũi, cụ thể, nói với cả hai: “Góc nhỏ của hai đứa”, “Một điều ước nhỏ”, “Mở hũ”. Tiếng Việt không dùng “anh/em”; tiếng Anh nói cùng ý, tự nhiên. Mọi chuỗi qua i18n (`src/client/i18n`).
- Linh vật len: đứng yên, nền trong suốt, chỉ xuất hiện ở trạng thái trống, đợi tải, lỗi, ăn mừng. Quy tắc: [Mascot](docs/product/mascot.md).

## Chuyển động

- Đổi tab ở thanh dưới là tức thì: trang mới hiện ngay, không trượt hay mờ, như thanh tab iOS; chỉ viên chỉ báo trượt sang tab mới, không bao giờ làm trang chờ.
- Nhẹ, ngắn, có lý do (mở, chuyển, ăn mừng); không lặp vô hạn để gây chú ý.
- Luôn tôn trọng `prefers-reduced-motion`: thay bằng mờ chéo hoặc đứng yên.

## Kiểm tra

- Xem mẫu token và component ở `/design` khi chạy `pnpm dev`.