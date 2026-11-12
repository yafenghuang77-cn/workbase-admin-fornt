import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const rotatedTokens = { accessToken: 'rotated-access', refreshToken: 'rotated-refresh' };
const newLogin = { accessToken: 'new-account-access', refreshToken: 'new-account-refresh' };

async function openTab() {
  vi.resetModules();
  const [auth, refresh] = await Promise.all([
    import('@/stores/auth'),
    import('@/utils/http/refresh'),
  ]);
  return { ...auth, ...refresh };
}

type Tab = Awaited<ReturnType<typeof openTab>>;

function sessionOf(tab: Tab) {
  const { sessionVersion, accessToken } = tab.useAuthStore.getState();
  return { version: sessionVersion, accessToken };
}

function unauthorized() {
  return new AxiosError<unknown, unknown>('Unauthorized', undefined, undefined, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function activeRecordKey(): string {
  const id = localStorage.getItem('workbase-auth-session');
  if (!id) throw new Error('缺少当前会话标识');
  return `workbase-auth:${id}`;
}

function deferredRefresh() {
  let resolve: ((tokens: typeof oldTokens) => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  const pending = new Promise<typeof oldTokens>((onSuccess, onError) => {
    resolve = onSuccess;
    reject = onError;
  });

  return {
    refresh: vi.fn(() => pending),
    succeed: () => resolve?.(rotatedTokens),
    fail: () => reject?.(unauthorized()),
  };
}

function attemptCount(): number {
  return Array.from({ length: localStorage.length }, (_entry, index) =>
    localStorage.key(index),
  ).filter((key) => key?.startsWith('workbase-auth-refresh-attempt:') === true).length;
}

beforeEach(() => {
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.unstubAllGlobals();
});

test('旧版令牌记录可以读取并在刷新后迁移', async () => {
  localStorage.setItem('workbase-auth', JSON.stringify({ state: oldTokens, version: 0 }));
  const tab = await openTab();
  expect(tab.useAuthStore.getState()).toMatchObject(oldTokens);

  await expect(
    tab.handleUnauthorized(unauthorized(), sessionOf(tab), async () => rotatedTokens),
  ).resolves.toBe(rotatedTokens.accessToken);

  expect(localStorage.getItem('workbase-auth')).toBeNull();
  const reloaded = await openTab();
  expect(reloaded.useAuthStore.getState()).toMatchObject(rotatedTokens);
});

test('过期刷新在通过检查后遇到另一标签页登录也无法覆盖新会话', async () => {
  const oldTab = await openTab();
  oldTab.useAuthStore.getState().setTokens(oldTokens);
  const oldRecord = activeRecordKey();
  const newTab = await openTab();
  const original = unauthorized();
  const setItem = Storage.prototype.setItem;
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === oldRecord) {
      save.mockRestore();
      newTab.useAuthStore.getState().setTokens(newLogin);
    }
    setItem.call(this, key, value);
  });

  try {
    await expect(
      oldTab.handleUnauthorized(original, sessionOf(oldTab), async () => rotatedTokens),
    ).rejects.toBe(original);
  } finally {
    save.mockRestore();
  }

  expect(localStorage.getItem(oldRecord)).toBeNull();
  expect(oldTab.useAuthStore.getState()).toMatchObject(newLogin);
  const reloaded = await openTab();
  expect(reloaded.useAuthStore.getState()).toMatchObject(newLogin);
});

test('旧标签页刷新失败不能清理后来登录的会话', async () => {
  const oldTab = await openTab();
  oldTab.useAuthStore.getState().setTokens(oldTokens);
  const newTab = await openTab();
  const original = unauthorized();
  const onExpired = vi.fn();
  oldTab.setSessionExpiredHandler(onExpired);

  let failRefresh: (() => void) | undefined;
  const refresh = vi.fn(
    () =>
      new Promise<never>((_resolve, reject) => {
        failRefresh = () => reject(unauthorized());
      }),
  );
  const outcome = Promise.allSettled([
    oldTab.handleUnauthorized(original, sessionOf(oldTab), refresh),
  ]);
  await Promise.resolve();
  expect(refresh).toHaveBeenCalledOnce();

  newTab.useAuthStore.getState().setTokens(newLogin);
  failRefresh?.();

  await expect(outcome).resolves.toEqual([{ status: 'rejected', reason: original }]);
  expect(onExpired).not.toHaveBeenCalled();
  const reloaded = await openTab();
  expect(reloaded.useAuthStore.getState()).toMatchObject(newLogin);
});

test('同一会话的刷新令牌已在其他标签页轮换时复用新令牌', async () => {
  const oldTab = await openTab();
  oldTab.useAuthStore.getState().setTokens(oldTokens);
  const otherTab = await openTab();
  const original = unauthorized();
  let failRefresh: (() => void) | undefined;
  const refresh = vi.fn(
    () =>
      new Promise<never>((_resolve, reject) => {
        failRefresh = () => reject(unauthorized());
      }),
  );
  const request = oldTab.handleUnauthorized(original, sessionOf(oldTab), refresh);
  await Promise.resolve();

  await expect(
    otherTab.handleUnauthorized(unauthorized(), sessionOf(otherTab), async () => rotatedTokens),
  ).resolves.toBe(rotatedTokens.accessToken);
  failRefresh?.();

  await expect(request).resolves.toBe(rotatedTokens.accessToken);
  expect(oldTab.useAuthStore.getState()).toMatchObject(rotatedTokens);
});

test('Web Locks 串行处理同一会话的跨标签页刷新', async () => {
  const held = new Map<string, Promise<unknown>>();
  const request = vi.fn((name: string, work: () => Promise<unknown>) => {
    const queued = (held.get(name) ?? Promise.resolve()).then(work);
    held.set(
      name,
      queued.catch(() => undefined),
    );
    return queued;
  });
  vi.stubGlobal('navigator', { locks: { request } });

  const first = await openTab();
  first.useAuthStore.getState().setTokens(oldTokens);
  const second = await openTab();
  const winner = deferredRefresh();
  const follower = vi.fn(async () => {
    throw unauthorized();
  });

  const outcomes = Promise.allSettled([
    first.handleUnauthorized(unauthorized(), sessionOf(first), winner.refresh),
    second.handleUnauthorized(unauthorized(), sessionOf(second), follower),
  ]);
  await vi.waitFor(() => {
    expect(request).toHaveBeenCalledTimes(2);
    expect(winner.refresh).toHaveBeenCalledOnce();
  });
  expect(follower).not.toHaveBeenCalled();

  winner.succeed();

  await expect(outcomes).resolves.toEqual([
    { status: 'fulfilled', value: rotatedTokens.accessToken },
    { status: 'fulfilled', value: rotatedTokens.accessToken },
  ]);
  expect(follower).not.toHaveBeenCalled();
  expect(second.useAuthStore.getState()).toMatchObject(rotatedTokens);
  expect(attemptCount()).toBe(0);
});

test('无 Web Locks 时先返回的刷新失败会等待另一个标签页的成功结果', async () => {
  const first = await openTab();
  first.useAuthStore.getState().setTokens(oldTokens);
  const second = await openTab();
  const winner = deferredRefresh();
  const loser = deferredRefresh();
  const onExpired = vi.fn();
  second.setSessionExpiredHandler(onExpired);

  const outcomes = Promise.allSettled([
    first.handleUnauthorized(unauthorized(), sessionOf(first), winner.refresh),
    second.handleUnauthorized(unauthorized(), sessionOf(second), loser.refresh),
  ]);
  await vi.waitFor(() => expect(attemptCount()).toBe(2));

  loser.fail();
  await vi.waitFor(() => expect(attemptCount()).toBe(1));
  expect(second.useAuthStore.getState()).toMatchObject(oldTokens);
  expect(onExpired).not.toHaveBeenCalled();

  winner.succeed();

  await expect(outcomes).resolves.toEqual([
    { status: 'fulfilled', value: rotatedTokens.accessToken },
    { status: 'fulfilled', value: rotatedTokens.accessToken },
  ]);
  expect(second.useAuthStore.getState()).toMatchObject(rotatedTokens);
  expect(onExpired).not.toHaveBeenCalled();
  expect(attemptCount()).toBe(0);
});

test('同一会话的所有跨标签页刷新均失败时仍结束会话', async () => {
  const first = await openTab();
  first.useAuthStore.getState().setTokens(oldTokens);
  const record = activeRecordKey();
  const second = await openTab();
  const firstAttempt = deferredRefresh();
  const secondAttempt = deferredRefresh();
  const onExpired = vi.fn();
  first.setSessionExpiredHandler(onExpired);
  second.setSessionExpiredHandler(onExpired);
  const firstError = unauthorized();
  const secondError = unauthorized();

  const outcomes = Promise.allSettled([
    first.handleUnauthorized(firstError, sessionOf(first), firstAttempt.refresh),
    second.handleUnauthorized(secondError, sessionOf(second), secondAttempt.refresh),
  ]);
  await vi.waitFor(() => expect(attemptCount()).toBe(2));

  firstAttempt.fail();
  await vi.waitFor(() => expect(attemptCount()).toBe(1));
  expect(onExpired).not.toHaveBeenCalled();
  secondAttempt.fail();

  await expect(outcomes).resolves.toEqual([
    { status: 'rejected', reason: firstError },
    { status: 'rejected', reason: secondError },
  ]);
  expect(localStorage.getItem(record)).toBeNull();
  expect(onExpired).toHaveBeenCalledOnce();
  expect(attemptCount()).toBe(0);
});

test('storage 事件更新本页会话并只在切换账号或登出时推进版本', async () => {
  const first = await openTab();
  first.useAuthStore.getState().setTokens(oldTokens);
  const other = await openTab();
  const stop = first.watchAuthSession();
  const initialVersion = first.useAuthStore.getState().sessionVersion;
  const syncKey = (key: string) => {
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }));
  };

  try {
    await other.handleUnauthorized(unauthorized(), sessionOf(other), async () => rotatedTokens);
    syncKey(activeRecordKey());
    expect(first.useAuthStore.getState()).toMatchObject({
      ...rotatedTokens,
      sessionVersion: initialVersion,
    });

    other.useAuthStore.getState().setTokens(newLogin);
    syncKey('workbase-auth-session');
    expect(first.useAuthStore.getState()).toMatchObject({
      ...newLogin,
      sessionVersion: initialVersion + 1,
    });

    other.useAuthStore.getState().clearTokens();
    syncKey('workbase-auth-session');
    expect(first.useAuthStore.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      sessionVersion: initialVersion + 2,
    });
  } finally {
    stop();
  }
});
