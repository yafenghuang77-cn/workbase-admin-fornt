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

function deferredRefresh(result = rotatedTokens) {
  let resolve: ((tokens: typeof oldTokens) => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  const pending = new Promise<typeof oldTokens>((onSuccess, onError) => {
    resolve = onSuccess;
    reject = onError;
  });

  return {
    refresh: vi.fn(() => pending),
    succeed: () => resolve?.(result),
    fail: () => reject?.(unauthorized()),
  };
}

function attemptCount(): number {
  return Array.from({ length: localStorage.length }, (_entry, index) =>
    localStorage.key(index),
  ).filter((key) => key?.startsWith('workbase-auth-refresh-attempt:') === true).length;
}

function mockWebLocks() {
  const held = new Map<string, Promise<unknown>>();
  const request = vi.fn((name: string, work: () => unknown) => {
    const queued = (held.get(name) ?? Promise.resolve()).then(work);
    held.set(
      name,
      queued.catch(() => undefined),
    );
    return queued;
  });
  vi.stubGlobal('navigator', { locks: { request } });
  return request;
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

test.each(['登录', '退出'])('跨标签页%s从最终检查到活动指针写入保持独占', async (action) => {
  mockWebLocks();
  const first = await openTab();
  await first.useAuthStore.getState().setTokens(oldTokens);
  const second = await openTab();
  const initialRecord = activeRecordKey();
  const { version: firstVersion } = sessionOf(first);
  const { version: secondVersion } = sessionOf(second);
  const setItem = Storage.prototype.setItem;
  let queued: Promise<boolean> | undefined;
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === 'workbase-auth-session') {
      save.mockRestore();
      queued = second.useAuthStore.getState().setTokensForLogin(secondVersion, rotatedTokens);
    }
    setItem.call(this, key, value);
  });

  try {
    const auth = first.useAuthStore.getState();
    const committed =
      action === '登录'
        ? await auth.setTokensForLogin(firstVersion, newLogin)
        : await auth.clearTokens().then(() => true);
    expect(committed).toBe(true);
    await expect(queued).resolves.toBe(false);
    expect(second.useAuthStore.getState().accessToken).toBe(
      action === '登录' ? newLogin.accessToken : null,
    );
    expect(localStorage.getItem(initialRecord)).toBeNull();
    expect(Object.keys(localStorage).filter((key) => key.startsWith('workbase-auth:'))).toEqual(
      action === '登录' ? [activeRecordKey()] : [],
    );
  } finally {
    save.mockRestore();
    await queued;
  }
});

test.each([
  { name: '无历史标识', marker: null },
  { name: '旧版空标识', marker: '' },
])('跨标签页登录后又退出时丢弃未同步中间状态的旧登录（$name）', async ({ marker }) => {
  mockWebLocks();
  if (marker !== null) {
    localStorage.setItem('workbase-auth-session', marker);
    localStorage.setItem('workbase-auth', JSON.stringify({ state: oldTokens, version: 0 }));
  }

  const first = await openTab();
  const { version, accessToken } = sessionOf(first);
  expect(accessToken).toBeNull();

  const other = await openTab();
  await other.useAuthStore.getState().setTokens(newLogin);
  await other.useAuthStore.getState().clearTokens();
  const logoutId = localStorage.getItem('workbase-auth-session');

  await expect(first.useAuthStore.getState().setTokensForLogin(version, oldTokens)).resolves.toBe(
    false,
  );
  expect(sessionOf(first)).toEqual({ version: version + 1, accessToken: null });
  expect(logoutId).toBeTruthy();
  expect(localStorage.getItem('workbase-auth-session')).toBe(logoutId);
  expect(Object.keys(localStorage).filter((key) => key.startsWith('workbase-auth:'))).toEqual([]);
});

test('等待共享提交锁的登录在页面取消后不写入令牌', async () => {
  const request = mockWebLocks();
  const tab = await openTab();
  const controller = new AbortController();
  const { version } = sessionOf(tab);
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const hold = request('workbase-auth-session-commit', () => gate);
  const login = tab.useAuthStore.getState().setTokensForLogin(version, newLogin, controller.signal);

  controller.abort();
  release?.();

  await hold;
  await expect(login).resolves.toBe(false);
  expect(localStorage.length).toBe(0);
  expect(tab.useAuthStore.getState().accessToken).toBeNull();
});

test('过期刷新在通过检查后遇到另一标签页登录也无法覆盖新会话', async () => {
  const oldTab = await openTab();
  await oldTab.useAuthStore.getState().setTokens(oldTokens);
  const oldRecord = activeRecordKey();
  const newTab = await openTab();
  const original = unauthorized();
  const setItem = Storage.prototype.setItem;
  let newSession: Promise<void> | undefined;
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === oldRecord) {
      save.mockRestore();
      newSession = newTab.useAuthStore.getState().setTokens(newLogin);
    }
    setItem.call(this, key, value);
  });

  try {
    await expect(
      oldTab.handleUnauthorized(original, sessionOf(oldTab), async () => rotatedTokens),
    ).rejects.toBe(original);
  } finally {
    save.mockRestore();
    await newSession;
  }

  expect(localStorage.getItem(oldRecord)).toBeNull();
  expect(oldTab.useAuthStore.getState()).toMatchObject(newLogin);
  const reloaded = await openTab();
  expect(reloaded.useAuthStore.getState()).toMatchObject(newLogin);
});

test('旧标签页刷新失败不能清理后来登录的会话', async () => {
  const oldTab = await openTab();
  await oldTab.useAuthStore.getState().setTokens(oldTokens);
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

  await newTab.useAuthStore.getState().setTokens(newLogin);
  failRefresh?.();

  await expect(outcome).resolves.toEqual([{ status: 'rejected', reason: original }]);
  expect(onExpired).not.toHaveBeenCalled();
  const reloaded = await openTab();
  expect(reloaded.useAuthStore.getState()).toMatchObject(newLogin);
});

test('同一会话的刷新令牌已在其他标签页轮换时复用新令牌', async () => {
  const oldTab = await openTab();
  await oldTab.useAuthStore.getState().setTokens(oldTokens);
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

test('轮换后的凭据收到 401 时，等待中的旧请求也加入新刷新', async () => {
  const tab = await openTab();
  await tab.useAuthStore.getState().setTokens(oldTokens);
  const other = await openTab();
  const original = deferredRefresh();
  const nextTokens = { accessToken: 'next-access', refreshToken: 'next-refresh' };
  const next = deferredRefresh(nextTokens);
  const originalOutcome = Promise.allSettled([
    tab.handleUnauthorized(unauthorized(), sessionOf(tab), original.refresh),
  ]);

  try {
    await Promise.resolve();
    expect(original.refresh).toHaveBeenCalledExactlyOnceWith(oldTokens.refreshToken);

    await other.handleUnauthorized(unauthorized(), sessionOf(other), async () => rotatedTokens);
    tab.useAuthStore.getState().syncSession();
    const rotatedSession = sessionOf(tab);
    const nextOutcome = Promise.allSettled([
      tab.handleUnauthorized(unauthorized(), rotatedSession, next.refresh),
    ]);
    await Promise.resolve();
    expect(next.refresh).toHaveBeenCalledExactlyOnceWith(rotatedTokens.refreshToken);

    original.fail();
    // Allow the original refresh to settle while the next refresh is still pending.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const duplicateRefresh = vi.fn(async () => nextTokens);
    const duplicate = tab.handleUnauthorized(unauthorized(), rotatedSession, duplicateRefresh);
    next.succeed();

    await expect(nextOutcome).resolves.toEqual([
      { status: 'fulfilled', value: nextTokens.accessToken },
    ]);
    await expect(originalOutcome).resolves.toEqual([
      { status: 'fulfilled', value: nextTokens.accessToken },
    ]);
    await expect(duplicate).resolves.toBe(nextTokens.accessToken);
    expect(duplicateRefresh).not.toHaveBeenCalled();
  } finally {
    original.succeed();
    next.succeed();
  }
});

test('Web Locks 串行处理同一会话的跨标签页刷新', async () => {
  const request = mockWebLocks();

  const first = await openTab();
  await first.useAuthStore.getState().setTokens(oldTokens);
  request.mockClear();
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
  await first.useAuthStore.getState().setTokens(oldTokens);
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
  await first.useAuthStore.getState().setTokens(oldTokens);
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
  await first.useAuthStore.getState().setTokens(oldTokens);
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

    await other.useAuthStore.getState().setTokens(newLogin);
    syncKey('workbase-auth-session');
    expect(first.useAuthStore.getState()).toMatchObject({
      ...newLogin,
      sessionVersion: initialVersion + 1,
    });

    await other.useAuthStore.getState().clearTokens();
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
