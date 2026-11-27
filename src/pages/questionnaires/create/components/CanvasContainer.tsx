import type { ReactNode } from 'react';

import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/react';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';

import type { DesignerQuestion } from '../data';
import { getQuestionDropId, PALETTE_ITEM_DRAG_TYPE } from '../drag-drop';

import { QuestionCard } from './QuestionCard';

interface CanvasContainerProps {
  /** 容器区块标识，用于题目投放区。 */
  blockId: string;
  title: string;
  icon: ReactNode;
  /** 配色变体：追问区用紫色系与题目组区分。 */
  tone?: 'default' | 'follow-up';
  /** 容器内题目。 */
  questions: DesignerQuestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, index: number) => void;
  onAddRow: (questionId: string) => void;
  onAddColumn: (questionId: string) => void;
}

/** 画布容器外壳：题目组与追问区共用结构，正文即题目投放区。 */
export const CanvasContainer = ({
  blockId,
  title,
  icon,
  tone = 'default',
  questions,
  selectedId,
  onSelect,
  onAddOption,
  onRemoveOption,
  onAddRow,
  onAddColumn,
}: CanvasContainerProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: getQuestionDropId(blockId),
    accept: PALETTE_ITEM_DRAG_TYPE,
    collisionPriority: 8,
  });

  return (
    <section
      className={clsx('question-group', tone === 'follow-up' && 'question-group--follow-up')}
      aria-label={title}
    >
      <header className="question-group__header">
        <span className="question-group__icon" aria-hidden="true">
          {icon}
        </span>
        <h3 className="question-group__title">{title}</h3>
        <span className="question-group__count">共 {questions.length} 题</span>
        <Tooltip title="更多">
          <Button
            className="question-group__more"
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label={`${title}更多操作`}
          />
        </Tooltip>
      </header>
      <div
        ref={ref}
        className={clsx('question-group__body', isDropTarget && 'is-drop-target')}
        data-testid={`question-drop-${blockId}`}
      >
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            selected={selectedId === question.id}
            onSelect={onSelect}
            onAddOption={onAddOption}
            onRemoveOption={onRemoveOption}
            onAddRow={onAddRow}
            onAddColumn={onAddColumn}
          />
        ))}
        <Button className="question-group__add" type="dashed" icon={<PlusOutlined />}>
          {isDropTarget ? '松开鼠标，添加题目到此处' : '添加题目（拖拽左侧题型到此处）'}
        </Button>
      </div>
    </section>
  );
};
