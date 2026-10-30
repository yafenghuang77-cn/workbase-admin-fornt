import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { routeTree } from '@/router';

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({
    routeTree,
    history,
    basepath: '/workbase/',
    defaultPendingMinMs: 0,
  });

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, history };
}

test('直接访问已配置的页面时保留部署前缀并呈现页面标题', async () => {
  const { router } = renderAt('/workbase/welcome');

  expect(await screen.findByTitle('欢迎')).toBeVisible();
  expect(router.state.location.pathname).toBe('/welcome');
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/workbase/welcome');
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
});

test('访问根路径会重定向到配置的欢迎页', async () => {
  const { history } = renderAt('/workbase/');

  await waitFor(() => expect(history.location.pathname).toBe('/workbase/welcome'));
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
});

test('带尾斜杠的首页地址显示欢迎页和正确页头', async () => {
  renderAt('/workbase/welcome/');

  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
  expect(screen.getByTitle('欢迎')).toBeVisible();
  expect(screen.queryByTitle('页面不存在')).not.toBeInTheDocument();
});

test('路由匹配成功时使用路由元数据生成标题而不依赖 URL 大小写', async () => {
  renderAt('/workbase/WELCOME');

  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
  expect(screen.getByTitle('欢迎')).toBeVisible();
  expect(screen.queryByTitle('页面不存在')).not.toBeInTheDocument();
});

test('从未知页面返回首页后可通过历史记录返回和前进', async () => {
  const user = userEvent.setup();
  const { history } = renderAt('/workbase/does-not-exist');

  await user.click(await screen.findByRole('link', { name: '返回首页' }));
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/welcome'));
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();

  await act(async () => {
    history.back();
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/does-not-exist'));
  expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeVisible();

  await act(async () => {
    history.forward();
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/welcome'));
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
});

test('尚未实现的账户菜单项禁用且不包含失效链接', async () => {
  const user = userEvent.setup();
  const { history } = renderAt('/workbase/welcome');

  await user.click(await screen.findByRole('button', { name: '打开用户菜单' }));

  const center = await screen.findByRole('menuitem', { name: /个人中心/ });
  const settings = screen.getByRole('menuitem', { name: /个人设置/ });
  expect(center).toHaveAttribute('aria-disabled', 'true');
  expect(settings).toHaveAttribute('aria-disabled', 'true');
  expect(screen.queryByRole('link', { name: /个人中心/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /个人设置/ })).not.toBeInTheDocument();

  await user.click(center);
  expect(history.location.pathname).toBe('/workbase/welcome');
});

test('未知路径展示 404 并可返回首页', async () => {
  renderAt('/workbase/does-not-exist');

  expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeVisible();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute(
    'href',
    '/workbase/welcome',
  );
});
