import { FileTextOutlined, MessageOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { DesignerBlock } from '../data';

import { QuestionGroup } from './QuestionGroup';

interface DesignerCanvasProps {
  blocks: DesignerBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** 画布区：按顺序编排引导语、题目组与追问区块。 */
export const DesignerCanvas = ({ blocks, selectedId, onSelect }: DesignerCanvasProps) => (
  <section className="designer-canvas" aria-label="问卷画布">
    <div className="designer-canvas__content">
      {blocks.map((block) => {
        if (block.kind === 'group') {
          return (
            <QuestionGroup
              key={block.id}
              group={block}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          );
        }
        if (block.kind === 'guide') {
          return (
            <section key={block.id} className="designer-block designer-block--guide">
              <header className="designer-block__head">
                <FileTextOutlined aria-hidden="true" />
                <Tag color="green">引导语</Tag>
                <span className="designer-block__title">{block.title}</span>
              </header>
              <p className="designer-block__body">{block.content}</p>
            </section>
          );
        }
        return (
          <section key={block.id} className="designer-block designer-block--follow-up">
            <header className="designer-block__head">
              <MessageOutlined aria-hidden="true" />
              <Tag color="purple">追问区</Tag>
              <span className="designer-block__title">{block.title}</span>
            </header>
            <p className="designer-block__body designer-block__body--placeholder">
              {block.placeholder}
            </p>
          </section>
        );
      })}
    </div>
  </section>
);
