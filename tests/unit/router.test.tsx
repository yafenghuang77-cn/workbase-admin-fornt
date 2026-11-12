import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { expect, test, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { RouteErrorPage } from '@/router/RouteFeedback';
import { routeTree } from '@/routeTree.gen';
import { useAuthStore } from '@/stores/auth';
import { http } from '@/utils/http';

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

test('路由加载遇到 403 时展示权限提示', async () => {
  const root = createRootRoute({ errorComponent: RouteErrorPage });
  const route = createRoute({
    getParentRoute: () => root,
    path: '/',
    loader: () => {
      throw new AxiosError('Forbidden', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        config: { headers: new AxiosHeaders() },
        data: null,
        headers: {},
        status: 403,
        statusText: 'Forbidden',
      });
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/workbase/'] }),
    basepath: '/workbase/',
    defaultPendingMinMs: 0,
  });

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  expect(await screen.findByText('抱歉，你没有权限访问此页面。')).toBeVisible();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/workbase/');
});

test('登录失败时显示提示，成功后保存令牌并返回应用首页', async () => {
  const user = userEvent.setup();
  const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
  const post = vi
    .spyOn(http, 'post')
    .mockRejectedValueOnce(new Error('用户名或密码不正确'))
    .mockResolvedValueOnce(tokens);
  const { history } = renderAt('/workbase/login');

  try {
    expect(await screen.findByRole('heading', { name: 'Workbase 登录' })).toBeVisible();
    await user.type(screen.getByLabelText('用户名'), 'workbase');
    await user.type(screen.getByLabelText('密码'), 'example-password');
    await user.click(screen.getByRole('button', { name: /^登\s*录$/u }));
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码不正确');

    await user.click(screen.getByRole('button', { name: /^登\s*录$/u }));
    expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
    expect(history.location.pathname).toBe('/workbase/');
    expect(useAuthStore.getState()).toMatchObject(tokens);
    expect(post).toHaveBeenCalledWith(
      '/auth/login',
      { username: 'workbase', password: 'example-password' },
      expect.objectContaining({ skipAuth: true, skipDedupe: true, silent: true }),
    );
  } finally {
    useAuthStore.getState().clearTokens();
  }
});
