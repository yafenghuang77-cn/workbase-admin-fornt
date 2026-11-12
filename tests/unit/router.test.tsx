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

test('直接访问部署根路径时渲染独立首页', async () => {
  const { history } = renderAt('/workbase/');

  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase', level: 1 })).toBeVisible();
  expect(screen.getByRole('main')).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '打开用户菜单' })).not.toBeInTheDocument();
  expect(history.location.pathname).toBe('/workbase/');
});

test.each(['/workbase/welcome', '/workbase/welcome/', '/workbase/WELCOME'])(
  '旧欢迎页地址 %s 跳转到首页',
  async (path) => {
    const { history } = renderAt(path);

    expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
    expect(history.location.pathname).toBe('/workbase/');
  },
);

test('从未知页面返回首页后可通过历史记录返回和前进', async () => {
  const user = userEvent.setup();
  const { history } = renderAt('/workbase/does-not-exist');

  await user.click(await screen.findByRole('link', { name: '返回首页' }));
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/'));
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();

  await act(async () => {
    history.back();
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/does-not-exist'));
  expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeVisible();

  await act(async () => {
    history.forward();
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/'));
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
});

test('未知路径展示 404 并可返回首页', async () => {
  renderAt('/workbase/does-not-exist');

  expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeVisible();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/workbase/');
});
