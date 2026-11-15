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
- Điều ước, lời nhắn và hộp thẻ ban đầu có bộ nhớ trong phiên và gộp request trùng đang chạy. Phần cache này đã được thay bằng TanStack Query trong bước tiếp theo bên dưới.
- Home gọi garden, boxes, notes, journal và stars độc lập sau khi lấy couple. Mẫu đo local cho các GET couple/nội dung là 8–43 ms, qua proxy local tới Worker với dữ liệu seed đã có. Chưa chứng minh database là nút thắt trên production.
- Garden thăm dò mỗi 15 giây khi trang hiện. `gardenState` có nhiều lượt truy vấn tuần tự; cần trace production trước khi đổi cách batch hoặc thêm index.
- Chuyển tab dùng View Transitions; thanh điều hướng dùng backdrop blur. Chưa có phép đo trên iPhone chứng minh hai hiệu ứng này gây giật, nên giữ thiết kế theo [DESIGN.md](../DESIGN.md).

## Giới hạn

Đã qua `pnpm typecheck`, 1.048 test Vitest, 24 test Node hiện có và `pnpm build` kèm kiểm tra dung lượng mới. Trên bản production local đã kiểm tra đăng nhập, Home, Journal, Wishes, Garden, Settings và Back về Garden. Do công cụ click bị lệch tọa độ khi giả lập màn hình điện thoại, kiểm tra điều hướng dùng focus và Enter; không lấy số đo click của phiên này làm INP.

Không đo được INP/LCP/CLS đại diện cho người dùng từ dữ liệu local ít bài viết. Chưa kiểm thử trên iPhone thật, mạng di động hoặc dữ liệu production lớn. Cần đo các trường hợp đó nếu vẫn chậm sau phát hành; không suy ra phần trăm tăng tốc thực tế từ dung lượng bundle.

## Cache dữ liệu và render với TanStack Query

Áp dụng [ADR 0013](adr/0013-server-state-with-tanstack-query.md): Home/Garden dùng chung query Garden; Home/Journal dùng chung các trang nhật ký. Điều ước, lời nhắn, claims và hộp thẻ cũng dùng QueryClient riêng cho mỗi phiên. `TabMemory` chỉ giữ trạng thái giao diện. Query không còn component sử dụng được thu hồi sau 30 phút; đăng xuất dọn toàn bộ client của phiên.

Test bằng QueryClient/QueryObserver thật xác nhận request đang chạy được gộp, dữ liệu còn mới không gọi lại, JSON không đổi giữ reference và không thông báo cho observer chỉ theo dõi data. Test cũng kiểm tra lỗi HTTP, lỗi làm mới vẫn giữ dữ liệu cũ, invalidation sau mutation, phân trang/cập nhật/xóa nhật ký và kết quả đến muộn sau đăng xuất. Các test component dùng adapter riêng vì bộ test hiện tại render SSR hoặc giả lập React hooks thủ công.

Trên production local: Garden → Home giữ số GET `/api/garden` ở 8, Journal → Home giữ số GET `/api/journal` ở 4 trong thời gian cache còn mới. Đây là tổng đếm của phiên có polling và các lần đưa cửa sổ ra trước, không phải số request cần cho một lần mở app. Đã tạo một điều ước kiểm tra, xác nhận query được làm mới và mục xuất hiện, rồi xóa lại thành công; đăng xuất trả về màn đăng nhập. Không thay dữ liệu mẫu có sẵn.

Sau migration: typecheck, 1.055 test Vitest, 24 test Node và build đều qua. JavaScript ban đầu là 167.854 byte gzip, tăng khoảng 10,5 kB so với bước tách màn hình, vẫn dưới budget 200 kB. Chưa có số đo React Profiler trên iPhone để kết luận mọi lần render tốn kém đã được xử lý.

## Khởi động nguội: hiện Home gần như ngay (perf/launch)

Áp dụng [ADR 0014](adr/0014-persist-server-data-on-device.md). Trước đó, mở app từ đầu phải đi qua ba bước nối tiếp (`/api/me`, `/api/couple`, tải chunk Home) rồi mới tới các query của Home, trong lúc màn hình chỉ có màn chờ.

Đã đổi:

- Lưu cache query vào IndexedDB trên máy (mỗi user + couple một bản) cùng bản ghi `{user, couple}` cuối cùng. Người đã đăng nhập thấy Home từ cache ngay, `/api/me` và `/api/couple` cập nhật nền. Đăng xuất, 401 hoặc đổi người dùng xóa sạch. Offline vẫn ở Home đã lưu. Cache bị bỏ khi đổi bản build, quá 30 ngày; nhật ký chỉ lưu trang đầu; query lỗi không lưu.
- `/api/me`, `/api/couple` và chunk Home chạy song song ngay từ `main.tsx`. `/api/me` còn một lượt D1 thay vì hai.
- `index.html` có khung chờ tĩnh (logo trên nền theo theme) hiện trước khi JavaScript chạy; linh vật màn chờ tải ngay.
- Service worker không còn tải lại app đang mở khi có bản mới (chờ tới khi app bị ẩn) và chỉ kiểm tra bản mới tối đa mỗi giờ.

Phát hiện khi đo: `React.lazy` luôn treo ở lần render đầu, kể cả khi chunk đã tải, và React giữ nội dung lại khoảng 300 ms sau khi đã hiện fallback. Cùng một cache, Home hiện sau 433 ms khi dùng `lazy` và sau 71 ms khi render component đã tải trực tiếp (bản production local, Chrome headless, mốc từ lúc tài liệu bắt đầu; không phải số đo iPhone).

Đo trên bản production local (dữ liệu seed, cache hợp lệ, tải lại trang): khung chờ tĩnh → Home thật ở khoảng 30 ms, không qua màn chờ. Offline, mở nguội vẫn ra Home đã lưu. Đăng xuất làm IndexedDB trống và tải lại không tạo lại. JavaScript ban đầu: 170.729 byte gzip so với 167.854 (tăng 2.875 byte, dưới budget 200.000).

Chưa đo được: thời gian mở nguội thật trên iPhone (PWA đã cài, mạng di động), việc iOS có xóa IndexedDB của PWA lâu không dùng, thời gian đọc IndexedDB trên máy thật, và hành vi bản cập nhật service worker chờ khi app chạy nền. Cần đo các trường hợp này trước khi kết luận mức cải thiện.
