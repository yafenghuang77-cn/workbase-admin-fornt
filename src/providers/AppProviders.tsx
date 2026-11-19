import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { App, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { appTheme } from './theme';
import type { ThemeSettings } from './theme-settings';
import { ThemeSettingsContext } from './theme-settings';
import { loadThemeSettings, saveThemeSettings } from './theme-storage';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [settings, setSettings] = useState<ThemeSettings>(loadThemeSettings);
  useEffect(() => saveThemeSettings(settings), [settings]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        ...appTheme,
        algorithm: settings.navTheme === 'realDark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { ...appTheme.token, colorPrimary: settings.colorPrimary },
      }}
    >
      <ThemeSettingsContext value={{ settings, setSettings }}>
        <App>{children}</App>
      </ThemeSettingsContext>
    </ConfigProvider>
  );
};
