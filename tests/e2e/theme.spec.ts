import { expect, test } from '@playwright/test';

test('首页主题设置即时生效，跳转后保留主题且隐藏设置入口', async ({ page }, testInfo) => {
  await page.goto('welcome');
  const createTask = page.getByRole('button', { name: '新建任务', exact: true });
  await expect(createTask).toBeVisible();
  await page.getByRole('img', { name: 'setting', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: '主题设置' });
  await expect(drawer).toBeVisible();

  await drawer.locator('.ant-pro-setting-drawer-theme-color-block').nth(2).click();
  await expect(createTask).toHaveCSS('background-color', 'rgb(245, 34, 45)');
  await drawer.locator('.ant-pro-setting-drawer-block-checkbox-item-realDark').click();
  await drawer.getByRole('button', { name: /close|关闭/iu }).click();
  await expect(drawer).not.toBeVisible();

  const search = page.getByRole('combobox', { name: '搜索功能' });
  await search.fill('富文本');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/rich-text-editor$/u);
  await expect(page.getByRole('button', { name: '校验内容' })).toHaveCSS(
    'background-color',
    'rgb(211, 32, 41)',
  );
  await expect(page.getByRole('img', { name: 'setting', exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '主题设置' })).toHaveCount(0);

  await page.getByRole('link', { name: /工作台/u }).click();
  await page.getByRole('img', { name: 'setting', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '主题设置' })).toBeVisible();
  await expect(createTask).toHaveCSS('background-color', 'rgb(211, 32, 41)');
  await page.reload();
  await expect(createTask).toHaveCSS('background-color', 'rgb(211, 32, 41)');
  await page.getByRole('img', { name: 'setting', exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath('theme-settings.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '恢复默认主题' }).click();
  await page.reload();
  await expect(createTask).toHaveCSS('background-color', 'rgb(22, 119, 255)');
});

test('直达其他页面没有主题设置入口', async ({ page }) => {
  for (const path of ['rich-text-editor', 'login']) {
    await page.goto(path);
    if (path === 'login') {
      await expect(page.getByRole('heading', { name: '登录 Workbase' })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: '校验内容', exact: true })).toBeVisible();
    }
    await expect(page.getByRole('img', { name: 'setting', exact: true })).toHaveCount(0);
  }
});

test('手机端滚动工作台后仍可打开主题设置', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto('welcome');
  await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();

  const content = page.locator('#workbase-content');
  await content.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.getByRole('img', { name: 'setting', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '主题设置' })).toBeVisible();
});
