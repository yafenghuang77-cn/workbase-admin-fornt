import type { CSSProperties } from 'react';

import { FolderOutlined, InfoCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/react';
import clsx from 'clsx';

import { RichTextViewer } from '@/components/rich-text-editor';

import type { DesignerBlock, GuideBlock } from '../data';
import { CANVAS_BLOCK_DRAG_TYPE, CANVAS_DROP_ID, PALETTE_ITEM_DRAG_TYPE } from '../drag-drop';
import { DEFAULT_GUIDE_DISPLAY_TIME, textToDoc } from '../mock-content';

import { CanvasBlock } from './CanvasBlock';
import { CanvasContainer } from './CanvasContainer';
import { CanvasEmptyState } from './CanvasEmptyState';
import { CanvasInsertionSlot } from './CanvasInsertionSlot';

interface DesignerCanvasProps {
  /** 组件库是否已收起。 */
  paletteCollapsed: boolean;
  /** 画布区块（当前为本地 mock 内容）。 */
  blocks: DesignerBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 容器拖拽时按指针实时计算的激活插入间隙。 */
  insertionGap: number | null;
  /** 当前点击选中的容器。 */
  selectedContainerId: string | null;
  onSelectContainer: (blockId: string) => void;
  /** 选项类题型的添加与删除入口。 */
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, index: number) => void;
  /** 矩阵题型的行列新增入口。 */
  onAddRow: (questionId: string) => void;
  onAddColumn: (questionId: string) => void;
}

/** 引导语：说明块，正文富文本直接呈现在浅色底上。 */
const GuideBlockView = ({ block }: { block: GuideBlock }) => (
  <section className="designer-block designer-block--guide" aria-label={block.title}>
    <header className="designer-block__head">
      <span className="designer-block__icon" aria-hidden="true">
        <InfoCircleOutlined />
      </span>
      <span className="designer-block__title">{block.title}</span>
      <span className="designer-block__meta">
        展示 {block.displayTime ?? DEFAULT_GUIDE_DISPLAY_TIME} 秒
      </span>
    </header>
    <div className="designer-block__body">
      <RichTextViewer
        aria-label="引导语内容"
        className="designer-block__richtext"
        style={{ '--rich-bg': 'transparent' } as CSSProperties}
        value={block.contentDoc ?? textToDoc(block.content)}
      />
    </div>
  </section>
);

/** 问卷画布：容器按间隙插入，题目只能拖入题目组或追问区。 */
export const DesignerCanvas = ({
  paletteCollapsed,
  blocks,
  selectedId,
  onSelect,
  insertionGap,
  selectedContainerId,
  onSelectContainer,
  onAddOption,
  onRemoveOption,
  onAddRow,
  onAddColumn,
}: DesignerCanvasProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: CANVAS_DROP_ID,
    accept: [PALETTE_ITEM_DRAG_TYPE, CANVAS_BLOCK_DRAG_TYPE],
    collisionPriority: 1,
  });

  return (
    <section className="designer-canvas" aria-label="问卷画布">
      <div
        ref={ref}
        className={clsx('designer-canvas__surface', isDropTarget && 'is-drop-target')}
        data-testid="canvas-surface"
      >
        {blocks.length === 0 ? (
          <CanvasEmptyState paletteCollapsed={paletteCollapsed} dropActive={isDropTarget} />
        ) : (
          <div className="designer-canvas__content">
            {blocks.map((block, index) => (
              <div className="designer-canvas__row" key={block.id}>
                <CanvasInsertionSlot index={index} active={insertionGap === index} />
                <CanvasBlock
                  blockId={block.id}
                  label={block.title}
                  selected={selectedContainerId === block.id}
                  onSelect={onSelectContainer}
                >
                  {block.kind === 'guide' ? (
                    <GuideBlockView block={block} />
                  ) : (
                    <CanvasContainer
                      blockId={block.id}
                      title={block.title}
                      icon={block.kind === 'group' ? <FolderOutlined /> : <MessageOutlined />}
                      tone={block.kind === 'follow-up' ? 'follow-up' : 'default'}
                      questions={block.questions}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onAddOption={onAddOption}
                      onRemoveOption={onRemoveOption}
                      onAddRow={onAddRow}
                      onAddColumn={onAddColumn}
                    />
                  )}
                </CanvasBlock>
              </div>
            ))}
            <CanvasInsertionSlot index={blocks.length} active={insertionGap === blocks.length} />
          </div>
        )}
      </div>
    </section>
  );
};
