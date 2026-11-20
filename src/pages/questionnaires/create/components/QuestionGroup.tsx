import { FolderOutlined, HolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import type { QuestionGroup as QuestionGroupModel } from '../data';

import { QuestionCard } from './QuestionCard';

interface QuestionGroupProps {
  group: QuestionGroupModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** 题目组容器：组标题栏、题目列表与行内添加入口。 */
export const QuestionGroup = ({ group, selectedId, onSelect }: QuestionGroupProps) => (
  <section className="question-group" aria-label={group.title}>
    <header className="question-group__header">
      <HolderOutlined className="question-group__handle" aria-hidden="true" />
      <FolderOutlined aria-hidden="true" />
      <h3 className="question-group__title">{group.title}</h3>
      <span className="question-group__count">共 {group.questions.length} 题</span>
      <Tooltip title="更多">
        <Button
          className="question-group__more"
          type="text"
          size="small"
          icon={<MoreOutlined />}
          aria-label="题目组更多操作"
        />
      </Tooltip>
    </header>
    <div className="question-group__body">
      {group.questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          selected={selectedId === question.id}
          onSelect={onSelect}
        />
      ))}
      <Button className="question-group__add" type="dashed" icon={<PlusOutlined />}>
        添加题目（点击或拖拽左侧题型）
      </Button>
    </div>
  </section>
);
