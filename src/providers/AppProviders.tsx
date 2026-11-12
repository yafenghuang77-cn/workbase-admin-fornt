import type { PropsWithChildren } from 'react';
import { useLayoutEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { queryClient } from '@/query-client';
import { useAuthStore } from '@/stores/auth';
import { registerHttpNotifier } from '@/utils/http/notify';

function HttpNotifications() {
  const { message } = App.useApp();

  useLayoutEffect(
    () =>
      registerHttpNotifier((content, level) => {
        message[level](content);
      }),
    [message],
  );

  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  const sessionVersion = useAuthStore((state) => state.sessionVersion);

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <App>
        <HttpNotifications />
        <QueryClientProvider key={sessionVersion} client={queryClient}>
          {children}
        </QueryClientProvider>
      </App>
    </ConfigProvider>
  );
}
