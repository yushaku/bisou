# Đánh giá hiệu năng, 14/11/2026

Mã của toàn bộ màn hình được tải ngay từ trang đăng nhập. Đã chuyển các màn hình sau đăng nhập sang `React.lazy`, dùng trạng thái chờ và xử lý lỗi sẵn có.

## Đo trước và sau

Hai bản production build cùng máy, cùng lockfile. Dung lượng gzip được cộng cho script entry và toàn bộ modulepreload trong HTML, không gồm các màn hình tải sau.

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| JavaScript ban đầu, chưa nén | 777.879 byte | 482.976 byte |
| JavaScript ban đầu, gzip | 238.371 byte | 157.389 byte |
| Tổng JavaScript trong assets, gzip | 286.122 byte | 317.210 byte |

Giữ thay đổi: giảm 34% JavaScript ban đầu. Tổng gzip tăng khoảng 31 kB do tách nhiều module; service worker vẫn precache toàn bộ app để các màn hình dùng được offline. Đây là giảm mã cần tải và chạy trước khi hiển thị app, không phải mức giảm thời gian phản hồi của mọi thao tác. Lần đầu mở một màn hình chưa có trong cache có thể hiện trạng thái chờ khi tải module.

`pnpm build` chạy `test/client-bundle.test.mjs` sau khi build và dừng nếu JavaScript ban đầu vượt 200.000 byte gzip. Kiểm tra này đã thất bại trên bản cũ (238.371 byte) và qua trên bản mới (157.389 byte).

## Rà soát các luồng

- Nhật ký đã phân trang bằng cursor; ảnh được lấy chung theo trang, không gọi một query cho từng bài. Ảnh trong feed có kích thước cố định, `srcSet`, tải lười và giải mã bất đồng bộ.
- Điều ước, lời nhắn và hộp thẻ đã có bộ nhớ trong phiên và gộp request trùng đang chạy. Không thêm cache dữ liệu cá nhân.
- Home gọi garden, boxes, notes, journal và stars độc lập sau khi lấy couple. Mẫu đo local cho các GET couple/nội dung là 8–43 ms, qua proxy local tới Worker với dữ liệu seed đã có. Chưa chứng minh database là nút thắt trên production.
- Garden thăm dò mỗi 15 giây khi trang hiện. `gardenState` có nhiều lượt truy vấn tuần tự; cần trace production trước khi đổi cách batch hoặc thêm index.
- Chuyển tab dùng View Transitions; thanh điều hướng dùng backdrop blur. Chưa có phép đo trên iPhone chứng minh hai hiệu ứng này gây giật, nên giữ thiết kế theo [DESIGN.md](../DESIGN.md).

## Giới hạn

Đã qua `pnpm typecheck`, 1.048 test Vitest, 24 test Node hiện có và `pnpm build` kèm kiểm tra dung lượng mới. Trên bản production local đã kiểm tra đăng nhập, Home, Journal, Wishes, Garden, Settings và Back về Garden. Do công cụ click bị lệch tọa độ khi giả lập màn hình điện thoại, kiểm tra điều hướng dùng focus và Enter; không lấy số đo click của phiên này làm INP.

Không đo được INP/LCP/CLS đại diện cho người dùng từ dữ liệu local ít bài viết. Chưa kiểm thử trên iPhone thật, mạng di động hoặc dữ liệu production lớn. Cần đo các trường hợp đó nếu vẫn chậm sau phát hành; không suy ra phần trăm tăng tốc thực tế từ dung lượng bundle.
