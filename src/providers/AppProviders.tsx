import type { PropsWithChildren } from 'react';

import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { workbenchTheme } from '@/layout/theme';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <ConfigProvider locale={zhCN} theme={workbenchTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
};
