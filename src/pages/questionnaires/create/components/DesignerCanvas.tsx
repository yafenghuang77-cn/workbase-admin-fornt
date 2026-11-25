import { FileTextOutlined } from '@ant-design/icons';

import { CanvasEmptyState } from './CanvasEmptyState';
import { DesignerPanelHeading } from './DesignerPanelHeading';

/** 问卷画布：当前为空态占位，题目计数随内容接入后更新。 */
export const DesignerCanvas = () => (
  <section className="designer-canvas" aria-label="问卷画布">
    <DesignerPanelHeading
      icon={<FileTextOutlined />}
      title="问卷画布"
      description="编排题目与内容区块"
      extra={<span className="designer-canvas__count">0 道题</span>}
    />
    <div className="designer-canvas__surface">
      <CanvasEmptyState />
    </div>
  </section>
);
