import type { AxiosAdapter } from 'axios';
import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { expect, test, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth';
import { ApiError, ApiResponseError, http } from '@/utils/http';
import { cancelRouteRequests } from '@/utils/http/cancel';

function respond(data: unknown, status = 200): AxiosAdapter {
  return async (config) => ({
    config,
    data,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: { 'x-request-id': 'test-request' },
  });
}

function holdRequest(data: unknown) {
  let markStarted: ((signal: AbortSignal) => void) | undefined;
  let finish: (() => void) | undefined;
  const started = new Promise<AbortSignal>((resolve) => {
    markStarted = resolve;
  });
  const adapter: AxiosAdapter = (config) => {
    const { signal } = config;
    if (!(signal instanceof AbortSignal)) throw new Error('Axios 未收到 AbortSignal');

    return new Promise((resolve, reject) => {
      const cancel = () => reject(new CanceledError('Canceled', config));
      signal.addEventListener('abort', cancel, { once: true });
      finish = () => {
        signal.removeEventListener('abort', cancel);
        resolve({ config, data: { data }, status: 200, statusText: 'OK', headers: {} });
      };
      markStarted?.(signal);
    });
  };

  return { adapter, started, finish: () => finish?.() };
}

test('请求解包成功响应并保留 null 业务数据', async () => {
  await expect(
    http.request<{ id: number }>({
      url: '/users/1',
      adapter: respond({ code: 0, data: { id: 1 } }),
    }),
  ).resolves.toEqual({ id: 1 });
  await expect(
    http.request({ url: '/users/1', adapter: respond({ data: null }) }),
  ).resolves.toBeNull();
});

test('请求可按接口提供解析器', async () => {
  await expect(
    http.request({ url: '/total', adapter: respond(7) }, (response) => ({ total: response.data })),
  ).resolves.toEqual({ total: 7 });
});

test('原始响应保留 HTTP 元数据并接受 204', async () => {
  const body = { code: 7, message: '无可用数据' };
  const response = await http.requestRaw<typeof body>({ url: '/users', adapter: respond(body) });

  expect(response.data).toEqual(body);
  expect(response.status).toBe(200);
  expect(response.headers['x-request-id']).toBe('test-request');

  await expect(
    http.requestRaw({ url: '/users/1', adapter: respond('', 204) }),
  ).resolves.toMatchObject({
    status: 204,
    data: '',
  });
});

test('非零业务码产生包含状态和消息的 ApiError', async () => {
  const result = http.request({
    url: '/users/1',
    adapter: respond({ code: 7, message: '用户不可用', data: null }),
  });

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({ code: 7, message: '用户不可用', httpStatus: 200 });
});

test.each([
  { label: '空响应', body: '', status: 204 },
  { label: '非对象响应', body: null, status: 200 },
  { label: '缺少 data', body: { code: 0 }, status: 200 },
  { label: '非数字业务码', body: { code: '0', data: 1 }, status: 200 },
])('$label 产生 ApiResponseError', async ({ body, status }) => {
  await expect(
    http.request({ url: '/users/1', adapter: respond(body, status) }),
  ).rejects.toBeInstanceOf(ApiResponseError);
});

test('保留原始 AxiosError，供 Query 根据 HTTP 状态判断重试', async () => {
  const error = new AxiosError(
    'Service unavailable',
    AxiosError.ERR_BAD_RESPONSE,
    undefined,
    undefined,
    {
      status: 503,
      statusText: 'Service Unavailable',
      data: null,
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
  const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(error);

  await expect(http.request({ url: '/users', adapter })).rejects.toBe(error);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('将调用方的取消信号传到 Axios 并保留取消错误', async () => {
  const controller = new AbortController();
  const canceled = new CanceledError('Canceled');
  const adapter: AxiosAdapter = ({ signal }) => {
    if (!(signal instanceof AbortSignal)) throw new Error('Axios 未收到 AbortSignal');

    return new Promise<never>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(canceled), { once: true });
      controller.abort();
    });
  };

  await expect(http.request({ url: '/users', adapter, signal: controller.signal })).rejects.toBe(
    canceled,
  );
});

test('调用方取消时立即结束异步解析等待', async () => {
  const controller = new AbortController();
  let markParsing: (() => void) | undefined;
  let finishParsing: ((value: string) => void) | undefined;
  const parsingStarted = new Promise<void>((resolve) => {
    markParsing = resolve;
  });
  const parsing = new Promise<string>((resolve) => {
    finishParsing = resolve;
  });
  const request = http.request(
    { url: '/parse', signal: controller.signal, adapter: respond({ data: null }) },
    () => {
      markParsing?.();
      return parsing;
    },
  );
  await parsingStarted;

  controller.abort();
  try {
    await expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  } finally {
    finishParsing?.('晚到的解析结果');
  }
});

test('Axios CancelToken 取消异步解析并保留原始取消错误', async () => {
  const source = axios.CancelToken.source();
  let markParsing: (() => void) | undefined;
  let finishParsing: ((value: string) => void) | undefined;
  const parsingStarted = new Promise<void>((resolve) => {
    markParsing = resolve;
  });
  const parsing = new Promise<string>((resolve) => {
    finishParsing = resolve;
  });
  const unsubscribe = vi.spyOn(source.token, 'unsubscribe');
  const request = http.request(
    { url: '/parse', cancelToken: source.token, adapter: respond({ data: null }) },
    () => {
      markParsing?.();
      return parsing;
    },
  );
  await parsingStarted;

  try {
    source.cancel('取消解析');
    await expect(request).rejects.toBe(source.token.reason);
    expect(unsubscribe).toHaveBeenCalledOnce();
  } finally {
    finishParsing?.('晚到的解析结果');
  }
});

test('预先取消的 CancelToken 不替换仍在进行的同键请求', async () => {
  const first = holdRequest('first');
  const ongoing = http.request({ url: '/users', adapter: first.adapter });
  const signal = await first.started;
  const source = axios.CancelToken.source();
  source.cancel('发起前取消');
  const adapter = vi.fn(respond({ data: null }));

  try {
    await expect(http.request({ url: '/users', adapter, cancelToken: source.token })).rejects.toBe(
      source.token.reason,
    );
    expect(adapter).not.toHaveBeenCalled();
    expect(signal.aborted).toBe(false);
  } finally {
    first.finish();
    await ongoing;
  }
});

test('被替换的请求结束后，后续同键请求仍能取消当前请求', async () => {
  const first = holdRequest('first');
  const second = holdRequest('second');
  const third = holdRequest('third');
  const url = '/users';
  const firstOutcome = Promise.allSettled([http.request({ url, adapter: first.adapter })]);
  await first.started;
  const secondOutcome = Promise.allSettled([http.request({ url, adapter: second.adapter })]);
  await second.started;
  first.finish();
  await expect(firstOutcome).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
  ]);

  const latest = http.request({ url, adapter: third.adapter });
  await third.started;
  second.finish();
  third.finish();

  await expect(secondOutcome).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
  ]);
  await expect(latest).resolves.toBe('third');
});

test('取消旧请求的回调不能替换新请求已经校验的 URL', async () => {
  const previous = holdRequest('previous');
  const latest = { url: '/users', adapter: vi.fn(respond({ data: 'latest' })) };
  const oldAdapter: AxiosAdapter = (config) => {
    if (!(config.signal instanceof AbortSignal)) throw new Error('Axios 未收到 AbortSignal');
    config.signal.addEventListener(
      'abort',
      () => {
        latest.url = '/../escaped';
      },
      { once: true },
    );
    return previous.adapter(config);
  };
  const oldOutcome = Promise.allSettled([http.request({ url: latest.url, adapter: oldAdapter })]);
  await previous.started;

  await expect(http.request(latest)).resolves.toBe('latest');

  expect(latest.url).toBe('/../escaped');
  expect(latest.adapter).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ url: '/users' }),
  );
  await expect(oldOutcome).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
  ]);
});

test('去重回调切换会话时新请求在进入 adapter 前取消', async () => {
  await useAuthStore.getState().setTokens({ accessToken: 'account-a', refreshToken: 'refresh-a' });
  const previous = holdRequest('previous');
  const latestAdapter = vi.fn(respond({ data: 'latest' }));
  let switchSession: Promise<void> | undefined;
  const oldAdapter: AxiosAdapter = (config) => {
    if (!(config.signal instanceof AbortSignal)) throw new Error('Axios 未收到 AbortSignal');
    config.signal.addEventListener(
      'abort',
      () => {
        switchSession = useAuthStore
          .getState()
          .setTokens({ accessToken: 'account-b', refreshToken: 'refresh-b' });
      },
      { once: true },
    );
    return previous.adapter(config);
  };
  const data = { name: '同一条记录' };
  const oldOutcome = Promise.allSettled([http.post('/records', data, { adapter: oldAdapter })]);

  try {
    await previous.started;
    await expect(http.post('/records', data, { adapter: latestAdapter })).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    });

    await switchSession;
    expect(useAuthStore.getState().accessToken).toBe('account-b');
    expect(latestAdapter).not.toHaveBeenCalled();
    await expect(oldOutcome).resolves.toMatchObject([
      { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
    ]);
  } finally {
    previous.finish();
    await useAuthStore.getState().clearTokens();
  }
});

test('JSON 写入完成后释放去重记录', async () => {
  const first = holdRequest('first');
  const data = { name: '用户' };
  const request = http.post('/users', data, { adapter: first.adapter });
  const signal = await first.started;
  first.finish();
  await expect(request).resolves.toBe('first');

  await expect(http.post('/users', data, { adapter: respond({ data: 'second' }) })).resolves.toBe(
    'second',
  );
  expect(signal.aborted).toBe(false);
});

test('参数和嵌套 JSON 字段换序时仍取消前一个同内容请求', async () => {
  const first = holdRequest('first');
  const second = holdRequest('second');
  const firstOutcome = Promise.allSettled([
    http.post(
      '/users',
      { options: { active: true, roles: ['a', 'b'] }, page: 1 },
      {
        adapter: first.adapter,
        params: { cursor: 'next', limit: 5 },
      },
    ),
  ]);
  await first.started;

  const latest = http.post(
    '/users',
    { page: 1, options: { roles: ['a', 'b'], active: true } },
    {
      adapter: second.adapter,
      params: { limit: 5, cursor: 'next' },
    },
  );
  await second.started;
  first.finish();
  second.finish();

  await expect(firstOutcome).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
  ]);
  await expect(latest).resolves.toBe('second');
});

test.each([
  {
    label: '直接设置 URL-encoded 请求头',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    expected: ['tags%5B%5D=first&tags%5B%5D=second', 'tags%5B%5D=second&tags%5B%5D=first'],
  },
  {
    label: '在 common 请求头中设置 URL-encoded 类型',
    headers: {
      common: new AxiosHeaders({
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      }),
    },
    expected: ['tags%5B%5D=first&tags%5B%5D=second', 'tags%5B%5D=second&tags%5B%5D=first'],
  },
  {
    label: '在 post 请求头中设置 multipart 类型',
    headers: { post: new AxiosHeaders({ 'Content-Type': 'multipart/form-data' }) },
    expected: [
      ['first', 'second'],
      ['second', 'first'],
    ],
  },
])('$label 时保留重复字段顺序不同的两个请求', async ({ headers, expected }) => {
  const adapter = vi.fn(respond({ data: 'ok' }));
  const options = { adapter, headers, env: { FormData } };
  const results = await Promise.allSettled([
    http.post('/tags', { 'tags[]': ['first'], tags: ['second'] }, options),
    http.post('/tags', { tags: ['second'], 'tags[]': ['first'] }, options),
  ]);

  expect(
    adapter.mock.calls.map(([config]) => {
      const data: unknown = config.data;
      return data instanceof FormData ? data.getAll('tags[]') : data;
    }),
  ).toEqual(expected);
  expect(results).toEqual([
    { status: 'fulfilled', value: 'ok' },
    { status: 'fulfilled', value: 'ok' },
  ]);
});

test('显式 JSON 请求头覆盖 common 表单类型后仍按 JSON 去重', async () => {
  const adapter = vi.fn(respond({ data: 'ok' }));
  const headers = {
    common: new AxiosHeaders({ 'Content-Type': 'multipart/form-data' }),
    'Content-Type': 'application/json',
  };
  const results = await Promise.allSettled([
    http.post('/tags', { first: 'a', second: 'b' }, { adapter, headers }),
    http.post('/tags', { second: 'b', first: 'a' }, { adapter, headers }),
  ]);

  expect(adapter.mock.calls[0]?.[0].data).toBe('{"first":"a","second":"b"}');
  expect(results).toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
    { status: 'fulfilled', value: 'ok' },
  ]);
});

test('请求数组顺序和 Basic Auth 凭据不同的请求各自完成', async () => {
  const firstOrder = holdRequest('first order');
  const secondOrder = holdRequest('second order');
  const firstAuth = holdRequest('first auth');
  const secondAuth = holdRequest('second auth');
  const outcomes = Promise.allSettled([
    http.post('/users', { roles: ['a', 'b'] }, { adapter: firstOrder.adapter }),
    http.post('/users', { roles: ['b', 'a'] }, { adapter: secondOrder.adapter }),
    http.get('/profile', {
      adapter: firstAuth.adapter,
      auth: { username: 'first', password: 'test' },
    }),
    http.get('/profile', {
      adapter: secondAuth.adapter,
      auth: { username: 'second', password: 'test' },
    }),
  ]);
  await Promise.all([
    firstOrder.started,
    secondOrder.started,
    firstAuth.started,
    secondAuth.started,
  ]);
  firstOrder.finish();
  secondOrder.finish();
  firstAuth.finish();
  secondAuth.finish();

  await expect(outcomes).resolves.toEqual([
    { status: 'fulfilled', value: 'first order' },
    { status: 'fulfilled', value: 'second order' },
    { status: 'fulfilled', value: 'first auth' },
    { status: 'fulfilled', value: 'second auth' },
  ]);
});

test('不同的凭据模式及省略请求体和显式 JSON null 不互相取消', async () => {
  const defaultCredentials = holdRequest('default');
  const omitCredentials = holdRequest('omit');
  const includeCredentials = holdRequest('include');
  const omittedBody = holdRequest('omitted');
  const nullBody = holdRequest('null');
  const headers = { 'Content-Type': 'application/json' };
  const requests = Promise.all([
    http.get('/credentials', { adapter: defaultCredentials.adapter }),
    http.get('/credentials', { adapter: omitCredentials.adapter, withCredentials: false }),
    http.get('/credentials', { adapter: includeCredentials.adapter, withCredentials: true }),
    http.post('/body', undefined, { adapter: omittedBody.adapter, headers }),
    http.post('/body', null, { adapter: nullBody.adapter, headers }),
  ]);
  const outcome = Promise.allSettled([requests]);
  const held = [defaultCredentials, omitCredentials, includeCredentials, omittedBody, nullBody];
  await Promise.all(held.map(({ started }) => started));
  held.forEach(({ finish }) => finish());

  await expect(outcome).resolves.toEqual([
    { status: 'fulfilled', value: ['default', 'omit', 'include', 'omitted', 'null'] },
  ]);
});

test.each([false, undefined])('显式 Axios 请求头 %s 与默认请求头各自完成', async (value) => {
  const suppressed = holdRequest('suppressed');
  const defaults = holdRequest('default');
  const suppressedAdapter = vi.fn(suppressed.adapter);
  const defaultAdapter = vi.fn(defaults.adapter);
  const results = Promise.allSettled([
    http.get('/headers', {
      adapter: suppressedAdapter,
      headers: new AxiosHeaders().set('Accept', value),
    }),
    http.get('/headers', { adapter: defaultAdapter, headers: new AxiosHeaders() }),
  ]);
  await Promise.all([suppressed.started, defaults.started]);
  suppressed.finish();
  defaults.finish();

  await expect(results).resolves.toEqual([
    { status: 'fulfilled', value: 'suppressed' },
    { status: 'fulfilled', value: 'default' },
  ]);
  expect(suppressedAdapter.mock.calls[0]?.[0].headers.get('Accept')).toBe(value);
  expect(defaultAdapter.mock.calls[0]?.[0].headers.get('Accept')).toBe('application/json');
});

test('包含不同二进制表单字段的对象请求各自完成', async () => {
  const first = holdRequest('first');
  const second = holdRequest('second');
  const headers = { 'Content-Type': 'multipart/form-data' };
  const env = { FormData };
  const results = Promise.allSettled([
    http.post(
      '/multipart',
      { file: new File(['one'], 'one.txt') },
      { adapter: first.adapter, headers, env },
    ),
    http.post(
      '/multipart',
      { file: new File(['two'], 'two.txt') },
      { adapter: second.adapter, headers, env },
    ),
  ]);
  await Promise.all([first.started, second.started]);
  first.finish();
  second.finish();

  await expect(results).resolves.toEqual([
    { status: 'fulfilled', value: 'first' },
    { status: 'fulfilled', value: 'second' },
  ]);
});

test('路由切换取消独立读取，保留由调用方管理及显式跳过的请求', async () => {
  const scoped = holdRequest('scoped');
  const caller = holdRequest('caller');
  const independent = holdRequest('independent');
  const controller = new AbortController();
  const outcomes = Promise.allSettled([
    http.get('/scoped', { adapter: scoped.adapter }),
    http.get('/caller', { adapter: caller.adapter, signal: controller.signal }),
    http.get('/independent', { adapter: independent.adapter, skipRouteCancel: true }),
  ]);
  await Promise.all([scoped.started, caller.started, independent.started]);

  cancelRouteRequests();
  scoped.finish();
  caller.finish();
  independent.finish();

  await expect(outcomes).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
    { status: 'fulfilled', value: 'caller' },
    { status: 'fulfilled', value: 'independent' },
  ]);
});

test('独立写入可显式选择跟随路由取消', async () => {
  const scoped = holdRequest('scoped');
  const independent = holdRequest('independent');
  const outcomes = Promise.allSettled([
    http.post('/scoped', {}, { adapter: scoped.adapter, routeScoped: true }),
    http.post('/independent', {}, { adapter: independent.adapter }),
  ]);
  await Promise.all([scoped.started, independent.started]);

  cancelRouteRequests();
  scoped.finish();
  independent.finish();

  await expect(outcomes).resolves.toMatchObject([
    { status: 'rejected', reason: { code: 'ERR_CANCELED' } },
    { status: 'fulfilled', value: 'independent' },
  ]);
});

test.each([
  'https://example.com/users',
  '//example.com/users',
  '/\\example.com/users',
  'users',
  '/../metadata',
  '/%2e%2E/metadata',
  '/.%2e/metadata',
  '/users/%2e.',
  '/users/./me',
])('路径 %s 在发出请求前被拒绝', async (url) => {
  const adapter = vi.fn(respond({ data: null }));

  await expect(http.request({ url, adapter })).rejects.toBeInstanceOf(TypeError);
  await expect(http.requestRaw({ url, adapter })).rejects.toBeInstanceOf(TypeError);
  expect(adapter).not.toHaveBeenCalled();
});

test('查询值中的点号和文件名前缀不改变 API 路径', async () => {
  await expect(
    http.get('/..report?redirect=/../metadata', { adapter: respond({ data: true }) }),
  ).resolves.toBe(true);
});
