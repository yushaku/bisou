# Bisou design system

Đây là nguồn chuẩn về thiết kế giao diện Bisou. Mọi agent phải đọc tài liệu này trước khi tạo hoặc sửa màn hình, component, token, asset hay nội dung hiển thị. Áp dụng trực tiếp các quyết định đã chốt; không mở lại bước chọn phong cách cho mỗi task.

Yêu cầu mới, rõ ràng của người dùng được ưu tiên. Khi yêu cầu đó thay đổi một quyết định thiết kế, cập nhật tài liệu này cùng phần triển khai. Code giữ giá trị token chính xác; tài liệu này giữ ý nghĩa, cách dùng và giới hạn. Tài liệu khác dẫn về đây, không giữ một bộ quy tắc riêng.

## 1. Hướng đã chốt: vải mềm tinh tế

Ngày 05/11/2026, người dùng chọn **hướng A**, phía trái của [ảnh tham chiếu](docs/design/reference-ab.webp).

Bisou là góc riêng của hai người: ấm, gần gũi, dễ đọc và thuận tiện dùng bằng một tay. Chất liệu tạo chiều sâu; nội dung chính vẫn là ảnh, câu chuyện và điều ước của người dùng.

- Nền kem, vân linen rất nhẹ; thẻ sáng hơn nền, góc bo và bóng mềm có độ nổi vừa đủ.
- Màu đào cho hành động chính và điểm nhấn; chữ nâu đậm trên nền sáng.
- Len/nỉ ở một vài minh hoạ như đôi nhân vật, túi điều ước. Giữ ô nhập, nội dung dài và điều hướng rõ ràng.
- Nút hơi đệm, nhấn xuống nhẹ. Không nhún liên tục hay tự chạy hiệu ứng khi đọc nội dung.
- Ảnh nhật ký giữ chất ảnh thật. Minh hoạ trang trí không thay thế ảnh đại diện hoặc giả làm dữ liệu của cặp đôi.

Trong hướng A, tránh phủ sợi len lên toàn màn hình, đường may dày quanh mọi thẻ, bóng cứng kiểu sticker, bề mặt nhựa bóng và làm mọi nút thành viên thuốc. Journal và Sticker vẫn là lựa chọn riêng; không trộn chúng vào Soft.

Ảnh triển khai: [Home sáng](docs/design/home-light.png), [Home sau khi cuộn](docs/design/home-light-scrolled.png), [Home tối](docs/design/home-dark.png), [Login](docs/design/login.png). [design-qa.md](design-qa.md) ghi lại lần kiểm tra ban đầu, không thay thế kiểm tra các thay đổi sau này.

## 2. Bảng màu, chế độ, phong cách và nền độc lập

| Lựa chọn | Trách nhiệm | Giá trị hiện có |
| --- | --- | --- |
| Bảng màu | Màu semantic cho bề mặt, chữ, trạng thái | Sáng: `peach`, `latte`. Tối: `cocoa`, `frappe`, `macchiato`, `mocha` |
| Chế độ | Chọn bảng sáng/tối hoặc theo hệ điều hành | `light`, `dark`, `system` |
| Phong cách | Font, bo góc, viền, bóng, chuyển động, khung ảnh | `soft`, `journal`, `sticker` |
| Nền trang | Hoạ tiết phía sau nội dung | `linen`, `plain`, `paper`, `dots`, `hearts` |

Mặc định khi chưa có tuỳ chọn: `style: soft`, `background: linen`, `mode: system`, `lightTheme: peach`, `darkTheme: cocoa`. Nhãn của `soft` là **Vải mềm / Soft fabric**; giữ nguyên ID này.

Peach/Cocoa là bộ màu của hướng A; cả bốn flavor Catppuccin vẫn được hỗ trợ. Đổi nền không đổi màu hoặc phong cách; đổi chế độ không làm mất bảng sáng/tối đã chọn. Vân trên thẻ thuộc phong cách, độc lập với nền trang.

Tuỳ chọn lưu dưới `bisou.theme`. Giữ lựa chọn hợp lệ đã lưu; chỉ fallback khi thiếu hoặc sai. Không tự đặt lại giao diện của người dùng khi thêm theme mới.

## 3. Token và nơi sửa

| Nguồn | Trách nhiệm |
| --- | --- |
| [palettes.json](src/client/theme/palettes.json) | Khối màu semantic của mỗi theme |
| [themes.ts](src/client/theme/themes.ts) | Registry, default, kiểm tra tuỳ chọn, chọn theme |
| [ThemeProvider.tsx](src/client/theme/ThemeProvider.tsx) | Áp dụng/lưu tuỳ chọn, theo dõi chế độ hệ thống |
| [personalities.css](src/client/theme/personalities.css) | Font, bán kính, viền, bóng, nhấn và khung ảnh |
| [backgrounds.css](src/client/theme/backgrounds.css) | Hoạ tiết nền, độ đậm và lớp phủ nền ảnh |
| [fonts.css](src/client/theme/fonts.css) | Font tự host, gồm bộ ký tự tiếng Việt |
| [styles.css](src/client/styles.css) | Ánh xạ token sang Tailwind và utility chung |
| [theme-bootstrap.ts](scripts/theme-bootstrap.ts) | CSS màu và script áp dụng trước lần vẽ đầu tiên |

Dùng token như `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-input`, `ring-ring` và các token trạng thái. Không đặt màu hex riêng trong màn hình hoặc gắn màu theo tên theme trong component. Swatch xem trước màu là ngoại lệ vì hiển thị dữ liệu registry.

Theme áp dụng `data-theme`, `data-style`, `data-bg` và class `dark` trên `<html>` để cả dialog/drawer qua portal nhận cùng token. Dùng `useTheme` và `ThemeControls` hiện có; không tạo bộ lưu tuỳ chọn hoặc bộ theo dõi chế độ hệ thống riêng trong từng màn hình. Trạng thái dùng `destructive`, `success`, `warning`, `info` và foreground tương ứng ở nơi có định nghĩa.

Dùng utility chung `edge`, `edge-control`, `edge-ink`, `elevate`, `elevate-sm`, `press`, `rounded-control`. Độ nổi của Soft nằm ở `--surface-highlight`, `--surface-shade`, `--material-wash`, `--shadow-rest`, `--shadow-rest-sm`. Không tạo một bộ shadow/radius riêng cho từng màn hình. Dark mode giảm highlight và độ rõ của vân, vẫn giữ viền ô nhập và focus dễ thấy.

**Thêm bảng màu:** thêm một khối `{ label, kind, tokens }` vào `palettes.json`, đủ cùng tập token với các bảng hiện có. Picker và CSS đọc từ registry, không cần thêm nhánh trong component. Khởi động lại Vite và kiểm tra tương phản.

**Đổi default hoặc tập style/nền:** đồng bộ `themes.ts`, script trước khi vẽ, fallback trong `index.html` và test liên quan. Khi đổi màu mặc định, kiểm tra cả manifest PWA trong `vite.config.ts`.

Nền ảnh chỉ có hook CSS `data-bg="photo"` và `--bg-photo`, kèm lớp phủ giữ khả năng đọc. Chưa có upload, lưu trữ hay trình chọn ảnh nền; chưa đưa `photo` vào picker.

## 4. Chữ, bố cục và tương tác

| Phong cách | Chữ nội dung / tiêu đề | Đặc trưng |
| --- | --- | --- |
| Soft (`soft`, mặc định) | Nunito / Nunito | Tiêu đề tròn, đậm; thẻ vải nhẹ; bóng mềm |
| Journal (`journal`) | Be Vietnam Pro / Lora | Tiêu đề serif; ảnh như dán vào sổ |
| Sticker (`sticker`) | Be Vietnam Pro / Baloo 2 | Viền dày, bóng cứng, chuyển động nhún |

- Dùng `font-heading` cho tiêu đề và bộ đếm. Font phải có đủ dấu tiếng Việt; giữ font tự host trong cache PWA.
- Nội dung và ô nhập mặc định 16px; ngày tháng/chú thích có thể 14px. Không thu nhỏ chữ để ép vừa một màn hình; cho phép xuống dòng và cuộn.
- Mobile trước: mốc chính 390 × 844, thêm 360 × 780 tiếng Anh. Dùng `AppShell`, cột nội dung `max-w-md`, lề ngang 16px và thang spacing hiện có.
- Hành động chính và nút điều hướng có vùng chạm ít nhất 44 × 44px. Giữ safe area; thanh tab không che hành động cuối trang, bàn phím không làm mất ô nhập đang dùng.
- Có focus bằng bàn phím; không để chức năng chỉ xuất hiện khi hover. Icon đơn cần tên truy cập được.
- Khi đang gửi, dùng loading và ngăn gửi lặp. Lỗi có chữ, liên kết với ô nhập, không chỉ đổi màu viền.
- Chuyển động đọc token của phong cách. Tôn trọng `prefers-reduced-motion`, gồm hiệu ứng ăn mừng.
- Chữ thường đạt tối thiểu 4.5:1; viền nhận diện ô nhập và focus đạt tối thiểu 3:1 trên nền liên quan. Kiểm tra cả màu thực tế sau lớp phủ/texture.

## 5. Component dùng chung

Ưu tiên: component Bisou đã có → primitive shadcn đã chỉnh → mở rộng bằng prop/variant có nhu cầu thực → component mới khi các cách trên không đủ. Các phong cách dùng chung cây component; không tạo `PeachButton`, `SoftHome` hay bản sao màn hình theo theme.

| Thành phần | Dùng cho |
| --- | --- |
| `AppShell`, `PageHeader` | Khung app, tiêu đề, thanh tab tuỳ chọn |
| `BrandMark`, `CoupleAvatars` | Logo, danh tính người dùng và fallback khi thiếu ảnh |
| `DaysCounter`, `MilestoneItem` | Đếm ngày theo ngày lịch, mốc kỷ niệm |
| `EntryCard`, `PhotoGrid` | Nhật ký, ảnh, nội dung dài, mốc đặc biệt |
| `WishCard`, `WishTeaser`, `SpinCard` | Điều ước, lối mở hũ, trạng thái quay |
| `Celebration`, `EmptyState` | Ăn mừng, trạng thái chưa có nội dung |
| `OtpInput`, `PairCodeDisplay` | Mã đăng nhập, mã ghép đôi |
| `SettingsSheet`, `ThemeControls`, `LanguageToggle` | Cài đặt giao diện, ngôn ngữ |

Primitive ở `src/client/components/ui`; component sản phẩm ở `src/client/components/bisou`. Giữ import `shadcn/tailwind.css` vì Radix dùng các state variant của nó. Khi regenerate primitive, rà lại các utility đã thích nghi với token.

`OtpInput` giữ **một input thật** để hỗ trợ dán mã, bàn phím và `one-time-code`; các ô nhìn thấy chỉ là phần trình bày. Caller lọc chữ số và gửi mã. Không đổi thành sáu input độc lập vì hình thức.

Tính ngày, kỷ niệm và định dạng tiền qua `src/client/lib/format.ts`. `WishTeaser` nhận `onOpen`; `AppShell` chỉ hiện tab khi có đích đến. Không tạo nút trông hoạt động nhưng thiếu hành vi hoặc trạng thái giải thích.

## 6. Hình ảnh và nội dung

- Tái sử dụng `src/client/assets/couple.webp`, `wish-pouch.webp`, `linen.webp`. Minh hoạ trang trí dùng `alt=""`; ảnh nội dung cần mô tả có nghĩa.
- Asset mới giữ ánh sáng mềm, bề mặt mờ, màu dịu. Giữ alpha cho ảnh cắt nền, tối ưu kích thước theo nơi dùng, kiểm tra trên nền sáng/tối. Không dựng đồ len bằng nhiều lớp div/SVG hoặc thay bằng emoji.
- Giới hạn kích thước minh hoạ trong container; không để hình đè chữ, bị cắt đầu hoặc chiếm chỗ nội dung chính. Tái sử dụng Lucide cho icon chức năng và `BrandMark` cho logo.
- Giữ ảnh/font cần thiết trong cache app shell; không cache API. Kiểm tra cấu hình WebP trong `vite.config.ts` khi thêm asset.
- Mọi chuỗi sản phẩm đi qua `i18n/vi.ts` và `i18n/en.ts`, cùng key; chuỗi riêng của gallery ở `design/messages.ts`.
- Giọng văn gần gũi, ngắn, cụ thể: “Góc nhỏ của hai đứa”, “Một điều ước nhỏ”, “Mở hũ”. Nói rõ thao tác, lỗi và trạng thái lưu; không đưa thuật ngữ kỹ thuật hoặc lời giới thiệu design system vào luồng sản phẩm.
- Không hiển thị danh sách điều ước bí mật của người kia. `SpinCard` dùng fixture cho preview; luồng thật phải để server lọc/chọn điều ước và kiểm soát quyền truy cập.

## 7. Gallery và ranh giới chức năng

Chạy `pnpm dev`, mở `/design`. Trang này chỉ có trong dev: ba màn Home, Nhật ký, Điều ước, bảng token, trạng thái primitive và component Bisou. Dùng nó để thử thay đổi trên cùng bộ component.

```text
/design?style=soft&theme=peach&bg=linen&lang=vi&screen=home
/design?style=soft&theme=cocoa&bg=linen&lang=vi&screen=home
```

`screen` nhận `home`, `journal`, `wishes`; bỏ tham số này để xem cả gallery. Các tham số giao diện cũng cập nhật tuỳ chọn đã lưu. Fixture chủ yếu bằng tiếng Việt để kiểm tra dấu và độ dài chữ.

Hiện đăng nhập OTP và sửa hồ sơ là luồng thật. Home cặp đôi, nhật ký và hũ điều ước trong gallery là mẫu, không lưu dữ liệu. Không đưa fixture, thông báo lưu thành công giả hoặc logic quay phía client vào luồng thật. Khi triển khai tính năng thật, dùng lại component và nối API tương ứng.

## 8. Kiểm tra và duy trì

Với thay đổi giao diện:

1. Đọc phần liên quan ở đây và component/token đang dùng; xác định caller và trạng thái bị ảnh hưởng.
2. Sửa ở nguồn dùng chung. Khi đổi component, kiểm tra cả luồng thật dùng nó và mẫu trong `/design`.
3. Xem trên trình duyệt ở 390 × 844 sáng/tối, 360 × 780 tiếng Anh: tràn ngang, cuộn, ảnh, dấu tiếng Việt, focus, loading/error/disabled liên quan. Thử đổi palette/nền để phát hiện màu hoặc style bị gắn cứng.
4. Khi đổi cảm giác thị giác hoặc bố cục, đối chiếu ảnh render với hướng A; ghi rõ khác biệt có chủ ý. Kết quả build không thay cho kiểm tra hình ảnh.
5. Chạy tuần tự `pnpm typecheck`, `pnpm test`, `pnpm build`. Nếu chạm theme/default/date, giữ các kiểm tra trong `test/design-system.test.mjs`. Nếu chạm gallery/asset, xác nhận production bỏ code và ảnh fixture nhưng vẫn có asset cần cho app.
6. Cập nhật `DESIGN.md` khi quyết định thay đổi và `/design` khi cần ví dụ sử dụng mới. Giữ tài liệu khác trỏ về đây.

Với thay đổi chỉ có tài liệu, kiểm tra đường dẫn, tên component/token và tính nhất quán; không cần chạy lại kiểm thử giao diện. PWA, bàn phím và OTP autofill trên iPhone thật vẫn cần kiểm tra thủ công. Chỉ báo đã kiểm tra những gì thực sự đã chạy.
