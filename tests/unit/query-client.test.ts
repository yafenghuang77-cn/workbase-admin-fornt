import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { AxiosAdapter } from 'axios';
import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { queryClient } from '@/query-client';
import { http } from '@/utils/http';
import { registerHttpNotifier } from '@/utils/http/notify';

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
});

afterEach(() => {
  client.clear();
});

function httpError(status: number) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    status,
    statusText: 'Error',
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

test.each([400, 401, 403, 404, 409, 422, 429, 501])('HTTP %i 失败不重复请求', async (status) => {
  const error = httpError(status);
  const queryFn = vi.fn().mockRejectedValue(error);

  await expect(client.fetchQuery({ queryKey: ['request'], queryFn, retryDelay: 0 })).rejects.toBe(
    error,
  );
  expect(queryFn).toHaveBeenCalledTimes(1);
});

test.each([
  ['取消', new CanceledError('Canceled')],
  ['业务错误', new Error('Business rule rejected')],
  ['程序错误', new TypeError('Invalid data')],
  ['请求配置错误', new AxiosError('Invalid option', 'ERR_BAD_OPTION')],
])('%s 不自动重试', async (_label, error) => {
  const queryFn = vi.fn().mockRejectedValue(error);

  await expect(client.fetchQuery({ queryKey: ['request'], queryFn, retryDelay: 0 })).rejects.toBe(
    error,
  );
  expect(queryFn).toHaveBeenCalledTimes(1);
});

test.each([
  ['服务暂不可用', httpError(503)],
  ['网络中断', new AxiosError('Network Error', 'ERR_NETWORK')],
  ['超时', new AxiosError('Timeout', 'ECONNABORTED')],
])('%s 最多重试两次', async (_label, error) => {
  const queryFn = vi.fn().mockRejectedValue(error);

  await expect(client.fetchQuery({ queryKey: ['request'], queryFn, retryDelay: 0 })).rejects.toBe(
    error,
  );
  expect(queryFn).toHaveBeenCalledTimes(3);
});

test('临时故障恢复后停止重试，并复用新鲜缓存', async () => {
  const queryFn = vi.fn().mockRejectedValueOnce(httpError(502)).mockResolvedValue({ total: 1 });
  const options = { queryKey: ['request'], queryFn, retryDelay: 0 };

  await expect(client.fetchQuery(options)).resolves.toEqual({ total: 1 });
  await expect(client.fetchQuery(options)).resolves.toEqual({ total: 1 });
  expect(queryFn).toHaveBeenCalledTimes(2);
});

test('写操作遇到服务错误也不自动重放', async () => {
  const error = httpError(503);
  const mutationFn = vi.fn().mockRejectedValue(error);
  const mutation = new MutationObserver(client, { mutationFn });

  await expect(mutation.mutate(undefined)).rejects.toBe(error);
  expect(mutationFn).toHaveBeenCalledTimes(1);
});

test('只提示最终失败，忽略恢复、取消和静默请求', async () => {
  const notify = vi.fn();
  const unregister = registerHttpNotifier(notify);
  const error = httpError(503);

  try {
    const recoveringAdapter = vi
      .fn<AxiosAdapter>()
      .mockRejectedValueOnce(error)
      .mockImplementation(async (config) => ({
        config,
        data: { data: { total: 1 } },
        headers: {},
        status: 200,
        statusText: 'OK',
      }));
    await expect(
      queryClient.fetchQuery({
        queryKey: ['recovering'],
        queryFn: ({ signal }) =>
          http.get('/request', {
            adapter: recoveringAdapter,
            signal,
            silent: true,
            skipDedupe: true,
          }),
        retryDelay: 0,
      }),
    ).resolves.toEqual({ total: 1 });
    expect(recoveringAdapter).toHaveBeenCalledTimes(2);

    const canceledQuery = vi.fn().mockRejectedValue(new CanceledError('Canceled'));
    await expect(
      queryClient.fetchQuery({ queryKey: ['canceled'], queryFn: canceledQuery }),
    ).rejects.toBeInstanceOf(CanceledError);

    const failingAdapter = vi.fn<AxiosAdapter>().mockRejectedValue(error);
    const failingQuery = ({ signal }: { signal: AbortSignal }) =>
      http.get('/request', { adapter: failingAdapter, signal, silent: true, skipDedupe: true });
    await expect(
      queryClient.fetchQuery({
        queryKey: ['silent'],
        queryFn: failingQuery,
        retryDelay: 0,
        meta: { silent: true },
      }),
    ).rejects.toBe(error);
    expect(notify).not.toHaveBeenCalled();

    await expect(
      queryClient.fetchQuery({ queryKey: ['failing'], queryFn: failingQuery, retryDelay: 0 }),
    ).rejects.toBe(error);
    expect(failingAdapter).toHaveBeenCalledTimes(6);
    expect(notify).toHaveBeenCalledExactlyOnceWith('Request failed', 'error');
  } finally {
    unregister();
    queryClient.clear();
  }
});

test('不同查询键请求同一地址时由 Query 管理请求，两次查询均完成', async () => {
  const adapter = vi.fn<AxiosAdapter>().mockImplementation(async (config) => ({
    config,
    data: { data: { total: 1 } },
    headers: {},
    status: 200,
    statusText: 'OK',
  }));
  const queryFn = ({ signal }: { signal: AbortSignal }) =>
    http.get('/request', { adapter, signal, silent: true, skipDedupe: true });

  const results = await Promise.all([
    client.fetchQuery({ queryKey: ['request', 'first'], queryFn }),
    client.fetchQuery({ queryKey: ['request', 'second'], queryFn }),
  ]);

  expect(results).toEqual([{ total: 1 }, { total: 1 }]);
  expect(adapter).toHaveBeenCalledTimes(2);
});

test('独立 HTTP 请求失败仍显示错误提示', async () => {
  const notify = vi.fn();
  const unregister = registerHttpNotifier(notify);
  const error = httpError(500);
  const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(error);

  try {
    await expect(http.get('/request', { adapter })).rejects.toBe(error);
    expect(notify).toHaveBeenCalledExactlyOnceWith('Request failed', 'error');
  } finally {
    unregister();
  }
});
