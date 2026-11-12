import { MutationObserver, useQuery } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { AxiosAdapter } from 'axios';
import { CanceledError } from 'axios';
import { afterEach, expect, test, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';
import { queryClient } from '@/query-client';
import { useAuthStore } from '@/stores/auth';
import { http } from '@/utils/http';

const accountA = { accessToken: 'account-a', refreshToken: 'refresh-a' };
const accountB = { accessToken: 'account-b', refreshToken: 'refresh-b' };
const privateKey = ['private-profile'];

afterEach(() => {
  useAuthStore.getState().clearTokens();
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
  useAuthStore.getState().setTokens(accountA);
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

    act(() => useAuthStore.getState().setTokens(accountB));

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

test('切换账号时等待异步 onMutate 的操作保持原会话约束', async () => {
  useAuthStore.getState().setTokens(accountA);
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

    useAuthStore.getState().setTokens(accountB);
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
