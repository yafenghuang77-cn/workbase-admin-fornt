import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { routeTree } from '@/router/routes';

const renderRoute = (pathname: string) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const router = createRouter({ routeTree, history, basepath: '/workbase/' });

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { history };
};

test('部署根路径重定向到工作台首页并替换当前历史记录', async () => {
  const { history } = renderRoute('/workbase/');

  expect(await screen.findByRole('button', { name: '新建任务' }, { timeout: 8000 })).toBeVisible();
  expect(history.location.pathname).toBe('/workbase/welcome');
  expect(history.canGoBack()).toBe(false);
});

test('直达工作台首页时显示公共导航', async () => {
  const { history } = renderRoute('/workbase/welcome');

  expect(await screen.findByRole('button', { name: '新建任务' }, { timeout: 8000 })).toBeVisible();
  expect(history.location.pathname).toBe('/workbase/welcome');
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/workbase/welcome');
  expect(screen.getByRole('menuitem', { name: /开发资源/u })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('导航支持折叠和子菜单跳转', async () => {
  const user = userEvent.setup();
  const { history } = renderRoute('/workbase/welcome');
  await user.click(await screen.findByRole('button', { name: '收起导航' }));
  expect(screen.getByRole('button', { name: '展开导航' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await user.click(screen.getByRole('button', { name: '展开导航' }));
  const workbenchLink = screen.getByRole('link', { name: /工作台/u });
  expect(workbenchLink).toHaveAttribute('href', '/workbase/welcome');
  expect(within(workbenchLink).getAllByRole('img', { name: 'home' })).toHaveLength(1);
  await user.click(screen.getByRole('menuitem', { name: /开发资源/u }));
  const editorLink = await screen.findByRole('link', { name: /富文本编辑器/u });
  await waitFor(() => expect(within(editorLink).getByRole('img', { hidden: true })).toBeVisible());
  await user.click(editorLink);
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/rich-text-editor'));
  expect(screen.getByRole('menuitem', { name: /开发资源/u })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await user.click(screen.getByRole('link', { name: /工作台/u }));
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/welcome'));
});

test('工作台可创建演示任务', { timeout: 12000 }, async () => {
  const user = userEvent.setup();
  renderRoute('/workbase/welcome');
  await user.click(await screen.findByRole('button', { name: '新建任务' }, { timeout: 8000 }));
  await user.type(screen.getByRole('textbox', { name: '任务名称' }), '布局验收');
  await user.click(screen.getByRole('button', { name: '保 存' }));
  expect(await screen.findByRole('cell', { name: '布局验收' })).toBeVisible();
});

test('从不存在的页面按提示返回部署首页', async () => {
  const user = userEvent.setup();
  renderRoute('/workbase/not-a-page');

  expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeVisible();
  const homeLink = screen.getByRole('link', { name: '返回首页' });
  expect(homeLink).toHaveAttribute('href', '/workbase/welcome');
  await user.click(homeLink);

  expect(await screen.findByRole('button', { name: '新建任务' }, { timeout: 8000 })).toBeVisible();
});

test('登录路由可以直接打开登录表单', async () => {
  renderRoute('/workbase/login');

  expect(await screen.findByRole('heading', { name: '登录 Workbase' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: '账号' })).toBeVisible();
});

test('富文本路由直达后可清空、粘贴并实时预览，再重置为初始正文', { timeout: 12_000 }, async () => {
  const user = userEvent.setup();
  renderRoute('/workbase/rich-text-editor');

  const editorRole = { name: '文章正文' };
  const previewRole = { name: '文章展示预览' };
  const initialText = '让内容表达更清晰';
  const preview = await screen.findByRole('document', previewRole, { timeout: 8_000 });
  expect(within(preview).getByText(initialText)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '清空内容' }));
  expect(await screen.findByText('编辑左侧内容，在此查看效果。')).toBeVisible();

  const editor = await screen.findByRole('textbox', editorRole);
  fireEvent.paste(editor, {
    clipboardData: { getData: (type: string) => (type === 'text/plain' ? '新的发布公告' : '') },
  });
  const updatedPreview = await screen.findByRole('document', previewRole);
  expect(within(updatedPreview).getByText('新的发布公告')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '重置内容' }));
  expect(
    await within(await screen.findByRole('document', previewRole)).findByText(initialText),
  ).toBeInTheDocument();
});

test('富文本页面支持禁用并重新启用编辑', { timeout: 12_000 }, async () => {
  const user = userEvent.setup();
  renderRoute('/workbase/rich-text-editor');

  const editor = await screen.findByRole('textbox', { name: '文章正文' }, { timeout: 8_000 });
  await user.click(screen.getByRole('button', { name: '禁用编辑' }));
  await waitFor(() => expect(editor).toHaveAttribute('aria-readonly', 'true'));
  expect(screen.getByRole('button', { name: '粗体' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: '启用编辑' }));
  await waitFor(() => expect(editor).toHaveAttribute('aria-readonly', 'false'));
  expect(screen.getByRole('button', { name: '粗体' })).toBeEnabled();
});
