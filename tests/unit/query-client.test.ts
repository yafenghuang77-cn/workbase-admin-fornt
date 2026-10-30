import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { queryClient } from '@/query-client';

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
