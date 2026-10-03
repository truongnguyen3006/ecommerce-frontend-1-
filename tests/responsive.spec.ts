import { test, expect } from '@playwright/test';
import { mockBackend, signIn, noOverflow } from './fixtures';
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`major pages fit ${width}px and expose operational controls`, async ({ browser }, testInfo) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ viewport: { width, height: 1000 }, baseURL: 'http://localhost:3001' });
    const page = await context.newPage();
    await signIn(page);
    await mockBackend(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(page.url() + ': ' + error.message));
    const customer = [['/', 'home'], ['/products', 'products'], ['/product/1', 'detail'], ['/checkout', 'checkout'], ['/checkout/waiting/order-fixture-1', 'waiting'], ['/orders', 'orders'], ['/profile', 'profile'], ['/wishlist', 'wishlist'], ['/about', 'about'], ['/help', 'help']];
    for (const [route, label] of customer) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('[role="status"]')).toHaveCount(0);
      const size = await noOverflow(page); expect(size.content, label).toBeLessThanOrEqual(size.width);
      if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath(label + '.png'), fullPage: true, animations: 'disabled' });
    }
    await context.close();
    const adminContext = await browser.newContext({ viewport: { width, height: 1000 }, baseURL: 'http://localhost:3001' });
    const admin = await adminContext.newPage();
    await signIn(admin, 'admin');
    await mockBackend(admin, { role: 'admin' });
    admin.on('pageerror', (error) => errors.push(admin.url() + ': ' + error.message));
    for (const [route, label] of [['/admin', 'admin'], ['/admin/products', 'admin-products'], ['/admin/products/1', 'admin-detail'], ['/admin/products/create', 'admin-create'], ['/admin/products/edit/1', 'admin-edit'], ['/admin/orders', 'admin-orders'], ['/admin/users', 'admin-users']]) {
      await admin.goto(route);
      await expect(admin.locator('h1').first()).toBeVisible();
      const size = await noOverflow(admin); expect(size.content, label).toBeLessThanOrEqual(size.width);
      if (width < 768) {
        await admin.getByRole('button', { name: 'Mở menu quản trị' }).click();
        await expect(admin.getByRole('dialog').getByRole('link', { name: 'Đơn hàng', exact: true })).toBeVisible();
        await admin.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();
        await expect(admin.getByRole('dialog')).not.toBeVisible();
      }
      if (width === 390 || width === 1440) await admin.screenshot({ path: testInfo.outputPath(label + '.png'), fullPage: true, animations: 'disabled' });
    }
    await adminContext.close();
    const anonymousContext = await browser.newContext({ viewport: { width, height: 1000 }, baseURL: 'http://localhost:3001' });
    const anonymous = await anonymousContext.newPage();
    anonymous.on('pageerror', (error) => errors.push(anonymous.url() + ': ' + error.message));
    await mockBackend(anonymous);
    for (const [route, label] of [['/login', 'login'], ['/register', 'register']]) {
      await anonymous.goto(route);
      const size = await noOverflow(anonymous); expect(size.content, label).toBeLessThanOrEqual(size.width);
      if (width === 390 || width === 1440) await anonymous.screenshot({ path: testInfo.outputPath(label + '.png'), fullPage: true, animations: 'disabled' });
    }
    expect(errors).toEqual([]);
    await anonymousContext.close();
  });
}
