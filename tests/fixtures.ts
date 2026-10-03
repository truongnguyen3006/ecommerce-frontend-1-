// Contract fixtures only: these are never imported into the production app.
import type { Page } from '@playwright/test';
import type { Product, Cart, CatalogItem } from '../src/types';
import type { OrderResponse, OrderStatus } from '../src/services/orderApi';
import type { UserAddress } from '../src/services/addressApi';
type Role = 'user' | 'admin';
export function fixtureToken(role: Role = 'user', suffix = ''): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [encode({ alg: 'none' }), encode({ sub: role + '-fixture', preferred_username: role + suffix, exp: Math.floor(Date.now() / 1000) + 3600, realm_access: { roles: [role.toUpperCase()] } }), 'test-only'].join('.');
}
export async function signIn(page: Page, role: Role = 'user') {
  await page.addInitScript(({ role, token }) => {
    const user = { id: role === 'admin' ? 1 : 2, keycloakId: role + '-fixture', username: role, fullName: role === 'admin' ? 'Quản trị kiểm thử' : 'Khách kiểm thử', email: role + '@example.test', roles: [role] };
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('refresh_token', 'test-only-refresh');
    sessionStorage.setItem('flash-sale-auth', JSON.stringify({ state: { user, token, isAuthenticated: true }, version: 0 }));
  }, { role, token: fixtureToken(role) });
}
export const makeProducts = (): Product[] => Array.from({ length: 14 }, (_, index) => ({
  id: index + 1, name: 'Sản phẩm kiểm thử ' + String(index + 1).padStart(2, '0'), description: 'Mô tả từ fixture kiểm thử contract.',
  category: index % 2 ? 'Phụ kiện' : 'Giày', price: 100000 + index * 10000, imageUrl: '/product-placeholder.svg',
  variants: [
    { skuCode: 'FIXTURE-' + (index + 1) + '-BLACK-40', color: 'Đen', size: '40', price: 100000 + index * 10000, imageUrl: '/product-placeholder.svg', galleryImages: ['/product-placeholder.svg'], isActive: true },
    { skuCode: 'FIXTURE-' + (index + 1) + '-BLACK-41', color: 'Đen', size: '41', price: 100000 + index * 10000, imageUrl: '/product-placeholder.svg', galleryImages: [], isActive: true },
    { skuCode: 'FIXTURE-' + (index + 1) + '-WHITE-40', color: 'Trắng', size: '40', price: 110000 + index * 10000, imageUrl: '/product-placeholder.svg', galleryImages: [], isActive: true },
  ],
}));
export const makeOrder = (status: OrderStatus = 'VALIDATED', paymentMethod: 'COD' | 'VNPAY' = 'VNPAY'): OrderResponse => ({
  id: 1, orderNumber: 'order-fixture-1', status, userId: 'user-fixture', paymentMethod, totalPrice: 100000, orderDate: '2026-10-03 10:00:00',
  shippingRecipientName: 'Khách kiểm thử', shippingRecipientPhone: '0900000000', shippingAddressLine: 'Địa chỉ kiểm thử', shippingAddressLabel: 'Nhà riêng',
  orderLineItemsList: [{ id: 1, skuCode: 'FIXTURE-1-BLACK-40', quantity: 1, price: 100000, productName: 'Sản phẩm kiểm thử 01', color: 'Đen', size: '40' }],
});
export interface RequestRecord { path: string; method: string; body: unknown; idempotencyKey?: string; query: string }
export async function mockBackend(page: Page, options: { role?: Role; terminal?: OrderStatus; initialOrder?: OrderResponse; emptyCart?: boolean; paymentState?: string } = {}) {
  const actor = options.role || 'user';
  const products = makeProducts();
  const cart: Cart = { userId: actor + '-fixture', items: options.emptyCart ? [] : [{ skuCode: 'FIXTURE-1-BLACK-40', quantity: 1, productName: products[0].name, price: 100000, imageUrl: '/product-placeholder.svg' }] };
  let addresses: UserAddress[] = [{ id: 1, label: 'Nhà riêng', recipientName: 'Khách kiểm thử', recipientPhone: '0900000000', addressLine: 'Địa chỉ kiểm thử', isDefault: true }];
  const users = [
    { id: 1, keycloakId: 'admin-fixture', fullName: 'Quản trị kiểm thử', email: 'admin@example.test', phoneNumber: '', address: '', status: true, roles: ['ADMIN'] },
    { id: 2, keycloakId: 'user-fixture', fullName: 'Khách kiểm thử', email: 'user@example.test', phoneNumber: '0900000000', address: 'Địa chỉ kiểm thử', status: true, roles: ['USER'] },
  ];
  let order = options.initialOrder || makeOrder(), orderReads = 0, accepted = false;
  const records: RequestRecord[] = [];
  // Failed test-only CDN images exercise the production local placeholder.
  await page.route('**/_next/image?**', (route) => route.abort());
  await page.route('http://localhost:8080/ws/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = decodeURIComponent(url.pathname), method = request.method();
    let body: Record<string, unknown> = {};
    try { body = request.postDataJSON() || {}; } catch { /* multipart data is inspected separately */ }
    records.push({ path, method, body, idempotencyKey: request.headers()['idempotency-key'], query: url.search });
    const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    const variant = (sku: string): CatalogItem | undefined => {
      const product = products.find((product) => product.variants.some((item) => item.skuCode === sku));
      const found = product?.variants.find((item) => item.skuCode === sku);
      return product && found ? { ...found, name: product.name } : undefined;
    };
    if (path === '/api/product/search') {
      let result = products.filter((product) => {
        const keyword = url.searchParams.get('keyword')?.toLowerCase() || '', category = url.searchParams.get('category') || '';
        const color = url.searchParams.get('color') || '', size = url.searchParams.get('size') || '';
        return product.name.toLowerCase().includes(keyword) && (!category || product.category === category) &&
          (!url.searchParams.has('minPrice') || product.price >= Number(url.searchParams.get('minPrice'))) &&
          (!url.searchParams.has('maxPrice') || product.price <= Number(url.searchParams.get('maxPrice'))) &&
          product.variants.some((variant) => (!color || variant.color === color) && (!size || variant.size === size));
      });
      const sort = url.searchParams.get('sort');
      if (sort === 'price,desc') result = [...result].sort((a, b) => b.price - a.price);
      const page = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 12);
      return respond({ content: result.slice(page * size, (page + 1) * size), page, size, totalElements: result.length, totalPages: Math.ceil(result.length / size) });
    }
    if (path === '/api/product' && method === 'GET') return respond(products);
    if (path === '/api/product' && method === 'POST') return respond({ id: 100, ...body, price: body.basePrice }, 201);
    if (path.startsWith('/api/product/sku/')) return variant(path.split('/').pop()!) ? respond(variant(path.split('/').pop()!)) : respond({ code: 'NOT_FOUND' }, 404);
    if (/^\/api\/product\/\d+$/.test(path)) {
      const product = products.find((item) => item.id === Number(path.split('/').pop()));
      if (!product) return respond({ code: 'NOT_FOUND' }, 404);
      if (method === 'PUT') {
        Object.assign(product, body, { price: body.basePrice ?? product.price });
        return respond(product);
      }
      if (method === 'DELETE') { products.splice(products.indexOf(product), 1); return route.fulfill({ status: 204 }); }
      return respond(product);
    }
    if (path === '/api/inventory/adjust') return respond({ skuCode: body.skuCode, status: 'queued' }, 202);
    if (path.startsWith('/api/inventory/')) return respond({ skuCode: path.split('/').pop(), quantity: path.endsWith('-41') ? 0 : 3 });
    if (path === '/api/cart/me') {
      if (method === 'DELETE') { cart.items = []; return route.fulfill({ status: 204 }); }
      return respond(cart);
    }
    if (path.startsWith('/api/cart/items')) {
      const sku = String(body.skuCode || path.split('/').pop()), item = cart.items.find((item) => item.skuCode === sku);
      if (method === 'DELETE') { cart.items = cart.items.filter((item) => item.skuCode !== sku); return route.fulfill({ status: 204 }); }
      const quantity = Number(body.quantity) + (method === 'POST' ? item?.quantity || 0 : 0);
      if (quantity > 3 || quantity <= 0) return respond({ code: 'CONFLICT' }, 409);
      if (item) item.quantity = quantity; else cart.items.push({ skuCode: sku, productName: variant(sku)!.name, quantity, price: variant(sku)!.price, imageUrl: '/product-placeholder.svg' });
      return respond({});
    }
    if (path === '/api/user/me') {
      const profile = users.find((user) => user.keycloakId === actor + '-fixture')!;
      if (method === 'PATCH') Object.assign(profile, body);
      return respond(profile);
    }
    if (path === '/api/user/addresses' && method === 'GET') return respond(addresses);
    if (path === '/api/user/addresses' && method === 'POST') {
      const address = { ...body, id: Math.max(0, ...addresses.map((item) => item.id)) + 1 } as unknown as UserAddress;
      if (address.isDefault) addresses.forEach((item) => item.isDefault = false);
      addresses.push(address); return respond(address, 201);
    }
    if (path.startsWith('/api/user/addresses/')) {
      const id = Number(path.split('/')[4]), address = addresses.find((item) => item.id === id);
      if (!address) return respond({}, 404);
      if (method === 'DELETE') { addresses = addresses.filter((item) => item.id !== id); return route.fulfill({ status: 204 }); }
      if (path.endsWith('/default')) addresses.forEach((item) => item.isDefault = item.id === id);
      else Object.assign(address, body);
      return respond(address);
    }
    if (path === '/api/user') return respond(users);
    if (path.startsWith('/api/user/admin/')) {
      const profile = users.find((user) => user.id === Number(path.split('/')[4]))!;
      profile.status = Boolean(body.enabled); return respond(profile);
    }
    if (path === '/api/order' && method === 'POST') {
      order = { ...makeOrder('PENDING', body.paymentMethod as 'COD' | 'VNPAY'), shippingRecipientName: String(body.shippingRecipientName), shippingRecipientPhone: String(body.shippingRecipientPhone), shippingAddressLine: String(body.shippingAddressLine) };
      accepted = true; return respond({ orderNumber: order.orderNumber, message: 'Order received' }, 202);
    }
    if (path === '/api/order/me' || path === '/api/order/admin') return respond([order]);
    if (path.endsWith('/cancel')) { order.status = 'CANCELLED'; return respond(order); }
    if (path === '/api/order/' + order.orderNumber) {
      orderReads++;
      if (accepted && orderReads > 1) order.status = options.terminal || 'VALIDATED';
      return respond(order);
    }
    if (path === '/api/payment/order/' + order.orderNumber) return respond({ orderNumber: order.orderNumber, provider: 'VNPAY', status: options.paymentState || 'NOT_CREATED', amount: order.totalPrice });
    if (path === '/api/payment/vnpay/create') return respond({ code: 'CONFLICT', message: 'Not configured' }, 409);
    if (path.startsWith('/api/product/uploads/')) return respond(path.endsWith('/gallery') ? [{ secureUrl: '/product-placeholder.svg', publicId: 'fixture-image' }] : { secureUrl: '/product-placeholder.svg', publicId: 'fixture-image' });
    return respond({ code: 'NOT_FOUND' }, 404);
  });
  await page.route('**/auth/**', async (route) => {
    const url = new URL(route.request().url());
    let body: unknown; try { body = route.request().postDataJSON(); } catch { body = route.request().postData(); }
    records.push({ path: url.pathname, method: route.request().method(), body, query: url.search });
    if (url.pathname === '/auth/login') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: fixtureToken(actor), refresh_token: 'test-only-refresh', expires_in: 3600 }) });
    if (url.pathname === '/auth/register') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(users[1]) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return { records, cart, products, get order() { return order; }, setOrderStatus: (status: OrderStatus) => { order.status = status; } };
}
export async function noOverflow(page: Page) {
  return page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
}
