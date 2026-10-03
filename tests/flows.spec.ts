import { test, expect } from '@playwright/test';
import { mockBackend, signIn, makeOrder, noOverflow } from './fixtures';

test('public home uses real API cards and links', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trong danh mục' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 01/ }).first()).toBeVisible();
  await expect(page.getByText('New drop')).toHaveCount(0);
  await expect(page.getByText('Miễn phí vận chuyển')).toHaveCount(0);
  const size = await noOverflow(page); expect(size.content).toBeLessThanOrEqual(size.width);
});
test('API failure is an error with retry, not an empty product catalog', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.route('**/api/product/search?**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"SERVICE_UNAVAILABLE"}' }));
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Chưa thể tải sản phẩm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  expect(backend.records.filter((record) => record.path === '/api/product/search')).toHaveLength(0);
  await page.unroute('**/api/product/search?**');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 01/ })).toBeVisible();
});
test('URL search, sorting, pagination and range validation use backend contracts', async ({ page }, testInfo) => {
  const backend = await mockBackend(page);
  await page.goto('/products');
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 01/ })).toBeVisible();
  await page.getByRole('listitem', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(backend.records.some((record) => record.path === '/api/product/search' && new URLSearchParams(record.query).get('page') === '1')).toBe(true);
  await page.getByLabel('Sắp xếp', { exact: true }).selectOption('price,desc');
  await expect(page).toHaveURL(/sort=price%2Cdesc/);
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 14/ })).toBeVisible();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Lọc', exact: true }).click();
  const filter = testInfo.project.name === 'mobile' ? page.getByRole('dialog').getByRole('form', { name: 'Bộ lọc sản phẩm' }) : page.getByRole('form', { name: 'Bộ lọc sản phẩm' }).first();
  await filter.getByLabel('Giá tối thiểu').fill('200000');
  await filter.getByLabel('Giá tối đa').fill('100000');
  await filter.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(filter.getByRole('alert')).toHaveText('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
  await filter.getByLabel('Giá tối thiểu').fill('');
  await filter.getByLabel('Giá tối đa').fill('');
  await filter.getByLabel('Từ khóa').fill('kiểm thử 02');
  await filter.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page).toHaveURL(/keyword=/);
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 02/ })).toBeVisible();
  const request = backend.records.filter((record) => record.path === '/api/product/search').at(-1)!;
  expect(new URLSearchParams(request.query).get('keyword')).toBe('kiểm thử 02');
  expect(new URLSearchParams(request.query).get('page')).toBe('0');
});
test('private customer routes and admin require authentication', async ({ page }) => {
  const backend = await mockBackend(page);
  for (const path of ['/checkout', '/profile', '/orders', '/checkout/waiting/order-fixture-1', '/admin']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Đăng nhập để tiếp tục' })).toBeVisible();
  }
  expect(backend.records.some((record) => record.path.startsWith('/api/order') || record.path.startsWith('/api/user/addresses'))).toBe(false);
});
test('login resumes the requested customer page', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login?next=%2Fcheckout');
  await page.getByLabel('Tên đăng nhập').fill('user');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Giỏ hàng & thanh toán' })).toBeVisible();
});
test('registration enforces backend password minimum before submitting', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto('/register');
  await page.getByLabel('Tên đăng nhập').fill('fixture-new');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('1234567');
  await page.getByLabel('Họ và tên').fill('Khách mới');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByText('Mật khẩu cần từ 8 đến 128 ký tự.')).toBeVisible();
  expect(backend.records.some((record) => record.path === '/auth/register')).toBe(false);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test('variant stock, quantity bounds, backend cart and local wishlist work', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page, { emptyCart: true });
  await page.goto('/product/1');
  await expect(page.getByRole('heading', { name: 'Sản phẩm kiểm thử 01' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Size 41 — hết hàng', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Size 40', exact: true }).click();
  await expect(page.getByText('Còn 3 sản phẩm.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tăng số lượng' }).click({ clickCount: 2, delay: 100 });
  await expect(page.getByRole('button', { name: 'Tăng số lượng' })).toBeDisabled();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page.getByText('Đã thêm vào giỏ hàng.')).toBeVisible();
  expect(backend.records.find((record) => record.path === '/api/cart/items' && record.method === 'POST')?.body).toEqual({ skuCode: 'FIXTURE-1-BLACK-40', quantity: 3 });
  await page.getByRole('button', { name: 'Lưu yêu thích' }).click();
  await page.goto('/wishlist');
  await expect(page.getByRole('link', { name: /Sản phẩm kiểm thử 01/ })).toBeVisible();
  await expect(page.getByText(/chưa đồng bộ với tài khoản/)).toBeVisible();
});
test('cart quantity updates and removals are server-owned', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page);
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Tăng số lượng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await expect(page.locator('output')).toHaveText('2');
  expect(backend.records.find((record) => record.path.endsWith('/FIXTURE-1-BLACK-40') && record.method === 'PUT')?.body).toEqual({ skuCode: 'FIXTURE-1-BLACK-40', quantity: 2 });
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeVisible();
  expect(backend.cart.items).toHaveLength(0);
});
test('202 checkout preserves cart, stock failure allows review without losing items', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page, { terminal: 'FAILED' });
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Gửi đơn hàng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Gửi đơn hàng' }).click();
  await expect(page).toHaveURL(/waiting\/order-fixture-1/);
  expect(backend.cart.items).toHaveLength(1);
  const placement = backend.records.find((record) => record.path === '/api/order' && record.method === 'POST')!;
  expect(placement.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
  expect(placement.body).toMatchObject({ items: [{ skuCode: 'FIXTURE-1-BLACK-40', quantity: 1 }], paymentMethod: 'COD', shippingRecipientName: 'Khách kiểm thử', shippingAddressLine: 'Địa chỉ kiểm thử' });
  await page.getByRole('button', { name: 'Tải lại trạng thái' }).click();
  await expect(page.getByRole('heading', { name: 'Không thể xử lý', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Xem giỏ hàng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sản phẩm kiểm thử 01' })).toBeVisible();
  expect(backend.records.some((record) => record.path.startsWith('/api/cart') && record.method === 'DELETE')).toBe(false);
});
test('completed order cleanup preserves changed or newly added cart lines', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page, { terminal: 'COMPLETED' });
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Gửi đơn hàng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Gửi đơn hàng' }).click();
  await expect(page).toHaveURL(/waiting/);
  await page.getByRole('button', { name: 'Tải lại trạng thái' }).click();
  await expect(page.getByRole('heading', { name: 'Đã hoàn tất xử lý', exact: true })).toBeVisible();
  backend.cart.items[0].quantity = 2;
  backend.cart.items.push({ skuCode: 'FIXTURE-2-BLACK-40', quantity: 1, productName: backend.products[1].name, price: backend.products[1].price });
  await page.getByRole('button', { name: 'Xóa sản phẩm đã mua khỏi giỏ' }).click();
  await expect(page.getByText('Đã xóa sản phẩm đã mua. Các dòng có số lượng thay đổi được giữ lại.')).toBeVisible();
  expect(backend.cart.items[0].quantity).toBe(2);
  expect(backend.cart.items.map((item) => item.skuCode)).toContain('FIXTURE-2-BLACK-40');
});
test('manual checkout retry after uncertain response reuses the idempotency key', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page);
  let firstKey = '';
  await page.route('**/api/order', async (route) => {
    firstKey = route.request().headers()['idempotency-key'];
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"SERVICE_UNAVAILABLE"}' });
  }, { times: 1 });
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Gửi đơn hàng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Gửi đơn hàng' }).click();
  await expect(page.getByText('Không thể kết nối dịch vụ. Vui lòng thử lại sau.')).toBeVisible();
  expect(backend.cart.items).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Gửi đơn hàng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Gửi đơn hàng' }).click();
  await expect(page).toHaveURL(/waiting\/order-fixture-1/);
  expect(backend.records.find((record) => record.path === '/api/order' && record.method === 'POST')?.idempotencyKey).toBe(firstKey);
});
test('completed order cleanup deletes matching purchased lines only', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page, { terminal: 'COMPLETED' });
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Gửi đơn hàng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Gửi đơn hàng' }).click();
  await page.getByRole('button', { name: 'Tải lại trạng thái' }).click();
  await expect(page.getByRole('heading', { name: 'Đã hoàn tất xử lý', exact: true })).toBeVisible();
  backend.cart.items.push({ skuCode: 'FIXTURE-2-BLACK-40', quantity: 1, productName: backend.products[1].name, price: backend.products[1].price });
  await page.getByRole('button', { name: 'Xóa sản phẩm đã mua khỏi giỏ' }).click();
  await expect(page.getByText('Đã cập nhật giỏ hàng.')).toBeVisible();
  expect(backend.cart.items.map((item) => item.skuCode)).toEqual(['FIXTURE-2-BLACK-40']);
});
test('payment query string is not proof of success and PAYMENT_FAILED cannot repay', async ({ page }) => {
  await signIn(page);
  await mockBackend(page, { initialOrder: makeOrder('PAYMENT_FAILED') });
  await page.goto('/checkout/waiting/order-fixture-1?payment=success');
  await expect(page.getByRole('heading', { name: 'Thanh toán thất bại', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thanh toán VNPay' })).toHaveCount(0);
  await expect(page.getByText('Thanh toán đã được xác nhận từ dịch vụ.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hủy đơn hàng' })).toBeVisible();
});
test('order cancellation uses confirmation and correct endpoint', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page);
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Hủy đơn hàng' }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
  await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible();
  expect(backend.records.some((record) => record.path === '/api/order/order-fixture-1/cancel' && record.method === 'POST')).toBe(true);
});
test('in-flight online payment hides cancellation while keeping payment resume', async ({ page }) => {
  await signIn(page);
  await mockBackend(page, { initialOrder: { ...makeOrder('VALIDATED'), onlinePaymentInFlight: true } });
  await page.goto('/orders');
  await expect(page.getByRole('button', { name: 'Hủy đơn hàng' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thanh toán VNPay' })).toBeVisible();
  await expect(page.getByText('Thanh toán trực tuyến đã bắt đầu. Đơn chưa thể hủy trong khi chờ kết quả.')).toBeVisible();
});
test('late-money reconciliation preserves cancelled order and blocks another payment', async ({ page }) => {
  await signIn(page);
  await mockBackend(page, { initialOrder: { ...makeOrder('CANCELLED'), paymentReconciliationRequired: true } });
  await page.goto('/checkout/waiting/order-fixture-1');
  await expect(page.getByRole('heading', { name: 'Đã hủy', exact: true })).toBeVisible();
  await expect(page.getByText('Đã ghi nhận tiền; đơn hàng cần đối soát. Vui lòng liên hệ hỗ trợ trước khi thanh toán lại.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hủy đơn hàng' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thanh toán VNPay' })).toHaveCount(0);
});
test('profile edits and address create/edit/default/delete preserve backend contracts', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Họ và tên').fill('Khách đã sửa');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
  await page.getByRole('button', { name: 'Thêm địa chỉ', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Người nhận').fill('Người nhận mới');
  await dialog.getByLabel('Số điện thoại', { exact: true }).fill('0910000000');
  await dialog.getByLabel('Địa chỉ giao hàng', { exact: true }).fill('Địa chỉ mới');
  await dialog.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
  await expect(page.getByText('Địa chỉ mới', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đặt mặc định' }).click();
  await expect(page.getByRole('button', { name: 'Đặt mặc định' })).toHaveCount(1);
  const newAddress = page.locator('.address-row').filter({ hasText: 'Người nhận mới' });
  await newAddress.getByRole('button', { name: 'Sửa', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Địa chỉ giao hàng', { exact: true }).fill('Địa chỉ đã sửa');
  await dialog.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
  await expect(page.getByText('Địa chỉ đã sửa', { exact: true })).toBeVisible();
  await newAddress.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa địa chỉ', exact: true }).click();
  await expect(page.getByText('Địa chỉ đã sửa', { exact: true })).toHaveCount(0);
  expect(backend.records.some((record) => record.path === '/api/user/me' && record.method === 'PATCH')).toBe(true);
  expect(backend.records.some((record) => record.path === '/api/user/addresses/2/default' && record.method === 'PATCH')).toBe(true);
  expect(backend.records.some((record) => record.path === '/api/user/addresses/2' && record.method === 'DELETE')).toBe(true);
});
test('USER cannot mount admin data; ADMIN can navigate and lock users', async ({ page }) => {
  await signIn(page);
  let backend = await mockBackend(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(backend.records.some((record) => record.path === '/api/user' || record.path === '/api/order/admin')).toBe(false);
  await page.unroute('**/api/**');
  await signIn(page, 'admin');
  backend = await mockBackend(page, { role: 'admin' });
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Người dùng', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Trạng thái Quản trị kiểm thử' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Trạng thái Khách kiểm thử' }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText('Đã khóa', { exact: true })).toBeVisible();
  expect(backend.records.find((record) => record.path === '/api/user/admin/2/status')?.body).toEqual({ enabled: false });
});
test('admin create validates variants and zero-price SKU creation is intentional', async ({ page }) => {
  await signIn(page, 'admin');
  const backend = await mockBackend(page, { role: 'admin' });
  await page.goto('/admin/products/create');
  await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Sản phẩm mới kiểm thử');
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page.getByText('Thêm ít nhất một biến thể trước khi lưu.')).toBeVisible();
  await page.getByRole('button', { name: 'Thêm biến thể', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mã SKU').fill('NEW-BLACK-40');
  await dialog.getByLabel('Màu sắc').fill('Đen');
  await dialog.getByLabel('Kích cỡ').fill('40');
  await dialog.getByRole('button', { name: 'Lưu biến thể', exact: true }).click();
  await expect(page.getByText('NEW-BLACK-40', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  const request = backend.records.find((record) => record.path === '/api/product' && record.method === 'POST')!;
  expect(request.body).toMatchObject({ basePrice: 0, variants: [{ skuCode: 'NEW-BLACK-40', price: 0, initialQuantity: 0 }] });
  expect(request.body).not.toHaveProperty('galleryImages');
});
test('admin image binding, variant identity and queued inventory are preserved', async ({ page }) => {
  await signIn(page, 'admin');
  const backend = await mockBackend(page, { role: 'admin' });
  await page.goto('/admin/products/edit/1');
  await page.getByLabel('Ảnh đại diện sản phẩm').fill('https://res.cloudinary.com/fixture/image/upload/image.png');
  await page.getByRole('button', { name: 'Lưu thông tin chung' }).click();
  await expect(page.getByText('Đã lưu sản phẩm.')).toBeVisible();
  expect(backend.records.find((record) => record.path === '/api/product/1' && record.method === 'PUT')?.body).toHaveProperty('imageUrl', 'https://res.cloudinary.com/fixture/image/upload/image.png');
  await page.getByRole('button', { name: 'Sửa FIXTURE-1-BLACK-40', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Mã SKU')).toBeDisabled();
  await dialog.getByLabel('Màu sắc').fill('Đen mới');
  await dialog.getByRole('button', { name: 'Lưu biến thể', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(backend.products[0].variants[0].skuCode).toBe('FIXTURE-1-BLACK-40');
  await page.getByRole('button', { name: 'Điều chỉnh kho', exact: true }).first().click();
  await page.getByLabel('Số lượng điều chỉnh').fill('2');
  await page.getByRole('button', { name: 'Gửi điều chỉnh', exact: true }).click();
  await expect(page.getByText('Đã gửi điều chỉnh kho. Kiểm tra lại tồn kho sau khi hệ thống xử lý.')).toBeVisible();
  expect(backend.records.find((record) => record.path === '/api/inventory/adjust')?.body).toMatchObject({ skuCode: 'FIXTURE-1-BLACK-40', adjustmentQuantity: 2 });
});
test('admin bulk sizes retain uploaded variant galleries and multipart fields', async ({ page }) => {
  await signIn(page, 'admin');
  const backend = await mockBackend(page, { role: 'admin' });
  let uploadBody = '';
  const image = 'https://res.cloudinary.com/fixture/image/upload/gallery.png';
  await page.route('**/api/product/uploads/gallery', async (route) => {
    uploadBody = route.request().postDataBuffer()?.toString() || '';
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ secureUrl: image, publicId: 'test-only-gallery' }]) });
  });
  await page.goto('/admin/products/create');
  await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Sản phẩm bulk kiểm thử');
  await page.getByRole('button', { name: 'Thêm nhiều kích cỡ' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mã dòng sản phẩm').fill('FLASH');
  await dialog.getByLabel('Tên màu').fill('Đen');
  const sizes = dialog.getByLabel('Các kích cỡ');
  await sizes.fill('40'); await sizes.press('Enter');
  await sizes.fill('41'); await sizes.press('Enter');
  await dialog.locator('input[type="file"][multiple]').setInputFiles({ name: 'test-only.png', mimeType: 'image/png', buffer: Buffer.from('test-only-upload') });
  await expect(dialog.locator('input[value="' + image + '"]')).toHaveCount(1);
  expect(uploadBody).toContain('name="files"');
  expect(uploadBody).toContain('filename="test-only.png"');
  await dialog.getByRole('button', { name: 'Thêm biến thể', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  const body = backend.records.find((record) => record.path === '/api/product' && record.method === 'POST')?.body;
  expect(body).toMatchObject({ variants: [{ skuCode: 'FLASH-DEN-40', galleryImages: [image], price: 0 }, { skuCode: 'FLASH-DEN-41', galleryImages: [image], price: 0 }] });
});
test('STOMP CONNECT carries bearer header and notifications refetch authoritative order', async ({ page }) => {
  await signIn(page);
  const backend = await mockBackend(page, { initialOrder: makeOrder('PENDING') });
  await page.route('http://localhost:8080/ws/**', (route) => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': 'http://localhost:3001', 'access-control-allow-credentials': 'true' }, contentType: 'application/json', body: '{"websocket":true,"cookie_needed":false,"origins":["*:*"],"entropy":1}' }));
  let connect = '', destination = '', sendNotification: (() => void) | undefined;
  await page.routeWebSocket(/ws:\/\/localhost:8080\/ws\/.*\/websocket/, (socket) => {
    socket.send('o');
    socket.onMessage((message) => {
      const frames = JSON.parse(String(message)) as string[];
      for (const frame of frames) {
        if (frame.startsWith('CONNECT')) {
          connect = frame;
          socket.send('a' + JSON.stringify(['CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0']));
        }
        if (frame.startsWith('SUBSCRIBE')) {
          destination = frame;
          const subscription = frame.match(/id:([^\n]+)/)![1];
          sendNotification = () => socket.send('a' + JSON.stringify([`MESSAGE\nsubscription:${subscription}\nmessage-id:fixture\ndestination:/topic/order/order-fixture-1\n\n{"status":"COMPLETED"}\0`]));
        }
      }
    });
  });
  await page.goto('/checkout/waiting/order-fixture-1');
  const access = await page.evaluate(() => sessionStorage.getItem('access_token'));
  await expect.poll(() => connect).toContain('Authorization:Bearer ' + access);
  await expect.poll(() => destination).toContain('/topic/order/order-fixture-1');
  const before = backend.records.filter((record) => record.path === '/api/order/order-fixture-1').length;
  sendNotification!();
  await expect.poll(() => backend.records.filter((record) => record.path === '/api/order/order-fixture-1').length).toBeGreaterThan(before);
  await expect(page.getByRole('heading', { name: 'Đang xác nhận', exact: true })).toBeVisible();
  backend.setOrderStatus('COMPLETED'); sendNotification!();
  await expect(page.getByRole('heading', { name: 'Đã hoàn tất xử lý', exact: true })).toBeVisible();
});

test('expired payment shows investigation and disables financial actions', async ({ page }) => {
  await signIn(page);
  await mockBackend(page, {initialOrder:{...makeOrder('VALIDATED'),onlinePaymentInFlight:true,workflowInvestigationRequired:true},paymentState:'EXPIRED_RECONCILIATION_REQUIRED'});
  await page.goto('/checkout/waiting/order-fixture-1?payment=waiting');
  await expect(page.getByText('Liên kết thanh toán đã hết hạn.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Thanh toán VNPay'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Hủy đơn hàng'})).toHaveCount(0);
});
