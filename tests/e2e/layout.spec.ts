import { expect, test } from '@playwright/test';

test('公共布局支持导航、演示任务和导出', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '工作台', exact: true })).toBeVisible();
  await expect(
    page.getByRole('menuitem').filter({ has: page.getByRole('link', { name: /工作台/u }) }),
  ).toHaveClass(/ant-menu-item-selected/u);
  await expect(page.locator('body')).not.toContainText(/演示|尚未接入|布局预览/u);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '收起导航' }).click();
  await expect(page.getByRole('button', { name: '展开导航' })).toBeVisible();
  await page.getByRole('button', { name: '展开导航' }).click();
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('textbox', { name: '任务名称' }).fill('布局验收');
  await page.getByRole('button', { name: '保 存' }).click();
  await expect(page.getByRole('cell', { name: '布局验收', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('近期任务.csv');
  await page.getByRole('combobox', { name: '搜索功能' }).fill('客户');
  await page.getByRole('combobox', { name: '搜索功能' }).press('ArrowDown');
  await page.getByRole('combobox', { name: '搜索功能' }).press('Enter');
  await expect(page.getByRole('status', { name: '暂无数据' })).toBeVisible();
});

test('手机布局无页面横向溢出，支持抽屉导航', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '工作台', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('img', { name: 'menu', exact: true }).click();
  await expect(page.getByRole('link', { name: /客户管理/u })).toBeVisible();
});
