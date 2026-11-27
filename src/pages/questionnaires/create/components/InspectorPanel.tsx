import { ControlOutlined, SelectOutlined } from '@ant-design/icons';
import { Input, InputNumber } from 'antd';

import type { RichTextValue } from '@/components/rich-text-editor';
import { RichTextEditor } from '@/components/rich-text-editor';

import type { DesignerBlock } from '../data';
import { DEFAULT_GUIDE_DISPLAY_TIME, textToDoc } from '../mock-content';

import { DesignerPanelHeading } from './DesignerPanelHeading';

interface InspectorPanelProps {
  /** 当前点击选中的容器。 */
  selectedBlock: DesignerBlock | null;
  onUpdateBlock: (id: string, changes: Partial<DesignerBlock>) => void;
}

/** 右侧配置面板：选中容器后可编辑名称；引导语另可配置内容与显示时长。 */
export const InspectorPanel = ({ selectedBlock, onUpdateBlock }: InspectorPanelProps) => (
  <aside className="inspector-panel" aria-label="题目配置">
    <DesignerPanelHeading
      icon={<ControlOutlined />}
      title="题目配置"
      description="管理选项与答题规则"
    />
    {selectedBlock ? (
      <div className="inspector-panel__body">
        <label className="inspector-panel__field">
          <span className="inspector-panel__label">
            {selectedBlock.kind === 'group' ? '题目组名称' : '容器名称'}
          </span>
          <Input
            value={selectedBlock.title}
            maxLength={50}
            placeholder="请输入名称"
            onChange={(event) => onUpdateBlock(selectedBlock.id, { title: event.target.value })}
          />
        </label>
        {selectedBlock.kind === 'guide' ? (
          <>
            <div className="inspector-panel__field">
              <span className="inspector-panel__label">引导语内容</span>
              <RichTextEditor
                aria-label="引导语内容"
                placeholder="请输入引导语"
                value={selectedBlock.contentDoc ?? textToDoc(selectedBlock.content)}
                onChange={(value: RichTextValue) =>
                  onUpdateBlock(selectedBlock.id, { contentDoc: value })
                }
              />
            </div>
            <div className="inspector-panel__field">
              <label className="inspector-panel__label" htmlFor="guide-display-time">
                显示时间（秒）
              </label>
              <InputNumber
                id="guide-display-time"
                min={1}
                precision={0}
                value={selectedBlock.displayTime ?? DEFAULT_GUIDE_DISPLAY_TIME}
                onChange={(value) =>
                  onUpdateBlock(selectedBlock.id, { displayTime: Number(value) || 1 })
                }
              />
            </div>
          </>
        ) : null}
      </div>
    ) : (
      <div className="inspector-panel__placeholder">
        <SelectOutlined aria-hidden="true" />
        <h3>未选中题目</h3>
        <p>在画布中选中题目或容器后，相关设置会显示在此处。</p>
      </div>
    )}
  </aside>
);
