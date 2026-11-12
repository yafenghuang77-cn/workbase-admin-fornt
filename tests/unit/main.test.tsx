import type { Root } from 'react-dom/client';

import { act, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, CanceledError } from 'axios';
import { afterEach, expect, test, vi } from 'vitest';

let applicationRoot: Root | undefined;

// Keep real React rendering while retaining the entrypoint's root for teardown.
vi.mock(import('react-dom/client'), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createRoot: (...args: Parameters<typeof original.createRoot>) => {
      applicationRoot = original.createRoot(...args);
      return applicationRoot;
    },
  };
});

afterEach(() => {
  act(() => {
    applicationRoot?.unmount();
  });
  applicationRoot = undefined;
  vi.resetModules();
});

test('入口在根节点中渲染当前页面', async () => {
  window.history.replaceState(null, '', import.meta.env.BASE_URL);
  render(<div id="root" />);

  await act(async () => {
    await import('@/main');
  });

  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
  expect(window.location.pathname).toBe(import.meta.env.BASE_URL);

  const { notifyHttpError, notifyHttpWarning, notifyHttpSuccess } =
    await import('@/utils/http/notify');
  act(() => {
    notifyHttpError('请求失败');
    notifyHttpWarning('请求需要确认');
    notifyHttpSuccess('请求已完成');
  });
  expect(await screen.findByText('请求失败')).toBeInTheDocument();
  expect(await screen.findByText('请求需要确认')).toBeInTheDocument();
  expect(await screen.findByText('请求已完成')).toBeInTheDocument();
});

test('受保护请求确认会话失效后清空缓存并跳转到部署路径下的登录页', async () => {
  window.history.replaceState(null, '', import.meta.env.BASE_URL);
  render(<div id="root" />);

  await act(async () => {
    await import('@/main');
  });
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();

  const { queryClient } = await import('@/query-client');
  const { http } = await import('@/utils/http');
  queryClient.setQueryData(['private'], { id: 'previous-session' });

  await act(async () => {
    const request = http.get('/private', {
      adapter: async (config) => {
        throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
          config,
          data: null,
          headers: {},
          status: 401,
          statusText: 'Unauthorized',
        });
      },
    });
    await expect(request).rejects.toBeInstanceOf(AxiosError);
  });

  expect(await screen.findByRole('heading', { name: 'Workbase 登录' })).toBeVisible();
  expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}login`);
  expect(queryClient.getQueryData(['private'])).toBeUndefined();
});

test('路由重新加载保留请求，离开页面时取消其请求', async () => {
  window.history.replaceState(null, '', import.meta.env.BASE_URL);
  render(<div id="root" />);

  await act(async () => {
    await import('@/main');
  });
  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();

  const { router } = await import('@/router');
  const { http } = await import('@/utils/http');
  const onAbort = vi.fn();
  const request = http.get('/route-data', {
    adapter: (config) =>
      new Promise<never>((_resolve, reject) => {
        config.signal?.addEventListener?.('abort', () => {
          onAbort();
          reject(new CanceledError('请求已取消'));
        });
      }),
  });
  const outcome = request.catch((error: unknown) => error);

  await act(async () => {
    await router.invalidate();
  });
  expect(onAbort).not.toHaveBeenCalled();

  await act(async () => {
    await router.navigate({ to: '/login' });
  });
  await waitFor(() => expect(onAbort).toHaveBeenCalledOnce());
  expect(await outcome).toBeInstanceOf(CanceledError);
});

test('缺少根节点时报告明确的启动错误', async () => {
  await expect(import('@/main')).rejects.toThrow('Root element #root was not found');
});
