import { FileTextOutlined } from '@ant-design/icons';

interface CanvasEmptyStateProps {
  /** 组件库是否已收起，用于给出正确的操作指引。 */
  paletteCollapsed?: boolean | undefined;
}

/** 画布空态：铺满画布的虚线投放区，提示从组件库添加题目。 */
export const CanvasEmptyState = ({ paletteCollapsed }: CanvasEmptyStateProps) => (
  <div className="designer-canvas__dropzone">
    <span className="designer-canvas__dropzone-icon" aria-hidden="true">
      <FileTextOutlined />
    </span>
    <h3 className="designer-canvas__dropzone-title">暂无题目</h3>
    <p className="designer-canvas__dropzone-text">
      {paletteCollapsed
        ? '点击顶栏的组件库按钮展开题型面板，挑选题型开始搭建问卷。'
        : '从左侧组件库挑选题型，或拖拽题型到此处，开始搭建问卷。'}
    </p>
  </div>
);
