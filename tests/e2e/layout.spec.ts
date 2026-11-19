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
  await page.getByRole('combobox', { name: '搜索功能' }).fill('富文本');
  await page.getByRole('combobox', { name: '搜索功能' }).press('ArrowDown');
  await page.getByRole('combobox', { name: '搜索功能' }).press('Enter');
  await expect(page).toHaveURL(/\/rich-text-editor$/u);
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
  await page.getByRole('menuitem', { name: /开发资源/u }).click();
  await expect(page.getByRole('link', { name: /欢迎与资源/u })).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 480 },
  { width: 390, height: 480 },
]) {
  test(`${viewport.width}px 下只有内容区滚动，顶栏保持原位`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '工作台', exact: true })).toBeVisible();
    const header =
      viewport.width < 768
        ? page.getByTestId('pro-layout-header')
        : page.locator('.workbase-desktop-header');
    const content = page.locator('#workbase-content');
    const initialHeader = await header.boundingBox();
    expect(initialHeader).not.toBeNull();
    await content.hover();
    await page.mouse.wheel(0, 5000);
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole('cell', { name: '服务器扩容评估', exact: true })).toBeVisible();
    expect(await header.boundingBox()).toEqual(initialHeader);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
    await page.getByRole('combobox', { name: '搜索功能' }).fill('富文本');
    await page.getByRole('combobox', { name: '搜索功能' }).press('ArrowDown');
    await page.getByRole('combobox', { name: '搜索功能' }).press('Enter');
    await expect(page).toHaveURL(/\/rich-text-editor$/u);
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(0);
  });
}

test('树形菜单支持展开收起、路由定位与折叠浮层导航', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const business = page.getByRole('menuitem', { name: /开发资源/u });
  await expect(business).toHaveAttribute('aria-expanded', 'false');
  await business.click();
  await expect(business).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: '富文本编辑器', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sidebar-tree.png'), animations: 'disabled' });
  await business.click();
  await expect(page.getByRole('link', { name: '富文本编辑器', exact: true })).not.toBeVisible();
  await page.goto('rich-text-editor');
  await expect(page).toHaveURL(/\/rich-text-editor$/u);
  await expect(page.getByRole('menuitem', { name: /开发资源/u })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(
    page
      .getByRole('menuitem')
      .filter({ has: page.getByRole('link', { name: '富文本编辑器', exact: true }) }),
  ).toHaveClass(/ant-menu-item-selected/u);
  await page.getByRole('button', { name: '收起导航' }).click();
  await page
    .getByRole('menuitem')
    .filter({ has: page.getByRole('img', { name: 'bar-chart', exact: true }) })
    .hover();
  await page.getByRole('link', { name: '欢迎与资源', exact: true }).click();
  await expect(page).toHaveURL(/\/resources$/u);
  await page.getByRole('button', { name: '展开导航' }).click();
  await expect(page.getByRole('menuitem', { name: /开发资源/u })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});
