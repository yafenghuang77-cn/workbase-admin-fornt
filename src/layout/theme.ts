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
      iconSize: 14,
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
