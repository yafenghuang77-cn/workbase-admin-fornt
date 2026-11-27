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
    await expect(canvas.getByRole('heading', { name: '暂无题目' })).toBeVisible();
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

test('题型默认折叠，支持展开收起与搜索，题库显示独立的未开放提示', async ({ page }) => {
  await page.goto('questionnaires/create');
  const palette = page.getByRole('complementary', { name: '组件库' });
  const search = palette.getByRole('textbox', { name: '搜索题型' });

  await expect(palette.getByText('邮箱', { exact: true })).toBeHidden();
  await palette.getByText('填空题', { exact: true }).click();
  await expect(palette.getByText('邮箱', { exact: true })).toBeVisible();
  await palette.getByText('填空题', { exact: true }).click();
  await expect(palette.getByText('邮箱', { exact: true })).toBeHidden();
  await palette.getByText('选择题', { exact: true }).click();
  await expect(palette.getByText('单选题', { exact: true })).toBeVisible();
  await expect(palette.getByText('图片多选', { exact: true })).toBeVisible();
  await search.fill('邮箱');
  await expect(palette.getByText('邮箱', { exact: true })).toBeVisible();
  await search.fill('nps');
  await expect(palette.getByText('NPS', { exact: true })).toBeVisible();
  await search.fill('手机号');
  await expect(palette.getByText('手机号', { exact: true })).toBeVisible();
  await search.fill('不存在的题型');
  await expect(palette.getByText('未找到匹配题型')).toBeVisible();
  await palette.getByRole('tab', { name: '题库' }).click();
  await expect(palette.getByText('题库暂未开放')).toBeVisible();
  await expect(search).toBeHidden();
  await page.getByRole('button', { name: '返回问卷列表' }).click();
  await expect(page).toHaveURL(/\/workbase\/questionnaires\/list$/u);
});

test('组件库支持收起隐藏并从顶栏重新展开', async ({ page }) => {
  await page.goto('questionnaires/create');
  const palette = page.getByRole('complementary', { name: '组件库' });
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const expandedWidth = (await palette.boundingBox())?.width ?? 0;
  const canvasWidth = (await canvas.boundingBox())?.width ?? 0;

  await page.getByRole('button', { name: '收起组件库' }).click();
  await expect(palette).toBeHidden();
  expect((await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(canvasWidth);
  await expect(
    canvas.getByText('点击顶栏的组件库按钮展开题型面板', { exact: false }),
  ).toBeVisible();

  await page.getByRole('button', { name: '展开组件库' }).click();
  await expect(palette.getByRole('tab', { name: '题型' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '搜索题型' })).toBeVisible();
  await expect(canvas.getByText('先拖入题目组或追问区', { exact: false })).toBeVisible();
  await expect.poll(async () => (await palette.boundingBox())?.width ?? 0).toBe(expandedWidth);
});

test('容器组件可拖拽到画布并渲染对应区块', async ({ page }) => {
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const surface = page.getByTestId('canvas-surface');
  await expect(canvas.getByRole('heading', { name: '暂无题目' })).toBeVisible();

  const blocks = canvas.locator('.designer-canvas__row');

  const dragToCanvas = async (label: string) => {
    const expected = (await blocks.count()) + 1;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const item = page.locator('.palette-item').filter({ hasText: label }).first();
      const from = await item.boundingBox();
      const to = await surface.boundingBox();
      if (!from || !to) throw new Error('拖拽目标不可见');
      // 落点取投放区顶部固定区域，避免已添加内容导致的布局漂移
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 24, from.y + from.height / 2, { steps: 6 });
      await page.mouse.move(to.x + to.width / 2, to.y + 24, { steps: 12 });
      await page.waitForTimeout(150);
      await page.mouse.up();
      try {
        await expect(blocks).toHaveCount(expected, { timeout: 2000 });
        return;
      } catch {
        // 指针事件偶发未被识别时重试一次拖拽
      }
    }
    throw new Error(`拖拽 ${label} 未在画布生成区块`);
  };

  await dragToCanvas('引导语');
  await expect(canvas.getByRole('region', { name: '引导语' })).toBeVisible();
  await expect(canvas.getByText('感谢你参与本次问卷', { exact: false })).toBeVisible();

  await dragToCanvas('追问区');
  const followUp = canvas.getByRole('region', { name: '追问区' });
  await expect(followUp).toBeVisible();
  await expect(followUp).toHaveClass(/question-group--follow-up/u);
  await expect(followUp.getByRole('button', { name: /添加题目/u })).toBeVisible();

  await dragToCanvas('题目组');
  const group = canvas.getByRole('region', { name: '题目组' });
  await expect(group).toBeVisible();
  await expect(group.getByText('共 0 题')).toBeVisible();
  await expect(group.getByRole('button', { name: /添加题目/u })).toBeVisible();
  await expect(canvas.locator('.question-card')).toHaveCount(0);
  await expect(canvas.getByRole('heading', { name: '暂无题目' })).toHaveCount(0);
});

test('容器可拖拽到指定位置插入', async ({ page }) => {
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const surface = page.getByTestId('canvas-surface');
  const rows = canvas.locator('.designer-canvas__row');
  const orderOf = () =>
    canvas
      .locator('.designer-canvas__row section[aria-label]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));

  const pressAndMove = async (
    from: { x: number; y: number; width: number; height: number },
    to: { x: number; y: number },
  ) => {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  // 先拖入两个容器：引导语、追问区
  for (const label of ['引导语', '追问区']) {
    const expected = (await rows.count()) + 1;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const item = page.locator('.palette-item').filter({ hasText: label }).first();
      const from = await item.boundingBox();
      const to = await surface.boundingBox();
      if (!from || !to) throw new Error('拖拽目标不可见');
      await pressAndMove(from, { x: to.x + to.width / 2, y: to.y + to.height - 20 });
      if ((await rows.count()) === expected) break;
    }
    await expect(rows).toHaveCount(expected);
  }
  expect(await orderOf()).toEqual(['引导语', '追问区']);

  // 拖到首位插入位：题目组应插入到最前
  const slot = page.getByTestId('canvas-slot-0');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const item = page.locator('.palette-item').filter({ hasText: '题目组' }).first();
    const from = await item.boundingBox();
    const to = await slot.boundingBox();
    if (!from || !to) throw new Error('拖拽目标不可见');
    await pressAndMove(from, { x: to.x + to.width / 2, y: to.y + to.height / 2 });
    if ((await rows.count()) === 3) break;
  }
  await expect(rows).toHaveCount(3);
  expect(await orderOf()).toEqual(['题目组', '引导语', '追问区']);
});

test('点击容器可选中，且与题目选中互斥', async ({ page }) => {
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const surface = page.getByTestId('canvas-surface');

  const drop = async (label: string) => {
    const rows = canvas.locator('.designer-canvas__row');
    const expected = (await rows.count()) + 1;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const item = page.locator('.palette-item').filter({ hasText: label }).first();
      const from = await item.boundingBox();
      const to = await surface.boundingBox();
      if (!from || !to) throw new Error('拖拽目标不可见');
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
      await page.mouse.move(to.x + to.width / 2, to.y + to.height - 16, { steps: 12 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      if ((await rows.count()) === expected) break;
    }
    await expect(rows).toHaveCount(expected);
  };
  await drop('题目组');
  await drop('追问区');

  const blockAt = (index: number) => canvas.locator('.designer-canvas__block').nth(index);
  const clickContainer = async (name: string) => {
    const box = await canvas.getByRole('region', { name }).boundingBox();
    if (!box) throw new Error('容器不可见');
    await page.mouse.click(box.x + box.width / 2, box.y + 10);
    await page.waitForTimeout(150);
  };

  await clickContainer('题目组');
  await expect(blockAt(0)).toHaveClass(/is-selected/u);
  await expect(blockAt(1)).not.toHaveClass(/is-selected/u);

  await clickContainer('追问区');
  await expect(blockAt(1)).toHaveClass(/is-selected/u);
  await expect(blockAt(0)).not.toHaveClass(/is-selected/u);

  // 键盘可访问性：聚焦容器后 Enter 选中
  await blockAt(0).focus();
  await page.keyboard.press('Enter');
  await expect(blockAt(0)).toHaveClass(/is-selected/u);
});

test('选中容器后可编辑名称，引导语支持富文本与显示时间', async ({ page }) => {
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const surface = page.getByTestId('canvas-surface');
  const inspector = page.getByRole('complementary', { name: '题目配置' });

  const drop = async (label: string) => {
    const rows = canvas.locator('.designer-canvas__row');
    const expected = (await rows.count()) + 1;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const item = page.locator('.palette-item').filter({ hasText: label }).first();
      const from = await item.boundingBox();
      const to = await surface.boundingBox();
      if (!from || !to) throw new Error('拖拽目标不可见');
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
      await page.mouse.move(to.x + to.width / 2, to.y + to.height - 16, { steps: 12 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      if ((await rows.count()) === expected) break;
    }
    await expect(rows).toHaveCount(expected);
  };
  const clickContainer = async (name: string) => {
    const box = await canvas.getByRole('region', { name }).boundingBox();
    if (!box) throw new Error('容器不可见');
    await page.mouse.click(box.x + box.width / 2, box.y + 10);
    await page.waitForTimeout(150);
  };

  await drop('题目组');
  await drop('引导语');

  // 题目组名称编辑同步到画布
  await clickContainer('题目组');
  const nameInput = inspector.getByLabel('题目组名称');
  await nameInput.fill('第一组');
  await expect(canvas.getByRole('heading', { name: '第一组' })).toBeVisible();

  // 引导语：富文本编辑器与默认 30 秒显示时间
  await clickContainer('引导语');
  await expect(inspector.getByLabel('引导语内容')).toBeVisible();
  await expect(inspector.getByLabel('显示时间（秒）')).toHaveValue('30');
  await expect(canvas.getByText('展示 30 秒')).toBeVisible();

  await inspector.getByLabel('引导语内容').click();
  await page.keyboard.press('End');
  await page.keyboard.type('请认真作答。');
  await expect(canvas.getByText('请认真作答。')).toBeVisible();

  // 显示时间可修改，画布同步展示
  await inspector.getByLabel('显示时间（秒）').fill('45');
  await expect(inspector.getByLabel('显示时间（秒）')).toHaveValue('45');
  await expect(canvas.getByText('展示 45 秒')).toBeVisible();
});

test('题目只能拖入容器，题型 UI 支持添加与删除选项', async ({ page }) => {
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const surface = page.getByTestId('canvas-surface');
  const palette = page.getByRole('complementary', { name: '组件库' });
  const rows = canvas.locator('.designer-canvas__row');

  const dragTo = async (label: string, target: { x: number; y: number }) => {
    const item = palette.locator('.palette-item').filter({ hasText: label }).first();
    const from = await item.boundingBox();
    if (!from) throw new Error('拖拽源不可见');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(target.x, target.y, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  // 先拖入题目组容器
  const surfaceBox = await surface.boundingBox();
  if (!surfaceBox) throw new Error('画布不可见');
  await dragTo('题目组', {
    x: surfaceBox.x + surfaceBox.width / 2,
    y: surfaceBox.y + surfaceBox.height - 16,
  });
  await expect(rows).toHaveCount(1);

  // 题目拖到画布空白处：不新增区块，给出提示
  await palette.getByText('选择题', { exact: true }).click();
  const blankBox = await surface.boundingBox();
  if (!blankBox) throw new Error('画布不可见');
  await dragTo('单选题', {
    x: blankBox.x + blankBox.width / 2,
    y: blankBox.y + blankBox.height - 8,
  });
  await expect(rows).toHaveCount(1);
  await expect(canvas.locator('.question-card')).toHaveCount(0);

  // 题目拖入容器正文：加入该容器
  const dropZone = canvas.locator('[data-testid^="question-drop-"]').first();
  const zoneBox = await dropZone.boundingBox();
  if (!zoneBox) throw new Error('容器投放区不可见');
  await dragTo('单选题', { x: zoneBox.x + zoneBox.width / 2, y: zoneBox.y + zoneBox.height - 12 });
  await expect(canvas.locator('.question-card')).toHaveCount(1);

  const options = canvas.locator('.question-type__option');
  await expect(options).toHaveCount(3);
  const addButton = canvas.getByRole('button', { name: '添加选项', exact: true });
  await expect(addButton).toBeVisible();

  // 添加选项
  await addButton.click();
  await expect(options).toHaveCount(4);
  await expect(canvas.getByText('选项 4')).toBeVisible();

  // 删除选项
  await canvas.getByRole('button', { name: '删除选项 1', exact: true }).click();
  await expect(options).toHaveCount(3);
  await expect(canvas.getByText('选项 1')).toHaveCount(0);
});

test('窄屏优先显示画布且页面不会横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('questionnaires/create');
  const canvas = page.getByRole('region', { name: '问卷画布' });
  const palette = page.getByRole('complementary', { name: '组件库' });

  await expect(canvas.getByRole('heading', { name: '暂无题目' })).toBeInViewport();
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
