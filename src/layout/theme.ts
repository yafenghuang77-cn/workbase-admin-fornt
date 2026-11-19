import type { ThemeConfig } from 'antd';

/** 设计稿按 2x 导出：240px 侧栏、56px 顶栏、24px 内容边距。 */
export const layoutTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
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
      darkItemBg: 'transparent',
      darkItemColor: '#c7d6f3',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
      darkItemHoverColor: '#fff',
      darkItemSelectedBg: '#1677ff',
      darkItemSelectedColor: '#fff',
      darkSubMenuItemBg: 'rgba(0, 20, 60, 0.16)',
      darkPopupBg: '#103780',
      iconMarginInlineEnd: 12,
      groupTitleFontSize: 12,
    },
  },
};

export const workbenchTheme: ThemeConfig = {
  components: {
    Card: { bodyPadding: 24, headerHeight: 54, headerFontSize: 16 },
    Table: {
      cellPaddingBlock: 15,
      cellPaddingInline: 16,
      headerBg: '#fafafa',
      headerSplitColor: 'transparent',
      borderColor: '#f0f0f0',
    },
  },
};
