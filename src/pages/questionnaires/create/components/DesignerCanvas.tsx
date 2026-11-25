import { CanvasEmptyState } from './CanvasEmptyState';

/** 问卷画布：当前为空态占位，题目计数随内容接入后更新。 */
export const DesignerCanvas = () => (
  <section className="designer-canvas" aria-label="问卷画布">
    <div className="designer-canvas__surface">
      <CanvasEmptyState />
    </div>
  </section>
);
