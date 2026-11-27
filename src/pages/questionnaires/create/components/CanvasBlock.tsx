import type { KeyboardEvent, ReactNode } from 'react';

import clsx from 'clsx';

interface CanvasBlockProps {
  blockId: string;
  label: string;
  /** 是否被点击选中。 */
  selected: boolean;
  onSelect: (blockId: string) => void;
  children: ReactNode;
}

/** 画布容器包装：点击或键盘选中，不参与拖拽。 */
export const CanvasBlock = ({ blockId, label, selected, onSelect, children }: CanvasBlockProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(blockId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`选择容器：${label}`}
      aria-pressed={selected}
      className={clsx('designer-canvas__block', selected && 'is-selected')}
      data-block-id={blockId}
      onClick={() => onSelect(blockId)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};
