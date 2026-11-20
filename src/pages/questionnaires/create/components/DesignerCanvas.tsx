import { CanvasEmptyState } from './CanvasEmptyState';

export const DesignerCanvas = () => {
  return (
    <section className="designer-canvas" aria-label="问卷画布">
      <div className="designer-canvas__surface">
        <CanvasEmptyState />
      </div>
    </section>
  );
};
