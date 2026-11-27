import { FileTextOutlined } from '@ant-design/icons';
import clsx from 'clsx';

interface CanvasEmptyStateProps {
  /** 组件库是否已收起，用于给出正确的操作指引。 */
  paletteCollapsed?: boolean | undefined;
  /** 是否正处于题型拖拽悬停状态。 */
  dropActive?: boolean | undefined;
}

/** 画布空态：铺满画布的虚线投放区，提示从组件库添加题目。 */
export const CanvasEmptyState = ({ paletteCollapsed, dropActive }: CanvasEmptyStateProps) => (
  <div className={clsx('designer-canvas__dropzone', dropActive && 'is-drop-target')}>
    <span className="designer-canvas__dropzone-icon" aria-hidden="true">
      <FileTextOutlined />
    </span>
    <h3 className="designer-canvas__dropzone-title">暂无题目</h3>
    <p className="designer-canvas__dropzone-text">
      {dropActive
        ? '松开鼠标，添加容器组件。'
        : paletteCollapsed
          ? '点击顶栏的组件库按钮展开题型面板，先添加题目组或追问区。'
          : '先拖入题目组或追问区，再把题型拖进容器内。'}
    </p>
  </div>
);
