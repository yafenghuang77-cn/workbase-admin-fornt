import { expect, test } from '@playwright/test';

test('新增问卷进入独立全屏设计页，未配置画布在刷新后仍为空', async ({ page }) => {
  await page.goto('questionnaires/list');
  await page.getByRole('button', { name: '新增问卷' }).click();
  await expect(page).toHaveURL(/\/workbase\/questionnaires\/create$/u);
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    const main = page.getByRole('main', { name: '问卷设计' });
    const canvas = main.getByRole('region', { name: '问卷画布' });
    await expect(main).toBeVisible();
    await expect(canvas.getByRole('heading', { name: '暂无数据' })).toBeVisible();
    await expect(canvas.getByText('0 道题')).toBeVisible();
    await expect(main.getByRole('button', { name: '保存并返回' })).toBeDisabled();
    await expect(page.locator('.workbase-layout')).toHaveCount(0);
    expect(await main.boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: page.viewportSize()?.width,
      height: page.viewportSize()?.height,
    });
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/workbase\/questionnaires\/list$/u);
  await expect(page.getByRole('button', { name: '新增问卷' })).toBeVisible();
});

test('题型支持搜索和折叠，题库显示独立的未开放提示', async ({ page }) => {
  await page.goto('questionnaires/create');
  const palette = page.getByRole('complementary', { name: '组件库' });
  const search = palette.getByRole('textbox', { name: '搜索题型' });

  await palette.getByText('基础', { exact: true }).click();
  await expect(palette.getByText('邮箱', { exact: true })).toBeHidden();
  await search.fill('邮箱');
  await expect(palette.getByText('邮箱', { exact: true })).toBeVisible();
  await search.fill('nps');
  await expect(palette.getByText('NPS', { exact: true })).toBeVisible();
  await search.fill('不存在的题型');
  await expect(palette.getByText('未找到匹配题型')).toBeVisible();
  await palette.getByRole('tab', { name: '题库' }).click();
  await expect(palette.getByText('题库暂未开放')).toBeVisible();
  await expect(search).toBeHidden();
  await page.getByRole('button', { name: '返回问卷列表' }).click();
  await expect(page).toHaveURL(/\/workbase\/questionnaires\/list$/u);
});

test('窄屏优先显示画布且页面不会横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const palette = page.getByRole('complementary', { name: '组件库' });

  await expect(canvas.getByRole('heading', { name: '暂无数据' })).toBeInViewport();
  expect((await canvas.boundingBox())?.y).toBeLessThan((await palette.boundingBox())?.y ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('问卷菜单支持跳转，列表支持搜索、重置、分页', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('welcome');
  await page.getByRole('menuitem', { name: /问卷管理/u }).click();
  await page.getByRole('link', { name: /问卷列表/u }).click();
  await expect(page).toHaveURL(/\/workbase\/questionnaires\/list$/u);
  await expect(page.getByText('全部问卷', { exact: true })).toBeVisible();
  await expect(page.getByText('共 16 份问卷')).toBeVisible();

  await page.getByRole('combobox', { name: '问卷名称' }).fill('员工满意度');
  await page.getByTitle('员工满意度调查（WJ0001）', { exact: true }).click();
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('共 1 份问卷')).toBeVisible();
  await page.getByRole('button', { name: '重 置' }).click();
  await expect(page.getByText('共 16 份问卷')).toBeVisible();
  await page.getByTitle('2', { exact: true }).click();
  await expect(page.getByRole('cell', { name: 'WJ0011', exact: true })).toBeVisible();

  await page.getByPlaceholder('请输入问卷编号').fill('不存在的问卷');
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('暂无数据', { exact: true }).last()).toBeVisible();
  expect(errors).toEqual([]);
});

test('问卷名称下拉框支持按 ID 和名称模糊搜索、清空与无匹配提示', async ({ page }) => {
  await page.goto('questionnaires/list');
  const select = page.getByRole('combobox', { name: '问卷名称' });
  await select.fill('0002');
  await page.getByTitle('产品使用体验反馈（WJ0002）', { exact: true }).click();
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('共 1 份问卷')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'WJ0002', exact: true })).toBeVisible();
  await select.fill('wj0003');
  await page.getByTitle('年度培训需求调研（WJ0003）', { exact: true }).click();
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByRole('cell', { name: 'WJ0003', exact: true })).toBeVisible();
  await select.fill('协作');
  await page.getByTitle('团队协作体验调研（WJ0005）', { exact: true }).click();
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByRole('cell', { name: 'WJ0005', exact: true })).toBeVisible();
  await select.fill('不存在的问卷');
  await expect(page.getByText('未找到匹配问卷')).toBeVisible();
  await select.press('Escape');
  await page.getByRole('button', { name: '重 置' }).click();
  await expect(page.getByText('共 16 份问卷')).toBeVisible();
  await expect(select).toHaveValue('');
});

test('问卷列表支持直接访问与状态筛选', async ({ page }) => {
  await page.goto('questionnaires/list');
  await page.getByRole('combobox', { name: '状态' }).click();
  await page.getByTitle('草稿', { exact: true }).click();
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('共 5 份问卷')).toBeVisible();
  await expect(page.getByRole('cell', { name: '收集中', exact: true })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: '草稿', exact: true })).toHaveCount(5);
});

test('UI 调整保留查询展开收起与表格排序、密度、列设置入口', async ({ page }) => {
  await page.goto('questionnaires/list');
  await expect(page.getByPlaceholder('创建起始')).toBeVisible();
  await page.getByText('收起', { exact: true }).click();
  await expect(page.getByPlaceholder('创建起始')).toBeHidden();
  await page.getByText('展开', { exact: true }).click();
  await expect(page.getByPlaceholder('创建起始')).toBeVisible();
  await page.getByRole('columnheader', { name: '回收份数' }).click();
  await expect(
    page.locator('.ant-table-tbody > .ant-table-row').first().getByRole('cell').first(),
  ).toHaveText('WJ0002');
  await expect(
    page.locator('.ant-pro-table-list-toolbar').getByRole('img', { name: 'column-height' }),
  ).toBeVisible();
  await expect(
    page.locator('.ant-pro-table-list-toolbar').getByRole('img', { name: 'setting' }),
  ).toBeVisible();
});

test('查询支持编号、创建人、创建与上线日期组合筛选及重置', async ({ page }) => {
  await page.goto('questionnaires/list');
  await page.getByPlaceholder('请输入问卷编号').fill(' wj0001 ');
  await page.getByRole('combobox', { name: '创建人' }).click();
  await page.getByTitle('张敏', { exact: true }).click();
  for (const placeholder of ['创建起始', '创建结束']) {
    await page.getByPlaceholder(placeholder).fill('2026-11-19');
    await page.getByPlaceholder(placeholder).press('Tab');
  }
  for (const placeholder of ['上线起始', '上线结束']) {
    await page.getByPlaceholder(placeholder).fill('2026-11-20');
    await page.getByPlaceholder(placeholder).press('Tab');
  }
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('共 1 份问卷')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'WJ0001', exact: true })).toBeVisible();
  await page.getByPlaceholder('创建起始').fill('2026-11-20');
  await page.getByPlaceholder('创建起始').press('Tab');
  await page.getByPlaceholder('创建结束').fill('2026-11-21');
  await page.getByPlaceholder('创建结束').press('Tab');
  await page.getByRole('button', { name: '查 询' }).click();
  await expect(page.getByText('暂无数据', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: '重 置' }).click();
  await expect(page.getByText('共 16 份问卷')).toBeVisible();
  for (const placeholder of ['请输入问卷编号', '创建起始', '创建结束', '上线起始', '上线结束']) {
    await expect(page.getByPlaceholder(placeholder)).toHaveValue('');
  }
});

test('列表填满剩余内容，数据区独立滚动且左右列固定', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('questionnaires/list');
  const body = page.locator('.questionnaire-table .ant-table-body');
  const content = page.locator('#workbase-content');
  await expect.poll(() => body.evaluate((element) => element.clientHeight)).toBeGreaterThan(50);
  expect(
    await content.evaluate((element) => element.scrollHeight - element.clientHeight),
  ).toBeLessThanOrEqual(1);
  const pagination = await page.locator('.questionnaire-table .ant-pagination').boundingBox();
  expect(pagination?.y).toBeGreaterThan(500);
  const initialBodyHeight = await body.evaluate((element) => element.clientHeight);
  await body.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
  const id = page.getByRole('columnheader', { name: '问卷编号' });
  const title = page.getByRole('columnheader', { name: '问卷名称' });
  const action = page.getByRole('columnheader', { name: '操作' });
  const before = await Promise.all([id.boundingBox(), title.boundingBox(), action.boundingBox()]);
  await body.evaluate((element) => {
    element.scrollLeft = 500;
  });
  expect(await Promise.all([id.boundingBox(), title.boundingBox(), action.boundingBox()])).toEqual(
    before,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(() => body.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(initialBodyHeight + 200);
  await body.evaluate((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
  const searchPanel = page.locator('.ant-pro-table-search.questionnaire-table__search');
  expect(await searchPanel.evaluate((element) => element.clientHeight)).toBeLessThanOrEqual(150);
  const [idBox, nameBox, createdBox, publishedBox] = await Promise.all([
    page
      .locator('.ant-input-affix-wrapper')
      .filter({ has: page.getByPlaceholder('请输入问卷编号') })
      .boundingBox(),
    page
      .locator('.ant-select')
      .filter({ has: page.getByRole('combobox', { name: '问卷名称' }) })
      .boundingBox(),
    page
      .locator('.ant-picker-range')
      .filter({ has: page.getByPlaceholder('创建起始') })
      .boundingBox(),
    page
      .locator('.ant-picker-range')
      .filter({ has: page.getByPlaceholder('上线起始') })
      .boundingBox(),
  ]);
  expect(Math.abs((createdBox?.x ?? NaN) - (idBox?.x ?? NaN))).toBeLessThan(1);
  expect(Math.abs((publishedBox?.x ?? NaN) - (nameBox?.x ?? NaN))).toBeLessThan(1);
  expect(Math.abs((createdBox?.width ?? NaN) - (idBox?.width ?? NaN))).toBeLessThan(1);
  expect(Math.abs((publishedBox?.width ?? NaN) - (nameBox?.width ?? NaN))).toBeLessThan(1);
  await searchPanel.screenshot({
    path: testInfo.outputPath('query-panel.png'),
    animations: 'disabled',
  });
  await page.screenshot({
    path: testInfo.outputPath('questionnaires-desktop.png'),
    animations: 'disabled',
  });
});

test('问卷按状态最多显示三个操作入口，更多菜单保留原有操作提示', async ({ page }) => {
  await page.goto('questionnaires/list');
  for (const { id, actions } of [
    { id: 'WJ0001', actions: ['详情', '预览', '下线'] },
    { id: 'WJ0002', actions: ['编辑', '详情', '删除', '预览', '上线'] },
    { id: 'WJ0003', actions: ['编辑', '详情', '删除', '预览', '上线'] },
  ]) {
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: id, exact: true }) });
    await expect(row.getByRole('button')).toHaveCount(3);
    if (actions.length > 3) {
      await expect(row.getByRole('button', { name: '更多操作' })).toBeVisible();
      await expect(row.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);
    } else {
      await expect(row.getByRole('button')).toHaveText(actions);
      await expect(row.getByRole('button', { name: '更多操作' })).toHaveCount(0);
    }
    for (const action of actions) {
      if (actions.length > 3 && actions.indexOf(action) >= 2) {
        await row.getByRole('button', { name: '更多操作' }).click();
        await page.getByRole('menuitem', { name: action, exact: true }).click();
        await expect(page.getByRole('menuitem', { name: action, exact: true })).toBeHidden();
      } else {
        await row.getByRole('button', { name: action, exact: true }).click();
      }
      await expect(page.getByText(`${action}功能暂未实现`).last()).toBeVisible();
    }
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'WJ0001', exact: true })).toBeVisible();
  await expect(page.getByText('共 16 份问卷')).toBeVisible();
});
