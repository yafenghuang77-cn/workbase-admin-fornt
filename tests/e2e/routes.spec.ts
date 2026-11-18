import { expect, test } from '@playwright/test';

const loginChunk = /\/workbase\/js\/login-[\w-]+\.js$/u;

test('生产构建在部署子路径启动，加载 Gzip 脚本并支持登录页直达', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  const gzipScript = page.waitForResponse(
    (response) =>
      /\/workbase\/js\/[^/]+\.js$/u.test(response.url()) &&
      response.ok() &&
      response.headers()['content-encoding'] === 'gzip',
  );

  await page.goto('./');
  await expect(page.getByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
  await gzipScript;

  const lazyChunk = page.waitForResponse(
    (response) => loginChunk.test(response.url()) && response.ok(),
  );
  await page.goto('login');
  await expect(page.getByRole('heading', { name: '登录 Workbase' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '账号' })).toBeVisible();
  await lazyChunk;
  expect(runtimeErrors).toEqual([]);
});

test('懒加载失败时显示错误页，可返回首页并在资源恢复后打开登录页', async ({ page }) => {
  await page.route(loginChunk, (route) => route.abort('failed'));
  await page.goto('login');

  await expect(page.getByText('页面加载失败', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '返回首页' }).click();
  await expect(page).toHaveURL(/\/workbase\/$/u);
  await expect(page.getByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();

  await page.unroute(loginChunk);
  await page.goto('login');
  await expect(page.getByRole('heading', { name: '登录 Workbase' })).toBeVisible();
});
