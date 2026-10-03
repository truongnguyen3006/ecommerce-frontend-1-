import { installTestStorage, testStorage } from './storage-setup';
import { test, expect } from '@playwright/test';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient, { authTransport, refreshAccessToken } from '../src/lib/axiosClient';
import { useAuthStore } from '../src/store/useAuthStore';
import { safeImageSource, FALLBACK_IMAGE } from '../src/lib/catalog';
import { parseProductFilters } from '../src/lib/product-filters';
import { safeReturnPath } from '../src/lib/auth-navigation';
import { canCancelOrder, canPayOrder, getOrderTrackingSteps } from '../src/lib/order-status';
import { validateVariants, skuPart } from '../src/lib/product-editor';
import { paymentDestination, paymentStateMessage } from '../src/services/paymentApi';
import { pendingStockOperation, saveStockOperation, finishStockOperation } from '../src/lib/stock-operation';
import { facetLabels, facetKey } from '../src/lib/facets';
import { apiErrorMessage } from '../src/lib/api-error';
import { makeOrder, fixtureToken } from './fixtures';

test('URL filters validate prices and normalize page/sort', () => {
  expect(parseProductFilters(new URLSearchParams('minPrice=-1')).error).toBeTruthy();
  expect(parseProductFilters(new URLSearchParams('minPrice=200&maxPrice=100')).error).toBeTruthy();
  expect(parseProductFilters(new URLSearchParams('minPrice=nope')).error).toBeTruthy();
  expect(parseProductFilters(new URLSearchParams('page=3&sort=price,desc')).filters).toMatchObject({ page: 2, sort: 'price,desc', pageSize: 12 });
  expect(parseProductFilters(new URLSearchParams('page=-99&sort=unsafe,desc')).filters).toMatchObject({ page: 0, sort: 'id,asc' });
});
test('returns remain on site', () => {
  for (const unsafe of ['https://example.test', '//example.test', '/\\example.test', '/login?next=/']) expect(safeReturnPath(unsafe)).toBe('/');
  expect(safeReturnPath('/checkout')).toBe('/checkout');
});
test('payment and cancellation follow actual backend states', () => {
  expect(canPayOrder(makeOrder('VALIDATED'), 'user-fixture')).toBe(true);
  expect(canPayOrder(makeOrder('PAYMENT_FAILED'), 'user-fixture')).toBe(false);
  expect(canPayOrder(makeOrder('VALIDATED'), 'admin-fixture')).toBe(false);
  expect(canCancelOrder(makeOrder('PAYMENT_FAILED'))).toBe(true);
  expect(canCancelOrder(makeOrder('PENDING'))).toBe(false);
  expect(getOrderTrackingSteps(makeOrder('COMPLETED')).every((step) => step.status === 'finish')).toBe(true);
  expect(getOrderTrackingSteps(makeOrder('VALIDATED')).map((step) => step.title).join()).not.toContain('giao hàng');
});
test('SKU duplicates and invalid stock are rejected, zero price stays valid', () => {
  const variant = { skuCode: 'FLASH-DEN-40', price: 0, color: 'Đen', size: '40', imageUrl: '', galleryImages: [], initialQuantity: 0, isActive: true };
  expect(skuPart('Đen')).toBe('DEN');
  expect(validateVariants([variant])).toBeNull();
  expect(validateVariants([variant, { ...variant, skuCode: variant.skuCode.toLowerCase() }])).toBeTruthy();
  expect(validateVariants([{ ...variant, initialQuantity: -1 }])).toBeTruthy();
});
test('payment destinations reject scripts and embedded credentials', () => {
  expect(paymentDestination('javascript:alert(1)')).toBeNull();
  expect(paymentDestination('https://user:password@example.test')).toBeNull();
  expect(paymentDestination('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')).toContain('vnpayment.vn');
});
test('invalid image URLs use a neutral local placeholder', () => {
  for (const url of ['javascript:alert(1)', '//example.test/a.png', 'https://user:pass@example.test/a.png', 'not a URL']) expect(safeImageSource(url)).toBe(FALLBACK_IMAGE);
  expect(safeImageSource('https://catalog.example.test/a.png')).toBe('https://catalog.example.test/a.png');
});

test.describe('real Axios interceptor with deterministic transport', () => {
  const client = axiosClient, transport = authTransport, store = useAuthStore;
  let adapter: typeof client.defaults.adapter, authAdapter: typeof transport.defaults.adapter;
  test.beforeEach(async () => {
    installTestStorage();
    store.persist.setOptions({ storage: createJSONStorage(() => testStorage) });
    adapter = client.defaults.adapter; authAdapter = transport.defaults.adapter;
    store.getState().login(fixtureToken());
    testStorage.setItem('refresh_token', 'test-only-refresh');
  });
  test.afterEach(() => {
    store.getState().logout(); client.defaults.adapter = adapter; transport.defaults.adapter = authAdapter;
    Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
  const unauthorized = (config: InternalAxiosRequestConfig) => new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 401));
  test('parallel 401 reads share exactly one refresh', async () => {
    let refreshes = 0;
    const newToken = fixtureToken('user', '-renewed');
    transport.defaults.adapter = async (config) => { refreshes++; await new Promise((resolve) => setTimeout(resolve, 20)); return response(config, { access_token: newToken, refresh_token: 'test-only-new-refresh' }); };
    client.defaults.adapter = async (config) => {
      if (config.headers.Authorization !== 'Bearer ' + newToken) throw unauthorized(config);
      return response(config, { ok: true });
    };
    const result = await Promise.all(['/api/cart/me', '/api/order/me', '/api/user/addresses'].map((path) => client.get(path)));
    expect(result).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
  });
  test('mutation is not automatically replayed after refresh', async () => {
    let mutations = 0;
    transport.defaults.adapter = async (config) => response(config, { access_token: fixtureToken('user', '-renewed'), refresh_token: 'test-only-new-refresh' });
    client.defaults.adapter = async (config) => { mutations++; throw unauthorized(config); };
    await expect(client.post('/api/order', { items: [] })).rejects.toMatchObject({ response: { status: 401 } });
    expect(mutations).toBe(1);
  });
  test('refresh failure logs out without loops', async () => {
    let refreshes = 0;
    transport.defaults.adapter = async (config) => { refreshes++; throw unauthorized(config); };
    client.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(client.get('/api/user/me')).rejects.toBeInstanceOf(AxiosError);
    expect(refreshes).toBe(1); expect(store.getState().isAuthenticated).toBe(false);
  });
  test('temporary refresh failure preserves the account and exposes the service error', async () => {
    transport.defaults.adapter = async (config) => {throw new AxiosError('Temporary outage','ERR_BAD_RESPONSE',config,undefined,response(config,{code:'AUTH_UPSTREAM_UNAVAILABLE'},503));};
    client.defaults.adapter = async (config) => {throw unauthorized(config);};
    await expect(client.get('/api/user/me')).rejects.toMatchObject({response:{status:503,data:{code:'AUTH_UPSTREAM_UNAVAILABLE'}}});
    expect(store.getState().isAuthenticated).toBe(true);expect(sessionStorage.getItem('refresh_token')).toBe('test-only-refresh');
  });
  test('disabled account refresh ends the session with its own classification', async () => {
    transport.defaults.adapter = async (config) => {throw new AxiosError('Disabled','ERR_BAD_REQUEST',config,undefined,response(config,{code:'ACCOUNT_DISABLED'},403));};
    await expect(refreshAccessToken()).rejects.toMatchObject({response:{status:403}});expect(store.getState().isAuthenticated).toBe(false);
  });
  test('late refresh cannot restore a logged-out account', async () => {
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => { release = resolve; });
    transport.defaults.adapter = async (config) => { await pending; return response(config, { access_token: fixtureToken('user', '-renewed'), refresh_token: 'test-only-new-refresh' }); };
    const refresh = refreshAccessToken();
    store.getState().logout(); release();
    await expect(refresh).rejects.toThrow('Session changed');
    expect(store.getState().isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
  test('switching accounts does not retain the previous profile', () => {
    store.getState().login(fixtureToken(), { id: 2, fullName: 'First account', email: 'first@example.test' });
    store.getState().login(fixtureToken('admin'));
    expect(store.getState().user).toMatchObject({ keycloakId: 'admin-fixture' });
    expect(store.getState().user?.id).toBeUndefined();
    expect(store.getState().user?.email).toBeUndefined();
  });
  test('a missing refresh token does not poison a later login', async () => {
    sessionStorage.removeItem('refresh_token');
    await expect(refreshAccessToken()).rejects.toThrow('Session expired');
    store.getState().login(fixtureToken());
    sessionStorage.setItem('refresh_token', 'test-only-refresh');
    const renewed = fixtureToken('user', '-renewed');
    transport.defaults.adapter = async (config) => response(config, { access_token: renewed, refresh_token: 'test-only-new-refresh' });
    await expect(refreshAccessToken()).resolves.toBe(renewed);
  });
});

test('in-flight payment and reconciliation block cancellation while COD keeps its behavior', () => {
  const order = makeOrder('VALIDATED');
  expect(canCancelOrder({ ...order, onlinePaymentInFlight: true })).toBe(false);
  expect(canCancelOrder({ ...order, paymentReconciliationRequired: true })).toBe(false);
  const cod = { ...order, paymentMethod: 'COD' as const };
  expect(canCancelOrder(cod)).toBe(true);
});

test('expired payment has no automatic retry and investigation protects cancellation', () => {
  expect(paymentStateMessage({orderNumber:'O',provider:'VNPAY',status:'EXPIRED_RECONCILIATION_REQUIRED',amount:10,retryAvailable:false})).toContain('hết hạn');
  expect(paymentStateMessage({orderNumber:'O',provider:'VNPAY',status:'NOT_CREATED',amount:10,retryAvailable:true})).toContain('có thể tạo');
  expect(canCancelOrder({status:'VALIDATED',workflowInvestigationRequired:true})).toBe(false);
});

test('retired SKU conflict explains permanent identity to admin', () => {
  expect(apiErrorMessage({isAxiosError:true,response:{status:409,data:{code:'SKU_RESERVED'}}})).toContain('không thể tái sử dụng');
});

test('domain codes select action-specific messages before generic HTTP fallbacks', () => {
  const message=(status:number,code:string) => apiErrorMessage({isAxiosError:true,response:{status,data:{code,message:'provider-secret'}}});
  expect(message(409,'UPLOAD_NOT_CONFIGURED')).toContain('tải ảnh');expect(message(409,'PAYMENT_NOT_CONFIGURED')).toContain('VNPay');
  expect(message(409,'ONLINE_PAYMENT_IN_FLIGHT')).toContain('Đơn chưa thể hủy');expect(message(409,'PRODUCT_REVISION_CONFLICT')).toContain('người khác');
  expect(message(401,'INVALID_CREDENTIALS')).toContain('mật khẩu');expect(message(403,'ACCOUNT_DISABLED')).toContain('bị khóa');
  for(const status of [400,401,403,404,409,413,503]) expect(message(status,'UNRECOGNIZED')).not.toContain('provider-secret');
  expect(message(409,'UNRECOGNIZED')).not.toContain('tồn kho');
});
test('facet normalization preserves labels accents and interior spaces while collapsing case duplicates', () => {
  expect(facetLabels(['  Giày ','giày',' Gi  ày ','Giay'])).toEqual(['Giày','Gi  ày','Giay']);
  expect(facetKey(' ĐEN ')).toBe('đen');expect(facetKey('Gi  ày')).not.toBe(facetKey('Giày'));
  expect(parseProductFilters(new URLSearchParams('category=++Giày++&color=+ĐEN+')).filters).toMatchObject({category:'Giày',color:'ĐEN'});
});

test('pending stock operation survives reload and remains scoped to the account and SKU', () => {
  installTestStorage();
  const value={id:'12345678-1234-1234-1234-123456789abc',quantity:2,accepted:true};
  saveStockOperation('admin-A','SKU',value);expect(pendingStockOperation('admin-A','SKU')).toEqual(value);
  expect(pendingStockOperation('admin-B','SKU')).toBeNull();expect(pendingStockOperation('admin-A','OTHER')).toBeNull();
  finishStockOperation('admin-A','SKU');expect(pendingStockOperation('admin-A','SKU')).toBeNull();
  Reflect.deleteProperty(globalThis,'window');Reflect.deleteProperty(globalThis,'sessionStorage');
});
