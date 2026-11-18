import type { PropsWithChildren } from 'react';

import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <App>{children}</App>
    </ConfigProvider>
  );
};
