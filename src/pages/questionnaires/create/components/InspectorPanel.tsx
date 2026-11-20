import { ControlOutlined, SelectOutlined } from '@ant-design/icons';

import { DesignerPanelHeading } from './DesignerPanelHeading';

export const InspectorPanel = () => (
  <aside className="inspector-panel" aria-label="题目配置">
    <DesignerPanelHeading
      icon={<ControlOutlined />}
      title="题目配置"
      description="管理选项与答题规则"
    />
    <div className="inspector-panel__placeholder">
      <SelectOutlined aria-hidden="true" />
      <h3>未选中题目</h3>
      <p>画布中选中题目后，相关设置会显示在此处。</p>
    </div>
  </aside>
);
