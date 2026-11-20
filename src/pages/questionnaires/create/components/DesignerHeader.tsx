import { useState } from 'react';

import {
  ArrowLeftOutlined,
  BgColorsOutlined,
  BranchesOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import type { SegmentedProps } from 'antd';
import { App, Button, Divider, Input, Segmented } from 'antd';

type DesignerView = 'content' | 'logic' | 'style';
type DesignerMode = 'edit' | 'preview';

const viewOptions: SegmentedProps<DesignerView>['options'] = [
  { label: '内容', value: 'content', icon: <FileTextOutlined /> },
  { label: '逻辑', value: 'logic', icon: <BranchesOutlined /> },
  { label: '样式', value: 'style', icon: <BgColorsOutlined /> },
];

const modeOptions: SegmentedProps<DesignerMode>['options'] = [
  { label: '编辑', value: 'edit', icon: <EditOutlined /> },
  { label: '预览', value: 'preview', icon: <EyeOutlined /> },
];

/** 顶栏：返回、问卷标题输入框、工作区与编辑模式切换。 */
export const DesignerHeader = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [title, setTitle] = useState('访谈问卷');
  const [view, setView] = useState<DesignerView>('content');
  const [mode, setMode] = useState<DesignerMode>('edit');

  return (
    <header className="designer-header">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          navigate({ to: '/questionnaires/list' }).catch(() => {
            message.error('无法返回问卷列表，请重试');
          });
        }}
      >
        返回项目详情
      </Button>
      <Divider type="vertical" />
      <Input
        className="designer-header__title"
        aria-label="问卷标题"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="designer-header__spacer" />
      <Segmented
        className="designer-header__modes"
        value={view}
        options={viewOptions}
        onChange={(value) => setView(value)}
      />
      <Divider type="vertical" />
      <Segmented value={mode} options={modeOptions} onChange={(value) => setMode(value)} />
    </header>
  );
};
