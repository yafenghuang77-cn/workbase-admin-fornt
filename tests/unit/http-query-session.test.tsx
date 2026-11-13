import type { MutationFunction } from '@tanstack/react-query';
import { MutationObserver, onlineManager, useQuery } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { AxiosAdapter } from 'axios';
import { CanceledError } from 'axios';
import { afterEach, expect, test, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { getMutationSessionSignal, queryClient } from '@/query-client';
import { useAuthStore } from '@/stores/auth';
import { http } from '@/utils/http';
import { registerHttpNotifier } from '@/utils/http/notify';

const accountA = { accessToken: 'account-a', refreshToken: 'refresh-a' };
const accountB = { accessToken: 'account-b', refreshToken: 'refresh-b' };
const privateKey = ['private-profile'];

afterEach(async () => {
  await useAuthStore.getState().clearTokens();
});

function PrivateProfile({ adapter }: { adapter: AxiosAdapter }) {
  const profile = useQuery({
    queryKey: privateKey,
    queryFn: ({ signal }) =>
      http.get<string>('/profile', { adapter, signal, silent: true, skipDedupe: true }),
  });

  return <p>{profile.data ?? '正在加载账号资料'}</p>;
}

test('切换账号时已挂载的查询立即移除旧资料并用新会话重新加载', async () => {
  await useAuthStore.getState().setTokens(accountA);
  const previousClient = queryClient;
  let releaseAccountB: (() => void) | undefined;
  const accountBReady = new Promise<void>((resolve) => {
    releaseAccountB = resolve;
  });
  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const isAccountB = config.headers.get('Authorization') === 'Bearer account-b';
    if (isAccountB) await accountBReady;

    return {
      config,
      data: { data: isAccountB ? '账号 B 的资料' : '账号 A 的资料' },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  });
  const view = render(
    <AppProviders>
      <PrivateProfile adapter={adapter} />
    </AppProviders>,
  );

  try {
    expect(await screen.findByText('账号 A 的资料')).toBeInTheDocument();

    await act(async () => {
      await useAuthStore.getState().setTokens(accountB);
    });

    expect(screen.queryByText('账号 A 的资料')).not.toBeInTheDocument();
    expect(screen.getByText('正在加载账号资料')).toBeInTheDocument();
    expect(previousClient.getQueryData(privateKey)).toBeUndefined();

    releaseAccountB?.();
    expect(await screen.findByText('账号 B 的资料')).toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);
  } finally {
    view.unmount();
    releaseAccountB?.();
  }
});

test('持有旧 QueryClient 的加载器无法用新会话请求旧资料', async () => {
  await useAuthStore.getState().setTokens(accountA);
  const previousClient = queryClient;
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: { data: '账号 B 的资料' },
    headers: {},
    status: 200,
    statusText: 'OK',
  }));
  const profile = ({ signal }: { signal: AbortSignal }) =>
    http.get<string>('/profile', { adapter, signal, silent: true, skipDedupe: true });

  await useAuthStore.getState().setTokens(accountB);
  await expect(
    previousClient.fetchQuery({ queryKey: privateKey, queryFn: profile }),
  ).rejects.toBeInstanceOf(CanceledError);
  expect(adapter).not.toHaveBeenCalled();
  expect(previousClient.getQueryData(privateKey)).toBeUndefined();

  await expect(queryClient.fetchQuery({ queryKey: privateKey, queryFn: profile })).resolves.toBe(
    '账号 B 的资料',
  );
  expect(adapter).toHaveBeenCalledOnce();
  expect(adapter.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer account-b');
});

test('切换账号时等待异步 onMutate 的操作保持原会话约束', async () => {
  await useAuthStore.getState().setTokens(accountA);
  const previousClient = queryClient;
  let releaseOnMutate: (() => void) | undefined;
  const preparing = new Promise<void>((resolve) => {
    releaseOnMutate = resolve;
  });
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: { data: '提交成功' },
    headers: {},
    status: 200,
    statusText: 'OK',
  }));
  const save = (name: string) =>
    http.post<string>('/records', { name }, { adapter, silent: true, skipDedupe: true });
  const onMutate = vi.fn(() => preparing);
  const mutation = new MutationObserver(previousClient, { mutationFn: save, onMutate });
  const pending = mutation.mutate('账号 A 的记录').catch((error: unknown) => error);

  try {
    expect(onMutate).toHaveBeenCalledOnce();

    await useAuthStore.getState().setTokens(accountB);
    mutation.setOptions({ mutationFn: (name) => save(name), onMutate });
    releaseOnMutate?.();

    expect(await pending).toBeInstanceOf(CanceledError);
    expect(adapter).not.toHaveBeenCalled();

    const currentMutation = new MutationObserver(queryClient, { mutationFn: save });
    await expect(currentMutation.mutate('账号 B 的记录')).resolves.toBe('提交成功');
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer account-b');
  } finally {
    releaseOnMutate?.();
  }
});

test('重连时取消旧会话暂停的 Mutation，并继续当前会话的 Mutation', async () => {
  await useAuthStore.getState().setTokens(accountA);
  const previousClient = queryClient;
  const wasOnline = onlineManager.isOnline();
  let releasePreparation: (() => void) | undefined;
  const preparing = new Promise<void>((resolve) => {
    releasePreparation = resolve;
  });
  let stopPauseListener: (() => void) | undefined;
  const paused = new Promise<void>((resolve) => {
    stopPauseListener = previousClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'pause') resolve();
    });
  });
  const save = vi.fn(async (name: string) => name);
  const onError = vi.fn();
  const previous = new MutationObserver(previousClient, {
    mutationFn: save,
    onMutate: () => preparing,
    onError,
    retry: true,
  });

  onlineManager.setOnline(false);
  const pending = previous.mutate('账号 A 的记录').catch((error: unknown) => error);
  try {
    expect(previous.getCurrentResult().isPaused).toBe(true);
    await useAuthStore.getState().setTokens(accountB);
    expect(previousClient.getMutationCache().getAll()).toEqual([]);

    releasePreparation?.();
    await paused;
    const currentClient = queryClient;
    currentClient.mount();
    try {
      const current = new MutationObserver(currentClient, { mutationFn: save });
      const submission = current.mutate('账号 B 的记录');
      expect(current.getCurrentResult().isPaused).toBe(true);
      expect(save).not.toHaveBeenCalled();

      onlineManager.setOnline(true);
      expect(await pending).toBeInstanceOf(CanceledError);
      expect(previous.getCurrentResult().isPaused).toBe(false);
      expect(onError).toHaveBeenCalledOnce();
      await expect(submission).resolves.toBe('账号 B 的记录');
      expect(save.mock.calls).toEqual([['账号 B 的记录', expect.any(Object)]]);
    } finally {
      currentClient.unmount();
    }
  } finally {
    stopPauseListener?.();
    releasePreparation?.();
    onlineManager.setOnline(wasOnline);
  }
});

test('Mutation 内部等待后使用发起会话的 signal 请求', async () => {
  await useAuthStore.getState().setTokens(accountA);
  let reportSignal: ((signal: AbortSignal) => void) | undefined;
  let finishPreparation: (() => void) | undefined;
  const mutationStarted = new Promise<AbortSignal>((resolve) => {
    reportSignal = resolve;
  });
  const preparing = new Promise<void>((resolve) => {
    finishPreparation = resolve;
  });
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: { data: '提交成功' },
    headers: {},
    status: 200,
    statusText: 'OK',
  }));
  const save: MutationFunction<string, string> = async (name, context) => {
    const signal = getMutationSessionSignal(context);
    reportSignal?.(signal);
    await preparing;
    return http.post<string>(
      '/records',
      { name },
      { adapter, signal, silent: true, skipDedupe: true },
    );
  };
  const mutation = new MutationObserver(queryClient, { mutationFn: save });
  const pending = mutation.mutate('账号 A 的记录').catch((error: unknown) => error);

  try {
    const oldSignal = await mutationStarted;
    expect(oldSignal.aborted).toBe(false);

    await useAuthStore.getState().setTokens(accountB);
    expect(oldSignal.aborted).toBe(true);
    finishPreparation?.();

    expect(await pending).toBeInstanceOf(CanceledError);
    expect(adapter).not.toHaveBeenCalled();

    const currentMutation = new MutationObserver(queryClient, { mutationFn: save });
    await expect(currentMutation.mutate('账号 B 的记录')).resolves.toBe('提交成功');
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer account-b');
  } finally {
    finishPreparation?.();
  }
});

test('旧会话 Mutation 的原生中止错误不会在新会话弹出提示', async () => {
  await useAuthStore.getState().setTokens(accountA);
  let reportStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    reportStarted = resolve;
  });
  const aborted = new DOMException('异步准备已中止', 'AbortError');
  const notify = vi.fn();
  const unregister = registerHttpNotifier(notify);

  try {
    const mutation = new MutationObserver(queryClient, {
      mutationFn: (_value, context) =>
        new Promise<never>((_resolve, reject) => {
          const signal = getMutationSessionSignal(context);
          signal.addEventListener('abort', () => reject(aborted), { once: true });
          reportStarted?.();
        }),
    });
    const pending = mutation.mutate(undefined).catch((error: unknown) => error);
    await started;
    await useAuthStore.getState().setTokens(accountB);

    expect(await pending).toBe(aborted);
    expect(notify).not.toHaveBeenCalled();
  } finally {
    unregister();
  }
});
