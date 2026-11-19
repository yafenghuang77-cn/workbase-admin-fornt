import type { ProLayoutProps } from '@ant-design/pro-components';
import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

import type { ThemeSettings } from './theme-settings';

/** 默认主题配置；未保存个人设置或恢复默认时使用，可直接修改此对象。 */
export const defaultThemeSettings: ThemeSettings = {
  navTheme: 'light',
  colorPrimary: theme.defaultSeed.colorPrimary,
};

/** 应用统一主题，由 AppProviders 提供。 */
export const appTheme = {
  token: {
    borderRadiusLG: 8,
  },
  components: {
    Menu: {
      itemHeight: 40,
      itemMarginInline: 0,
      itemPaddingInline: 12,
      iconSize: 16,
      collapsedIconSize: 18,
      itemBorderRadius: 6,
      subMenuItemBorderRadius: 6,
      iconMarginInlineEnd: 12,
      groupTitleFontSize: 12,
    },
    Card: { bodyPadding: 24, headerHeight: 54, headerFontSize: 16 },
    Table: {
      cellPaddingBlock: 15,
      cellPaddingInline: 16,
    },
  },
} satisfies ThemeConfig;

/** 配色沿用 ProLayout 默认主题，仅保留已有布局尺寸。 */
export const proLayoutTheme: NonNullable<ProLayoutProps['token']> = {
  pageContainer: {
    paddingInlinePageContainerContent: 12,
    paddingBlockPageContainerContent: 16,
  },
  header: {
    heightLayoutHeader: 56,
  },
  sider: {
    menuHeight: 40,
    paddingInlineLayoutMenu: 12,
    paddingBlockLayoutMenu: 0,
  },
};
