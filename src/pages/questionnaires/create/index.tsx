import { useRef, useState } from 'react';

import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { useNavigate } from '@tanstack/react-router';
import { App } from 'antd';
import clsx from 'clsx';

import { getQuestionTypeDefinition } from '../question-types';

import { DesignerCanvas } from './components/DesignerCanvas';
import { DesignerFooter } from './components/DesignerFooter';
import { DesignerHeader } from './components/DesignerHeader';
import { InspectorPanel } from './components/InspectorPanel';
import { QuestionPalette } from './components/QuestionPalette';
import type { DesignerBlock } from './data';
import type { PaletteDragData } from './drag-drop';
import {
  CANVAS_BLOCK_DRAG_TYPE,
  CANVAS_DROP_ID,
  clampInsertionIndex,
  computeInsertionGap,
  readDraggedQuestionType,
  readInsertionIndex,
  readQuestionDropBlockId,
} from './drag-drop';
import { countQuestions, createMockBlock, createMockQuestion } from './mock-content';

import './index.less';

/** 问卷设计页：脱离布局组件的全屏工作台。 */
export const QuestionnaireCreatePage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [blocks, setBlocks] = useState<DesignerBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [insertionGap, setInsertionGap] = useState<number | null>(null);
  const gapRef = useRef<number | null>(null);

  const updateGap = (value: number | null) => {
    gapRef.current = value;
    setInsertionGap(value);
  };

  const selectedBlock = blocks.find((block) => block.id === selectedContainerId) ?? null;

  /** 右侧面板编辑容器名称、引导语内容与显示时长的唯一入口。 */
  const updateBlock = (id: string, changes: Partial<DesignerBlock>) => {
    setBlocks((previous) =>
      previous.map((block) =>
        block.id === id ? ({ ...block, ...changes } as DesignerBlock) : block,
      ),
    );
  };

  /** 选项类题型的选项增删：按题目定位后更新其选项文案。 */
  const updateQuestionOptions = (
    questionId: string,
    transform: (options: string[]) => string[],
  ) => {
    setBlocks((previous) =>
      previous.map((block) =>
        block.kind === 'group'
          ? {
              ...block,
              questions: block.questions.map((question) =>
                question.id === questionId
                  ? { ...question, options: transform(question.options ?? []) }
                  : question,
              ),
            }
          : block,
      ),
    );
  };

  const returnToList = () => {
    navigate({ to: '/questionnaires/list' }).catch(() => {
      message.error('无法返回问卷列表，请重试');
    });
  };

  /** 拖动过程中只更新落点提示，真正的数据变更统一放在 onDragEnd。 */
  const resolveGap = (operation: {
    source: { data: unknown } | null;
    target: { id: unknown } | null;
  }): number | null => {
    const { source, target } = operation;
    if (!source || !target) return null;
    return computeInsertionGap({
      slotIndex: readInsertionIndex(target.id),
      overCanvas: target.id === CANVAS_DROP_ID,
      fallback: gapRef.current,
    });
  };

  return (
    <DragDropProvider
      onDragStart={() => {
        updateGap(blocks.length);
      }}
      onDragOver={(event) => {
        updateGap(resolveGap(event.operation));
      }}
      onDragEnd={(event) => {
        const gap = resolveGap(event.operation) ?? gapRef.current;
        updateGap(null);
        if (event.canceled) return;
        const { source } = event.operation;
        if (!source) return;

        const type = readDraggedQuestionType(source.data);
        if (!type) return;
        const kind = getQuestionTypeDefinition(type)?.kind;

        // 容器组件：按落点间隙插入顶层
        if (kind === 'container') {
          if (source.type !== CANVAS_BLOCK_DRAG_TYPE) {
            const block = createMockBlock(type);
            if (!block) return;
            setBlocks((previous) => {
              const next = [...previous];
              next.splice(clampInsertionIndex(gap ?? undefined, next.length), 0, block);
              return next;
            });
          }
          return;
        }

        // 题目：只能放入题目组或追问区
        const targetBlockId = readQuestionDropBlockId(event.operation.target?.id);
        if (!targetBlockId) {
          message.info('题目需要拖入题目组或追问区');
          return;
        }
        setBlocks((previous) => {
          const question = createMockQuestion(type, countQuestions(previous) + 1);
          if (!question) return previous;
          return previous.map((block) =>
            block.id === targetBlockId && (block.kind === 'group' || block.kind === 'follow-up')
              ? { ...block, questions: [...block.questions, question] }
              : block,
          );
        });
      }}
    >
      <main className="questionnaire-create-page" aria-label="问卷设计">
        <DesignerHeader
          onBack={returnToList}
          paletteCollapsed={paletteCollapsed}
          onExpandPalette={() => setPaletteCollapsed(false)}
        />
        <div
          className={clsx(
            'questionnaire-create__workspace',
            paletteCollapsed && 'questionnaire-create__workspace--palette-hidden',
          )}
        >
          <QuestionPalette collapsed={paletteCollapsed} onCollapsedChange={setPaletteCollapsed} />
          <DesignerCanvas
            paletteCollapsed={paletteCollapsed}
            blocks={blocks}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSelectedContainerId(null);
            }}
            insertionGap={insertionGap}
            selectedContainerId={selectedContainerId}
            onSelectContainer={(id) => {
              setSelectedContainerId(id);
              setSelectedId(null);
            }}
            onAddOption={(questionId) =>
              updateQuestionOptions(questionId, (options) => [
                ...options,
                `选项 ${options.length + 1}`,
              ])
            }
            onRemoveOption={(questionId, index) =>
              updateQuestionOptions(questionId, (options) =>
                options.length <= 1 ? options : options.filter((_, current) => current !== index),
              )
            }
          />
          <InspectorPanel selectedBlock={selectedBlock} onUpdateBlock={updateBlock} />
        </div>
        <DesignerFooter onCancel={returnToList} />
      </main>
      <DragOverlay dropAnimation={null}>
        {(source) => {
          const data = source.data as Partial<PaletteDragData>;
          return <span className="designer-drag-preview">{data.label ?? '题型'}</span>;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
};
