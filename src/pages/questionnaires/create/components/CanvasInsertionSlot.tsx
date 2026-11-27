import { useDragOperation, useDroppable } from '@dnd-kit/react';
import clsx from 'clsx';

import { CANVAS_BLOCK_DRAG_TYPE, getInsertionDropId, PALETTE_ITEM_DRAG_TYPE } from '../drag-drop';

interface CanvasInsertionSlotProps {
  /** 落点下标：新容器插入到该下标位置。 */
  index: number;
  /** 父级按指针实时计算的激活间隙。 */
  active: boolean;
}

/** 容器之间的插入位：容器拖拽时可见间隙，激活时展开为虚线占位条。 */
export const CanvasInsertionSlot = ({ index, active }: CanvasInsertionSlotProps) => {
  const { source } = useDragOperation();
  const dragging =
    source?.type === CANVAS_BLOCK_DRAG_TYPE || source?.type === PALETTE_ITEM_DRAG_TYPE;
  const { ref, isDropTarget } = useDroppable({
    id: getInsertionDropId(index),
    accept: [CANVAS_BLOCK_DRAG_TYPE, PALETTE_ITEM_DRAG_TYPE],
    collisionPriority: 10,
  });

  return (
    <div
      ref={ref}
      className={clsx(
        'designer-canvas__slot',
        dragging && 'is-visible',
        (active || isDropTarget) && 'is-active',
      )}
      data-testid={`canvas-slot-${index}`}
    >
      <div className="designer-canvas__slot-placeholder" />
    </div>
  );
};
