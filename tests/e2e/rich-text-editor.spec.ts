import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { imageFile, videoFile } from './fixtures';

const editorFor = (page: Page) => page.getByRole('textbox', { name: '文章正文' });
const previewFor = (page: Page) => page.getByRole('document', { name: '文章展示预览' });
const chooseToolOption = async (page: Page, tool: string, option: string) => {
  await page.getByRole('button', { name: tool, exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: option }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('rich-text-editor');
  await expect(editorFor(page)).toBeEditable();
});

test('正文的粗体排版实时预览，撤销后恢复原文', async ({ page }) => {
  const title = '让内容表达更清晰';
  const preview = previewFor(page);
  await editorFor(page).press('ControlOrMeta+a');
  await page.getByRole('button', { name: '粗体' }).click();

  const boldTitle = preview.locator('strong').filter({ hasText: title });
  await expect(boldTitle).toBeVisible();
  await page.getByRole('button', { name: '撤销' }).click();

  await expect(boldTitle).toHaveCount(0);
  await expect(preview.getByRole('heading', { name: title })).toBeVisible();
});

test('段落可切换标题、对齐方式及两种列表', async ({ page }) => {
  const text = '项目进度';
  await page.getByRole('button', { name: '清空内容' }).click();
  await editorFor(page).fill(text);
  const preview = previewFor(page);

  await chooseToolOption(page, '段落样式', '标题 2');
  const heading = preview.getByRole('heading', { level: 2, name: text });
  await expect(heading).toBeVisible();
  await chooseToolOption(page, '文字对齐', '居中');
  await expect(heading).toHaveCSS('text-align', 'center');

  await chooseToolOption(page, '段落样式', '正文');
  await expect(preview.getByRole('paragraph').filter({ hasText: text })).toBeVisible();
  await page.getByRole('button', { name: '无序列表' }).click();
  await expect(preview.locator('ul').getByRole('listitem')).toHaveText(text);
  await page.getByRole('button', { name: '有序列表' }).click();
  await expect(preview.locator('ul')).toHaveCount(0);
  await expect(preview.locator('ol').getByRole('listitem')).toHaveText(text);
});

test('预览反映文字颜色、背景与行内排版，清除格式保留文字', async ({ page }) => {
  const text = '重要通知';
  await page.getByRole('button', { name: '清空内容' }).click();
  const editor = editorFor(page);
  await editor.fill(text);
  const preview = previewFor(page);
  const previewText = preview.getByText(text, { exact: true });
  const setColor = async (name: string, hex: string) => {
    await editor.press('ControlOrMeta+a');
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    const hexInput = page.getByRole('textbox', { name: '', exact: true });
    await hexInput.fill(hex);
    await button.click();
    await expect(hexInput).toBeHidden();
  };

  await setColor('文字颜色', '2f54eb');
  await expect(previewText).toHaveCSS('color', 'rgb(47, 84, 235)');
  await setColor('文字背景色', 'ffe58f');
  await expect(previewText).toHaveCSS('background-color', 'rgb(255, 229, 143)');

  await editor.press('ControlOrMeta+a');
  await page.getByRole('button', { name: '斜体' }).click();
  await page.getByRole('button', { name: '下划线' }).click();
  await page.getByRole('button', { name: '删除线' }).click();
  const marks = preview.locator('em, u, s');
  await expect(marks).toHaveCount(3);

  await page.getByRole('button', { name: '清除格式' }).click();
  await expect(marks).toHaveCount(0);
  await expect(previewText).toBeVisible();
  await expect(previewText).not.toHaveCSS('color', 'rgb(47, 84, 235)');
  await expect(previewText).not.toHaveCSS('background-color', 'rgb(255, 229, 143)');
});

test('切换深浅色会更新主题，并保留正文和预览', async ({ page }) => {
  const text = '主题切换后仍保留';
  const editor = editorFor(page);
  await page.getByRole('button', { name: '清空内容' }).click();
  await editor.fill(text);
  const background = (element: HTMLElement) => getComputedStyle(element).backgroundColor;
  const main = page.getByRole('main');
  const lightBackground = await main.evaluate(background);

  await page.getByRole('button', { name: '深色模式' }).click();
  await expect(main).not.toHaveCSS('background-color', lightBackground);
  await expect(editor).toHaveText(text);
  await expect(previewFor(page)).toHaveText(text);

  await page.getByRole('button', { name: '浅色模式' }).click();
  await expect(main).toHaveCSS('background-color', lightBackground);
  await expect(editor).toHaveText(text);
  await expect(previewFor(page)).toHaveText(text);
});

test('校验链接地址并支持添加、修改和移除链接', async ({ page }) => {
  const editor = editorFor(page);
  await page.getByRole('button', { name: '清空内容' }).click();
  await editor.fill('阅读员工手册');

  const dialog = page.getByRole('dialog', { name: '编辑链接' });
  const address = dialog.getByRole('textbox', { name: '链接地址' });
  const confirm = dialog.getByRole('button', { name: /^确\s*定$/u });
  const link = previewFor(page).getByRole('link', { name: '阅读员工手册' });
  const openDialog = async () => {
    await editor.press('ControlOrMeta+a');
    await page.getByRole('button', { name: '编辑链接' }).click();
  };

  await openDialog();
  await address.fill('ftp://example.test/manual');
  await confirm.click();
  await expect(dialog.getByText('请输入有效的链接地址')).toBeVisible();
  await expect(link).toHaveCount(0);

  await address.fill('/workbase/login');
  await confirm.click();
  await expect(link).toHaveAttribute('href', '/workbase/login');

  await openDialog();
  await expect(address).toHaveValue('/workbase/login');
  await address.fill('https://example.test/manual');
  await confirm.click();
  await expect(link).toHaveAttribute('href', 'https://example.test/manual');

  await openDialog();
  await address.clear();
  await confirm.click();
  await expect(link).toHaveCount(0);
  await expect(previewFor(page).getByText('阅读员工手册')).toBeVisible();
});

test('插入表格后可编辑单元格、增删行列及删除表格', async ({ page }) => {
  await page.getByRole('button', { name: '清空内容' }).click();
  const tableAction = (name: string) => chooseToolOption(page, '表格操作', name);

  await tableAction('插入 3 × 3 表格');
  const table = previewFor(page).getByRole('table');
  const rows = table.getByRole('row');
  const header = table.getByRole('columnheader');
  await expect(rows).toHaveCount(3);
  await expect(header).toHaveCount(3);
  await editorFor(page).getByRole('columnheader').first().click();
  await page.keyboard.insertText('项目');
  await expect(table.getByRole('columnheader', { name: '项目' })).toBeVisible();

  await tableAction('下方插入行');
  await expect(rows).toHaveCount(4);
  await tableAction('右侧插入列');
  await expect(header).toHaveCount(4);
  await tableAction('删除当前列');
  await expect(header).toHaveCount(3);
  await tableAction('删除当前行');
  await expect(rows).toHaveCount(3);
  await tableAction('删除表格');
  await expect(table).toHaveCount(0);
});

test('合并和拆分表格单元格会更新预览并保留正文', async ({ page }) => {
  await page.getByRole('button', { name: '清空内容' }).click();
  const tableAction = (name: string) => chooseToolOption(page, '表格操作', name);
  await tableAction('插入 3 × 3 表格');
  const editorRow = editorFor(page).getByRole('row').nth(1);
  const firstCell = editorRow.getByRole('cell').first();
  const secondCell = editorRow.getByRole('cell').nth(1);
  await firstCell.click();
  await page.keyboard.insertText('甲');
  await secondCell.click();
  await page.keyboard.insertText('乙');
  await firstCell.dragTo(secondCell);

  await tableAction('合并单元格');
  const previewRow = previewFor(page).getByRole('row').nth(1);
  const previewCells = previewRow.getByRole('cell');
  await expect(previewCells).toHaveCount(2);
  await expect(previewCells.first()).toHaveAttribute('colspan', '2');
  await expect(previewCells.first()).toHaveText(/甲\s*乙/u);

  await firstCell.click();
  await tableAction('拆分单元格');
  await expect(previewCells).toHaveCount(3);
  await expect(previewRow).toHaveText(/甲\s*乙/u);
});

test('粘贴超长正文时不替换或截断已有内容', async ({ page }) => {
  const editor = editorFor(page);
  await page.getByRole('button', { name: '清空内容' }).click();
  await editor.fill('原公告');
  await editor.press('ControlOrMeta+a');
  const pasteText = (text: string) =>
    editor.evaluate((element, value) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', value);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
    }, text);

  await pasteText('字'.repeat(20_001));
  await expect(editor).toHaveText('原公告');
  await expect(previewFor(page)).toHaveText('原公告');

  await editor.press('ControlOrMeta+a');
  await pasteText('新公告');
  await expect(previewFor(page)).toHaveText('新公告');
});

test('通过原生选择器上传图片，通过拖放上传视频，并在清空后释放预览', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '上传图片' }).click();
  await (await chooser).setFiles(imageFile);
  await expect(page.getByRole('status').filter({ hasText: /图片上传中 \d+%/u })).toBeVisible();

  const preview = previewFor(page);
  const image = preview.getByRole('img');
  await expect(image).toHaveAttribute('src', /^blob:/u);
  await expect
    .poll(() => image.evaluate((media) => media instanceof HTMLImageElement && media.naturalWidth))
    .toBe(16);

  await editorFor(page).drop({ files: videoFile });
  const video = preview.getByLabel(videoFile.name);
  await expect(video).toHaveAttribute('src', /^blob:/u);
  await expect
    .poll(() => video.evaluate((media) => media instanceof HTMLVideoElement && media.videoWidth))
    .toBe(16);

  const blobUrls = [await image.getAttribute('src'), await video.getAttribute('src')];
  await page.getByRole('button', { name: '清空内容' }).click();
  await expect(preview).toHaveCount(0);
  const reachable = await page.evaluate(
    (urls) =>
      Promise.all(
        urls.map((url) =>
          fetch(url ?? '').then(
            () => true,
            () => false,
          ),
        ),
      ),
    blobUrls,
  );
  expect(reachable).toEqual([false, false]);
});
