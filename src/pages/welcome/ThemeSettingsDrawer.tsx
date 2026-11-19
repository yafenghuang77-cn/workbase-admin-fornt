import { createPortal } from 'react-dom';

import { SettingDrawer } from '@ant-design/pro-components';
import { Button } from 'antd';

import { defaultThemeSettings } from '@/providers/theme';
import { useThemeSettings } from '@/providers/theme-settings';

export const ThemeSettingsDrawer = () => {
  const { settings, setSettings } = useThemeSettings();

  // 将官方齿轮入口挂载到滚动容器外，避免被页面内容遮挡。
  return createPortal(
    <SettingDrawer
      themeOnly
      enableDarkTheme
      hideHintAlert
      hideCopyButton
      disableUrlParams
      drawerProps={{
        title: '主题设置',
        closable: true,
        footer: (
          <Button block onClick={() => setSettings({ ...defaultThemeSettings })}>
            恢复默认主题
          </Button>
        ),
      }}
      settings={settings}
      onSettingChange={(next) => {
        setSettings((current) => ({
          navTheme: next.navTheme ?? current.navTheme,
          colorPrimary: next.colorPrimary ?? current.colorPrimary,
        }));
      }}
    />,
    document.body,
  );
};
