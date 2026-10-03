# Flash Store — Ecommerce Frontend

Giao diện Next.js cho hệ thống Ecommerce Microservices. Frontend phục vụ mua hàng, quản trị và theo dõi xử lý đơn bất đồng bộ; benchmark đồng thời vẫn dùng JMeter trong backend.

Batch 2 làm việc trên `batch2-frontend`, đối chiếu API của backend `project1-recovery`. Xem [hợp đồng API](docs/API_CONTRACT.md) và [báo cáo Batch 2](docs/BATCH2_REPORT.md).

## Chức năng

- Danh mục từ API thật; tìm kiếm, lọc, sắp xếp và phân trang phía server.
- Chi tiết sản phẩm, màu/kích cỡ, ảnh theo biến thể và tồn kho thật.
- Đăng ký/đăng nhập, hồ sơ và CRUD địa chỉ/default.
- Giỏ hàng của tài khoản trên backend; danh sách yêu thích lưu trên trình duyệt.
- Checkout có địa chỉ, COD/VNPay, khóa idempotency và giữ giỏ sau HTTP 202.
- Theo dõi đơn bằng API, STOMP được xác thực và polling có giới hạn.
- Admin: danh mục/biến thể/ảnh Cloudinary, điều chỉnh kho bất đồng bộ, đơn và trạng thái người dùng.

Next.js 16.0.3, React 19.2, TypeScript, Ant Design, Tailwind, Axios, React Query, Zustand và SockJS/STOMP được giữ lại. Playwright chỉ là dependency phát triển.

## Chạy local

Cần Node.js **20.9+**, npm và backend Batch 1 đã chạy. Môi trường kiểm thử Batch 2 dùng Node 24.19.0 / npm 11.9.0.

```bash
git clone --branch batch2-frontend https://github.com/truongnguyen3006/ecommerce-frontend-1-.git
cd ecommerce-frontend-1-
npm ci
cp .env.example .env.local
npm run dev
```

Mở **http://localhost:3001**. Nội dung `.env.local` tối thiểu:

```dotenv
API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
```

- Gateway mặc định là **8080**, đã đối chiếu cấu hình backend. Cấu hình cũ **8000** chỉ dùng khi bạn chủ động đặt `API_URL` cho một reverse proxy đang chạy.
- Browser gọi cùng origin `/api` và `/auth`; Next chuyển tiếp đến `API_URL`. Legacy `NEXT_PUBLIC_API_URL` vẫn được hỗ trợ nếu chưa có `API_URL`.
- SockJS dùng `NEXT_PUBLIC_WS_URL` trực tiếp. HTTP rewrites của Next không proxy WebSocket; origin frontend cần được gateway/notification service cho phép.
- Đổi môi trường phải khởi động lại Next; biến `NEXT_PUBLIC_*` được đưa vào bundle lúc build.
- Ảnh Cloudinary và ảnh catalog HTTPS trên `static.nike.com` dùng Next image optimization. URL HTTP(S) hợp lệ ở host khác tải trực tiếp trong browser; URL lỗi dùng placeholder trung tính. `PRODUCT_IMAGE_HOSTS` có thể khai báo các host HTTPS bổ sung cho image optimizer.
- Không đặt Keycloak client secret, Cloudinary key/secret hoặc VNPay secret vào frontend. Cloudinary cấu hình ở backend.
- `.env.local` không được commit.

Chạy production local:

```bash
npm run build
npm run start
```

Nếu môi trường chặn truy vấn network interfaces của Node, dùng `npm run start -- --hostname 127.0.0.1`.

## Kiểm tra

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

Hoặc chạy riêng:

```bash
npm run test:unit
npm run test:e2e
npm run test:responsive
```

Playwright chạy production build tại port 3001, tự khởi động server nếu cần. Các fixture chỉ nằm trong `tests/`: đó là kiểm thử contract/giao diện độc lập, **không xác minh backend sống**, không phải dữ liệu fallback cho ứng dụng. Responsive kiểm tra 360, 390, 768, 1024 và 1440 px. Trace/screenshot lỗi nằm trong `test-results/` và không được commit. Chromium đã cài sẵn khác có thể được chỉ định bằng `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Kiểm tra cùng backend thật

1. Xác nhận `GET http://localhost:8080/api/product` trả array sản phẩm; bật Network và mở `/products`, thử keyword/category/price/color/size/sort/page.
2. Đăng ký mật khẩu 8–128 ký tự, đăng nhập USER, sửa hồ sơ, tạo/sửa/xóa/default địa chỉ.
3. Mở `/product/{id}`, chọn SKU có tồn, kiểm tra giới hạn số lượng; thêm vào giỏ rồi kiểm tra API `/api/cart/me`.
4. Ở `/checkout`, đổi số lượng/xóa dòng, chọn địa chỉ và COD hoặc VNPay. Sau 202, giỏ vẫn còn; theo dõi trạng thái thật ở trang chờ.
5. COD: xem kết quả xử lý. VNPay: chỉ bắt đầu thanh toán khi đơn VALIDATED; dùng sandbox đã cấu hình, không dùng thông tin thẻ thật trong kiểm thử.
6. Kiểm tra lịch sử `/orders`, owner-only detail, hủy đơn theo trạng thái cho phép. Đơn COMPLETED có lựa chọn dọn các dòng đã mua; dòng mới hoặc đổi số lượng được giữ.
7. Đăng nhập ADMIN: dashboard, tạo/sửa/xóa sản phẩm, SKU ổn định, bulk sizes/gallery, upload ảnh, điều chỉnh kho, xem đơn và khóa/mở khóa người dùng khác.
8. Kiểm tra USER không mở được `/admin`; thử bàn phím, focus, menu/filter drawer và các độ rộng nêu trên.
9. Xem STOMP CONNECT có header Authorization (không chia sẻ token), và thử tắt notification service để kiểm tra polling/retry.
10. Xem lỗi thật khi gateway/stock/upload không sẵn sàng; trang hiển thị lỗi và retry, không thay bằng sản phẩm giả.

## Hành vi và giới hạn

Giỏ local cũ không được tự gửi lên backend vì thiếu xác minh SKU/tài khoản; từ Batch 2 cần đăng nhập để thêm vào giỏ. Wishlist chỉ lưu ID trên browser, chưa có API đồng bộ. Checkout dùng `POST /api/order` vì endpoint cart checkout hiện chỉ nhận COD và không mang địa chỉ/VNPay; xem giải thích trong tài liệu API.

COMPLETED mô tả hoàn tất xử lý của backend, không xác nhận giao hàng hay thu tiền COD. Điều chỉnh kho trả queued, chưa phải tồn mới. Dọn giỏ sau đơn là thao tác chủ động, không phải transaction liên thiết bị. Chạy production thực tế và benchmark vẫn cần đánh giá riêng.

Các ảnh trong `screenshots/` là tư liệu giao diện cũ được giữ nguyên, không đại diện Batch 2.

## Tác giả

Nguyễn Lâm Trường — [GitHub](https://github.com/truongnguyen3006). Backend: [ecommerce-backend-1-](https://github.com/truongnguyen3006/ecommerce-backend-1-).
