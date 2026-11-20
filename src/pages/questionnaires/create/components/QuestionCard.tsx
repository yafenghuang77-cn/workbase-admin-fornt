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

import type { DesignerQuestion } from '../data';
import { getQuestionTypeLabel } from '../data';

import { QuestionPreview } from './QuestionPreview';

interface QuestionCardProps {
  question: DesignerQuestion;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

/** 题目卡片：展示题型预览与选中态工具条。 */
export const QuestionCard = ({ question, index, selected, onSelect }: QuestionCardProps) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(question.id);
    }
  };

  return (
    <div
      className={clsx('question-card', selected && 'is-selected')}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(question.id)}
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
      <QuestionPreview question={question} />
    </div>
  );
};
