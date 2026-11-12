import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';

import { buildNavigation } from '@/router/navigation';
import type { AppRouteConfig } from '@/router/register-routes';
import { registerRoutes } from '@/router/register-routes';

function ConfiguredPage() {
  return <h1>配置指定的页面</h1>;
}

function FullscreenPage() {
  return <h1>独立全屏页面</h1>;
}

function SecondPage() {
  return <h1>显式指定的默认页面</h1>;
}

const config = [
  { path: '/custom', name: '自定义页面', component: ConfiguredPage },
  {
    path: '/preview',
    name: '独立展示',
    layout: false,
    children: [
      { path: '/preview/open', name: '全屏子页', component: FullscreenPage },
      { path: '/preview/admin', name: '后台子页', layout: true, component: ConfiguredPage },
    ],
  },
  {
    path: '/group',
    name: '页面分组',
    redirect: '/group/second',
    children: [
      { path: '/group/first', name: '第一个子页', component: ConfiguredPage },
      { path: '/group/second', name: '默认子页', component: SecondPage },
    ],
  },
  { path: '/hidden', name: '隐藏详情', hideInMenu: true, component: ConfiguredPage },
  { path: '/users/$userId', name: '用户详情', hideInMenu: true, component: ConfiguredPage },
] as const satisfies readonly AppRouteConfig[];

function renderAt(path: string) {
  const rootRoute = createRootRoute();
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({
    routeTree: rootRoute.addChildren(registerRoutes(rootRoute, config)),
    history,
    basepath: '/workbase/',
    defaultPendingMinMs: 0,
  });

  render(<RouterProvider router={router} />);
  return { router, history };
}

test('渲染配置指定的页面并记录默认布局元数据', async () => {
  const { router } = renderAt('/workbase/custom');

  expect(await screen.findByRole('heading', { name: '配置指定的页面' })).toBeVisible();
  expect(router.state.matches.at(-1)?.staticData.page).toMatchObject({
    name: '自定义页面',
    layout: true,
  });
});

test('子页继承 layout false 并保留面包屑元数据', async () => {
  const { router } = renderAt('/workbase/preview/open');

  expect(await screen.findByRole('heading', { name: '独立全屏页面' })).toBeVisible();
  expect(router.state.matches.at(-1)?.staticData.page).toMatchObject({
    layout: false,
    breadcrumb: [
      { path: '/preview', name: '独立展示' },
      { path: '/preview/open', name: '全屏子页' },
    ],
  });
});

test('子页可覆盖父级 layout false', async () => {
  const { router } = renderAt('/workbase/preview/admin');

  expect(await screen.findByRole('heading', { name: '配置指定的页面' })).toBeVisible();
  expect(router.state.matches.at(-1)?.staticData.page?.layout).toBe(true);
});

test('显式 redirect 不依赖子项顺序且不拦截直接访问子页', async () => {
  const { history } = renderAt('/workbase/group');

  expect(await screen.findByRole('heading', { name: '显式指定的默认页面' })).toBeVisible();
  expect(history.location.pathname).toBe('/workbase/group/second');

  await act(async () => {
    history.push('/workbase/group/first');
  });

  expect(await screen.findByRole('heading', { name: '配置指定的页面' })).toBeVisible();
  expect(history.location.pathname).toBe('/workbase/group/first');
});

test('hideInMenu 只隐藏菜单，页面仍可直接访问', async () => {
  const menu = buildNavigation(config);
  expect(menu.some((entry) => entry.path === '/hidden')).toBe(false);
  expect(menu.some((entry) => entry.path === '/custom')).toBe(true);

  renderAt('/workbase/hidden');

  expect(await screen.findByRole('heading', { name: '配置指定的页面' })).toBeVisible();
});

test('动态路由正确提取参数且不影响静态页面导航', async () => {
  const { router, history } = renderAt('/workbase/users/42');

  expect(await screen.findByRole('heading', { name: '配置指定的页面' })).toBeVisible();
  expect(router.state.matches.at(-1)?.params).toMatchObject({ userId: '42' });

  await act(async () => {
    history.push('/workbase/custom');
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/custom'));

  await act(async () => {
    history.push('/workbase/users/84');
  });
  await waitFor(() => expect(history.location.pathname).toBe('/workbase/users/84'));
});
