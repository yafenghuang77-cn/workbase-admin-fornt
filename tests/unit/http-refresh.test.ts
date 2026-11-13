import type { AxiosAdapter } from 'axios';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { http as mockHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { parseAuthTokens, useAuthStore } from '@/stores/auth';
import { ApiError, ApiResponseError, http } from '@/utils/http';
import {
  handleUnauthorized,
  isSessionExpiredError,
  setSessionExpiredHandler,
} from '@/utils/http/refresh';

const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const refreshedTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
const server = setupServer();
let unregisterExpiry: (() => void) | undefined;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(async () => {
  await useAuthStore.getState().setTokens(oldTokens);
});

afterEach(async () => {
  server.resetHandlers();
  unregisterExpiry?.();
  unregisterExpiry = undefined;
  await useAuthStore.getState().clearTokens();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});

function captureSession() {
  const { sessionVersion, accessToken } = useAuthStore.getState();
  return { version: sessionVersion, accessToken };
}

function httpError(status: number) {
  return new AxiosError<unknown, unknown>('Request failed', undefined, undefined, undefined, {
    status,
    statusText: 'Error',
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function monitorExpiry() {
  const onExpired = vi.fn();
  unregisterExpiry = setSessionExpiredHandler(onExpired);
  return onExpired;
}

function readPersistedTokens(): unknown {
  const id = localStorage.getItem('workbase-auth-session');
  const value = id ? localStorage.getItem(`workbase-auth:${id}`) : null;
  return value === null ? null : (JSON.parse(value) as unknown);
}

test('认证令牌校验和持久化只保留有效令牌对', () => {
  const tokens = parseAuthTokens({ ...oldTokens, extra: 'ignored' });

  expect(tokens).toEqual(oldTokens);
  expect(readPersistedTokens()).toEqual(oldTokens);
  expect(() => parseAuthTokens({ accessToken: 'access', refreshToken: '' })).toThrow();
});

test('同会话并发与迟到的旧令牌 401 只刷新一次', async () => {
  const refresh = vi.fn().mockResolvedValue(refreshedTokens);
  const session = captureSession();

  await expect(
    Promise.all([
      handleUnauthorized(httpError(401), session, refresh),
      handleUnauthorized(httpError(401), session, refresh),
    ]),
  ).resolves.toEqual([refreshedTokens.accessToken, refreshedTokens.accessToken]);
  await expect(handleUnauthorized(httpError(401), session, refresh)).resolves.toBe(
    refreshedTokens.accessToken,
  );

  expect(refresh).toHaveBeenCalledExactlyOnceWith(oldTokens.refreshToken);
  expect(useAuthStore.getState()).toMatchObject({
    ...refreshedTokens,
    sessionVersion: session.version,
  });
});

test('刷新凭据失效只通知一次并向各请求返回原始 401', async () => {
  const onExpired = monitorExpiry();
  const first = httpError(401);
  const second = httpError(401);
  const refresh = vi.fn().mockRejectedValue(httpError(403));
  const session = captureSession();

  await Promise.all([
    expect(handleUnauthorized(first, session, refresh)).rejects.toBe(first),
    expect(handleUnauthorized(second, session, refresh)).rejects.toBe(second),
  ]);

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(onExpired).toHaveBeenCalledTimes(1);
  expect(isSessionExpiredError(first)).toBe(true);
  expect(isSessionExpiredError(second)).toBe(true);
  expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null });
});

test('没有刷新凭据时结束会话并保留原始 401', async () => {
  await useAuthStore.getState().clearTokens();
  const onExpired = monitorExpiry();
  const originalError = httpError(401);
  const refresh = vi.fn();

  await expect(handleUnauthorized(originalError, captureSession(), refresh)).rejects.toBe(
    originalError,
  );

  expect(onExpired).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
});

test('临时刷新失败保留会话和原始传输错误，后续请求可以重试刷新', async () => {
  const onExpired = monitorExpiry();
  const temporaryError = httpError(503);
  const refresh = vi
    .fn()
    .mockRejectedValueOnce(temporaryError)
    .mockResolvedValueOnce(refreshedTokens);
  const session = captureSession();

  await expect(handleUnauthorized(httpError(401), session, refresh)).rejects.toBe(temporaryError);
  expect(useAuthStore.getState()).toMatchObject(oldTokens);
  expect(onExpired).not.toHaveBeenCalled();

  await expect(handleUnauthorized(httpError(401), session, refresh)).resolves.toBe(
    refreshedTokens.accessToken,
  );
  expect(refresh).toHaveBeenCalledTimes(2);
});

test('登出后的旧刷新成功不会恢复原会话', async () => {
  const originalError = httpError(401);
  const refresh = vi.fn().mockResolvedValue(refreshedTokens);
  const pending = handleUnauthorized(originalError, captureSession(), refresh);
  await Promise.resolve();

  await useAuthStore.getState().clearTokens();

  await expect(pending).rejects.toBe(originalError);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null });
});

test.each([httpError(403), new ApiError(1001, '刷新凭据无效', 200)])(
  '旧刷新失败不会清除新登录会话（%s）',
  async (refreshError) => {
    const onExpired = monitorExpiry();
    const originalError = httpError(401);
    const refresh = vi.fn().mockRejectedValue(refreshError);
    const pending = handleUnauthorized(originalError, captureSession(), refresh);
    await Promise.resolve();

    const nextLoginTokens = { accessToken: 'another-access', refreshToken: 'another-refresh' };
    await useAuthStore.getState().setTokens(nextLoginTokens);

    await expect(pending).rejects.toBe(originalError);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject(nextLoginTokens);
  },
);

function respondToRefresh() {
  const refreshCall = vi.fn();
  server.use(
    mockHttp.post('*/auth/refresh', async ({ request }) => {
      refreshCall(await request.json());
      return HttpResponse.json({ code: 0, data: refreshedTokens });
    }),
  );
  return refreshCall;
}

test('CancelToken 取消单个请求的刷新等待，其他请求仍可重放', async () => {
  const source = axios.CancelToken.source();
  const canceledAccess = vi.fn(() => new HttpResponse(null, { status: 401 }));
  const continuedAccess = vi.fn(({ request }: { request: Request }) =>
    request.headers.get('authorization') === `Bearer ${refreshedTokens.accessToken}`
      ? HttpResponse.json({ data: { id: 2 } })
      : new HttpResponse(null, { status: 401 }),
  );
  let markRefreshing: (() => void) | undefined;
  let finishRefreshing: (() => void) | undefined;
  const refreshingStarted = new Promise<void>((resolve) => {
    markRefreshing = resolve;
  });
  const refreshing = new Promise<void>((resolve) => {
    finishRefreshing = resolve;
  });
  const refresh = vi.fn(async () => {
    markRefreshing?.();
    await refreshing;
    return HttpResponse.json({ data: refreshedTokens });
  });
  server.use(
    mockHttp.get('*/users/1', canceledAccess),
    mockHttp.get('*/users/2', continuedAccess),
    mockHttp.post('*/auth/refresh', refresh),
  );

  const canceled = http.get('/users/1', { cancelToken: source.token });
  await refreshingStarted;
  const continued = http.get('/users/2');

  try {
    source.cancel('停止等待刷新');
    await expect(canceled).rejects.toBe(source.token.reason);
  } finally {
    finishRefreshing?.();
  }

  await expect(continued).resolves.toEqual({ id: 2 });
  expect(refresh).toHaveBeenCalledOnce();
  expect(canceledAccess).toHaveBeenCalledOnce();
  expect(continuedAccess).toHaveBeenCalledTimes(2);
});

test('旧令牌的迟到 401 等待当前凭据刷新后再重放', async () => {
  const latestTokens = { accessToken: 'latest-access', refreshToken: 'latest-refresh' };
  let rejectOldRequest: (() => void) | undefined;
  let markRefreshing: (() => void) | undefined;
  let finishRefreshing: (() => void) | undefined;
  const initialResponse = new Promise<never>((_resolve, reject) => {
    rejectOldRequest = () => reject(httpError(401));
  });
  const refreshingStarted = new Promise<void>((resolve) => {
    markRefreshing = resolve;
  });
  const refreshing = new Promise<void>((resolve) => {
    finishRefreshing = resolve;
  });
  const refresh = vi.fn(async ({ request }: { request: Request }) => {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && 'refreshToken' in body) {
      if (body.refreshToken === oldTokens.refreshToken) {
        return HttpResponse.json({ data: refreshedTokens });
      }
      if (body.refreshToken === refreshedTokens.refreshToken) {
        markRefreshing?.();
        await refreshing;
        return HttpResponse.json({ data: latestTokens });
      }
    }
    return new HttpResponse(null, { status: 400 });
  });
  server.use(mockHttp.post('*/auth/refresh', refresh));

  function authorize(expected: string): AxiosAdapter {
    return async (config) => {
      if (config.headers.get('Authorization') !== `Bearer ${expected}`) throw httpError(401);
      return { config, data: { data: expected }, headers: {}, status: 200, statusText: 'OK' };
    };
  }

  const delayed = vi.fn(authorize(latestTokens.accessToken)).mockReturnValueOnce(initialResponse);
  const oldOutcome = http.get('/old', { adapter: delayed, silent: true });
  const oldResult = oldOutcome.catch((error: unknown) => error);

  try {
    await expect(
      http.get('/rotate', { adapter: authorize(refreshedTokens.accessToken) }),
    ).resolves.toBe(refreshedTokens.accessToken);
    const current = http
      .get('/current', { adapter: authorize(latestTokens.accessToken) })
      .catch((error: unknown) => error);
    await refreshingStarted;
    rejectOldRequest?.();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(delayed).toHaveBeenCalledOnce();

    finishRefreshing?.();
    await expect(current).resolves.toBe(latestTokens.accessToken);
    await expect(oldResult).resolves.toBe(latestTokens.accessToken);
    expect(delayed).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    rejectOldRequest?.();
    finishRefreshing?.();
    await oldResult;
  }
});

test.each([
  { replaySucceeds: true, expected: { status: 'fulfilled', value: { id: 1 } } },
  {
    replaySucceeds: false,
    expected: { status: 'rejected', reason: { response: { status: 401 } } },
  },
])(
  '读取收到 401 后只重放一次（重放成功 $replaySucceeds）',
  async ({ replaySucceeds, expected }) => {
    const refreshCall = respondToRefresh();
    const authorization = vi.fn();
    server.use(
      mockHttp.get('*/users/1', ({ request }) => {
        const token = request.headers.get('authorization');
        authorization(token);
        if (replaySucceeds && token === `Bearer ${refreshedTokens.accessToken}`) {
          return HttpResponse.json({ data: { id: 1 } });
        }
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const outcome = await Promise.allSettled([
      http.get<{ id: number }>('/users/1', { silent: true }),
    ]);

    expect(outcome).toMatchObject([expected]);
    expect(refreshCall).toHaveBeenCalledExactlyOnceWith({ refreshToken: oldTokens.refreshToken });
    expect(authorization.mock.calls).toEqual([
      [`Bearer ${oldTokens.accessToken}`],
      [`Bearer ${refreshedTokens.accessToken}`],
    ]);
  },
);

test('刷新接口返回 200 业务拒绝时清除令牌并结束会话', async () => {
  const onExpired = monitorExpiry();
  const access = vi.fn(() => new HttpResponse(null, { status: 401 }));
  server.use(
    mockHttp.get('*/users/1', access),
    mockHttp.post('*/auth/refresh', () =>
      HttpResponse.json({ code: 1001, message: '刷新凭据无效' }),
    ),
  );

  const result = http.get('/users/1', { silent: true });
  await expect(result).rejects.toMatchObject({ response: { status: 401 } });
  await expect(result).rejects.toSatisfy(isSessionExpiredError);

  const cleared = { accessToken: null, refreshToken: null };
  expect(useAuthStore.getState()).toMatchObject(cleared);
  expect(readPersistedTokens()).toBeNull();
  expect(onExpired).toHaveBeenCalledTimes(1);
  expect(access).toHaveBeenCalledTimes(1);
});

test('刷新接口响应格式异常时保留会话', async () => {
  const onExpired = monitorExpiry();
  server.use(
    mockHttp.get('*/users/1', () => new HttpResponse(null, { status: 401 })),
    mockHttp.post('*/auth/refresh', () => HttpResponse.json({ code: 0 })),
  );

  await expect(http.get('/users/1', { silent: true })).rejects.toBeInstanceOf(ApiResponseError);
  expect(useAuthStore.getState()).toMatchObject(oldTokens);
  expect(onExpired).not.toHaveBeenCalled();
});

test('写入收到 401 时刷新凭据，默认只发出一次写入', async () => {
  const refreshCall = respondToRefresh();
  const writeCall = vi.fn();
  server.use(
    mockHttp.post('*/users', () => {
      writeCall();
      return new HttpResponse(null, { status: 401 });
    }),
  );

  await expect(http.post('/users', { name: '用户' }, { silent: true })).rejects.toMatchObject({
    response: { status: 401 },
  });

  expect(refreshCall).toHaveBeenCalledTimes(1);
  expect(writeCall).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject(refreshedTokens);
});
