import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosAdapter } from 'axios';
import { AxiosError, AxiosHeaders } from 'axios';
import { expect, test, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { RouteErrorPage } from '@/router/RouteFeedback';
import { watchRouterSession } from '@/router/session';
import { routeTree } from '@/routeTree.gen';
import { useAuthStore } from '@/stores/auth';
import { http } from '@/utils/http';

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({
    routeTree,
    history,
    basepath: '/workbase/',
    defaultPendingComponent: () => null,
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

test('会话切换时隐藏旧路由数据，并重新加载当前路由及旧预加载数据', async () => {
  const accountA = { accessToken: 'account-a', refreshToken: 'refresh-a' };
  const accountB = { accessToken: 'account-b', refreshToken: 'refresh-b' };
  await useAuthStore.getState().setTokens(accountA);
  let finishProfile: (() => void) | undefined;
  const heldProfile = new Promise<void>((resolve) => {
    finishProfile = resolve;
  });
  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const current = config.headers.get('Authorization') === 'Bearer account-a' ? 'A' : 'B';
    if (config.url === '/profile' && current === 'B') await heldProfile;
    return {
      config,
      data: { data: config.url === '/profile' ? `资料 ${current}` : `预览 ${current}` },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  });
  const root = createRootRoute();
  const profile = createRoute({
    getParentRoute: () => root,
    path: '/',
    loader: ({ abortController }) =>
      http.get<string>('/profile', { adapter, signal: abortController.signal }),
    component: () => <h1>{profile.useLoaderData()}</h1>,
  });
  const preview = createRoute({
    getParentRoute: () => root,
    path: '/preview',
    loader: ({ abortController }) =>
      http.get<string>('/preview', { adapter, signal: abortController.signal }),
    component: () => <h1>{preview.useLoaderData()}</h1>,
  });
  const history = createMemoryHistory({ initialEntries: ['/workbase/'] });
  const router = createRouter({
    routeTree: root.addChildren([profile, preview]),
    history,
    basepath: '/workbase/',
    defaultPendingComponent: () => null,
    defaultPendingMinMs: 0,
  });
  const stop = watchRouterSession(router);
  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  try {
    expect(await screen.findByRole('heading', { name: '资料 A' })).toBeVisible();
    await router.preloadRoute({ to: '/preview' });
    expect(adapter).toHaveBeenCalledTimes(2);

    await act(() => useAuthStore.getState().setTokens(accountB));
    expect(screen.queryByRole('heading', { name: '资料 A' })).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(3);

    await act(async () => {
      finishProfile?.();
    });
    expect(await screen.findByRole('heading', { name: '资料 B' })).toBeVisible();

    await act(async () => {
      history.push('/workbase/preview');
    });
    expect(await screen.findByRole('heading', { name: '预览 B' })).toBeVisible();
    expect(adapter).toHaveBeenCalledTimes(4);
  } finally {
    finishProfile?.();
    stop();
    view.unmount();
    await useAuthStore.getState().clearTokens();
  }
});

test('登录失败时显示提示，成功后保存令牌并返回应用首页', async () => {
  const user = userEvent.setup();
  const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
  const post = vi
    .spyOn(http, 'post')
    .mockRejectedValueOnce(new Error('用户名或密码不正确'))
    .mockResolvedValueOnce(tokens);
  const { history, router } = renderAt('/workbase/login');
  const stop = watchRouterSession(router);

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
    stop();
    await useAuthStore.getState().clearTokens();
  }
});

test.each(['响应到达前', '写入令牌时'])(
  '另一标签页在%s保存新会话时忽略迟到的登录结果',
  async (phase) => {
    const user = userEvent.setup();
    const oldLogin = { accessToken: 'old-access', refreshToken: 'old-refresh' };
    const newLogin = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    let completeLogin: ((tokens: typeof oldLogin) => void) | undefined;
    const response = new Promise<typeof oldLogin>((resolve) => {
      completeLogin = resolve;
    });
    const post = vi.spyOn(http, 'post').mockReturnValueOnce(response);
    const { history } = renderAt('/workbase/login');
    const version = useAuthStore.getState().sessionVersion;
    const sharedId = 'new-tab-session';
    const record = `workbase-auth:${sharedId}`;
    const setItem = Storage.prototype.setItem;
    const saveNewLogin = () => {
      setItem.call(localStorage, record, JSON.stringify(newLogin));
      setItem.call(localStorage, 'workbase-auth-session', sharedId);
    };
    const save = vi.spyOn(Storage.prototype, 'setItem');

    try {
      await user.type(await screen.findByLabelText('用户名'), 'workbase');
      await user.type(screen.getByLabelText('密码'), 'example-password');
      await user.click(screen.getByRole('button', { name: /^登\s*录$/u }));
      expect(post).toHaveBeenCalledOnce();

      // Model another tab's commit before this tab receives its storage event.
      if (phase === '响应到达前') {
        saveNewLogin();
      } else {
        save.mockImplementation(function (this: Storage, key, value) {
          setItem.call(this, key, value);
          if (key.startsWith('workbase-auth:')) saveNewLogin();
        });
      }
      expect(useAuthStore.getState().sessionVersion).toBe(version);

      await act(async () => {
        completeLogin?.(oldLogin);
        await response;
      });

      expect(localStorage.getItem('workbase-auth-session')).toBe(sharedId);
      expect(localStorage.getItem(record)).toBe(JSON.stringify(newLogin));
      expect(Object.keys(localStorage).filter((key) => key.startsWith('workbase-auth:'))).toEqual([
        record,
      ]);
      expect(useAuthStore.getState()).toMatchObject(newLogin);
      expect(history.location.pathname).toBe('/workbase/login');
    } finally {
      save.mockRestore();
      await act(() => useAuthStore.getState().clearTokens());
    }
  },
);
