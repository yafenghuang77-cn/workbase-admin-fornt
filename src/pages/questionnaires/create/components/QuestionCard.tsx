import { createElement } from 'react';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Button, Tag, Tooltip } from 'antd';
import clsx from 'clsx';

import { getQuestionTypeComponent } from '@/components/business/question-types';

import { getQuestionTypeLabel } from '../../question-types';
import type { DesignerQuestion } from '../data';

interface QuestionCardProps {
  question: DesignerQuestion;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  /** 选项类题型的添加与删除入口。 */
  onAddOption?: ((questionId: string) => void) | undefined;
  onRemoveOption?: ((questionId: string, index: number) => void) | undefined;
  /** 矩阵题型的行列新增入口。 */
  onAddRow?: ((questionId: string) => void) | undefined;
  onAddColumn?: ((questionId: string) => void) | undefined;
}

/** 题目卡片：展示题型 UI 与选中态工具条。 */
export const QuestionCard = ({
  question,
  index,
  selected,
  onSelect,
  onAddOption,
  onRemoveOption,
  onAddRow,
  onAddColumn,
}: QuestionCardProps) => {
  // 是否渲染题型 UI 由此处查表决定，组件自身不做题型判断
  const QuestionBody = getQuestionTypeComponent(question.type);
  const questionBody = QuestionBody
    ? createElement(QuestionBody, {
        options: question.options,
        rows: question.rows,
        columns: question.options,
        mediaItems: question.mediaItems,
        scale: question.scaleMax === undefined ? undefined : { min: 1, max: question.scaleMax },
        scaleLabels: question.scaleLabels,
        onAddOption: onAddOption ? () => onAddOption(question.id) : undefined,
        onRemoveOption: onRemoveOption
          ? (optionIndex: number) => onRemoveOption(question.id, optionIndex)
          : undefined,
        onAddRow: onAddRow ? () => onAddRow(question.id) : undefined,
        onAddColumn: onAddColumn ? () => onAddColumn(question.id) : undefined,
      })
    : null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onSelect(question.id);
    }
  };

  return (
    <div
      className={clsx('question-card', selected && 'is-selected')}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(question.id);
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="question-card__head">
        <HolderOutlined className="question-card__handle" aria-hidden="true" />
        <span className="question-card__num">{index + 1}</span>
        <Tag color="blue">{getQuestionTypeLabel(question.type)}</Tag>
        {question.required ? <span className="question-card__required">* 必填</span> : null}
        <div className="question-card__tools">
          {selected ? (
            <>
              <Tooltip title="上移">
                <Button type="text" size="small" icon={<ArrowUpOutlined />} aria-label="上移题目" />
              </Tooltip>
              <Tooltip title="下移">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  aria-label="下移题目"
                />
              </Tooltip>
              <Tooltip title="复制">
                <Button type="text" size="small" icon={<CopyOutlined />} aria-label="复制题目" />
              </Tooltip>
              <Tooltip title="删除">
                <Button type="text" size="small" icon={<DeleteOutlined />} aria-label="删除题目" />
              </Tooltip>
            </>
          ) : null}
          <Tooltip title="更多">
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多操作" />
          </Tooltip>
        </div>
      </div>
      <div className="question-card__title">{question.title}</div>
      {questionBody ? (
        <div
          className="question-card__body"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          {questionBody}
        </div>
      ) : null}
    </div>
  );
};
