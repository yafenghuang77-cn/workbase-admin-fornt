import { CanvasEmptyState } from './CanvasEmptyState';

interface DesignerCanvasProps {
  /** 组件库是否已收起。 */
  paletteCollapsed: boolean;
}

/** 问卷画布：当前为空态占位，题目内容接入后替换。 */
export const DesignerCanvas = ({ paletteCollapsed }: DesignerCanvasProps) => (
  <section className="designer-canvas" aria-label="问卷画布">
    <div className="designer-canvas__surface">
      <CanvasEmptyState paletteCollapsed={paletteCollapsed} />
    </div>
  </section>
);
