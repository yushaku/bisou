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

Theo [ADR 0015](adr/0015-server-data-freshness.md), cache trong phiên không hết hạn theo thời gian và Garden không còn polling. Kiểm tra bằng QueryClient/QueryObserver thật: mở Wishes, rời tab rồi quay lại sau 2 giờ giả lập có dữ liệu ngay (`status: success`), không thêm request; dữ liệu khôi phục đã cũ 1 ngày cũng không fetch khi mở tab. Đo thêm trên trình duyệt Orca ở bản dev với dữ liệu seed: sau khi mở mọi tab, chờ 40 giây không có request polling; hai vòng quay lại mọi tab có 0 request `/api/*` và 0 lần chèn skeleton. Một vòng kiểm tra bổ sung chờ đúng pathname của từng tab cũng cho kết quả đó. Tải lại Home từ cache có `/api/me`, `/api/couple` và đúng một request cho mỗi danh sách đã lưu, kể cả Wishes chưa mở; không có request chi tiết. Đây là kiểm tra trên máy dev, chưa đo trên iPhone. Khi foreground hoặc khôi phục cache lúc khởi động, các danh sách đã tải được làm mới kể cả khi tab không mở; chi tiết đang hiện trên màn hình tải lại ngay, chi tiết đang ẩn chỉ bị invalidation và tải khi mở lại. Làm mới khi foreground và lúc khởi động dùng chung request đang chạy; push của người ấy thì hủy và gửi lại request đang chạy cho dữ liệu nó liên quan, vì request đó có thể có trước thay đổi của người ấy. Query làm mới nền bị lỗi vẫn giữ dữ liệu (cả trong bản trên máy) và tải lại một lần khi được mở lại; lúc khởi động, dữ liệu đó hiện như cache bình thường (không báo lỗi) và được lần làm mới khởi động tải lại; reconnect chỉ thử lại query lỗi. Cấu hình push (`["push"]`) không lưu xuống máy. Cache trên máy vẫn hết hạn sau 30 ngày và bị bỏ khi đổi build; đăng xuất dọn client của phiên.

Sau migration: typecheck, 1.055 test Vitest, 24 test Node và build đều qua. JavaScript ban đầu là 167.854 byte gzip, tăng khoảng 10,5 kB so với bước tách màn hình, vẫn dưới budget 200 kB. Chưa có số đo React Profiler trên iPhone để kết luận mọi lần render tốn kém đã được xử lý.

## Khởi động nguội: hiện Home gần như ngay (perf/launch)

Áp dụng [ADR 0014](adr/0014-persist-server-data-on-device.md). Trước đó, mở app từ đầu phải đi qua ba bước nối tiếp (`/api/me`, `/api/couple`, tải chunk Home) rồi mới tới các query của Home, trong lúc màn hình chỉ có màn chờ.

Đã đổi:

- Lưu cache query vào IndexedDB trên máy (mỗi user + couple một bản) cùng bản ghi `{user, couple}` cuối cùng. Người đã đăng nhập thấy Home từ cache ngay, `/api/me` và `/api/couple` cập nhật nền. Đăng xuất, 401 hoặc đổi người dùng xóa sạch. Offline vẫn ở Home đã lưu. Cache bị bỏ khi đổi bản build, quá 30 ngày; nhật ký chỉ lưu trang đầu; query lỗi chưa có dữ liệu không lưu.
- `/api/me`, `/api/couple` và chunk Home chạy song song ngay từ `main.tsx`. `/api/me` còn một lượt D1 thay vì hai.
- `index.html` có khung chờ tĩnh (logo trên nền theo theme) hiện trước khi JavaScript chạy; linh vật màn chờ tải ngay.
- Service worker không còn tải lại app đang mở khi có bản mới (chờ tới khi app bị ẩn) và chỉ kiểm tra bản mới tối đa mỗi giờ.

Phát hiện khi đo: `React.lazy` luôn treo ở lần render đầu, kể cả khi chunk đã tải, và React giữ nội dung lại khoảng 300 ms sau khi đã hiện fallback. Cùng một cache, Home hiện sau 433 ms khi dùng `lazy` và sau 71 ms khi render component đã tải trực tiếp (bản production local, Chrome headless, mốc từ lúc tài liệu bắt đầu; không phải số đo iPhone).

Đo trên bản production local (dữ liệu seed, cache hợp lệ, tải lại trang): khung chờ tĩnh → Home thật ở khoảng 30 ms, không qua màn chờ. Offline, mở nguội vẫn ra Home đã lưu. Đăng xuất làm IndexedDB trống và tải lại không tạo lại. JavaScript ban đầu: 170.729 byte gzip so với 167.854 (tăng 2.875 byte, dưới budget 200.000).

Chưa đo được: thời gian mở nguội thật trên iPhone (PWA đã cài, mạng di động), việc iOS có xóa IndexedDB của PWA lâu không dùng, thời gian đọc IndexedDB trên máy thật, và hành vi bản cập nhật service worker chờ khi app chạy nền. Cần đo các trường hợp này trước khi kết luận mức cải thiện.

## Chuyển tab: khung dùng chung, chuyển cảnh không render trong callback (perf/tab-shell)

Triệu chứng trên iPhone đã cài PWA: chạm một tab ở thanh dưới thì khựng một lúc rồi hiệu ứng trượt chạy giật. Rà soát tĩnh chỉ ra các nguyên nhân sau, và mỗi thay đổi dưới đây chỉ giữ lại khi có số đo hoặc bằng chứng cụ thể.

Nguyên nhân tìm thấy:

- `document.startViewTransition(() => flushSync(navigate))`: Safari đóng băng ảnh cũ và chờ callback, trong khi toàn bộ màn hình mới được render đồng bộ trước khung hình đầu tiên.
- Mỗi màn hình tự bọc `AppShell` nên header, thanh tab, Drawer và các listener bị dựng lại mỗi lần đổi tab.
- `<main>` có `view-transition-name: tab-page` nên cả trang cao được chụp. Đo trong Chrome với 60 bài nhật ký: ảnh chụp trang cũ là 390 x 17.768 px CSS (khoảng 1170 x 53.300 px ở DPR 3), chụp hai lần.
- Chạm lần đầu vào Journal, Wishes hoặc Garden tải chunk bên trong callback, và `Suspense` ngoài cùng có thể hiện lại màn chờ toàn app giữa chừng.
- `formatDay` và `formatTime` tạo `Intl.DateTimeFormat` mới ở mỗi lần gọi; Journal tính lại `groupByDay` và `toCard` mỗi lần render.

### Phương pháp đo

Chrome headless-shell 154 (không phải Safari, không phải iPhone), bản production `pnpm build` chạy bằng `vite preview` với dữ liệu seed cục bộ (thêm 60 bài nhật ký không có ảnh và 8 điều ước), khung 390 x 844, DPR 3, giới hạn CPU 4x. Bản trước và bản sau chạy xen kẽ, hai phiên mỗi bên. Mỗi phiên: 3 lần mở nguội (tải lại trang, chờ 4 giây rồi chạm lần lượt Home→Journal→Wishes→Garden→Home) và 8 vòng nóng. Mốc là lúc chạm (`click()` trên nút của thanh tab) đến khi `ready` của view transition được giải quyết, tức lúc ảnh mới đã chụp và hiệu ứng bắt đầu. "Khung màn chờ" đếm số khung hình mà thanh tab biến mất hoặc màn chờ toàn app hiện trong lúc chuyển. Số liệu là trung vị, đơn vị ms. Không có long task (trên 50 ms) nào được ghi nhận ở cả hai bản nên không đưa vào bảng.

| Chuyển | Nóng: trước | Nóng: sau | Nguội: trước | Nguội: sau | Khung màn chờ nguội: trước | sau |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home → Journal | 40 | 38 | 37 | 44 | 4 | 0 |
| Journal → Wishes | 40 | 38 | 22 | 80 | 6 | 0 |
| Wishes → Garden | 99 | 67 | 65 | 96 | 6 | 0 |
| Garden → Home | 40 | 39 | 42 | 39 | 0 | 0 |

Đọc bảng:

- Lần chạm nóng: gần như không đổi trong sai số của máy (Wishes → Garden nhanh hơn 32 ms ở hai phiên xen kẽ, các chuyển còn lại chênh dưới 2 ms). Headless Chrome không tái hiện được khựng trên iPhone, nên đừng đọc bảng này như mức giảm thời gian trên điện thoại.
- Lần chạm nguội: số "trước" thấp vì hiệu ứng chạy trên màn chờ (cột khung màn chờ 4 đến 6), nội dung thật đến sau. Số "sau" cao hơn vì chờ nội dung thật rồi mới trượt, và không còn khung màn chờ nào.
- Thời gian callback chạy đồng bộ (render nằm trong callback): trước 21 / 40 / 30 / 28 ms cho bốn chuyển (đo ở vòng nóng, 12 vòng), sau 0 ms. Render vẫn xảy ra, nhưng sau khi trình duyệt đã chụp xong ảnh cũ.
- Ảnh chụp trang: 390 x 17.768 px xuống 390 x 788 px (giảm 95,6% diện tích). Chrome headless không cho thấy khác biệt thời gian, chi phí bộ nhớ GPU này cần đo trên Safari thật.
- Style recalc trong lúc chuyển tăng từ khoảng 16 đến 24 ms lên 24 đến 34 ms (đo qua `Performance.getMetrics`): đây là giá của việc đóng băng trang.
- `Intl.DateTimeFormat`: tạo mới mỗi lần khoảng 35 µs, dùng lại khoảng 1 µs (Node trên máy dev, chưa nhân hệ số làm chậm CPU). Journal gọi vài chục lần mỗi render.
- JavaScript ban đầu: 170.729 byte gzip lên 171.559 byte (tăng 830 byte, dưới budget 200.000). Khung dùng chung nằm cùng chunk với Home chứ không vào bundle chính; lần thử đầu import trực tiếp vào `App.tsx` đã làm bundle tăng 16.727 byte nên bị đổi.

### Đã giữ và đã hoàn lại

| Thay đổi | Quyết định | Lý do |
| --- | --- | --- |
| Tải trước chunk Journal, Wishes, Garden khi rảnh sau khung hình đầu, render trực tiếp khi đã tải, `Suspense` cục bộ trong khung | Giữ | Khung màn chờ lần chạm nguội 4 đến 6 xuống 0. Ngoài ra là sửa lỗi hiển thị. |
| Khung dùng chung (`TabFrame`): header, thanh tab, Drawer, pull-to-refresh nằm trên `Switch`, chỉ đổi nội dung | Giữ | Kiểm tra trên trình duyệt: phần tử `nav`, `header`, `main` giữ nguyên qua các lần đổi tab; cuộn từng tab, Settings, Events, nút tạo mới, kéo để làm mới vẫn chạy. Thời gian nóng không đổi. |
| Bỏ `flushSync`; callback trả về promise giải quyết khi nội dung mới đã commit (có timeout 400 ms) | Giữ | Callback đồng bộ 21 đến 40 ms xuống 0. Không dùng `startTransition`: wouter cập nhật vị trí qua `useSyncExternalStore`, mà React không cho các cập nhật đó chạy như transition. |
| Bỏ `view-transition-name` `tab-label-*` | Giữ | Không có CSS nào dùng, mỗi tên tạo thêm một nhóm. |
| Giới hạn ảnh chụp `tab-page` bằng khung viền cố định trong lúc chuyển (`html.tab-switching`) | Giữ, cần kiểm tra trên iPhone | Ảnh chụp 17.768 px xuống 788 px; so ảnh chụp màn hình lúc nghỉ và lúc đóng băng, sai khác chỉ ở vùng kính của thanh tab (tối đa 19/255 mỗi kênh). Thời gian không đổi trong headless, style recalc tăng. Chưa chứng minh trên Safari. |
| Cache `Intl.DateTimeFormat`/`NumberFormat` theo (locale, kiểu); memo `people`, `groupByDay`, `toCard` ở Journal | Giữ | Rẻ, có test so khớp chuỗi với cách cũ. Không đo được khác biệt thời gian chạm trong headless. |
| `session` của `SignedIn` bọc `useMemo` | Giữ | Sửa lỗi tham chiếu đổi mỗi lần render, không còn render lại vô ích các màn hình nhận `session`. |
| Đổi `backdrop-filter` của thanh tab sang nền đặc trong lúc chuyển | Hoàn lại | Headless Chrome không cho thấy khác biệt (giữ blur: 32 / 40 / 104 / 33 ms; đổi nền đặc: 32 / 44 / 103 / 35 ms), và nó làm thanh đổi vẻ ngoài trong lúc trượt. Nếu iPhone vẫn giật khi có kính mờ, thử lại sau khi đo bằng Web Inspector. |
| Journal chỉ vẽ 10 bài đầu rồi vẽ phần còn lại sau khung hình đầu | Hoàn lại | Home → Journal 32 ms với bản thử và 33 ms với bản đầy đủ, không đo được lợi ích, lại thêm một lần render và phải xử lý khôi phục vị trí cuộn sâu. |
| Bỏ qua kết quả thăm dò Garden 15 giây khi đang chuyển cảnh | Không làm | Không tầm thường; ghi lại để theo dõi. |

Chưa đo được và cần Web Inspector trên iPhone thật (PWA đã cài): thời gian từ chạm đến khung hình đầu tiên của hiệu ứng, bộ nhớ và thời gian chụp ảnh của trang cao (trước và sau khi giới hạn), chi phí `backdrop-filter` trong lúc chuyển, vị trí cuộn không nhảy khi hiệu ứng kết thúc (lúc gỡ khung cố định), và thanh tab không xê dịch trên màn hình có vùng an toàn.
